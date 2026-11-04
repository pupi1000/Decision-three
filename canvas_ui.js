// ═══════════════════════════════════════════════
//  CANVAS UI — PRESENTACIÓN Y EVENTOS
// ═══════════════════════════════════════════════

// ── Estado de Interfaz y Selección ──
let selectedNode = null;
try {
  Object.defineProperty(window, 'selectedNode', {
    get: () => selectedNode,
    set: (v) => { selectedNode = v; },
    configurable: true
  });
} catch (e) {}
let modalType = 'decision';

// ── Historia para Deshacer/Rehacer ──
const history = [];
let historyIdx = -1;
const MAX_HISTORY = 50;

function snapshot() {
  const s = JSON.stringify(tree);
  // Truncar rama futura si estamos en medio del historial
  history.splice(historyIdx + 1);
  history.push(s);
  if (history.length > MAX_HISTORY) history.shift();
  historyIdx = history.length - 1;
  updateUndoRedoBtns();
}

function undo() {
  if (historyIdx <= 0) return;
  historyIdx--;
  tree = history[historyIdx] ? JSON.parse(history[historyIdx]) : null;
  selectedNode = null;
  render();
  refreshSelectedPanel();
  updateUndoRedoBtns();
  setStatus('Deshacer ✓');
}

function redo() {
  if (historyIdx >= history.length - 1) return;
  historyIdx++;
  tree = JSON.parse(history[historyIdx]);
  selectedNode = null;
  render();
  refreshSelectedPanel();
  updateUndoRedoBtns();
  setStatus('Rehacer ✓');
}

function updateUndoRedoBtns() {
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');
  if (undoBtn) undoBtn.disabled = historyIdx <= 0;
  if (redoBtn) redoBtn.disabled = historyIdx >= history.length - 1;
}

// ═══════════════════════════════════════════════
//  RENDERIZADO SVG
// ═══════════════════════════════════════════════
let lastPosMap = {};
let contentBounds = { w: 800, h: 400 };

function render() {
  const layer = document.getElementById('tree-layer');
  if (!layer) return;
  layer.innerHTML = '';
  if (!tree) {
    lastPosMap = {};
    updateStats();
    return;
  }
  calcEV(tree);
  if (utilityMode) calcCE(tree);

  const posMap = {};
  const counter = { val: 0 };
  calcLayout(tree, 0, posMap, counter);
  lastPosMap = posMap;

  contentBounds = {
    w: Math.max(...Object.values(posMap).map(p => p.x)) + NW + MARGIN,
    h: Math.max(...Object.values(posMap).map(p => p.y)) + NH + MARGIN + 20
  };

  updateStats();
  drawConnectors(layer, tree, posMap);
  drawNodes(layer, tree, posMap);
  applyViewport();

  // Sincronizar en vivo el panel de sensibilidad si se encuentra abierto al mutar el árbol
  if (document.getElementById('sensitivity-panel')?.classList.contains('open') && sensNodeId) {
    runSensitivity();
  }
}

function updateStats() {
  const isCe = (typeof utilityMode !== 'undefined' && utilityMode);
  const treeHasErr = (typeof hasTreeProbabilityErrors === 'function') && tree && hasTreeProbabilityErrors(tree);
  const statEv = document.getElementById('stat-ev');
  const statEvLabel = document.getElementById('stat-ev-label');
  const statDec = document.getElementById('stat-dec');
  const statNodes = document.getElementById('stat-nodes');
  const statLevels = document.getElementById('stat-levels');
  const statMode = document.getElementById('stat-mode');
  const statCe = document.getElementById('stat-ce');

  if (statEv) {
    const val = (isCe && tree) ? tree._ce : (tree ? tree._ev : null);
    statEv.textContent = (!treeHasErr && val !== null && val !== undefined && !isNaN(val)) ? fmt(val) : '—';
    statEv.className = 'stat-value ' + (isCe ? 'stat-ce-val' : 'gold');
  }
  if (statEvLabel) {
    statEvLabel.textContent = isCe ? 'CE óptimo' : 'VE óptimo';
  }
  if (statDec) {
    const optLabel = (!treeHasErr && tree) ? findOptimalLabel(tree) : '—';
    statDec.textContent = optLabel;
    statDec.title = optLabel;
  }
  if (statNodes)  statNodes.textContent  = tree ? countNodes(tree) : '0';
  if (statLevels) statLevels.textContent = tree ? countDepth(tree) : '0';
  if (statMode) {
    statMode.textContent = optimizeMode === 'max' ? 'Maximizar ↑' : 'Minimizar ↓';
    statMode.style.color = optimizeMode === 'max' ? 'var(--gold)' : '#ff9f4a';
  }
  if (statCe)     statCe.textContent     = (!treeHasErr && isCe && tree && tree._ce !== null && !isNaN(tree._ce)) ? fmt(tree._ce) : '—';
  validateProbabilities();
}

function drawConnectors(layer, node, posMap) {
  if (!node.children || node.children.length === 0) return;
  const p = posMap[node.id];
  if (!p) return;
  const px = p.x + NW, py = p.y + NH / 2;

  for (const child of node.children) {
    const cp = posMap[child.id];
    if (!cp) continue;
    const cx = cp.x, cy = cp.y + NH / 2;
    const treeHasErr = (typeof hasTreeProbabilityErrors === 'function') && tree && hasTreeProbabilityErrors(tree);
    const isOpt = !treeHasErr && (child._optimal === true);
    const color = isOpt ? '#f5c842' : '#3a4258';
    const sw = isOpt ? 2 : 1.2;
    const dash = (!isOpt && node.type === 'decision') ? '5,3' : '';

    // Punto de control al 50% de la distancia real entre nodos
    const dx   = cx - px;
    const midX = px + dx * 0.5;
    const pathD = `M${px},${py} C${midX},${py} ${midX},${cy} ${cx},${cy}`;

    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('d', pathD);
    el.setAttribute('fill', 'none');
    el.setAttribute('stroke', color);
    el.setAttribute('stroke-width', sw);
    if (dash) el.setAttribute('stroke-dasharray', dash);
    el.setAttribute('marker-end', isOpt ? 'url(#arr-opt)' : 'url(#arr-nor)');
    layer.appendChild(el);

    const labelX = (px + cx) / 2;

    if (child.prob !== null && child.prob !== undefined) {
      const probTxt = `p=${(child.prob*100).toFixed(1)}%`;
      const tw = probTxt.length * 6.5 + 8;
      const labelY = cy - 7;
      const probBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      probBg.setAttribute('x', labelX - tw/2); probBg.setAttribute('y', labelY - 12);
      probBg.setAttribute('width', tw); probBg.setAttribute('height', 14); probBg.setAttribute('rx', 3);
      probBg.setAttribute('fill', isOpt ? 'rgba(245,200,66,.15)' : 'rgba(42,48,64,.9)');
      probBg.setAttribute('stroke', isOpt ? '#f5c842' : '#2a3040'); probBg.setAttribute('stroke-width', 0.5);
      layer.appendChild(probBg);
      const probEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      probEl.setAttribute('x', labelX); probEl.setAttribute('y', labelY - 2);
      probEl.setAttribute('text-anchor', 'middle'); probEl.setAttribute('font-family', 'DM Mono, monospace');
      probEl.setAttribute('font-size', '9'); probEl.setAttribute('fill', isOpt ? '#f5c842' : '#7a8299');
      probEl.textContent = probTxt;
      layer.appendChild(probEl);
    }

    if (child.type !== 'terminal' && child.value && child.value !== 0) {
      const valY = cy + 16;
      const valTxt = fmt(child.value);
      const tw2 = valTxt.length * 6.5 + 8;
      const vbg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      vbg.setAttribute('x', labelX - tw2/2); vbg.setAttribute('y', valY - 11);
      vbg.setAttribute('width', tw2); vbg.setAttribute('height', 14); vbg.setAttribute('rx', 3);
      vbg.setAttribute('fill', 'rgba(42,48,64,.9)'); vbg.setAttribute('stroke', '#2a3040'); vbg.setAttribute('stroke-width', 0.5);
      layer.appendChild(vbg);
      const vel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      vel.setAttribute('x', labelX); vel.setAttribute('y', valY);
      vel.setAttribute('text-anchor', 'middle'); vel.setAttribute('font-family', 'DM Mono, monospace');
      vel.setAttribute('font-size', '9'); vel.setAttribute('fill', '#e8916a');
      vel.textContent = valTxt;
      layer.appendChild(vel);
    }
    drawConnectors(layer, child, posMap);
  }
}

