// ═══════════════════════════════════════════════
//  TREE ENGINE — ESTADO Y MODELOS DE DATOS
// ═══════════════════════════════════════════════
let tree = null;
let nodeCounter = 0;
let optimizeMode = 'max'; // 'max' | 'min'
let clipboard = null;

// Layout constants
const NW = 110, NH = 48, NW_TERM = 124;
const HGAP = 110;
const VGAP = 22;
const MARGIN = 40;

// ═══════════════════════════════════════════════
//  MOTOR DE CÁLCULO (ROLLBACK)
// ═══════════════════════════════════════════════
// ═══════════════════════════════════════════════
//  VALIDACIÓN DE AXIOMAS DE PROBABILIDAD (BUG-01)
// ═══════════════════════════════════════════════
function validateNodeProbabilities(node) {
  if (!node || node.type !== 'chance') {
    if (node) {
      node.hasProbabilityError = false;
      node.hasRangeError = false;
    }
    return {
      hasRangeError: false,
      hasProbabilityError: false,
      sum: 0,
      text: '',
      statusClass: 'prob-badge ok',
      valid: true
    };
  }

  if (!node.children || node.children.length === 0) {
    node.hasProbabilityError = false;
    node.hasRangeError = false;
    return {
      hasRangeError: false,
      hasProbabilityError: false,
      sum: 0,
      text: '',
      statusClass: 'prob-badge ok',
      valid: true
    };
  }

  let hasRangeError = false;
  let sum = 0;

  for (const c of node.children) {
    const rawP = c.prob;
    const p = typeof rawP === 'string' ? parseFloat(rawP) : rawP;
    if (p === null || p === undefined || isNaN(p) || p < 0.0 || p > 1.0) {
      hasRangeError = true;
    }
    if (typeof p === 'number' && !isNaN(p)) {
      sum += p;
    }
  }

  node.hasRangeError = hasRangeError;
  node._probSum = sum;

  if (hasRangeError) {
    node.hasProbabilityError = true;
    return {
      hasRangeError: true,
      hasProbabilityError: true,
      sum,
      text: 'Err: p ∉ [0, 1]',
      statusClass: 'prob-badge warn',
      valid: false
    };
  }

  const isSumValid = Math.abs(sum - 1.0) < 0.001;
  if (!isSumValid) {
    node.hasProbabilityError = true;
    return {
      hasRangeError: false,
      hasProbabilityError: true,
      sum,
      text: `Σ=${sum.toFixed(2)} ≠ 1`,
      statusClass: 'prob-badge warn',
      valid: false
    };
  }

  node.hasProbabilityError = false;
  return {
    hasRangeError: false,
    hasProbabilityError: false,
    sum,
    text: 'Σ=1.00',
    statusClass: 'prob-badge ok',
    valid: true
  };
}

function hasTreeProbabilityErrors(node) {
  if (!node) return false;
  if (node.type === 'chance' && node.children && node.children.length > 0) {
    const res = validateNodeProbabilities(node);
    if (res.hasProbabilityError) return true;
  }
  for (const c of (node.children || [])) {
    if (hasTreeProbabilityErrors(c)) return true;
  }
  return false;
}

function clearOptimalFlags(node) {
  if (!node) return;
  node._optimal = false;
  for (const c of (node.children || [])) {
    c._optimal = false;
    clearOptimalFlags(c);
  }
}

// ═══════════════════════════════════════════════
//  TRAZADO Y CONTINUIDAD DE LA RUTA ÓPTIMA (BUG-02)
// ═══════════════════════════════════════════════
function propagateOptimalPath(node, active = true) {
  if (!node) return;
  node._optimal = active;
  if (!node.children || node.children.length === 0) return;

  if (node.type === 'decision') {
    // Para decisión: solo se activa la rama elegida (la que tiene _isChosen)
    for (const c of node.children) {
      const isChosen = active && (c._isChosen === true);
      propagateOptimalPath(c, isChosen);
    }
  } else if (node.type === 'chance') {
    // Para azar: si el azar está activo en la ruta óptima, TODAS sus ramas
    // propagan el estado activo para asegurar la continuidad hacia decisiones subsecuentes
    for (const c of node.children) {
      propagateOptimalPath(c, active);
    }
  } else {
    for (const c of node.children) {
      propagateOptimalPath(c, false);
    }
  }
}

function calcEV(node) {
  if (!node) return 0;

  function _eval(n) {
    if (!n) return null;
    if (n.type === 'terminal') {
      n._ev = (n.value !== null && n.value !== undefined && !isNaN(n.value)) ? Number(n.value) : 0;
      return n._ev;
    }
    if (n.type === 'chance') {
      validateNodeProbabilities(n);
      let childError = false;
      let expectedSum = 0;
      for (const c of (n.children || [])) {
        const cev = _eval(c);
        if (cev === null || isNaN(cev)) {
          childError = true;
        } else {
          // BUG-02: Propagación neta de costos en ramas intermedias
          const branchCost = (c.cost !== undefined && c.cost !== null && !isNaN(c.cost))
            ? Number(c.cost)
            : ((c.type === 'decision' && c.value !== undefined && c.value !== null && !isNaN(c.value)) ? -Number(c.value) : 0);
          const effectiveVal = cev - branchCost;
          expectedSum += (c.prob || 0) * effectiveVal;
        }
      }
      if (n.hasProbabilityError || childError) {
        n._ev = null;
        return null;
      }
      const baseVal = (n.value !== null && n.value !== undefined && !isNaN(n.value)) ? Number(n.value) : 0;
      n._ev = baseVal + expectedSum;
      return n._ev;
    }
    if (n.type === 'decision') {
      let best = optimizeMode === 'max' ? -Infinity : Infinity;
      let opt = null;
      let childError = false;
      for (const c of (n.children || [])) {
        const cev = _eval(c);
        if (cev === null || isNaN(cev)) {
          childError = true;
        } else {
          // BUG-02: Propagación neta de costos en alternativas
          const branchCost = (c.cost !== undefined && c.cost !== null && !isNaN(c.cost))
            ? Number(c.cost)
            : 0;
          const effectiveVal = cev - branchCost;
          const better = optimizeMode === 'max' ? effectiveVal > best : effectiveVal < best;
          if (better) {
            best = effectiveVal;
            opt = c;
          }
        }
      }
      for (const c of (n.children || [])) {
        c._isChosen = (c === opt && opt !== null && !childError);
        c._optimal = c._isChosen;
      }
      if (childError || best === Infinity || best === -Infinity) {
        n._ev = null;
        return null;
      }
      n._ev = best;
      return n._ev;
    }
    return 0;
  }

  const res = _eval(node);

  const treeRoot = (typeof tree !== 'undefined' && tree) ? tree : node;
  if (hasTreeProbabilityErrors(treeRoot)) {
    clearOptimalFlags(treeRoot);
  } else {
    // Si la raíz no tiene errores, propagar continuamente la ruta óptima desde la raíz
    propagateOptimalPath(node, true);
  }

  return res;
}

