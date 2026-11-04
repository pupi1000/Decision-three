// ═══════════════════════════════════════════════
//  TREE ENGINE — ESTADO Y MODELOS DE DATOS
// ═══════════════════════════════════════════════
let tree = null;
let nodeCounter = 0;
let optimizeMode = 'max'; // 'max' | 'min'
let clipboard = null;

// Layout constants
const NW = 110, NH = 48;
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