function drawNodes(layer, node, posMap) {
  const pos = posMap[node.id];
  if (!pos) return;

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'tree-node');
  g.style.cursor = 'pointer';
  g.dataset.nodeId = node.id;

  const treeHasErr = (typeof hasTreeProbabilityErrors === 'function') && tree && hasTreeProbabilityErrors(tree);
  const isOpt = !treeHasErr && (node._optimal === true);
  const isSel = selectedNode && selectedNode.id === node.id;

  if (node.type === 'decision') {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', pos.x); rect.setAttribute('y', pos.y);
    rect.setAttribute('width', NW); rect.setAttribute('height', NH); rect.setAttribute('rx', 4);
    rect.setAttribute('fill', isSel ? 'rgba(79,142,247,.25)' : 'rgba(79,142,247,.12)');
    rect.setAttribute('stroke', isSel ? '#ffffff' : (isOpt ? '#f5c842' : '#4f8ef7'));
    rect.setAttribute('stroke-width', isSel ? 2.5 : (isOpt ? 2 : 1.5));
    g.appendChild(rect);
  } else if (node.type === 'chance') {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    circle.setAttribute('cx', pos.x + NW/2); circle.setAttribute('cy', pos.y + NH/2);
    circle.setAttribute('rx', NW/2 - 1); circle.setAttribute('ry', NH/2 - 1);
    circle.setAttribute('fill', isSel ? 'rgba(59,162,164,.25)' : 'rgba(59,162,164,.10)');
    circle.setAttribute('stroke', isSel ? '#ffffff' : (isOpt ? '#f5c842' : '#3BA2A4'));
    circle.setAttribute('stroke-width', isSel ? 2.5 : (isOpt ? 2 : 1.5));
    g.appendChild(circle);
  } else {
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', `${pos.x},${pos.y} ${pos.x+NW},${pos.y+NH/2} ${pos.x},${pos.y+NH}`);
    poly.setAttribute('fill', isSel ? 'rgba(155,127,244,.25)' : 'rgba(155,127,244,.10)');
    poly.setAttribute('stroke', isSel ? '#ffffff' : (isOpt ? '#f5c842' : '#9b7ff4'));
    poly.setAttribute('stroke-width', isSel ? 2.5 : (isOpt ? 2 : 1.5));
    g.appendChild(poly);
  }

  const textX = node.type === 'terminal' ? pos.x + NW * 0.38 : pos.x + NW/2;
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('x', textX); label.setAttribute('y', pos.y + NH/2 - 5);
  label.setAttribute('text-anchor', 'middle'); label.setAttribute('dominant-baseline', 'central');
  label.setAttribute('font-family', 'Syne, sans-serif'); label.setAttribute('font-size', '11');
  label.setAttribute('font-weight', '600'); label.setAttribute('fill', '#e8eaf0');
  label.textContent = node.label.length > 14 ? node.label.substring(0,13)+'…' : node.label;
  g.appendChild(label);

  const evLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  evLabel.setAttribute('x', textX); evLabel.setAttribute('y', pos.y + NH/2 + 9);
  evLabel.setAttribute('text-anchor', 'middle'); evLabel.setAttribute('dominant-baseline', 'central');
  evLabel.setAttribute('font-family', 'DM Mono, monospace'); evLabel.setAttribute('font-size', '9.5');
  evLabel.setAttribute('font-weight', '500');
  // En modo CE renderizar directamente CE: $... en púrpura sin duplicar elementos SVG (DEF-MCQ-07)
  if (utilityMode && node._ce !== undefined && node._ce !== null) {
    evLabel.setAttribute('fill', '#c97ef7');
    evLabel.textContent = `CE: ${fmt(node._ce)}`;
  } else {
    evLabel.setAttribute('fill', node.type==='terminal' ? '#9b7ff4' : node.type==='chance' ? '#3BA2A4' : '#4f8ef7');
    if (node.type === 'terminal') {
      evLabel.textContent = fmt(node.value);
    } else {
      evLabel.textContent = (!treeHasErr && node._ev !== null && node._ev !== undefined && !isNaN(node._ev)) ? `VE: ${fmt(node._ev)}` : 'VE: —';
    }
  }
  g.appendChild(evLabel);

  g.addEventListener('mouseenter', (e) => showTooltip(e, node));
  g.addEventListener('mouseleave', hideTooltip);
  g.addEventListener('click', (e) => { e.stopPropagation(); selectNodeById(node.id); });
  g.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); openContextMenu(e, node.id); });
  g.addEventListener('dblclick', (e) => { e.stopPropagation(); selectNodeById(node.id); ctxEditNode(); });

  // ── Badge Σp para nodos de azar ──
  if (node.type === 'chance' && node.children && node.children.length > 0) {
    const probInfo = (typeof validateNodeProbabilities === 'function')
      ? validateNodeProbabilities(node)
      : { valid: Math.abs(node.children.reduce((s, c) => s + (c.prob || 0), 0) - 1.0) <= 0.001, text: `Σ=${node.children.reduce((s, c) => s + (c.prob || 0), 0).toFixed(2)}`, statusClass: 'prob-badge warn' };

    const valid = probInfo.valid;
    const badge = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    badge.setAttribute('class', probInfo.statusClass);

    const badgeTxt = probInfo.text;
    const bw = badgeTxt.length * 6.2 + 10;
    const bx = pos.x + NW - bw / 2;
    const by = pos.y - 16;

    const bgrect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgrect.setAttribute('x', bx); bgrect.setAttribute('y', by);
    bgrect.setAttribute('width', bw); bgrect.setAttribute('height', 13);
    bgrect.setAttribute('rx', 3);
    bgrect.setAttribute('fill', valid ? 'rgba(59,162,164,.15)' : 'rgba(255,95,95,.18)');
    bgrect.setAttribute('stroke', valid ? '#3BA2A4' : '#ff5f5f');
    bgrect.setAttribute('stroke-width', '0.8');
    badge.appendChild(bgrect);

    const btxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    btxt.setAttribute('x', bx + bw / 2); btxt.setAttribute('y', by + 9.5);
    btxt.setAttribute('text-anchor', 'middle');
    btxt.setAttribute('font-family', 'DM Mono, monospace');
    btxt.setAttribute('font-size', '8.5');
    btxt.setAttribute('font-weight', '600');
    btxt.setAttribute('fill', valid ? '#3BA2A4' : '#ff5f5f');
    btxt.textContent = badgeTxt;
    badge.appendChild(btxt);
    layer.appendChild(badge);
  }

  layer.appendChild(g);

  // Etiqueta de tipo de probabilidad (prior/posterior/etc.)
  drawProbLabel(layer, node, pos);

  // Modo utilidad CE integrado directamente en evLabel sin superposición (DEF-MCQ-07)

  for (const child of (node.children || [])) drawNodes(layer, child, posMap);
}

// ── Dibuja la etiqueta de tipo encima del nodo ──
function drawProbLabel(layer, node, pos) {
  if (!node.probLabel || !PROB_LABEL_COLORS[node.probLabel]) return;
  const cfg = PROB_LABEL_COLORS[node.probLabel];
  const txt = cfg.name;
  const tw  = txt.length * 6 + 10;
  const bx  = pos.x + (NW - tw) / 2;
  const by  = pos.y + NH + 4;

  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', bx); bg.setAttribute('y', by);
  bg.setAttribute('width', tw); bg.setAttribute('height', 13);
  bg.setAttribute('rx', 3);
  bg.setAttribute('fill', cfg.fill);
  bg.setAttribute('stroke', cfg.stroke);
  bg.setAttribute('stroke-width', '0.8');
  layer.appendChild(bg);

  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('x', bx + tw / 2); t.setAttribute('y', by + 9.5);
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('font-family', 'DM Mono, monospace');
  t.setAttribute('font-size', '8');
  t.setAttribute('font-weight', '700');
  t.setAttribute('fill', cfg.text);
  t.textContent = txt;
  layer.appendChild(t);
}

// ═══════════════════════════════════════════════
//  CONTEXT MENU (clic derecho)
// ═══════════════════════════════════════════════
function openContextMenu(e, nodeId) {
  selectNodeById(nodeId);
  const menu = document.getElementById('ctx-menu');
  const canvas = document.getElementById('canvas-area').getBoundingClientRect();

  document.getElementById('ctx-node-title').textContent = selectedNode.label;

  // Ocultar la opción del tipo actual
  document.getElementById('ctx-to-dec').className = 'ctx-item' + (selectedNode.type==='decision' ? ' disabled' : '');
  document.getElementById('ctx-to-cha').className = 'ctx-item' + (selectedNode.type==='chance'   ? ' disabled' : '');
  document.getElementById('ctx-to-ter').className = 'ctx-item' + (selectedNode.type==='terminal' ? ' disabled' : '');

  // Paste disponible solo si hay clipboard y el nodo es terminal
  document.getElementById('ctx-paste').className = 'ctx-item' +
    (!clipboard || selectedNode.type !== 'terminal' ? ' disabled' : '');

  let left = e.clientX - canvas.left;
  let top  = e.clientY - canvas.top;
  // Evitar que el menú salga de la pantalla
  if (left + 200 > canvas.width)  left = left - 200;
  if (top  + 280 > canvas.height) top  = top  - 280;

  menu.style.left = left + 'px';
  menu.style.top  = top  + 'px';
  menu.classList.add('open');
}

function closeContextMenu() {
  document.getElementById('ctx-menu').classList.remove('open');
}

function ctxAddBranch() {
  closeContextMenu();
  openAddModal('terminal');
}

function ctxCopySubtree() {
  closeContextMenu();
  if (!selectedNode) return;
  // Copia profunda del subárbol, reasignando IDs para evitar colisiones
  clipboard = deepCloneWithNewIds(selectedNode);
  setStatus(`Subárbol "${selectedNode.label}" copiado al portapapeles (${countNodes(clipboard)} nodos)`);
}

function ctxPasteSubtree() {
  closeContextMenu();
  if (!clipboard || !selectedNode) return;
  if (selectedNode.type !== 'terminal') {
    setStatus('⚠ Solo puedes pegar en un nodo terminal');
    return;
  }
  snapshot();
  // El terminal se convierte en el tipo raíz del subárbol copiado
  const pasted = deepCloneWithNewIds(clipboard);
  // Reemplazar el terminal seleccionado con el subárbol pegado
  replaceNodeInTree(tree, selectedNode.id, pasted);
  selectedNode = null;
  render();
  refreshSelectedPanel();
  setStatus(`Subárbol pegado correctamente (${countNodes(pasted)} nodos)`);
}