// ═══════════════════════════════════════════════
//  CÁLCULO DE LAYOUT Y MÉTRICAS
// ═══════════════════════════════════════════════
function calcLayout(node, depth, posMap, counter) {
  if (!node.children || node.children.length === 0) {
    const y = counter.val * (NH + VGAP);
    counter.val++;
    posMap[node.id] = { x: depth * (NW + HGAP) + MARGIN, y };
    return y;
  }
  const childYs = node.children.map(c => calcLayout(c, depth + 1, posMap, counter));
  const y = (childYs[0] + childYs[childYs.length - 1]) / 2;
  posMap[node.id] = { x: depth * (NW + HGAP) + MARGIN, y };
  return y;
}

function countDepth(node) {
  if (!node || !node.children || node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(countDepth));
}

function countNodes(node) {
  if (!node) return 0;
  return 1 + (node.children || []).reduce((s, c) => s + countNodes(c), 0);
}

function findOptimalLabel(node) {
  if (!node || node.type !== 'decision') return '—';
  if (typeof hasTreeProbabilityErrors === 'function' && hasTreeProbabilityErrors(node)) return '—';
  for (const c of node.children) if (c._optimal) return c.label;
  return '—';
}

// ═══════════════════════════════════════════════
//  VALIDACIÓN DE PROBABILIDADES
// ═══════════════════════════════════════════════
function validateProbabilities() {
  const errors = [];
  if (tree) collectProbErrors(tree, errors);

  const panel = document.getElementById('prob-alert-panel');
  const list  = document.getElementById('prob-alert-list');
  if (!panel || !list) return;

  if (errors.length === 0) {
    panel.classList.remove('visible');
    return;
  }
  panel.classList.add('visible');
  list.innerHTML = errors.map(e => `
    <div class="prob-alert-row" style="margin-bottom:3px">
      <span class="prob-alert-id">${e.id}</span>
      <span style="color:var(--muted)">${e.label}</span>
      <span style="color:#ff5f5f;font-family:'DM Mono',monospace">${e.text}</span>
    </div>`).join('');
}

function collectProbErrors(node, errors) {
  if (node.type === 'chance' && node.children && node.children.length > 0) {
    const val = validateNodeProbabilities(node);
    if (val.hasProbabilityError) {
      errors.push({ id: node.id, label: node.label.substring(0,16), text: val.text, sum: val.sum });
    }
  }
  for (const c of (node.children || [])) collectProbErrors(c, errors);
}

// ═══════════════════════════════════════════════
//  UTILIDADES DE ÁRBOL Y ESTRUCTURAS
// ═══════════════════════════════════════════════
function deepCloneWithNewIds(node) {
  if (!node) return null;
  nodeCounter++;
  const prefix = node.type === 'decision' ? 'D' : node.type === 'chance' ? 'C' : 'T';
  return {
    id: prefix + nodeCounter,
    type: node.type,
    label: node.label,
    value: node.value,
    cost: node.cost,
    prob: node.prob,
    children: (node.children || []).map(c => deepCloneWithNewIds(c))
  };
}

function replaceNodeInTree(root, targetId, replacement) {
  if (!root || !root.children) return false;
  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].id === targetId) {
      root.children[i] = replacement;
      return true;
    }
    if (replaceNodeInTree(root.children[i], targetId, replacement)) return true;
  }
  return false;
}

function findParent(node, childId) {
  if (!node || !node.children) return null;
  for (const c of node.children) {
    if (c.id === childId) return node;
    const found = findParent(c, childId);
    if (found) return found;
  }
  return null;
}

function findNode(node, id) {
  if (!node) return null;
  if (node.id === id) return node;
  for (const c of (node.children||[])) { const r = findNode(c, id); if (r) return r; }
  return null;
}

function deleteFromTree(node, id) {
  if (!node.children) return;
  node.children = node.children.filter(c => c.id !== id);
  node.children.forEach(c => deleteFromTree(c, id));
}

// ═══════════════════════════════════════════════
//  ETIQUETAS DE PROBABILIDAD (CONFIGURACIÓN)
// ═══════════════════════════════════════════════
const PROB_LABEL_COLORS = {
  prior:      { fill: 'rgba(79,142,247,.2)',  stroke: '#4f8ef7', text: '#4f8ef7',  name: 'Prior' },
  likelihood: { fill: 'rgba(245,200,66,.15)', stroke: '#f5c842', text: '#f5c842',  name: 'Likelihood' },
  posterior:  { fill: 'rgba(59,162,164,.15)',  stroke: '#3BA2A4', text: '#3BA2A4',  name: 'Posterior' },
  marginal:   { fill: 'rgba(155,127,244,.18)',stroke: '#9b7ff4', text: '#9b7ff4',  name: 'Marginal' },
};

// ═══════════════════════════════════════════════
//  UTILIDAD DE RIESGO (EQUIVALENTE CIERTO - CE)
// ═══════════════════════════════════════════════
let utilityMode = false;  // false = VE normal, true = CE con función exponencial
let R = 100000;           // tolerancia al riesgo (fuente única de verdad)

function getRiskTolerance() {
  return R;
}

function setRiskTolerance(val) {
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  if (isNaN(num) || !isFinite(num) || num <= 0) {
    return {
      success: false,
      value: R,
      error: 'La tolerancia al riesgo R debe ser un valor numérico estrictamente positivo (R > 0).'
    };
  }
  R = num;
  if (typeof window !== 'undefined') {
    window.R = num;
  }
  return { success: true, value: R };
}

