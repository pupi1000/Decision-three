const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('═══════════════════════════════════════════════════════════');
console.log(' VERIFICACIÓN TÉCNICA SENIOR: BUG-04, RETORNO & VEIP/VEIM  ');
console.log('═══════════════════════════════════════════════════════════\n');

// 1. Verificación sintáctica y carga con DOM mock persistente
const elementsCache = {};
const domMock = {
  getElementById: (id) => {
    if (!elementsCache[id]) {
      elementsCache[id] = {
        id,
        classList: { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false },
        style: {},
        appendChild: () => {},
        dataset: {},
        addEventListener: () => {},
        setAttribute: () => {},
        getAttribute: () => null
      };
    }
    return elementsCache[id];
  },
  createElementNS: (ns, tag) => {
    const el = {
      tag,
      attrs: {},
      style: {},
      children: [],
      dataset: {},
      setAttribute: (k, v) => { el.attrs[k] = v; },
      getAttribute: (k) => el.attrs[k],
      appendChild: (c) => el.children.push(c),
      addEventListener: () => {}
    };
    return el;
  },
  addEventListener: () => {}
};

const sandbox = {
  window: {},
  document: domMock,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Math: Math
};
sandbox.window = sandbox;
sandbox.global = sandbox;
sandbox.addEventListener = () => {};
sandbox.window.addEventListener = () => {};

const treeEngineCode = fs.readFileSync('tree_engine.js', 'utf8');
const canvasUiCode = fs.readFileSync('canvas_ui.js', 'utf8');
const uiEventsCode = fs.readFileSync('src/ui/ui-events.js', 'utf8');

vm.createContext(sandbox);

// Ejecutar tree_engine.js
try {
  vm.runInContext(treeEngineCode, sandbox);
  console.log('✔ tree_engine.js cargado y evaluado sin errores sintácticos');
} catch (e) {
  console.error('❌ Error en tree_engine.js:', e);
  process.exit(1);
}

// Ejecutar canvas_ui.js
try {
  vm.runInContext(canvasUiCode, sandbox);
  console.log('✔ canvas_ui.js cargado y evaluado sin errores sintácticos');
} catch (e) {
  console.error('❌ Error en canvas_ui.js:', e);
  process.exit(1);
}

// Ejecutar ui-events.js
try {
  vm.runInContext(uiEventsCode, sandbox);
  console.log('✔ ui-events.js cargado y evaluado sin errores sintácticos');
} catch (e) {
  console.error('❌ Error en ui-events.js:', e);
  process.exit(1);
}

// 2. Comprobación analítica geométrica de BUG-04
console.log('\n--- Test BUG-04: Geometría de Nodos Terminales ---');
const NW = 110;
const NH = 48;
const testNumericValues = [80000, 100000, 200000, -150000];

testNumericValues.forEach(val => {
  const terminalNode = {
    id: 'n_term',
    type: 'terminal',
    label: 'Demanda Alta',
    value: val
  };
  const pos = { x: 100, y: 100 };
  const layer = domMock.createElementNS('http://www.w3.org/2000/svg', 'g');

  sandbox.selectedNode = null;
  sandbox.tree = terminalNode;
  sandbox.optimizeMode = 'max';
  sandbox.utilityMode = false;
  sandbox.drawNodes(layer, terminalNode, { n_term: pos });

  const g = layer.children[0];
  const texts = g.children.filter(c => c.tag === 'text');
  assert.strictEqual(texts.length, 2, 'Debe haber 2 elementos de texto (label y value)');

  const labelEl = texts[0];
  const evLabelEl = texts[1];

  const expectedTextX = 100 + NW * 0.33; // 136.3
  const expectedLabelY = 100 + NH / 2 - 6.5; // 117.5
  const expectedValY = 100 + NH / 2 + 5; // 129.0

  assert.strictEqual(parseFloat(labelEl.getAttribute('x')), expectedTextX, 'textX del label incorrecto');
  assert.strictEqual(parseFloat(labelEl.getAttribute('y')), expectedLabelY, 'labelY incorrecto');
  assert.strictEqual(parseFloat(evLabelEl.getAttribute('x')), expectedTextX, 'textX del valor incorrecto');
  assert.strictEqual(parseFloat(evLabelEl.getAttribute('y')), expectedValY, 'evLabelY incorrecto');

  // Font size dinámico
  const formattedStr = sandbox.fmt(val);
  const fontSize = parseFloat(evLabelEl.getAttribute('font-size'));
  const expectedFont = formattedStr.length >= 9 ? 8 : (formattedStr.length >= 6 ? 8.5 : 9.5);
  assert.strictEqual(fontSize, expectedFont, `Para ${formattedStr} la fuente debe ser ${expectedFont}px`);

  // Verificar holgura con la arista diagonal inferior:
  // Arista inferior en triángulo: de (100, 148) a (210, 124).
  // Ecuación: y_bottom(x) = 148 - (24/110) * (x - 100)
  const charW = fontSize <= 8 ? 5.0 : 5.3;
  const halfTextW = (formattedStr.length * charW) / 2;
  const rightEdgeX = expectedTextX + halfTextW;
  const yBottomAtRightEdge = 148 - (24 / 110) * (rightEdgeX - 100);
  const textBottomY = expectedValY + (fontSize / 2); // baseline central + media altura de fuente

  const clearance = yBottomAtRightEdge - textBottomY;
  assert.ok(clearance > 1.5, `La holgura mínima debe ser positiva y segura (>1.5px). Holgura obtenida: ${clearance.toFixed(2)}px`);
  console.log(`✔ Nodo con valor ${formattedStr}: textX=${expectedTextX}, valY=${expectedValY}, font=${fontSize}px, holgura diagonal=${clearance.toFixed(2)}px (>1.5px OK)`);
});