function ctxChangeTo(newType) {
  closeContextMenu();
  if (!selectedNode || selectedNode.type === newType) return;
  snapshot();

  const old = selectedNode.type;
  selectedNode.type = newType;

  // Si convertimos a terminal: eliminar hijos
  if (newType === 'terminal') {
    selectedNode.children = [];
    selectedNode.prob = selectedNode.prob || null;
  }
  // Si convertimos desde terminal a decisión/azar: inicializar hijos vacíos
  if (old === 'terminal' && newType !== 'terminal') {
    selectedNode.children = [];
    selectedNode.value = selectedNode.value || 0;
  }
  // Prob: solo relevante si el padre es nodo de azar
  if (newType === 'decision') selectedNode.prob = null;

  render();
  selectNodeById(selectedNode.id);
  setStatus(`Nodo "${selectedNode.label}" convertido a ${newType}`);
}

function ctxEditNode() {
  closeContextMenu();
  if (!selectedNode) return;
  document.getElementById('edit-label').value = selectedNode.label || '';
  document.getElementById('edit-value').value = selectedNode.value || 0;
  document.getElementById('edit-prob').value  = selectedNode.prob  || '';
  document.getElementById('edit-prob-field').style.display =
    (selectedNode.prob !== null && selectedNode.prob !== undefined) ? 'block' : 'none';
  document.getElementById('modal-edit').classList.add('open');
  setTimeout(() => document.getElementById('edit-label').focus(), 100);
}

function ctxDeleteNode() {
  closeContextMenu();
  deleteSelected();
}

function closeEditModal() {
  document.getElementById('modal-edit').classList.remove('open');
}

function confirmEdit() {
  if (!selectedNode) return;
  snapshot();
  selectedNode.label = document.getElementById('edit-label').value.trim() || selectedNode.label;
  selectedNode.value = parseFloat(document.getElementById('edit-value').value) || 0;
  const probVal = parseFloat(document.getElementById('edit-prob').value);
  if (!isNaN(probVal)) selectedNode.prob = probVal;
  closeEditModal();
  render();
  selectNodeById(selectedNode.id);
  setStatus(`Nodo "${selectedNode.label}" actualizado`);
}

function ctxInsertNode() {
  closeContextMenu();
  if (!selectedNode || !tree) return;
  if (selectedNode.id === tree.id) {
    setStatus('⚠ No se puede insertar antes del nodo raíz');
    return;
  }
  document.getElementById('insert-label').value = '';
  document.getElementById('insert-value').value = '0';
  document.getElementById('modal-insert').classList.add('open');
  setTimeout(() => document.getElementById('insert-label').focus(), 100);
}

function closeInsertModal() {
  document.getElementById('modal-insert').classList.remove('open');
}

function confirmInsert() {
  if (!selectedNode || !tree) return;
  const type  = document.getElementById('insert-type').value;
  const label = document.getElementById('insert-label').value.trim() || 'Nuevo nodo';
  const value = parseFloat(document.getElementById('insert-value').value) || 0;

  snapshot();
  nodeCounter++;
  const prefix = type === 'decision' ? 'D' : 'C';
  const newId  = prefix + nodeCounter;

  // El nuevo nodo absorbe el selectedNode como único hijo
  const newNode = {
    id: newId, type, label, value, prob: null,
    children: [selectedNode]
  };

  // Reemplazar selectedNode por newNode en su padre
  const parent = findParent(tree, selectedNode.id);
  if (parent) {
    const idx = parent.children.findIndex(c => c.id === selectedNode.id);
    if (idx !== -1) parent.children[idx] = newNode;
  } else {
    tree = newNode;
  }

  closeInsertModal();
  render();
  selectNodeById(newId);
  setStatus(`Nodo "${label}" insertado entre padre y "${selectedNode.label}"`);
}

function ctxSetProbLabel(label) {
  closeContextMenu();
  if (!selectedNode) return;
  snapshot();
  selectedNode.probLabel = label;
  render();
  selectNodeById(selectedNode.id);
  setStatus(label
    ? `Etiqueta "${PROB_LABEL_COLORS[label].name}" asignada a "${selectedNode.label}"`
    : `Etiqueta removida de "${selectedNode.label}"`);
}

// ═══════════════════════════════════════════════
//  INTERACTIVIDAD — TOOLTIP Y SELECCIÓN
// ═══════════════════════════════════════════════
function showTooltip(e, node) {
  const tt = document.getElementById('tooltip');
  const canvas = document.getElementById('canvas-area').getBoundingClientRect();
  document.getElementById('tt-title').textContent = node.label;
  document.getElementById('tt-type').textContent = {decision:'Decisión',chance:'Azar',terminal:'Terminal'}[node.type];
  document.getElementById('tt-ev').textContent = node.type === 'terminal' ? fmt(node.value) : (node._ev !== null && node._ev !== undefined && !isNaN(node._ev) ? fmt(node._ev) : '—');
  document.getElementById('tt-prob').textContent = node.prob != null ? `${(node.prob*100).toFixed(0)}%` : '—';
  tt.style.left = (e.clientX - canvas.left + 14) + 'px';
  tt.style.top  = (e.clientY - canvas.top  + 14) + 'px';
  tt.classList.add('visible');
}

function hideTooltip() {
  const tt = document.getElementById('tooltip');
  if (tt) tt.classList.remove('visible');
}

function selectNodeById(id) {
  selectedNode = findNode(tree, id);
  if (!selectedNode) return;
  render(); // re-render para mostrar el highlight de selección
  refreshSelectedPanel();
  setStatus(`Nodo seleccionado: ${selectedNode.label} (${selectedNode.id}) — Clic derecho para opciones`);
}

function refreshSelectedPanel() {
  if (window.DecisionTreeUI && window.DecisionTreeUI.Toolbar && typeof window.DecisionTreeUI.Toolbar.syncSelectionState === 'function') {
    window.DecisionTreeUI.Toolbar.syncSelectionState(selectedNode);
  }
  const panel = document.getElementById('selected-info');
  if (!panel) return;
  if (!selectedNode) {
    panel.innerHTML = `
      <div class="selected-empty-state">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="empty-icon">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <p class="empty-text">Selecciona un nodo del árbol para consultar sus características y propiedades.</p>
      </div>
    `;
    return;
  }

  const n = selectedNode;
  const isCe = (typeof utilityMode !== 'undefined' && utilityMode);
  const typeMap = {
    decision: { label: 'Decisión', pillClass: 'type-dec' },
    chance:   { label: 'Azar / Evento', pillClass: 'type-cha' },
    terminal: { label: 'Terminal', pillClass: 'type-ter' }
  };
  const typeInfo = typeMap[n.type] || { label: n.type, pillClass: 'type-dec' };

  let propsHtml = '';
  // ID
  propsHtml += `
    <div class="node-prop-item">
      <span class="node-prop-label">ID:</span>
      <span class="node-prop-val">${n.id}</span>
    </div>
  `;
  // Tipo
  propsHtml += `
    <div class="node-prop-item">
      <span class="node-prop-label">Tipo:</span>
      <span class="node-prop-val">${typeInfo.label}</span>
    </div>
  `;

  // Valor monetario directo (solo terminales o cuando existe valor explícito)
  if (n.type === 'terminal' || (n.value !== undefined && n.value !== 0)) {
    propsHtml += `
      <div class="node-prop-item">
        <span class="node-prop-label">Valor pago:</span>
        <span class="node-prop-val" style="color:#9b7ff4">${fmt(n.value || 0)}</span>
      </div>
    `;
  }

  // Valor Esperado (VE) para nodos de decisión y azar
  if (n.type !== 'terminal' && n._ev !== undefined) {
    propsHtml += `
      <div class="node-prop-item">
        <span class="node-prop-label">VE calculado:</span>
        <span class="node-prop-val" style="color:var(--gold)">${(n._ev !== null && !isNaN(n._ev)) ? fmt(n._ev) : '—'}</span>
      </div>
    `;
  }

  // Equivalente Cierto (CE) si el modo de utilidad está activo
  if (isCe && n._ce !== undefined) {
    propsHtml += `
      <div class="node-prop-item">
        <span class="node-prop-label">Equivalente (CE):</span>
        <span class="node-prop-val" style="color:#c97ef7">${fmt(n._ce)}</span>
      </div>
    `;
  }

  // Probabilidad si aplica
  if (n.prob != null) {
    propsHtml += `
      <div class="node-prop-item">
        <span class="node-prop-label">Probabilidad:</span>
        <span class="node-prop-val" style="color:#3BA2A4">${(n.prob * 100).toFixed(1)}% (${n.prob})</span>
      </div>
    `;
  }

  // Cantidad de hijos / ramas conectadas
  if (n.children && n.children.length > 0) {
    propsHtml += `
      <div class="node-prop-item">
        <span class="node-prop-label">Ramas / Hijos:</span>
        <span class="node-prop-val">${n.children.length}</span>
      </div>
    `;
  }

  // Estado óptimo
  if (n._optimal === true) {
    propsHtml += `
      <div class="node-prop-item">
        <span class="node-prop-label">Estado:</span>
        <span class="node-prop-val" style="color:var(--gold)">★ Rama óptima</span>
      </div>
    `;
  }

  panel.innerHTML = `
    <div class="node-card">
      <div class="node-card-header">
        <div class="node-card-title" title="${n.label}">${n.label}</div>
        <span class="node-type-pill ${typeInfo.pillClass}">${typeInfo.label}</span>
      </div>
      <div class="node-props-grid">
        ${propsHtml}
      </div>
      <div style="font-size:9.5px;color:#7d8c9e;margin-top:2px;line-height:1.4">
        Clic derecho sobre el nodo para opciones completas.
      </div>
      <div class="node-card-actions">
        <button class="sidebar-action-btn" onclick="ctxEditNode()" title="Editar propiedades del nodo">✏️ Editar</button>
        <button class="sidebar-action-btn danger" onclick="deleteSelected()" title="Eliminar nodo seleccionado">🗑️ Eliminar</button>
      </div>
    </div>
  `;
}