// Exponer en objeto window para interoperabilidad modular con el Ribbon y Sidebar
if (typeof window !== 'undefined') {
  window.R = R;
  window.getRiskTolerance = getRiskTolerance;
  window.setRiskTolerance = setRiskTolerance;
  window.validateNodeProbabilities = validateNodeProbabilities;
  window.validateProbabilities = validateProbabilities;
  window.checkProbabilities = validateNodeProbabilities;
  window.checkNodeProbabilities = validateNodeProbabilities;
  window.hasTreeProbabilityErrors = hasTreeProbabilityErrors;
  window.clearOptimalFlags = clearOptimalFlags;
  window.propagateOptimalPath = propagateOptimalPath;
  window.calcEV = calcEV;
  window.calcCE = calcCE;
  window.calculateRollback = calcEV;
  window.solveTree = calcEV;
  window.calculateVEIP = calculateVEIP;
  window.calculateVEIM = calculateVEIM;
}

// U(x) = 1 - e^(-x/R)  →  CE(nodo) = -R * ln(1 - U)
function utility(x) {
  if (isNaN(x)) return 0;
  return 1 - Math.exp(-x / R);
}

function certainEquiv(u) {
  if (u >= 1) {
    // Si u llega a 1 por redondeo flotante, acotar al límite de precisión sin techo arbitrario
    return -R * Math.log(Number.EPSILON);
  }
  return -R * Math.log(1 - u);
}

// Cálculo CE por rollback — paralelo a calcEV con preservación de costos parciales en azar multinivel
function calcCE(node) {
  if (!node) return 0;

  function _evalCE(n) {
    if (!n) return null;
    if (n.type === 'terminal') {
      n._ce = (n.value !== null && n.value !== undefined && !isNaN(n.value)) ? Number(n.value) : 0;
      n._u  = utility(n._ce);
      return n._u;
    }
    if (n.type === 'chance') {
      validateNodeProbabilities(n);
      if (!n.children || n.children.length === 0) {
        n._ce = (n.value !== null && n.value !== undefined && !isNaN(n.value)) ? Number(n.value) : 0;
        n._u  = utility(n._ce);
        return n._u;
      }
      let childError = false;
      for (const c of n.children) {
        const cu = _evalCE(c);
        if (cu === null || isNaN(cu) || c._ce === null || isNaN(c._ce)) {
          childError = true;
        }
      }
      if (n.hasProbabilityError || childError) {
        n._ce = null;
        n._u  = null;
        return null;
      }

      // BUG-02: Propagación neta de costos en ramas de azar para CE
      const netCEValues = n.children.map(c => {
        const branchCost = (c.cost !== undefined && c.cost !== null && !isNaN(c.cost))
          ? Number(c.cost)
          : ((c.type === 'decision' && c.value !== undefined && c.value !== null && !isNaN(c.value)) ? -Number(c.value) : 0);
        return (c._ce || 0) - branchCost;
      });

      const minCE = Math.min(...netCEValues);
      const sumExp = n.children.reduce((s, c, idx) => s + (c.prob || 0) * Math.exp(-(netCEValues[idx] - minCE) / R), 0);
      const childrenCE = (sumExp > 0 && isFinite(sumExp)) ? minCE - R * Math.log(sumExp) : minCE;

      n._ce = childrenCE + (n.value || 0);
      n._u  = utility(n._ce);
      return n._u;
    }
    if (n.type === 'decision') {
      let bestCE = optimizeMode === 'max' ? -Infinity : Infinity;
      let opt = null;
      let childError = false;
      for (const c of n.children) {
        _evalCE(c);
        if (c._ce === null || isNaN(c._ce)) {
          childError = true;
        } else {
          const branchCost = (c.cost !== undefined && c.cost !== null && !isNaN(c.cost))
            ? Number(c.cost)
            : 0;
          const effectiveCE = (c._ce || 0) - branchCost;
          const better = optimizeMode === 'max' ? effectiveCE > bestCE : effectiveCE < bestCE;
          if (better) { bestCE = effectiveCE; opt = c; }
        }
      }
      for (const c of n.children) {
        c._optimal = (c === opt && opt !== null && !childError);
      }
      if (childError || bestCE === -Infinity || bestCE === Infinity) {
        n._ce = null;
        n._u  = null;
        return null;
      }
      const resolvedCE = bestCE;
      n._ce = resolvedCE + (n.value || 0);
      n._u  = utility(n._ce);
      return n._u;
    }
    return 0;
  }

  const res = _evalCE(node);

  const treeRoot = (typeof tree !== 'undefined' && tree) ? tree : node;
  if (hasTreeProbabilityErrors(treeRoot)) {
    clearOptimalFlags(treeRoot);
  } else {
    propagateOptimalPath(node, true);
  }

  return res;
}