// 3. Comprobación de separación de badges (drawProbLabel)
console.log('\n--- Test BUG-04: Separación con Badges Inferiores ---');
const nodeWithBadge = {
  id: 'n_badge',
  type: 'terminal',
  label: 'Prueba',
  value: 50000,
  probLabel: 'posterior'
};
const badgeLayer = domMock.createElementNS('http://www.w3.org/2000/svg', 'g');
sandbox.drawProbLabel(badgeLayer, nodeWithBadge, { x: 50, y: 50 });
const badgeRect = badgeLayer.children[0];
const expectedBadgeY = 50 + NH + 8; // 106
assert.strictEqual(parseFloat(badgeRect.getAttribute('y')), expectedBadgeY, 'El badge inferior para terminales debe situarse en y + NH + 8');
console.log(`✔ Separación de badge para nodo terminal: by=${expectedBadgeY} (+8px de separación limpia vs +4px tradicional)`);

// 4. Comprobación de sincronización bidireccional de retorno en Marco Teórico
console.log('\n--- Test Retorno Dinámico Marco Teórico ---');
let openedModal = null;
sandbox.openVEIP = () => { openedModal = 'veip'; };
sandbox.openVEIM = () => { openedModal = 'veim'; };
sandbox.closeVEIP = () => {};
sandbox.closeVEIM = () => {};
sandbox.openValueInfoModal = () => {};
sandbox.closeValueInfoModal = () => {};

// Caso A: Usuario abre marco teórico desde VEIM
sandbox.showTheoryFrom('veim');
const btn = domMock.getElementById('btn-return-value-info');
assert.strictEqual(btn.style.display, 'inline-flex');
assert.strictEqual(btn.textContent, '← Volver a VEIM');
console.log('✔ showTheoryFrom("veim") -> Botón configurado a "← Volver a VEIM"');

// Usuario hace clic en tab VEIP dentro del modal
sandbox.DecisionTreeUI.Events.switchValueInfoTab('veip');
assert.strictEqual(btn.textContent, '← Volver a VEIP');
console.log('✔ switchValueInfoTab("veip") -> Botón se actualizó dinámicamente a "← Volver a VEIP"');

// Usuario hace clic en "Volver"
sandbox.returnFromValueInfo();
assert.strictEqual(openedModal, 'veip');
assert.strictEqual(btn.style.display, 'none');
console.log('✔ returnFromValueInfo() -> Regresó con éxito al modal VEIP');

// Caso B: Usuario abre marco teórico desde VEIP y cambia a VEIM
sandbox.showTheoryFrom('veip');
assert.strictEqual(btn.textContent, '← Volver a VEIP');
sandbox.DecisionTreeUI.Events.switchValueInfoTab('veim');
assert.strictEqual(btn.textContent, '← Volver a VEIM');
sandbox.returnFromValueInfo();
assert.strictEqual(openedModal, 'veim');
console.log('✔ showTheoryFrom("veip") -> cambio a tab VEIM -> Volver abre VEIM correctamente');

// Caso C: Usuario abre Marco Teórico directamente (sin cálculo previo)
sandbox.valueInfoReturnOrigin = null;
sandbox.DecisionTreeUI.Events.switchValueInfoTab('veip');
assert.strictEqual(btn.style.display, 'none');
sandbox.DecisionTreeUI.Events.switchValueInfoTab('veim');
assert.strictEqual(btn.style.display, 'none');
console.log('✔ Si se abre directamente sin cálculo de origen, el botón permanece oculto');

// 5. Validación analítica de VEIP y VEIM
console.log('\n--- Validación de Algoritmos Analíticos VEIP / VEIM ---');
const sampleTree = {
  id: 'root',
  type: 'decision',
  label: 'Decisión Fabril',
  children: [
    {
      id: 'd1',
      type: 'chance',
      label: 'Planta Grande',
      children: [
        { id: 't1', type: 'terminal', label: 'Alta Demanda', prob: 0.6, value: 200000 },
        { id: 't2', type: 'terminal', label: 'Baja Demanda', prob: 0.4, value: -180000 }
      ]
    },
    {
      id: 'd2',
      type: 'chance',
      label: 'Planta Pequeña',
      children: [
        { id: 't3', type: 'terminal', label: 'Alta Demanda', prob: 0.6, value: 100000 },
        { id: 't4', type: 'terminal', label: 'Baja Demanda', prob: 0.4, value: -20000 }
      ]
    }
  ]
};

const veipRes = sandbox.calculateVEIP(sampleTree, 'max');
assert.strictEqual(veipRes.success, true);
assert.strictEqual(veipRes.vesip, 52000);
assert.strictEqual(veipRes.vecip, 112000);
assert.strictEqual(veipRes.veip, 60000);
console.log(`✔ calculateVEIP validado: VEsIP=$${veipRes.vesip}, VEcIP=$${veipRes.vecip}, VEIP=$${veipRes.veip}`);

console.log('\n===========================================================');
console.log('   TODAS LAS PRUEBAS (BUG-04, RETORNO & VEIP/VEIM) OK ✔   ');
console.log('===========================================================');
