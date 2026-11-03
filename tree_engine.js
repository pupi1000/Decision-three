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
function calcEV(node) {
  if (!node) return 0;
  if (node.type === 'terminal') { node._ev = node.value || 0; return node._ev; }
  if (node.type === 'chance') {
    let ev = node.value || 0;
    for (const c of node.children) ev += (c.prob || 0) * calcEV(c);
    node._ev = ev; return ev;
  }
  if (node.type === 'decision') {
    let best = optimizeMode === 'max' ? -Infinity : Infinity;
    let opt = null;
    for (const c of node.children) {
      const ev = calcEV(c);
      const better = optimizeMode === 'max' ? ev > best : ev < best;
      if (better) { best = ev; opt = c; }
    }
    for (const c of node.children) c._optimal = (c === opt);
    node._ev = (best === Infinity || best === -Infinity) ? 0 : best;
    return node._ev;
  }
  return 0;
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
      <span style="color:#ff5f5f;font-family:'DM Mono',monospace">Σ=${e.sum.toFixed(3)}</span>
    </div>`).join('');
}

function collectProbErrors(node, errors) {
  if (node.type === 'chance' && node.children && node.children.length > 0) {
    const sum = node.children.reduce((s, c) => s + (c.prob || 0), 0);
    if (Math.abs(sum - 1.0) > 0.001) {
      errors.push({ id: node.id, label: node.label.substring(0,16), sum });
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
  if (node.type === 'terminal') {
    node._ce = node.value || 0;
    node._u  = utility(node._ce);
    return node._u;
  }
  if (node.type === 'chance') {
    if (!node.children || node.children.length === 0) {
      node._ce = node.value || 0;
      node._u  = utility(node._ce);
      return node._u;
    }
    // Evaluar recursivamente los subárboles de cada rama
    for (const c of node.children) calcCE(c);

    // Calcular el Equivalente Cierto de las ramas hijas mediante LogSumExp numéricamente estable
    const minCE = Math.min(...node.children.map(c => c._ce || 0));
    const sumExp = node.children.reduce((s, c) => s + (c.prob || 0) * Math.exp(-((c._ce || 0) - minCE) / R), 0);
    const childrenCE = (sumExp > 0 && isFinite(sumExp)) ? minCE - R * Math.log(sumExp) : minCE;

    // Incorporar el valor/costo parcial del nodo (propiedad delta de CARA: CE(X + k) = CE(X) + k)
    node._ce = childrenCE + (node.value || 0);
    node._u  = utility(node._ce);
    return node._u;
  }
  if (node.type === 'decision') {
    let bestCE = optimizeMode === 'max' ? -Infinity : Infinity;
    let opt = null;
    for (const c of node.children) {
      calcCE(c);
      const better = optimizeMode === 'max' ? c._ce > bestCE : c._ce < bestCE;
      if (better) { bestCE = c._ce; opt = c; }
    }
    for (const c of node.children) c._optimal = (c === opt);
    const resolvedCE = bestCE === -Infinity || bestCE === Infinity ? 0 : bestCE;
    node._ce = resolvedCE + (node.value || 0);
    node._u  = utility(node._ce);
    return node._u;
  }
  return 0;
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