function deleteSelected() {
  if (!selectedNode || !tree) return;

  // DEF-MOD-03: Confirmación preventiva antes de eliminar árbol completo o ramas con hijos
  if (selectedNode.id === tree.id) {
    const totalNodes = (typeof countNodes === 'function') ? countNodes(tree) : 0;
    const confirmRoot = window.confirm(
      `¿Desea eliminar el nodo raíz "${selectedNode.label}" (${selectedNode.id}) y todo el árbol de decisión completo? Esta acción eliminará permanentemente ${totalNodes} nodos.`
    );
    if (!confirmRoot) return;

    snapshot();
    tree = null;
    selectedNode = null;
    render();
    refreshSelectedPanel();
    setStatus('Árbol completo eliminado');
    return;
  }

  const numDesc = (selectedNode.children && selectedNode.children.length > 0)
    ? ((typeof countNodes === 'function') ? countNodes(selectedNode) - 1 : selectedNode.children.length)
    : 0;

  if (numDesc > 0) {
    const confirmBranch = window.confirm(
      `¿Desea eliminar el nodo "${selectedNode.label}" (${selectedNode.id}) y sus ${numDesc} ramas descendientes?`
    );
    if (!confirmBranch) return;
  }

  snapshot();
  deleteFromTree(tree, selectedNode.id);
  selectedNode = null;
  render();
  refreshSelectedPanel();
  setStatus('Rama eliminada');
  return;
}

// ═══════════════════════════════════════════════
//  MODAL AGREGAR NODO Y CONTROL DE ENVÍO (DEF-MOD-05)
// ═══════════════════════════════════════════════
let isConfirmingAdd = false;

function resetAddModalState() {
  isConfirmingAdd = false;
  const btnConfirm = document.querySelector('#modal .modal-btn.confirm');
  if (btnConfirm) {
    btnConfirm.disabled = false;
    btnConfirm.textContent = 'Agregar';
  }
}

function openAddModal(type) {
  // DEF-MOD-02: Impedir que un nodo terminal actúe como padre de nuevos nodos
  if (tree && selectedNode && selectedNode.type === 'terminal') {
    setStatus('⚠ Los nodos terminales representan resultados finales y no pueden tener ramas hijas. Selecciona un nodo de decisión o azar.');
    return;
  }

  resetAddModalState();
  modalType = type || 'decision';
  selectType(modalType);
  document.getElementById('inp-label').value  = '';
  document.getElementById('inp-value').value  = '';
  document.getElementById('inp-prob').value   = '';
  document.getElementById('inp-parent').value = selectedNode ? selectedNode.id : (tree ? tree.id : '');
  document.getElementById('parent-field').style.display = tree ? 'block' : 'none';
  selectBranches(2);
  document.getElementById('modal').classList.add('open');
  setTimeout(() => document.getElementById('inp-label').focus(), 100);
}

function selectType(type) {
  modalType = type;
  ['decision','chance','terminal'].forEach(t => {
    const btn = document.getElementById('t-'+t.substring(0,3));
    if (!btn) return;
    btn.className = 'type-opt';
    if (t === type) btn.classList.add('selected-'+t.substring(0,3));
  });
  const probField = document.getElementById('prob-field');
  if (probField) {
    probField.style.display = (type === 'terminal' || type === 'chance') ? 'block' : 'none';
  }
  const branchesField = document.getElementById('branches-field');
  if (branchesField) {
    branchesField.style.display = (type === 'terminal') ? 'none' : 'block';
  }
  updateBranchesHint();
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

function selectBranches(n) {
  const inp = document.getElementById('inp-branches');
  if (inp) inp.value = n;
  document.querySelectorAll('.branch-opt').forEach(btn => {
    btn.classList.toggle('selected', parseInt(btn.dataset.n) === n);
  });
  updateBranchesHint();
}

function onBranchesInput(val) {
  const n = Math.max(2, Math.min(10, parseInt(val) || 2));
  document.querySelectorAll('.branch-opt').forEach(btn => {
    btn.classList.toggle('selected', parseInt(btn.dataset.n) === n);
  });
  updateBranchesHint();
}

function updateBranchesHint() {
  const n = Math.max(2, Math.min(10, parseInt(document.getElementById('inp-branches')?.value) || 2));
  const hint = document.getElementById('branches-hint');
  if (!hint) return;
  const pEach = (1 / n * 100).toFixed(1);
  if (modalType === 'chance') {
    hint.textContent = `Principio de Laplace — ${n} eventos equiprobables: p = ${pEach}% cada uno`;
    hint.style.color = 'var(--accent)';
  } else {
    hint.textContent = `Se crearán ${n} alternativas terminales`;
    hint.style.color = 'var(--muted)';
  }
}

function confirmAdd() {
  // DEF-MOD-05: Protección contra múltiples envíos (debouncing lógico y visual)
  if (isConfirmingAdd) return;

  const btnConfirm = document.querySelector('#modal .modal-btn.confirm');
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.textContent = 'Agregando...';
  }
  isConfirmingAdd = true;

  try {
    const parent = document.getElementById('inp-parent').value.trim();

    // DEF-MOD-02: Validación reforzada al confirmar
    if (tree) {
      const parentNode = findNode(tree, parent);
      if (parentNode && parentNode.type === 'terminal') {
        setStatus('⚠ No se puede insertar: los nodos terminales no pueden tener ramas hijas');
        resetAddModalState();
        return;
      }
    }

    snapshot();
    const label   = document.getElementById('inp-label').value.trim() || 'Nuevo nodo';
    const value   = parseFloat(document.getElementById('inp-value').value) || 0;
    const prob    = parseFloat(document.getElementById('inp-prob').value);
    const nBranches = (modalType !== 'terminal')
      ? Math.max(2, Math.min(10, parseInt(document.getElementById('inp-branches').value) || 2))
      : 0;

    nodeCounter++;
    const prefix  = modalType === 'decision' ? 'D' : modalType === 'chance' ? 'C' : 'T';
    const id      = prefix + nodeCounter;

    // Crear el nodo principal
    const newNode = {
      id, type: modalType, label, value,
      prob: isNaN(prob) ? null : prob,
      children: []
    };

    // Crear ramas hijas automáticamente para decisión y azar
    if (modalType !== 'terminal' && nBranches >= 2) {
      const pEach = parseFloat((1 / nBranches).toFixed(4));
      const pLast = parseFloat((1 - pEach * (nBranches - 1)).toFixed(4));
      for (let i = 0; i < nBranches; i++) {
        nodeCounter++;
        const isLast  = i === nBranches - 1;
        const branchP = modalType === 'chance'
          ? (isLast ? pLast : pEach)
          : null;
        const branchLabel = modalType === 'chance'
          ? `E${i + 1} (p=${(branchP * 100).toFixed(1)}%)`
          : `Alternativa ${i + 1}`;
        const branchNode = {
          id: 'T' + nodeCounter,
          type: 'terminal',
          label: branchLabel,
          value: 0,
          prob: branchP,
          children: []
        };
        newNode.children.push(branchNode);
      }
    }

    // Insertar en el árbol
    if (!tree) {
      tree = newNode;
    } else {
      const parentNode = findNode(tree, parent);
      if (parentNode) parentNode.children.push(newNode);
      else tree.children.push(newNode);
    }

    closeModal();
    render();
    selectNodeById(id);
    const msg = nBranches > 0
      ? `Nodo "${label}" agregado con ${nBranches} ramas — edita las etiquetas con doble clic`
      : `Nodo "${label}" agregado`;
    setStatus(msg);
  } catch (err) {
    console.error('Error al agregar nodo:', err);
    resetAddModalState();
  }
}

// ═══════════════════════════════════════════════
//  CONTROLES HEADER Y SERIALIZACIÓN
// ═══════════════════════════════════════════════
function toggleMinMax() {
  optimizeMode = optimizeMode === 'max' ? 'min' : 'max';
  const btn = document.getElementById('btn-minmax');
  if (optimizeMode === 'min') {
    btn.textContent = '↓ Minimizar';
    btn.classList.add('minimizing');
    setStatus('Modo Minimizar activado — se selecciona la rama de menor valor esperado');
  } else {
    btn.textContent = '↑ Maximizar';
    btn.classList.remove('minimizing');
    setStatus('Modo Maximizar activado — se selecciona la rama de mayor valor esperado');
  }
  if (tree) render();
}