// ═══════════════════════════════════════════════
//  ANÁLISIS DE SENSIBILIDAD — ALGORITMO
// ═══════════════════════════════════════════════
function findThreshold(chanceNodeId, branchId, origOptimal) {
  // Bisección: buscar p* donde la decisión óptima cambia
  let lo = 0.0001, hi = 0.9999;

  // Función de evaluación según el modo activo (VE o CE) y criterio de optimización (Max / Min)
  const evAt = (p) => {
    const tc = JSON.parse(JSON.stringify(tree));
    const cn = findNode(tc, chanceNodeId);
    if (!cn) return null;
    const vb = cn.children.find(c => c.id === branchId);
    if (!vb) return null;
    const others = cn.children.filter(c => c.id !== branchId);
    vb.prob = p;
    const rem = 1 - p;
    const os  = others.reduce((s, c) => s + (c.prob || 0), 0);
    if (os > 0) {
      for (const c of others) c.prob = (c.prob / os) * rem;
    } else {
      const share = others.length > 0 ? rem / others.length : 0;
      for (const c of others) c.prob = share;
    }
    calcEV(tc);
    if (utilityMode) calcCE(tc);
    return findOptimalLabel(tc);
  };

  const optLo = evAt(lo);
  const optHi = evAt(hi);
  if (!optLo || !optHi) return null;
  if (optLo === optHi) return null; // No hay cambio en el intervalo [0, 1]

  // Algoritmo de bisección robusto e invariante:
  // Tomamos como referencia el óptimo en el extremo inferior (target = optLo).
  // En cada paso, si optMid coincide con target, el cruce se encuentra a la derecha ([mid, hi]).
  // Si no coincide, el cruce ya ocurrió a la izquierda ([lo, mid]).
  const target = optLo;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const optMid = evAt(mid);
    if (optMid === target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ═══════════════════════════════════════════════
//  CALCULADORA BAYESIANA (LÓGICA MATEMÁTICA)
// ═══════════════════════════════════════════════
let bayesHyps = [
  { label: 'H₁', prior: 0.5 },
  { label: 'H₂', prior: 0.5 },
];
let bayesEvs = [
  { label: 'E₁', likelihoods: [0.8, 0.3] },
];

function bayesAddHyp() {
  const n = bayesHyps.length + 1;
  bayesHyps.push({ label: `H${n}`, prior: 0 });
  bayesEvs.forEach(e => e.likelihoods.push(0.5));
  renderBayesInputs();
}

function bayesRemoveHyp() {
  if (bayesHyps.length <= 2) return;
  bayesHyps.pop();
  bayesEvs.forEach(e => e.likelihoods.pop());
  renderBayesInputs();
}

function bayesAddEv() {
  const n = bayesEvs.length + 1;
  bayesEvs.push({ label: `E${n}`, likelihoods: bayesHyps.map(() => 0.5) });
  renderBayesInputs();
}

function bayesRemoveEv() {
  if (bayesEvs.length <= 1) return;
  bayesEvs.pop();
  renderBayesInputs();
}

function updatePriorSum() {
  const sum = bayesHyps.reduce((s, h) => s + (h.prior || 0), 0);
  const el  = document.getElementById('bayes-prior-sum');
  if (!el) return;
  el.textContent = `Σ = ${sum.toFixed(3)}`;
  el.style.color = Math.abs(sum - 1) < 0.001 ? 'var(--brand)' : 'var(--danger)';
}

function syncBayesLikelihoodHeaders() {
  renderBayesInputs(); // re-render simplificado
}

function runBayes() {
  const warn = document.getElementById('bayes-warn');
  warn.style.display = 'none';

  // 1. Validar probabilidades a priori individuales (DEF-MCQ-05)
  for (let i = 0; i < bayesHyps.length; i++) {
    const p = bayesHyps[i].prior;
    if (isNaN(p) || p < 0 || p > 1) {
      warn.textContent = `⚠ La probabilidad a priori de ${bayesHyps[i].label} (${p}) debe encontrarse estrictamente en el intervalo [0.000, 1.000]`;
      warn.style.display = 'block';
      return;
    }
  }

  // 2. Validar normalización de probabilidades a priori (suma = 1.000)
  const priorSum = bayesHyps.reduce((s, h) => s + (h.prior || 0), 0);
  if (Math.abs(priorSum - 1) > 0.001) {
    warn.textContent = `⚠ Las probabilidades a priori suman ${priorSum.toFixed(3)} — deben sumar 1.000`;
    warn.style.display = 'block';
    return;
  }

  // 3. Validar verosimilitudes individuales (DEF-MCQ-05)
  for (let ei = 0; ei < bayesEvs.length; ei++) {
    const ev = bayesEvs[ei];
    for (let hi = 0; hi < bayesHyps.length; hi++) {
      const lik = ev.likelihoods[hi];
      if (isNaN(lik) || lik < 0 || lik > 1) {
        warn.textContent = `⚠ La verosimilitud P(${ev.label}|${bayesHyps[hi].label}) = ${lik} debe encontrarse estrictamente en el intervalo [0.000, 1.000]`;
        warn.style.display = 'block';
        return;
      }
    }
  }

  // Calcular para cada evidencia
  const results = bayesEvs.map(ev => {
    // Conjuntas: P(Hᵢ ∩ E) = P(E|Hᵢ) · P(Hᵢ)
    const joints = bayesHyps.map((h, i) => (ev.likelihoods[i] || 0) * h.prior);
    // Marginal: P(E) = Σ conjuntas
    const marginal = joints.reduce((s, j) => s + j, 0);
    // Posteriores: P(Hᵢ|E) = conjunta / marginal (0 si marginal <= 0)
    const posteriors = marginal > 0 ? joints.map(j => j / marginal) : joints.map(() => 0);
    const posteriorSum = posteriors.reduce((s, p) => s + p, 0);
    return { ev, joints, marginal, posteriors, posteriorSum };
  });

  // Renderizar tabla
  const container = document.getElementById('bayes-result-container');
  container.innerHTML = '';
  results.forEach(({ ev, joints, marginal, posteriors, posteriorSum }) => {
    const rows = bayesHyps.map((h, i) => `
      <tr>
        <td>${h.label}</td>
        <td>${h.prior.toFixed(4)}</td>
        <td>${(ev.likelihoods[i]||0).toFixed(4)}</td>
        <td>${joints[i].toFixed(4)}</td>
        <td class="posterior">${posteriors[i].toFixed(4)}</td>
      </tr>`).join('');

    // Si la marginal es cero, la posterior es matemáticamente indefinida (DEF-MCQ-10)
    const posteriorTotalDisplay = marginal > 0 ? posteriorSum.toFixed(4) : '0.0000 (Indef.)';

    container.innerHTML += `
      <div style="margin-bottom:12px">
        <div style="font-size:10px;color:var(--brand);font-weight:700;margin-bottom:6px">
          Evidencia: ${ev.label}
        </div>
        <table class="bayes-result-table">
          <thead>
            <tr>
              <th>Hᵢ</th>
              <th>P(Hᵢ)</th>
              <th>P(${ev.label}|Hᵢ)</th>
              <th>P(Hᵢ∩${ev.label})</th>
              <th>P(Hᵢ|${ev.label})</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr>
              <td class="total">Total</td>
              <td class="total">1.0000</td>
              <td>—</td>
              <td class="total">${marginal.toFixed(4)}</td>
              <td class="total">${posteriorTotalDisplay}</td>
            </tr>
          </tbody>
        </table>
        <div style="font-size:10px;color:var(--muted);margin-top:5px">
          P(${ev.label}) = ${marginal.toFixed(4)} &nbsp;·&nbsp; Probabilidad marginal de la evidencia
        </div>
      </div>`;
  });

  document.getElementById('bayes-result-section').style.display = 'block';
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setStatus('Calculadora Bayesiana — tabla calculada');
}


// ═══════════════════════════════════════════════
//  MÓDULO DE CÁLCULO DE VEIP (FEAT-02)
//  Valor Esperado de la Información Perfecta
//  Marco Teórico: Eppen / Hillier / Lieberman
// ═══════════════════════════════════════════════
function calculateVEIP(rootNode, mode) {
  mode = mode || (typeof optimizeMode !== 'undefined' ? optimizeMode : 'max');
  if (!rootNode) {
    return {
      success: false,
      message: 'No hay un árbol de decisión disponible para calcular el VEIP.'
    };
  }

  // Asegurar que el árbol tiene calculados sus valores esperados (Rollback)
  if (typeof calcEV === 'function') {
    calcEV(rootNode);
  }

  // Verificar si hay errores de probabilidad en el árbol
  if (rootNode.hasProbabilityError) {
    return {
      success: false,
      message: 'El árbol contiene errores en las probabilidades de los nodos de azar. Corrija los axiomas antes de calcular el VEIP.'
    };
  }

  // Caso especial: si rootNode es un nodo de azar directo con desenlaces terminales (ej. rama "Sin estudio")
  if (rootNode.type === 'chance' && rootNode.children && rootNode.children.length > 0 && rootNode.children.every(c => c.type === 'terminal' || !c.children || c.children.length === 0)) {
    const isMaxMode = (mode === 'max');
    const vesipVal = (rootNode._ev !== undefined && rootNode._ev !== null) ? Number(rootNode._ev) : Number(rootNode.value || 0);
    let vecipVal = 0;
    const detailTbl = [];

    for (const c of rootNode.children) {
      const prob = (c.prob !== undefined && !isNaN(c.prob)) ? Number(c.prob) : 0;
      const payoff = Number(c.value || 0);
      const bestPayoff = isMaxMode ? Math.max(0, payoff) : Math.min(0, payoff);
      const bestDecision = (bestPayoff === payoff) ? (c.label || c.id) : 'No participar';
      const contrib = prob * bestPayoff;
      vecipVal += contrib;
      detailTbl.push({
        state: c.label || c.id,
        prob: prob,
        bestDecision: bestDecision,
        bestPayoff: bestPayoff,
        contribution: contrib
      });
    }

    const veipVal = Math.abs(vecipVal - vesipVal);
    return {
      success: true,
      mode: mode,
      vesip: vesipVal,
      vecip: vecipVal,
      veip: veipVal,
      alternatives: [rootNode.label || 'Participar', 'No participar'],
      detailTable: detailTbl
    };
  }

  // Identificar la decisión principal
  let decisionNode = null;
  if (rootNode.type === 'decision') {
    decisionNode = rootNode;
  } else if (rootNode.type === 'chance' && rootNode.children) {
    for (const c of rootNode.children) {
      if (c.type === 'decision') {
        decisionNode = c;
        break;
      }
    }
  }

  if (!decisionNode || !decisionNode.children || decisionNode.children.length === 0) {
    return {
      success: false,
      message: 'Estructura no válida: Para calcular el VEIP se requiere un nodo de decisión con alternativas evaluables.'
    };
  }

  // Extraer las alternativas de decisión d_i y sus ramas de azar / terminales
  const alternatives = [];
  const chanceAlternatives = [];

  for (const alt of decisionNode.children) {
    const altLabel = alt.label || alt.id;
    const branchCost = (alt.cost !== undefined && !isNaN(alt.cost)) ? Number(alt.cost) : 0;
    const chanceUpfrontCost = (alt.value !== undefined && !isNaN(alt.value) && Number(alt.value) < 0) ? -Number(alt.value) : 0;
    const chanceUpfrontReward = (alt.value !== undefined && !isNaN(alt.value) && Number(alt.value) > 0) ? Number(alt.value) : 0;
    const totalDeduction = branchCost + chanceUpfrontCost - chanceUpfrontReward;

    const altObj = {
      id: alt.id,
      label: altLabel,
      type: alt.type,
      cost: totalDeduction,
      rawNode: alt,
      states: [],
      deterministicValue: null
    };

    if (alt.type === 'chance' && alt.children && alt.children.length > 0) {
      if (alt.hasProbabilityError) {
        return {
          success: false,
          message: 'El nodo de azar "' + altLabel + '" presenta inconsistencias de probabilidad.'
        };
      }
      for (const st of alt.children) {
        const stateLabel = st.label || st.id;
        const prob = (st.prob !== undefined && !isNaN(st.prob)) ? Number(st.prob) : 0;
        const stateCost = (st.cost !== undefined && !isNaN(st.cost)) ? Number(st.cost) : 0;
        const basePayoff = (st.type === 'terminal' || !st.children || st.children.length === 0)
          ? Number(st.value || 0)
          : Number(st._ev !== undefined ? st._ev : (st.value || 0));

        const netPayoff = basePayoff - stateCost - totalDeduction;

        altObj.states.push({
          id: st.id,
          label: stateLabel,
          prob: prob,
          payoff: netPayoff
        });
      }
      chanceAlternatives.push(altObj);
    } else {
      // Alternativa determinista (terminal directa o sin incertidumbre)
      const basePayoff = Number(alt.value || 0);
      altObj.deterministicValue = basePayoff - totalDeduction;
    }

    alternatives.push(altObj);
  }

  if (chanceAlternatives.length === 0) {
    return {
      success: false,
      message: 'Estructura no válida: Ninguna alternativa de decisión contiene eventos de azar o incertidumbre para contrastar con información perfecta.'
    };
  }

  // Verificar concordancia de estados de la naturaleza entre alternativas de azar
  const baseStates = chanceAlternatives[0].states;
  const numStates = baseStates.length;
  let matchesByLabel = true;
  let matchesByIndex = true;

  for (let i = 1; i < chanceAlternatives.length; i++) {
    const curr = chanceAlternatives[i].states;
    if (curr.length !== numStates) {
      matchesByLabel = false;
      matchesByIndex = false;
      break;
    }
    for (let s = 0; s < numStates; s++) {
      if (curr[s].label.trim().toLowerCase() !== baseStates[s].label.trim().toLowerCase()) {
        matchesByLabel = false;
      }
      if (Math.abs(curr[s].prob - baseStates[s].prob) > 0.05) {
        matchesByIndex = false;
      }
    }
  }

  const isMax = (mode === 'max');
  const vesip = (rootNode._ev !== undefined && rootNode._ev !== null) ? Number(rootNode._ev) : Number(rootNode.value || 0);
  let vecip = 0;
  const detailTable = [];

  if (matchesByLabel || matchesByIndex) {
    for (let s = 0; s < numStates; s++) {
      const sName = matchesByLabel ? baseStates[s].label : ('Estado ' + (s + 1) + ' (' + baseStates[s].label + ')');
      const sProb = baseStates[s].prob;

      let bestDecision = null;
      let bestPayoff = isMax ? -Infinity : Infinity;

      for (const alt of alternatives) {
        let pVal;
        if (alt.deterministicValue !== null) {
          pVal = alt.deterministicValue;
        } else {
          pVal = alt.states[s].payoff;
        }

        if (isMax) {
          if (pVal > bestPayoff) {
            bestPayoff = pVal;
            bestDecision = alt.label;
          }
        } else {
          if (pVal < bestPayoff) {
            bestPayoff = pVal;
            bestDecision = alt.label;
          }
        }
      }

      const contrib = sProb * bestPayoff;
      vecip += contrib;
      detailTable.push({
        state: sName,
        prob: sProb,
        bestDecision: bestDecision,
        bestPayoff: bestPayoff,
        contribution: contrib
      });
    }
  } else {
    // Si los estados tienen etiquetas distintas, consolidar mapa de etiquetas únicas
    const labelMap = new Map();
    for (const ca of chanceAlternatives) {
      for (const st of ca.states) {
        if (!labelMap.has(st.label)) {
          labelMap.set(st.label, { label: st.label, prob: st.prob });
        }
      }
    }
    const distinctStates = Array.from(labelMap.values());
    const sumP = distinctStates.reduce((acc, x) => acc + x.prob, 0);

    if (Math.abs(sumP - 1.0) <= 0.05) {
      for (const dst of distinctStates) {
        let bestDecision = null;
        let bestPayoff = isMax ? -Infinity : Infinity;

        for (const alt of alternatives) {
          let pVal = null;
          if (alt.deterministicValue !== null) {
            pVal = alt.deterministicValue;
          } else {
            const found = alt.states.find(x => x.label.trim().toLowerCase() === dst.label.trim().toLowerCase());
            if (found) pVal = found.payoff;
          }

          if (pVal !== null) {
            if (isMax) {
              if (pVal > bestPayoff) {
                bestPayoff = pVal;
                bestDecision = alt.label;
              }
            } else {
              if (pVal < bestPayoff) {
                bestPayoff = pVal;
                bestDecision = alt.label;
              }
            }
          }
        }

        if (bestDecision === null) {
          bestDecision = '—';
          bestPayoff = 0;
        }

        const contrib = dst.prob * bestPayoff;
        vecip += contrib;
        detailTable.push({
          state: dst.label,
          prob: dst.prob,
          bestDecision: bestDecision,
          bestPayoff: bestPayoff,
          contribution: contrib
        });
      }
    } else {
      return {
        success: false,
        message: 'Para calcular el VEIP, las alternativas de azar deben compartir los mismos estados de la naturaleza (ej: Demanda Alta / Demanda Baja).'
      };
    }
  }

  const veip = Math.abs(vecip - vesip);

  return {
    success: true,
    mode: mode,
    vesip: vesip,
    vecip: vecip,
    veip: veip,
    alternatives: alternatives.map(a => a.label),
    detailTable: detailTable
  };
}


// ═══════════════════════════════════════════════
//  MÓDULO DE CÁLCULO DE VEIM (FEAT-03)
//  Valor Esperado de la Información Muestral (EVSI)
//  Marco Teórico: Eppen / Taha / Hillier
// ═══════════════════════════════════════════════
function calculateVEIM(rootNode, bayesMatrix, options) {
  bayesMatrix = bayesMatrix || null;
  options = options || { objective: 'max' };
  const mode = (options && options.objective) ? options.objective : (typeof optimizeMode !== 'undefined' ? optimizeMode : 'max');
  const isMax = (mode === 'max');

  // CASO A: Cálculo a partir de matriz bayesiana directa
  if (bayesMatrix && (bayesMatrix.veSinIM !== undefined || (bayesMatrix.priors && bayesMatrix.likelihoods && bayesMatrix.payoffs))) {
    // Si viene directamente con VEconIM y VEsinIM (ej. caso sintético o prueba Eppen)
    if (bayesMatrix.veConIM !== undefined && bayesMatrix.veSinIM !== undefined) {
      const veConIM = Number(bayesMatrix.veConIM);
      const veSinIM = Number(bayesMatrix.veSinIM);
      const veim = Math.abs(veConIM - veSinIM);
      const cost = (bayesMatrix.cost !== undefined && !isNaN(bayesMatrix.cost)) ? Number(bayesMatrix.cost) : 0;
      const vnim = veim - cost;
      const veip = (bayesMatrix.veip !== undefined && !isNaN(bayesMatrix.veip)) ? Number(bayesMatrix.veip) : null;
      const efficiency = (veip !== null && veip > 0) ? (veim / veip) * 100 : 0;

      return {
        success: true,
        mode: mode,
        veSinIM: veSinIM,
        veConIM: veConIM,
        veim: veim,
        cost: cost,
        vnim: vnim,
        isProfitable: (vnim > 0),
        veip: veip,
        efficiency: Number(efficiency.toFixed(2)),
        sampleBreakdown: bayesMatrix.sampleBreakdown || []
      };
    }

    const priors = bayesMatrix.priors;
    const likelihoods = bayesMatrix.likelihoods;
    const payoffs = bayesMatrix.payoffs;
    const altLabels = bayesMatrix.alternatives || payoffs.map((_, i) => 'Alternativa ' + (i + 1));
    const outcomeLabels = bayesMatrix.outcomes || likelihoods.map((_, k) => 'Resultado ' + (k + 1));

    // VEsinIM = max_i( sum_j P(theta_j) * R_ij )
    const evSinIMPerAlt = payoffs.map(row => row.reduce((sum, p, j) => sum + (priors[j] || 0) * p, 0));
    const veSinIM = isMax ? Math.max(...evSinIMPerAlt) : Math.min(...evSinIMPerAlt);

    let veConIM = 0;
    const sampleBreakdown = [];

    for (let k = 0; k < likelihoods.length; k++) {
      const zLik = likelihoods[k];
      const joints = priors.map((p, j) => (zLik[j] || 0) * p);
      const marginalProb = joints.reduce((sum, jVal) => sum + jVal, 0);
      const posteriors = marginalProb > 0 ? joints.map(jVal => jVal / marginalProb) : joints.map(() => 0);

      let bestDecision = null;
      let bestExpPayoff = isMax ? -Infinity : Infinity;

      for (let i = 0; i < payoffs.length; i++) {
        const altExp = payoffs[i].reduce((sum, p, j) => sum + posteriors[j] * p, 0);
        if (isMax) {
          if (altExp > bestExpPayoff) {
            bestExpPayoff = altExp;
            bestDecision = altLabels[i];
          }
        } else {
          if (altExp < bestExpPayoff) {
            bestExpPayoff = altExp;
            bestDecision = altLabels[i];
          }
        }
      }

      if (bestDecision === null) {
        bestDecision = '—';
        bestExpPayoff = 0;
      }

      const weightedPayoff = marginalProb * bestExpPayoff;
      veConIM += weightedPayoff;

      sampleBreakdown.push({
        outcome: outcomeLabels[k],
        marginalProb: marginalProb,
        bestDecision: bestDecision,
        expectedPayoff: bestExpPayoff,
        weightedPayoff: weightedPayoff
      });
    }

    const veim = Math.abs(veConIM - veSinIM);
    const studyCost = (bayesMatrix.cost !== undefined && !isNaN(bayesMatrix.cost)) ? Number(bayesMatrix.cost) : 0;
    const vnim = veim - studyCost;

    let veip = (typeof bayesMatrix.veip === 'number') ? bayesMatrix.veip : null;
    if (veip === null) {
      let vecip = 0;
      for (let j = 0; j < priors.length; j++) {
        let bestStatePayoff = isMax ? -Infinity : Infinity;
        for (let i = 0; i < payoffs.length; i++) {
          if (isMax) {
            if (payoffs[i][j] > bestStatePayoff) bestStatePayoff = payoffs[i][j];
          } else {
            if (payoffs[i][j] < bestStatePayoff) bestStatePayoff = payoffs[i][j];
          }
        }
        vecip += priors[j] * bestStatePayoff;
      }
      veip = Math.abs(vecip - veSinIM);
    }

    const efficiency = (veip !== null && veip > 0) ? (veim / veip) * 100 : 0;

    return {
      success: true,
      mode: mode,
      veSinIM: veSinIM,
      veConIM: veConIM,
      veim: veim,
      cost: studyCost,
      vnim: vnim,
      isProfitable: (vnim > 0),
      veip: veip,
      efficiency: Number(efficiency.toFixed(2)),
      sampleBreakdown: sampleBreakdown
    };
  }

  // CASO B: Detección automática en el árbol jerárquico cargado
  if (!rootNode) {
    return {
      success: false,
      message: 'No hay un árbol de decisión disponible para calcular el VEIM.'
    };
  }

  if (typeof calcEV === 'function') {
    calcEV(rootNode);
  }

  if (rootNode.hasProbabilityError) {
    return {
      success: false,
      message: 'El árbol contiene errores en las probabilidades de los nodos de azar.'
    };
  }

  let decisionNode = null;
  if (rootNode.type === 'decision') {
    decisionNode = rootNode;
  } else if (rootNode.type === 'chance' && rootNode.children) {
    for (const c of rootNode.children) {
      if (c.type === 'decision') {
        decisionNode = c;
        break;
      }
    }
  }

  if (!decisionNode || !decisionNode.children || decisionNode.children.length < 2) {
    return {
      success: false,
      message: 'Para calcular el VEIM, el modelo debe contener una decisión inicial con al menos dos alternativas (con estudio / prueba vs sin estudio).'
    };
  }

  // Identificar rama de estudio vs rama sin estudio
  let sampleBranch = null;
  let noSampleBranch = null;

  for (const c of decisionNode.children) {
    const lbl = (c.label || '').toLowerCase();
    const hasSampleKeywords = lbl.includes('con estudio') || lbl.includes('estudio') || lbl.includes('muestra') || lbl.includes('prueba') || lbl.includes('test') || lbl.includes('investigación');
    const hasNoSampleKeywords = lbl.includes('sin estudio') || lbl.includes('sin prueba') || lbl.includes('sin muestra') || lbl.includes('no realizar') || lbl.includes('no test');

    if (hasNoSampleKeywords) {
      noSampleBranch = c;
    } else if (hasSampleKeywords && !sampleBranch) {
      sampleBranch = c;
    }
  }

  if (!sampleBranch || !noSampleBranch) {
    const candidates = decisionNode.children.slice().sort((a, b) => {
      const depthA = (a.children && a.children[0] && a.children[0].children) ? 2 : (a.children ? 1 : 0);
      const depthB = (b.children && b.children[0] && b.children[0].children) ? 2 : (b.children ? 1 : 0);
      return depthB - depthA;
    });

    if (candidates.length >= 2) {
      sampleBranch = candidates[0];
      noSampleBranch = candidates[1];
    }
  }

  if (!sampleBranch || !noSampleBranch) {
    return {
      success: false,
      message: 'No se pudo identificar la bifurcación de muestreo (Con Estudio vs Sin Estudio) en el árbol.'
    };
  }

  // Costo del estudio
  const branchCost = (sampleBranch.cost !== undefined && !isNaN(sampleBranch.cost)) ? Number(sampleBranch.cost) : 0;
  const upfrontCost = (sampleBranch.value !== undefined && !isNaN(sampleBranch.value) && Number(sampleBranch.value) < 0) ? -Number(sampleBranch.value) : 0;
  const studyCost = branchCost + upfrontCost;

  // VEsinIM: Valor del subárbol sin estudio
  const veSinIM = (noSampleBranch._ev !== undefined && noSampleBranch._ev !== null) ? Number(noSampleBranch._ev) : Number(noSampleBranch.value || 0);

  // VEconIM: Valor bruto del subárbol de muestreo (sin deducir el costo del estudio)
  const netSampleEV = (sampleBranch._ev !== undefined && sampleBranch._ev !== null) ? Number(sampleBranch._ev) : Number(sampleBranch.value || 0);
  const veConIM = netSampleEV + studyCost;

  const veim = Math.abs(veConIM - veSinIM);
  const vnim = veim - studyCost;

  // Desglose de resultados de la muestra (z_k)
  const sampleBreakdown = [];
  if (sampleBranch.children && sampleBranch.children.length > 0) {
    for (const zk of sampleBranch.children) {
      const outcomeLabel = zk.label || zk.id;
      const marginalProb = (zk.prob !== undefined && !isNaN(zk.prob)) ? Number(zk.prob) : 0;
      const zkVal = (zk._ev !== undefined && zk._ev !== null) ? Number(zk._ev) : Number(zk.value || 0);

      let bestDecision = '—';
      if (zk.children && zk.children.length > 0) {
        if (zk.type === 'decision') {
          const chosen = zk.children.find(ch => ch._isChosen || ch._optimal);
          bestDecision = chosen ? (chosen.label || chosen.id) : (zk.children[0].label || zk.children[0].id);
        } else {
          bestDecision = zk.children[0].label || zk.children[0].id;
        }
      }

      sampleBreakdown.push({
        outcome: outcomeLabel,
        marginalProb: marginalProb,
        bestDecision: bestDecision,
        expectedPayoff: zkVal,
        weightedPayoff: marginalProb * zkVal
      });
    }
  }

  // Cálculo o inferencia del VEIP
  let veip = null;
  if (typeof calculateVEIP === 'function') {
    const veipRes = calculateVEIP(noSampleBranch, mode);
    if (veipRes && veipRes.success) {
      veip = veipRes.veip;
    } else {
      const rootVeipRes = calculateVEIP(rootNode, mode);
      if (rootVeipRes && rootVeipRes.success) veip = rootVeipRes.veip;
    }
  }

  const efficiency = (veip !== null && veip > 0) ? (veim / veip) * 100 : null;

  return {
    success: true,
    mode: mode,
    sampleBranchLabel: sampleBranch.label,
    noSampleBranchLabel: noSampleBranch.label,
    veSinIM: veSinIM,
    veConIM: veConIM,
    veim: veim,
    cost: studyCost,
    vnim: vnim,
    isProfitable: (vnim > 0),
    veip: veip,
    efficiency: efficiency !== null ? Number(efficiency.toFixed(2)) : null,
    sampleBreakdown: sampleBreakdown
  };
}


// ═══════════════════════════════════════════════
//  EJEMPLOS Y CARGA DE MODELOS PREDEFINIDOS
// ═══════════════════════════════════════════════
function loadExample(type) {
  nodeCounter = 0;
  if (type === 'launch') {
    tree = {
      id:'D1', type:'decision', label:'¿Lanzar?', value:0, prob:null,
      children:[
        { id:'C1', type:'chance', label:'Lanzar', value:-50000, prob:null,
          children:[
            {id:'T1',type:'terminal',label:'Alta demanda', value:200000, prob:0.60, children:[]},
            {id:'T2',type:'terminal',label:'Baja demanda',  value:30000,  prob:0.40, children:[]}
          ]},
        {id:'T3',type:'terminal',label:'No lanzar', value:0, prob:null, children:[]}
      ]
    };
    nodeCounter = 3;
  } else if (type === 'invest') {
    tree = {
      id:'D1',type:'decision',label:'¿Dónde invertir?',value:0,prob:null,
      children:[
        { id:'C1',type:'chance',label:'Bolsa',value:-10000,prob:null,
          children:[
            {id:'T1',type:'terminal',label:'Mercado alza',   value:50000, prob:0.45,children:[]},
            {id:'T2',type:'terminal',label:'Mercado estable',value:12000, prob:0.35,children:[]},
            {id:'T3',type:'terminal',label:'Mercado baja',   value:-5000, prob:0.20,children:[]}
          ]},
        { id:'C2',type:'chance',label:'Bien raíz',value:-10000,prob:null,
          children:[
            {id:'T4',type:'terminal',label:'Valoriza',    value:35000, prob:0.55,children:[]},
            {id:'T5',type:'terminal',label:'Sin cambio',  value:10000, prob:0.45,children:[]}
          ]},
        {id:'T6',type:'terminal',label:'Dep. bancario', value:5000, prob:null, children:[]}
      ]
    };
    nodeCounter = 6;
  } else if (type === 'bayes') {
    // Ejemplo clásico: decisión con información muestral adicional
    // Nodo azar marginal → nodo azar posterior → terminal
    tree = {
      id:'D1', type:'decision', label:'¿Estudio previo?', value:0, prob:null,
      children:[
        {
          id:'C1', type:'chance', label:'Con estudio', value:-5000, prob:null,
          children:[
            {
              id:'C2', type:'chance', label:'Riesgo bajo', value:0, prob:0.40,
              probLabel: 'marginal',
              children:[
                {id:'T1', type:'terminal', label:'Éxito | Bajo',   value:80000, prob:0.70, probLabel:'posterior', children:[]},
                {id:'T2', type:'terminal', label:'Fracaso | Bajo',  value:-10000,prob:0.30, probLabel:'posterior', children:[]}
              ]
            },
            {
              id:'C3', type:'chance', label:'Riesgo medio', value:0, prob:0.35,
              probLabel: 'marginal',
              children:[
                {id:'T3', type:'terminal', label:'Éxito | Medio',  value:50000, prob:0.45, probLabel:'posterior', children:[]},
                {id:'T4', type:'terminal', label:'Fracaso | Medio', value:-10000,prob:0.55, probLabel:'posterior', children:[]}
              ]
            },
            {
              id:'C4', type:'chance', label:'Riesgo alto', value:0, prob:0.25,
              probLabel: 'marginal',
              children:[
                {id:'T5', type:'terminal', label:'Éxito | Alto',   value:20000, prob:0.20, probLabel:'posterior', children:[]},
                {id:'T6', type:'terminal', label:'Fracaso | Alto',  value:-10000,prob:0.80, probLabel:'posterior', children:[]}
              ]
            }
          ]
        },
        {
          id:'C5', type:'chance', label:'Sin estudio', value:0, prob:null,
          children:[
            {id:'T7', type:'terminal', label:'Éxito',   value:40000, prob:0.50, probLabel:'prior', children:[]},
            {id:'T8', type:'terminal', label:'Fracaso',  value:-10000,prob:0.50, probLabel:'prior', children:[]}
          ]
        }
      ]
    };
    nodeCounter = 8;
  }
  selectedNode = null;
  history.length = 0; historyIdx = -1;
  snapshot();
  render();
  setTimeout(fitToScreen, 50);
  refreshSelectedPanel();
  setStatus(`Ejemplo cargado — rueda del ratón para zoom, arrastra para moverse`);
}

function clearTree() {
  snapshot();
  tree = null; selectedNode = null; nodeCounter = 0;
  render();
  refreshSelectedPanel();
  setStatus('Hoja limpia — agrega un nodo raíz para empezar');
}

// ═══════════════════════════════════════════════
//  UTILIDADES FORMATO Y ESTADO
// ═══════════════════════════════════════════════
function setStatus(msg) {
  const el = document.getElementById('status-msg');
  if (el) el.textContent = msg;
}

function fmt(n) {
  if (n == null) return '$0';
  const abs = Math.abs(n);
  return (n < 0 ? '-$' : '$') + abs.toLocaleString('es-BO', {maximumFractionDigits:0});
}

function escXml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