function saveJSON() {
  if (!tree) { setStatus('⚠ No hay árbol para guardar'); return; }
  const data = {
    version: '4.0.0',
    savedAt: new Date().toISOString(),
    optimizeMode,
    nodeCounter,
    tree: JSON.parse(JSON.stringify(tree, (k, v) => k.startsWith('_') ? undefined : v))
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const name = (tree.label || 'arbol').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  a.download = `DTP_${name}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  setStatus(`✓ Árbol guardado como JSON — ${countNodes(tree)} nodos`);
}

function loadJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.tree) {
        tree = data.tree;
        nodeCounter = data.nodeCounter || 99;
        if (data.optimizeMode) {
          optimizeMode = data.optimizeMode;
          const btn = document.getElementById('btn-minmax');
          btn.textContent = optimizeMode === 'min' ? '↓ Minimizar' : '↑ Maximizar';
          optimizeMode === 'min' ? btn.classList.add('minimizing') : btn.classList.remove('minimizing');
        }
      } else if (data.id && data.type) {
        tree = data;
        nodeCounter = 99;
      } else {
        throw new Error('Formato no reconocido');
      }
      selectedNode = null;
      history.length = 0; historyIdx = -1;
      snapshot();
      render();
      setTimeout(fitToScreen, 50);
      refreshSelectedPanel();
      setStatus(`✓ Árbol cargado desde "${file.name}" — ${countNodes(tree)} nodos`);
    } catch(err) {
      setStatus(`⚠ Error al cargar: ${err.message}`);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function toggleUtilityMode() {
  utilityMode = !utilityMode;
  if (typeof window !== 'undefined') window.utilityMode = utilityMode;

  const badge = document.getElementById('utility-badge');
  const ustatus = document.getElementById('utility-status');
  if (utilityMode) {
    if (badge) badge.style.display = 'inline';
    if (ustatus) {
      ustatus.textContent = 'Modo CE activo — usando U(x) = 1−e^(−x/R)';
      ustatus.style.color = '#c97ef7';
    }
    setStatus('Modo Equivalente Cierto activado — los nodos muestran CE en lugar de VE');
  } else {
    if (badge) badge.style.display = 'none';
    if (ustatus) {
      ustatus.textContent = 'Modo VE activo';
      ustatus.style.color = 'var(--muted)';
    }
    setStatus('Modo Valor Esperado restaurado');
  }

  // Sincronizar Ribbon de forma no destructiva preservando el icono SVG y clases (DEF-MCQ-09)
  if (typeof DecisionTreeUI !== 'undefined' && DecisionTreeUI.Toolbar && typeof DecisionTreeUI.Toolbar.syncUtilityMode === 'function') {
    const curR = (typeof getRiskTolerance === 'function') ? getRiskTolerance() : R;
    DecisionTreeUI.Toolbar.syncUtilityMode(utilityMode, curR);
  }

  if (tree) render();
}

function onRChange() {
  const inp = document.getElementById('inp-R');
  const val = inp ? parseFloat(inp.value) : NaN;
  const setter = (typeof setRiskTolerance === 'function') 
    ? setRiskTolerance 
    : (typeof window !== 'undefined' && window.setRiskTolerance ? window.setRiskTolerance : null);

  if (setter) {
    const res = setter(val);
    if (res.success) {
      // Sincronizar Ribbon (DEF-MCQ-08)
      if (typeof DecisionTreeUI !== 'undefined' && DecisionTreeUI.Toolbar && typeof DecisionTreeUI.Toolbar.syncUtilityMode === 'function') {
        DecisionTreeUI.Toolbar.syncUtilityMode(utilityMode, res.value);
      }
      if (utilityMode && tree) render();
    } else {
      setStatus('⚠ ' + (res.error || 'La tolerancia al riesgo R debe ser estrictamente positiva (R > 0).'));
      const getter = (typeof getRiskTolerance === 'function') ? getRiskTolerance : (() => R);
      if (inp) inp.value = getter();
    }
  } else {
    if (!isNaN(val) && val > 0) {
      R = val;
      if (typeof window !== 'undefined') window.R = val;
      if (typeof DecisionTreeUI !== 'undefined' && DecisionTreeUI.Toolbar && typeof DecisionTreeUI.Toolbar.syncUtilityMode === 'function') {
        DecisionTreeUI.Toolbar.syncUtilityMode(utilityMode, val);
      }
      if (utilityMode && tree) render();
    } else {
      setStatus('⚠ La tolerancia al riesgo R debe ser estrictamente positiva (R > 0).');
      if (inp) inp.value = R;
    }
  }
}

// ═══════════════════════════════════════════════
//  ANÁLISIS DE SENSIBILIDAD (INTERFAZ)
// ═══════════════════════════════════════════════
let sensNodeId   = null;
let sensBranchId = null;

function openSensitivity() {
  if (!tree) { setStatus('⚠ Carga un árbol primero'); return; }
  const panel = document.getElementById('sensitivity-panel');
  panel.classList.add('open');
  populateSensNodes();
}

function closeSensitivity() {
  document.getElementById('sensitivity-panel').classList.remove('open');
}

function populateSensNodes() {
  const sel = document.getElementById('sens-node-select');
  sel.innerHTML = '<option value="">— Selecciona un nodo —</option>';
  collectChanceNodes(tree, sel);
  if (selectedNode && selectedNode.type === 'chance') {
    sel.value = selectedNode.id;
    onSensNodeChange();
  }
}

function collectChanceNodes(node, sel) {
  if (!node) return;
  if (node.type === 'chance' && node.children && node.children.length >= 2) {
    const opt = document.createElement('option');
    opt.value = node.id;
    opt.textContent = `${node.id} — ${node.label}`;
    sel.appendChild(opt);
  }
  for (const c of (node.children || [])) collectChanceNodes(c, sel);
}

function onSensNodeChange() {
  sensNodeId = document.getElementById('sens-node-select').value;
  if (!sensNodeId) {
    document.getElementById('sens-result').innerHTML = '<div style="color:var(--muted);font-size:10px">Selecciona un nodo de azar para comenzar</div>';
    return;
  }

  const node = findNode(tree, sensNodeId);
  if (!node) return;

  const branchSel = document.getElementById('sens-branch-select');
  branchSel.innerHTML = '';
  for (const c of node.children) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.label} (p=${c.prob != null ? (c.prob*100).toFixed(0)+'%' : '?'})`;
    branchSel.appendChild(opt);
  }
  sensBranchId = node.children[0].id;

  const p0 = node.children[0].prob || 0.5;
  document.getElementById('sens-slider').value = Math.round(p0 * 100);
  document.getElementById('sens-p-display').textContent = p0.toFixed(2);
  runSensitivity();
}

function onSensSlider(val) {
  document.getElementById('sens-p-display').textContent = (val / 100).toFixed(2);
  sensBranchId = document.getElementById('sens-branch-select').value;
  runSensitivity();
}

function runSensitivity() {
  if (!sensNodeId) return;
  sensBranchId = document.getElementById('sens-branch-select').value;
  const p = parseInt(document.getElementById('sens-slider').value) / 100;
  document.getElementById('sens-p-display').textContent = p.toFixed(2);

  const treeClone = JSON.parse(JSON.stringify(tree));
  const chanceNode = findNode(treeClone, sensNodeId);
  if (!chanceNode) return;

  const varBranch   = chanceNode.children.find(c => c.id === sensBranchId);
  const otherBranches = chanceNode.children.filter(c => c.id !== sensBranchId);
  if (!varBranch) return;

  varBranch.prob = p;

  const remaining = 1 - p;
  const otherSum  = otherBranches.reduce((s, c) => s + (c.prob || 0), 0);
  if (otherSum > 0) {
    for (const c of otherBranches) c.prob = (c.prob / otherSum) * remaining;
  } else {
    const share = remaining / otherBranches.length;
    for (const c of otherBranches) c.prob = share;
  }

  calcEV(treeClone);
  if (utilityMode) calcCE(treeClone);

  const valLabel = utilityMode ? 'CE' : 'VE';
  const newEV      = utilityMode ? treeClone._ce : treeClone._ev;
  const origEV     = utilityMode ? tree._ce : tree._ev;
  const newOptimal = findOptimalLabel(treeClone);
  const origOptimal = findOptimalLabel(tree);
  const decisionChanged = newOptimal !== origOptimal;

  const threshold = findThreshold(sensNodeId, sensBranchId, origOptimal);

  const resultDiv = document.getElementById('sens-result');
  resultDiv.innerHTML = `
    <div class="sens-result-row"><span class="sens-result-label">${valLabel} original</span><span class="sens-result-val">${fmt(origEV)}</span></div>
    <div class="sens-result-row"><span class="sens-result-label">${valLabel} con p=${p.toFixed(2)}</span><span class="sens-result-val ${decisionChanged ? 'changed' : ''}">${fmt(newEV)}</span></div>
    <div class="sens-result-row"><span class="sens-result-label">Decisión actual</span><span class="sens-result-val">${origOptimal}</span></div>
    <div class="sens-result-row"><span class="sens-result-label">Decisión con p=${p.toFixed(2)}</span><span class="sens-result-val ${decisionChanged ? 'changed' : ''}">${newOptimal}</span></div>
    <div class="sens-threshold">
      ${threshold !== null
        ? `La decisión óptima cambia cuando p ≈ <strong>${(threshold*100).toFixed(1)}%</strong>`
        : `La decisión no cambia en ningún valor de p (0%–100%)`}
    </div>`;
}

// ═══════════════════════════════════════════════
//  MODO PRESENTACIÓN
// ═══════════════════════════════════════════════
let presentationMode = false;

/**
 * Alterna el estado colapsado / expandido de la barra lateral (FEAT-04 / UI REFINEMENT)
 */
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  const isCollapsed = sidebar.classList.contains('collapsed');

  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    toggleBtn.title = isCollapsed ? 'Expandir panel lateral (Alt+B)' : 'Contraer panel lateral (Alt+B)';
    toggleBtn.setAttribute('aria-label', isCollapsed ? 'Expandir panel lateral' : 'Contraer panel lateral');
  }

  // Sincronización bidireccional con el botón en Ribbon Vista
  if (typeof DecisionTreeUI !== 'undefined' && DecisionTreeUI.Toolbar && typeof DecisionTreeUI.Toolbar.syncSidebar === 'function') {
    DecisionTreeUI.Toolbar.syncSidebar(isCollapsed);
  } else {
    const btn = document.querySelector('button[data-action="toggle-sidebar"]');
    if (btn) {
      btn.classList.toggle('active', isCollapsed);
      btn.setAttribute('aria-pressed', isCollapsed ? 'true' : 'false');
    }
  }

  if (typeof setStatus === 'function') {
    setStatus(isCollapsed ? 'Barra lateral contraída — área de trabajo maximizada' : 'Barra lateral expandida');
  }

  // Ajuste suave del canvas al ancho liberado
  setTimeout(() => {
    if (typeof fitToScreen === 'function') fitToScreen();
  }, 120);
}
if (typeof window !== 'undefined') window.toggleSidebar = toggleSidebar;

/**
 * Alterna el estado colapsado / expandido de la barra Ribbon superior (FEAT-04 / UI REFINEMENT)
 */
function toggleRibbon() {
  if (typeof DecisionTreeUI !== 'undefined' && DecisionTreeUI.Ribbon && typeof DecisionTreeUI.Ribbon.toggle === 'function') {
    DecisionTreeUI.Ribbon.toggle();
    return;
  }
  const ribbonBar = document.getElementById('ribbon-bar');
  if (!ribbonBar) return;
  ribbonBar.classList.toggle('collapsed');
  const isCollapsed = ribbonBar.classList.contains('collapsed');

  const toggleBtn = document.getElementById('ribbon-toggle-btn');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    toggleBtn.title = isCollapsed ? 'Expandir barra de herramientas (Ctrl+F1)' : 'Contraer barra de herramientas (Ctrl+F1)';
    toggleBtn.setAttribute('aria-label', isCollapsed ? 'Expandir barra de herramientas' : 'Contraer barra de herramientas');
    toggleBtn.classList.toggle('active', isCollapsed);
  }

  try {
    localStorage.setItem('dtp_ribbon_collapsed', isCollapsed ? 'true' : 'false');
  } catch (e) {}

  if (typeof setStatus === 'function') {
    setStatus(isCollapsed ? 'Barra Ribbon contraída — área de trabajo maximizada' : 'Barra Ribbon expandida');
  }

  requestAnimationFrame(() => {
    setTimeout(() => {
      if (typeof fitToScreen === 'function') fitToScreen();
    }, 120);
  });
}
if (typeof window !== 'undefined') window.toggleRibbon = toggleRibbon;

function togglePresentation() {
  presentationMode = !presentationMode;
  document.body.classList.toggle('presentation-mode', presentationMode);
  
  const btn = document.getElementById('btn-present');
  if (btn) {
    btn.classList.toggle('active', presentationMode);
    btn.setAttribute('aria-pressed', presentationMode ? 'true' : 'false');
  }

  if (typeof window !== 'undefined' && window.DecisionTreeUI?.Toolbar?.syncPresentation) {
    window.DecisionTreeUI.Toolbar.syncPresentation(presentationMode);
  }

  // Sincronización robusta: esperar a que el navegador complete el reflow del layout
  requestAnimationFrame(() => {
    setTimeout(() => {
      fitToScreen();
    }, 80);
  });

  if (presentationMode) {
    setStatus('Modo presentación — Esc para salir');
  } else {
    setStatus('Modo presentación desactivado');
  }
}

// ═══════════════════════════════════════════════
//  EXPORTACIÓN (PNG Y SVG)
// ═══════════════════════════════════════════════
/**
 * Genera el nombre estandarizado y dinámico para exportaciones (DEF-EXP-02)
 * Formato: DTP_{nombre_arbol}_{YYYY-MM-DD}{ext}
 */
function getExportFilename(baseTree, ext) {
  const rawLabel = (baseTree && baseTree.label ? String(baseTree.label) : 'arbol').trim();
  const normalized = typeof rawLabel.normalize === 'function'
    ? rawLabel.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : rawLabel;
  const clean = normalized.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase() || 'arbol';
  const dateStr = new Date().toISOString().slice(0, 10);
  return `DTP_${clean}_${dateStr}${ext}`;
}
if (typeof window !== 'undefined') window.getExportFilename = getExportFilename;

function exportPNG() {
  if (!tree || !lastPosMap) { setStatus('⚠ No hay árbol para exportar'); return; }

  const pad    = 48;
  const W      = Math.ceil(contentBounds.w + pad * 2);
  const H      = Math.ceil(contentBounds.h + pad * 2);
  const SCALE  = 2; // resolución 2x para pantallas retina

  const lines = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  lines.push(`<defs>
    <marker id="ex-arr-opt" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M1 1L9 5L1 9" fill="none" stroke="#f5c842" stroke-width="1.5"/>
    </marker>
    <marker id="ex-arr-nor" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M1 1L9 5L1 9" fill="none" stroke="#3a4258" stroke-width="1.5"/>
    </marker>
  </defs>`);

  const EX = {
    bg:'#0d1118', surface:'#1c2232', border:'#263040', text:'#e8eaf0',
    muted:'#7a8899', gold:'#f5c842', dec:'#4f8ef7', cha:'#3BA2A4',
    ter:'#9b7ff4', ce:'#c97ef7', conn:'#3a4258', connOpt:'#f5c842', val:'#e8916a',
  };

  lines.push(`<rect width="${W}" height="${H}" fill="${EX.bg}"/>`);
  lines.push(`<text x="${W-12}" y="${H-10}" text-anchor="end" font-size="9" font-weight="600" fill="${EX.muted}" opacity="0.6" font-family="Arial,sans-serif" letter-spacing="0.08em">AIGENOTECH · DecisionTree Pro</text>`);
  lines.push(`<g transform="translate(${pad},${pad})">`);
  calcEV(tree);
  if (typeof utilityMode !== 'undefined' && utilityMode && typeof calcCE === 'function') {
    calcCE(tree);
  }
  renderConnectorsEx(lines, tree, EX);
  renderNodesEx(lines, tree, EX);
  lines.push(`</g></svg>`);

  const svgStr  = lines.join('\n');
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const url     = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    try {
      const canvas  = document.createElement('canvas');
      canvas.width  = W * SCALE;
      canvas.height = H * SCALE;
      const ctx = canvas.getContext('2d');
      ctx.scale(SCALE, SCALE);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        if (!blob) {
          setStatus('⚠ Error al generar imagen PNG');
          return;
        }
        const a = document.createElement('a');
        const dlUrl = URL.createObjectURL(blob);
        a.href = dlUrl;
        a.download = getExportFilename(tree, '@2x.png');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => {
          try { URL.revokeObjectURL(dlUrl); } catch(e) {}
        }, 1000);
        setStatus('✓ PNG exportado en resolución 2x');
      }, 'image/png');
    } catch(err) {
      try { URL.revokeObjectURL(url); } catch(e) {}
      setStatus('⚠ Error al renderizar PNG');
    }
  };
  img.onerror = () => {
    try { URL.revokeObjectURL(url); } catch(e) {}
    setStatus('⚠ Error al generar PNG — intenta con SVG');
  };
  img.src = url;
}

function exportSVG() {
  if (!tree || !lastPosMap) { setStatus('⚠ No hay árbol para exportar'); return; }

  const pad = 48;
  const W = contentBounds.w + pad * 2;
  const H = contentBounds.h + pad * 2;

  const EX = {
    bg:      '#0f1117',
    surface: '#1e2330',
    border:  '#2a3040',
    text:    '#e8eaf0',
    muted:   '#7a8299',
    gold:    '#f5c842',
    dec:     '#4f8ef7',
    cha:     '#3BA2A4',
    ter:     '#9b7ff4',
    ce:      '#c97ef7',
    danger:  '#ff5f5f',
    conn:    '#3a4258',
    connOpt: '#f5c842',
    val:     '#e8916a',
  };

  calcEV(tree);
  if (typeof utilityMode !== 'undefined' && utilityMode && typeof calcCE === 'function') {
    calcCE(tree);
  }

  const lines = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  lines.push(`<defs>`);
  lines.push(`  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&amp;family=Syne:wght@600;700&amp;display=swap');
    text { font-family: 'Syne', Arial, sans-serif; }
    .mono { font-family: 'DM Mono', 'Courier New', monospace; }
  </style>`);
  lines.push(`  <marker id="ex-arr-opt" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
    <path d="M1 1L9 5L1 9" fill="none" stroke="${EX.connOpt}" stroke-width="1.5"/>
  </marker>`);
  lines.push(`  <marker id="ex-arr-nor" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
    <path d="M1 1L9 5L1 9" fill="none" stroke="${EX.conn}" stroke-width="1.5"/>
  </marker>`);
  lines.push(`</defs>`);
  lines.push(`<rect width="${W}" height="${H}" fill="${EX.bg}"/>`);
  lines.push(`<text x="${W - 12}" y="${H - 10}" text-anchor="end" font-size="9" font-weight="600" fill="${EX.muted}" opacity="0.6" font-family="'Syne',Arial,sans-serif" letter-spacing="0.08em">AIGENOTECH · DecisionTree Pro</text>`);
  lines.push(`<g transform="translate(${pad},${pad})">`);
  renderConnectorsEx(lines, tree, EX);
  renderNodesEx(lines, tree, EX);
  lines.push(`</g>`);
  lines.push(`</svg>`);

  const svgStr = lines.join('\n');
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const a = document.createElement('a');
  const dlUrl = URL.createObjectURL(blob);
  a.href = dlUrl;
  a.download = getExportFilename(tree, '.svg');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => {
    try { URL.revokeObjectURL(dlUrl); } catch(e) {}
  }, 1000);
  setStatus('✓ SVG exportado con tema oscuro');
}

function renderConnectorsEx(lines, node, EX) {
  if (!node.children || node.children.length === 0) return;
  const p = lastPosMap[node.id];
  if (!p) return;
  const px = p.x + NW, py = p.y + NH / 2;
  const midX = px + HGAP * 0.38;

  for (const child of node.children) {
    const cp = lastPosMap[child.id];
    if (!cp) continue;
    const cx = cp.x, cy = cp.y + NH / 2;
    const isOpt = child._optimal === true;
    const color = isOpt ? EX.connOpt : EX.conn;
    const sw    = isOpt ? 2 : 1.2;
    const dash  = (!isOpt && node.type === 'decision') ? ' stroke-dasharray="5,3"' : '';
    const marker = isOpt ? 'ex-arr-opt' : 'ex-arr-nor';
    const pathD = `M${px},${py} C${midX},${py} ${midX},${cy} ${cx},${cy}`;

    lines.push(`  <path d="${pathD}" fill="none" stroke="${color}" stroke-width="${sw}"${dash} marker-end="url(#${marker})"/>`);

    const labelX = (px + cx) / 2;

    if (child.prob !== null && child.prob !== undefined) {
      const txt = `p=${(child.prob * 100).toFixed(0)}%`;
      const tw  = txt.length * 6.5 + 8;
      const lx  = labelX - tw / 2;
      const ly  = cy - 19;
      const bgFill   = isOpt ? 'rgba(245,200,66,0.15)' : EX.surface;
      const bgStroke = isOpt ? EX.connOpt : EX.border;
      const txtFill  = isOpt ? EX.connOpt : EX.muted;
      lines.push(`  <rect x="${lx}" y="${ly}" width="${tw}" height="14" rx="3" fill="${bgFill}" stroke="${bgStroke}" stroke-width="0.5"/>`);
      lines.push(`  <text x="${labelX}" y="${ly + 10}" text-anchor="middle" font-size="9" fill="${txtFill}" class="mono">${txt}</text>`);
    }

    if (child.type !== 'terminal' && child.value && child.value !== 0) {
      const vtxt = fmt(child.value);
      const tw2  = vtxt.length * 6.5 + 8;
      const vx   = labelX - tw2 / 2;
      const vy   = cy + 5;
      lines.push(`  <rect x="${vx}" y="${vy}" width="${tw2}" height="14" rx="3" fill="${EX.surface}" stroke="${EX.border}" stroke-width="0.5"/>`);
      lines.push(`  <text x="${labelX}" y="${vy + 10}" text-anchor="middle" font-size="9" fill="${EX.val}" class="mono">${vtxt}</text>`);
    }

    renderConnectorsEx(lines, child, EX);
  }
}

function renderNodesEx(lines, node, EX) {
  const pos = lastPosMap[node.id];
  if (!pos) return;
  const { x, y } = pos;
  const isOpt = node._optimal === true;

  const borderColor = isOpt ? EX.gold : (node.type === 'decision' ? EX.dec : node.type === 'chance' ? EX.cha : EX.ter);
  const fillAlpha   = '22';
  const fillColor   = (node.type === 'decision' ? EX.dec : node.type === 'chance' ? EX.cha : EX.ter) + fillAlpha;
  const sw          = isOpt ? 2 : 1.5;

  if (node.type === 'decision') {
    lines.push(`  <rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="4" fill="${fillColor}" stroke="${borderColor}" stroke-width="${sw}"/>`);
  } else if (node.type === 'chance') {
    lines.push(`  <ellipse cx="${x + NW/2}" cy="${y + NH/2}" rx="${NW/2 - 1}" ry="${NH/2 - 1}" fill="${fillColor}" stroke="${borderColor}" stroke-width="${sw}"/>`);
  } else {
    lines.push(`  <polygon points="${x},${y} ${x+NW},${y+NH/2} ${x},${y+NH}" fill="${fillColor}" stroke="${borderColor}" stroke-width="${sw}"/>`);
  }

  const textX = node.type === 'terminal' ? x + NW * 0.38 : x + NW / 2;
  const shortLabel = node.label.length > 14 ? node.label.substring(0, 13) + '…' : node.label;
  lines.push(`  <text x="${textX}" y="${y + NH/2 - 5}" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="600" fill="${EX.text}" font-family="'Syne',Arial,sans-serif">${escXml(shortLabel)}</text>`);

  // DEF-EXP-01: Identificación rigurosa del modo analítico VE vs CE
  const isCeMode = (typeof utilityMode !== 'undefined' && utilityMode);
  let evTxt;
  let evFill;

  if (node.type === 'terminal') {
    evTxt = fmt(node.value);
    evFill = EX.ter;
  } else if (isCeMode) {
    if (node._ce !== undefined && node._ce !== null) {
      evTxt = `CE: ${fmt(node._ce)}`;
      evFill = EX.ce || '#c97ef7';
    } else {
      evTxt = 'CE: —';
      evFill = EX.ce || '#c97ef7';
    }
  } else {
    evTxt = `VE: ${fmt(node._ev)}`;
    evFill = node.type === 'chance' ? EX.cha : EX.dec;
  }
  lines.push(`  <text x="${textX}" y="${y + NH/2 + 9}" text-anchor="middle" dominant-baseline="central" font-size="9.5" font-weight="500" fill="${evFill}" class="mono" font-family="'DM Mono','Courier New',monospace">${escXml(evTxt)}</text>`);

  for (const child of (node.children || [])) renderNodesEx(lines, child, EX);
}

// ═══════════════════════════════════════════════
//  CALCULADORA BAYESIANA (INTERFAZ)
// ═══════════════════════════════════════════════
function openBayes() {
  renderBayesInputs();
  document.getElementById('bayes-overlay').classList.add('open');
  document.getElementById('bayes-result-section').style.display = 'none';
}

function closeBayes() {
  document.getElementById('bayes-overlay').classList.remove('open');
}

function renderBayesInputs() {
  const hypList = document.getElementById('bayes-hyp-list');
  hypList.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px">
      <div style="font-size:9px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em">Hipótesis</div>
      <div style="font-size:9px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:.06em">P(Hᵢ) a priori</div>
    </div>` +
    bayesHyps.map((h, i) => `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:5px">
      <input class="bayes-label-input" value="${h.label}" placeholder="H${i+1}"
        oninput="bayesHyps[${i}].label=this.value;syncBayesLikelihoodHeaders()">
      <input class="bayes-input" type="number" min="0" max="1" step="0.01" value="${h.prior}"
        placeholder="0.5" oninput="bayesHyps[${i}].prior=parseFloat(this.value)||0;updatePriorSum()">
    </div>`).join('');

  updatePriorSum();

  const evList = document.getElementById('bayes-ev-list');
  const hLabels = bayesHyps.map(h => h.label).join('</th><th style="font-size:9px;color:var(--muted);padding:4px 6px">');
  evList.innerHTML = `
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <th style="font-size:9px;color:var(--muted);padding:4px 6px;text-align:left">Evidencia</th>
        <th style="font-size:9px;color:var(--muted);padding:4px 6px">${hLabels}</th>
      </tr>` +
    bayesEvs.map((ev, ei) => `
      <tr>
        <td style="padding:4px 6px">
          <input class="bayes-label-input" value="${ev.label}" placeholder="E${ei+1}"
            oninput="bayesEvs[${ei}].label=this.value" style="width:60px">
        </td>` +
        bayesHyps.map((_, hi) => `
        <td style="padding:4px 6px">
          <input class="bayes-input" type="number" min="0" max="1" step="0.01"
            value="${ev.likelihoods[hi] ?? 0.5}" placeholder="0.5"
            oninput="bayesEvs[${ei}].likelihoods[${hi}]=parseFloat(this.value)||0">
        </td>`).join('') +
      `</tr>`).join('') +
    `</table>`;
}

// ═══════════════════════════════════════════════
//  ZOOM & PAN
// ═══════════════════════════════════════════════
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 4.0;
const ZOOM_STEP = 0.15;

let vp = { x: 40, y: 40, scale: 1.0 };
let isPanning = false;
let panStart = { x: 0, y: 0 };
let vpStart  = { x: 0, y: 0 };

function applyViewport() {
  const g = document.getElementById('viewport');
  if (g) g.setAttribute('transform', `translate(${vp.x},${vp.y}) scale(${vp.scale})`);
  const zoomLabel = document.getElementById('zoom-label');
  if (zoomLabel) zoomLabel.textContent = Math.round(vp.scale * 100) + '%';
  updateMinimap();
}

function zoomIn()  { zoomTo(vp.scale + ZOOM_STEP); }
function zoomOut() { zoomTo(vp.scale - ZOOM_STEP); }
function resetZoom() {
  const svg = document.getElementById('tree-svg');
  const cw = svg?.clientWidth  || 800;
  const ch = svg?.clientHeight || 500;
  vp = { x: cw / 2 - contentBounds.w / 2, y: ch / 2 - contentBounds.h / 2, scale: 1.0 };
  applyViewport();
}

function zoomTo(newScale, cx, cy) {
  const svg = document.getElementById('tree-svg');
  const cw = svg?.clientWidth  || 800;
  const ch = svg?.clientHeight || 500;
  const ox = cx !== undefined ? cx : cw / 2;
  const oy = cy !== undefined ? cy : ch / 2;

  const clampedScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newScale));
  const ratio = clampedScale / vp.scale;

  vp.x = ox - ratio * (ox - vp.x);
  vp.y = oy - ratio * (oy - vp.y);
  vp.scale = clampedScale;
  applyViewport();
}

function fitToScreen() {
  if (!tree) return;
  const svg = document.getElementById('tree-svg');
  const cw = svg?.clientWidth  || 800;
  const ch = svg?.clientHeight || 500;
  const pad = 60;
  const scaleX = (cw - pad * 2) / contentBounds.w;
  const scaleY = (ch - pad * 2) / contentBounds.h;
  const s = Math.min(scaleX, scaleY, 1.5);
  const clampedS = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, s));
  vp.scale = clampedS;
  vp.x = (cw - contentBounds.w * clampedS) / 2;
  vp.y = (ch - contentBounds.h * clampedS) / 2;
  applyViewport();
}

// ═══════════════════════════════════════════════
//  MINIMAP
// ═══════════════════════════════════════════════
function updateMinimap() {
  if (!tree) return;
  const mm = document.getElementById('minimap-svg');
  const mmLayer = document.getElementById('minimap-layer');
  const mmVP    = document.getElementById('minimap-viewport');
  if (!mm || !mmLayer || !mmVP) return;

  const mmW = 140, mmH = 80;
  const mmScale = Math.min(mmW / contentBounds.w, mmH / contentBounds.h) * 0.85;

  mmLayer.innerHTML = '';
  if (tree) drawMinimapNodes(mmLayer, tree, mmScale);

  const svg = document.getElementById('tree-svg');
  const cw = svg?.clientWidth  || 800;
  const ch = svg?.clientHeight || 500;

  const visX = -vp.x / vp.scale;
  const visY = -vp.y / vp.scale;
  const visW =  cw   / vp.scale;
  const visH =  ch   / vp.scale;

  mmVP.setAttribute('x',      visX * mmScale);
  mmVP.setAttribute('y',      visY * mmScale);
  mmVP.setAttribute('width',  visW * mmScale);
  mmVP.setAttribute('height', visH * mmScale);
}

function drawMinimapNodes(layer, node, mmScale) {
  if (!lastPosMap || !lastPosMap[node.id]) return;
  const pos = lastPosMap[node.id];
  const x = pos.x * mmScale;
  const y = pos.y * mmScale;
  const w = NW * mmScale;
  const h = NH * mmScale;
  const colors = { decision:'#4f8ef7', chance:'#3BA2A4', terminal:'#9b7ff4' };
  const c = colors[node.type] || '#888';

  if (node.type === 'decision') {
    const r = document.createElementNS('http://www.w3.org/2000/svg','rect');
    r.setAttribute('x',x); r.setAttribute('y',y); r.setAttribute('width',w); r.setAttribute('height',h);
    r.setAttribute('rx',1); r.setAttribute('fill', c); r.setAttribute('opacity','0.7');
    layer.appendChild(r);
  } else if (node.type === 'chance') {
    const el = document.createElementNS('http://www.w3.org/2000/svg','ellipse');
    el.setAttribute('cx',x+w/2); el.setAttribute('cy',y+h/2);
    el.setAttribute('rx',w/2); el.setAttribute('ry',h/2);
    el.setAttribute('fill',c); el.setAttribute('opacity','0.7');
    layer.appendChild(el);
  } else {
    const poly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.setAttribute('points',`${x},${y} ${x+w},${y+h/2} ${x},${y+h}`);
    poly.setAttribute('fill',c); poly.setAttribute('opacity','0.7');
    layer.appendChild(poly);
  }

  if (node.children && lastPosMap) {
    for (const child of node.children) {
      if (!lastPosMap[child.id]) continue;
      const cp = lastPosMap[child.id];
      const line = document.createElementNS('http://www.w3.org/2000/svg','line');
      line.setAttribute('x1', (pos.x + NW) * mmScale);
      line.setAttribute('y1', (pos.y + NH/2) * mmScale);
      line.setAttribute('x2', cp.x * mmScale);
      line.setAttribute('y2', (cp.y + NH/2) * mmScale);
      line.setAttribute('stroke', child._optimal ? '#f5c842' : '#3a4258');
      line.setAttribute('stroke-width', '0.8');
      layer.appendChild(line);
      drawMinimapNodes(layer, child, mmScale);
    }
  }
}

// ═══════════════════════════════════════════════
//  GESTORES DE EVENTOS DEL DOM
// ═══════════════════════════════════════════════

// ── Clic global para cerrar context menu ──
document.addEventListener('click', (e) => {
  const menu = document.getElementById('ctx-menu');
  if (menu && menu.classList.contains('open') && !menu.contains(e.target)) {
    closeContextMenu();
  }
});

// ── Atajos de teclado ──
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.key === 'Escape') {
    closeContextMenu();
    if (presentationMode) togglePresentation();
    const bayesEl = document.getElementById('bayes-overlay');
    if (bayesEl && bayesEl.classList.contains('open')) closeBayes();
  }
  if ((e.ctrlKey||e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
  if ((e.ctrlKey||e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key==='z'))) { e.preventDefault(); redo(); }
  if ((e.ctrlKey||e.metaKey) && e.key === 'c' && selectedNode) ctxCopySubtree();
  if ((e.ctrlKey||e.metaKey) && e.key === 'v' && selectedNode) ctxPasteSubtree();
  if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
  if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomOut(); }
  if (e.key === '0') { e.preventDefault(); fitToScreen(); }
  if (e.altKey && (e.key === 'b' || e.key === 'B')) { e.preventDefault(); toggleSidebar(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'F1') { e.preventDefault(); toggleRibbon(); }
  if (e.altKey && (e.key === 'r' || e.key === 'R')) { e.preventDefault(); toggleRibbon(); }
  const PS = 30;
  if (e.key === 'ArrowLeft')  { vp.x += PS; applyViewport(); }
  if (e.key === 'ArrowRight') { vp.x -= PS; applyViewport(); }
  if (e.key === 'ArrowUp')    { vp.y += PS; applyViewport(); }
  if (e.key === 'ArrowDown')  { vp.y -= PS; applyViewport(); }
});

// ── Rueda del ratón sobre SVG → zoom centrado en cursor ──
const treeSvg = document.getElementById('tree-svg');
if (treeSvg) {
  treeSvg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = treeSvg.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    zoomTo(vp.scale + delta, cx, cy);
  }, { passive: false });

  // ── Drag del ratón → pan ──
  let panMoved = false;
  const PAN_THRESHOLD = 4;

  treeSvg.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    panMoved = false;
    panStart = { x: e.clientX, y: e.clientY };
    vpStart  = { x: vp.x, y: vp.y };
    isPanning = true;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    if (!panMoved && Math.sqrt(dx*dx + dy*dy) < PAN_THRESHOLD) return;
    panMoved = true;
    treeSvg.classList.add('panning');
    vp.x = vpStart.x + dx;
    vp.y = vpStart.y + dy;
    applyViewport();
  });

  document.addEventListener('mouseup', () => {
    isPanning = false;
    panMoved  = false;
    treeSvg.classList.remove('panning');
  });

  // Deseleccionar al hacer clic en el lienzo vacío
  treeSvg.addEventListener('click', (e) => {
    if (panMoved) return;
    if (e.target === treeSvg || e.target.id === 'tree-layer') {
      selectedNode = null;
      render();
      refreshSelectedPanel();
    }
  });

  // ── Touch: pinch zoom + drag pan ──
  let touches = {};
  let lastPinchDist = null;

  treeSvg.addEventListener('touchstart', (e) => {
    e.preventDefault();
    [...e.changedTouches].forEach(t => touches[t.identifier] = { x: t.clientX, y: t.clientY });
    if (Object.keys(touches).length === 1) {
      const t = e.touches[0];
      panStart = { x: t.clientX, y: t.clientY };
      vpStart  = { x: vp.x, y: vp.y };
      isPanning = true;
    }
    if (Object.keys(touches).length === 2) {
      isPanning = false;
      lastPinchDist = getPinchDist(e.touches);
    }
  }, { passive: false });

  treeSvg.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isPanning) {
      const t = e.touches[0];
      vp.x = vpStart.x + (t.clientX - panStart.x);
      vp.y = vpStart.y + (t.clientY - panStart.y);
      applyViewport();
    } else if (e.touches.length === 2) {
      const dist = getPinchDist(e.touches);
      if (lastPinchDist) {
        const ratio = dist / lastPinchDist;
        const mid = getPinchMid(e.touches);
        const rect = treeSvg.getBoundingClientRect();
        zoomTo(vp.scale * ratio, mid.x - rect.left, mid.y - rect.top);
      }
      lastPinchDist = dist;
    }
  }, { passive: false });

  treeSvg.addEventListener('touchend', (e) => {
    [...e.changedTouches].forEach(t => delete touches[t.identifier]);
    if (Object.keys(touches).length < 2) lastPinchDist = null;
    if (Object.keys(touches).length === 0) isPanning = false;
  });

  function getPinchDist(t) {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx*dx + dy*dy);
  }
  function getPinchMid(t) {
    return {
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2
    };
  }
}

// ── Clic en minimap → navegar ──
const minimapSvg = document.getElementById('minimap-svg');
if (minimapSvg) {
  minimapSvg.addEventListener('click', (e) => {
    if (!tree) return;
    const rect = minimapSvg.getBoundingClientRect();
    const mmScale = Math.min(140 / contentBounds.w, 80 / contentBounds.h) * 0.85;
    const contentX = (e.clientX - rect.left) / mmScale;
    const contentY = (e.clientY - rect.top)  / mmScale;
    const svg = document.getElementById('tree-svg');
    vp.x = (svg?.clientWidth || 800)  / 2 - contentX * vp.scale;
    vp.y = (svg?.clientHeight || 500) / 2 - contentY * vp.scale;
    applyViewport();
  });
}

// ── Redimensión de ventana ──
window.addEventListener('resize', () => { if (tree) fitToScreen(); });

// ═══════════════════════════════════════════════
//  INICIALIZACIÓN AL CARGAR EL DOM
// ═══════════════════════════════════════════════
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => { loadExample('launch'); });
} else {
  loadExample('launch');
}

