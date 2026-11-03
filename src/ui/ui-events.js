/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DECISIONTREE PRO — UI MODULE: EVENT DELEGATION & ACTIONS (FEAT-04)
 * Módulo: src/ui/ui-events.js
 * Responsabilidad: Gestión, vinculación y delegación de eventos de la interfaz
 * Ribbon hacia las funcionalidades existentes del proyecto (sin duplicar lógica).
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function(global) {
  'use strict';

  global.DecisionTreeUI = global.DecisionTreeUI || {};

  // ── Sincronización léxica bidireccional con estado del motor ──
  try {
    if (typeof optimizeMode !== 'undefined') {
      Object.defineProperty(global, 'optimizeMode', {
        get: function() { return optimizeMode; },
        set: function(val) { optimizeMode = val; },
        configurable: true
      });
    }
    if (typeof tree !== 'undefined') {
      Object.defineProperty(global, 'tree', {
        get: function() { return tree; },
        set: function(val) { tree = val; },
        configurable: true
      });
    }
    if (typeof selectedNode !== 'undefined') {
      Object.defineProperty(global, 'selectedNode', {
        get: function() { return selectedNode; },
        set: function(val) { selectedNode = val; },
        configurable: true
      });
    }
  } catch (e) {
    console.warn('[DecisionTreeUI] optimizeMode / tree accessor:', e);
  }

  global.DecisionTreeUI.Events = {
    /**
     * Vincula la delegación de eventos al contenedor Ribbon (idempotente)
     * @param {HTMLElement} ribbonContainer
     */
    bindAll: function(ribbonContainer) {
      if (!ribbonContainer || ribbonContainer._eventsBound) return;
      ribbonContainer._eventsBound = true;

      // Delegación de clics en botones de acción
      ribbonContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn || btn.disabled) return;

        const action = btn.getAttribute('data-action');
        const param = btn.getAttribute('data-param');
        this.dispatchAction(action, param);
      });

      // Delegación de cambios en inputs (ej: Tolerancia R)
      ribbonContainer.addEventListener('change', (e) => {
        const input = e.target.closest('[data-action]');
        if (!input) return;

        const action = input.getAttribute('data-action');
        this.dispatchAction(action, input.value);
      });
    },

    /**
     * Despachador de acciones hacia las funciones globales existentes
     */
    dispatchAction: function(action, param) {
      switch (action) {
        // ── Archivo ──
        case 'new-file':
          this.handleNewFile();
          break;
        case 'load-file':
          this.handleLoadFile();
          break;
        case 'save-file':
          if (typeof global.saveJSON === 'function') global.saveJSON();
          break;

        // ── Historial ──
        case 'undo':
          if (typeof global.undo === 'function') global.undo();
          break;
        case 'redo':
          if (typeof global.redo === 'function') global.redo();
          break;

        // ── Plantillas ──
        case 'template':
          if (typeof global.loadExample === 'function') {
            global.loadExample(param);
          }
          break;

        // ── Modelado: Nodos ──
        case 'add-node':
          if (typeof global.openAddModal === 'function') {
            global.openAddModal(param);
          }
          break;

        // ── Modelado: Optimización Max / Min ──
        case 'set-optimize':
          this.handleSetOptimizeMode(param);
          break;

        // ── Modelado: Edición Rápida ──
        case 'quick-add-branch':
          this.handleQuickAddBranch();
          break;
        case 'quick-edit':
          this.handleQuickEdit();
          break;
        case 'quick-delete':
          this.handleQuickDelete();
          break;

        // ── Métodos Cuantitativos ──
        case 'open-bayes':
          if (typeof global.openBayes === 'function') global.openBayes();
          break;
        case 'open-sensitivity':
          if (typeof global.openSensitivity === 'function') global.openSensitivity();
          break;
        case 'open-veip':
          this.openValueInfoModal('veip');
          break;
        case 'open-veim':
          this.openValueInfoModal('veim');
          break;
        case 'toggle-utility':
          if (typeof global.toggleUtilityMode === 'function') global.toggleUtilityMode();
          break;
        case 'change-r':
          this.handleRChange(param);
          break;

        // ── Vista ──
        case 'zoom-in':
          if (typeof global.zoomIn === 'function') global.zoomIn();
          break;
        case 'zoom-out':
          if (typeof global.zoomOut === 'function') global.zoomOut();
          break;
        case 'zoom-reset':
          if (typeof global.resetZoom === 'function') global.resetZoom();
          break;
        case 'zoom-fit':
          if (typeof global.fitToScreen === 'function') global.fitToScreen();
          break;
        case 'toggle-presentation':
          if (typeof global.togglePresentation === 'function') global.togglePresentation();
          break;
        case 'toggle-sidebar':
          this.handleToggleSidebar();
          break;
        case 'toggle-minimap':
          this.handleToggleMinimap();
          break;

        // ── Exportación ──
        case 'export-png':
          if (typeof global.exportPNG === 'function') global.exportPNG();
          break;
        case 'export-svg':
          if (typeof global.exportSVG === 'function') global.exportSVG();
          break;
        case 'export-summary':
          this.handleExportSummary();
          break;

        default:
          console.warn('[DecisionTreeUI] Acción no reconocida:', action);
      }
    },

    /**
     * Confirmación preventiva para archivo nuevo
     */
    handleNewFile: function() {
      if (global.tree) {
        const ok = window.confirm("¿Deseas iniciar un nuevo árbol? Se perderán las modificaciones no guardadas en el lienzo.");
        if (!ok) return;
      }
      if (typeof global.clearTree === 'function') {
        global.clearTree();
      }
    },

    /**
     * Carga de archivo JSON a través del input oculto
     */
    handleLoadFile: function() {
      const inp = document.getElementById('inp-load');
      if (inp) inp.click();
    },

    /**
     * Sincronización del modo de optimización (Max / Min)
     * Delega a la función explícita e idempotente setOptimizeMode.
     */
    handleSetOptimizeMode: function(targetMode) {
      if (typeof global.setOptimizeMode === 'function') {
        global.setOptimizeMode(targetMode);
      }
    },

    /**
     * Acciones rápidas contextuales sobre el nodo seleccionado
     */
    handleQuickAddBranch: function() {
      const sel = (typeof selectedNode !== 'undefined') ? selectedNode : global.selectedNode;
      if (sel) {
        if (sel.type === 'terminal') {
          if (typeof global.setStatus === 'function') {
            global.setStatus('⚠ Los nodos terminales representan resultados finales y no pueden tener ramas hijas. Selecciona un nodo de decisión o azar.');
          }
          return;
        }
        if (typeof global.ctxAddBranch === 'function') {
          global.ctxAddBranch();
        }
      } else if (!global.tree && typeof global.openAddModal === 'function') {
        global.openAddModal('decision');
      } else if (typeof global.setStatus === 'function') {
        global.setStatus('ℹ Selecciona un nodo de decisión o azar en el lienzo para agregarle una rama');
      }
    },

    handleQuickEdit: function() {
      const sel = (typeof selectedNode !== 'undefined') ? selectedNode : global.selectedNode;
      if (sel && typeof global.ctxEditNode === 'function') {
        global.ctxEditNode();
      } else if (typeof global.setStatus === 'function') {
        global.setStatus('ℹ Selecciona un nodo en el lienzo para editar sus propiedades');
      }
    },

    handleQuickDelete: function() {
      const sel = (typeof selectedNode !== 'undefined') ? selectedNode : global.selectedNode;
      if (sel && typeof global.ctxDeleteNode === 'function') {
        global.ctxDeleteNode();
      } else if (typeof global.setStatus === 'function') {
        global.setStatus('ℹ Selecciona un nodo en el lienzo para eliminarlo');
      }
    },

    /**
     * Ajuste del parámetro de tolerancia al riesgo R
     */
    handleRChange: function(val) {
      const num = parseFloat(val);
      if (!isNaN(num) && num !== 0) {
        global.R = num;
        const inpR = document.getElementById('inp-R');
        if (inpR) inpR.value = num;
        if (global.utilityMode && global.tree && typeof global.render === 'function') {
          global.render();
        }
      }
    },

    /**
     * Alternar visibilidad de la barra lateral
     */
    handleToggleSidebar: function() {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        if (typeof global.setStatus === 'function') {
          global.setStatus(isCollapsed ? 'Barra lateral oculta — mayor espacio de trabajo' : 'Barra lateral visible');
        }
        setTimeout(() => {
          if (typeof global.fitToScreen === 'function') global.fitToScreen();
        }, 80);
      }
    },

    /**
     * Alternar visibilidad del minimapa
     */
    handleToggleMinimap: function() {
      const mm = document.getElementById('minimap-container');
      if (mm) {
        const isHidden = mm.style.display === 'none';
        mm.style.display = isHidden ? 'block' : 'none';
        if (typeof global.setStatus === 'function') {
          global.setStatus(isHidden ? 'Minimapa visible' : 'Minimapa oculto');
        }
      }
    },

    /**
     * Generación y copia del resumen ejecutivo del árbol
     */
    handleExportSummary: function() {
      if (!global.tree) {
        if (typeof global.setStatus === 'function') global.setStatus('⚠ No hay árbol cargado');
        return;
      }
      const totalNodes = typeof global.countNodes === 'function' ? global.countNodes(global.tree) : 0;
      const bestEv = (global.tree._ev != null && typeof global.fmt === 'function') ? global.fmt(global.tree._ev) : '—';
      let bestBranch = '—';
      if (global.tree.children && global.tree.children.length > 0) {
        const optChild = global.tree.children.find(c => c._optimal);
        if (optChild) bestBranch = optChild.label || optChild.id;
      }
      const summaryText = [
        `========================================`,
        ` DECISIONTREE PRO — RESUMEN EJECUTIVO`,
        `========================================`,
        `Modelo / Proyecto : ${global.tree.label || 'Árbol de Decisión'}`,
        `Fecha de análisis : ${new Date().toLocaleString()}`,
        `Criterio activo   : ${global.optimizeMode === 'max' ? 'Maximización (Beneficio)' : 'Minimización (Costo)'}`,
        `Modo de decisión  : ${global.utilityMode ? `Equivalente Cierto (CE) [R=${global.R}]` : 'Valor Esperado (VE)'}`,
        `Total de nodos    : ${totalNodes}`,
        `Decisión óptima   : ${bestBranch}`,
        `Valor óptimo      : ${bestEv}`,
        `========================================`
      ].join('\n');

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(summaryText).then(() => {
          if (typeof global.setStatus === 'function') global.setStatus('✓ Resumen del análisis copiado al portapapeles');
        }).catch(() => {
          prompt('Resumen del análisis (Ctrl+C para copiar):', summaryText);
        });
      } else {
        prompt('Resumen del análisis (Ctrl+C para copiar):', summaryText);
      }
    },

    /**
     * Gestión del modal de Valor de Información (VEIP / VEIM)
     */
    openValueInfoModal: function(tabType) {
      const modal = document.getElementById('modal-value-info');
      if (modal) {
        modal.classList.add('open');
        this.switchValueInfoTab(tabType || 'veip');
      }
    },

    closeValueInfoModal: function() {
      const modal = document.getElementById('modal-value-info');
      if (modal) modal.classList.remove('open');
    },

    switchValueInfoTab: function(type) {
      const btnVeip = document.getElementById('tab-btn-veip');
      const btnVeim = document.getElementById('tab-btn-veim');
      const contentVeip = document.getElementById('content-veip');
      const contentVeim = document.getElementById('content-veim');

      const isVeim = type === 'veim';
      if (btnVeip) btnVeip.classList.toggle('active', !isVeim);
      if (btnVeim) btnVeim.classList.toggle('active', isVeim);
      if (contentVeip) contentVeip.classList.toggle('active', !isVeim);
      if (contentVeim) contentVeim.classList.toggle('active', isVeim);
    }
  };

  /**
   * ═════════════════════════════════════════════════════════════════════════
   * GESTIÓN EXPLÍCITA E IDEMPOTENTE DEL CRITERIO DE OPTIMIZACIÓN (MAX / MIN)
   * ═════════════════════════════════════════════════════════════════════════
   * Establece explícitamente el modo ('max' | 'min').
   * - No invierte el modo si se pulsa repetidamente (idempotente).
   * - Asegura que ambos botones sean mutuamente excluyentes.
   * - Recalcula inmediatamente el árbol, las ramas óptimas y el panel lateral.
   * - Sincroniza botones del Ribbon y badge de Titlebar.
   */
  global.setOptimizeMode = function(targetMode) {
    if (targetMode !== 'max' && targetMode !== 'min') return;

    const currentMode = (typeof optimizeMode !== 'undefined') ? optimizeMode : global.optimizeMode;

    // Idempotencia: Si ya está activo el modo solicitado, asegurar sincronía visual y retornar sin recomputar
    if (currentMode === targetMode) {
      if (global.DecisionTreeUI && global.DecisionTreeUI.Toolbar) {
        global.DecisionTreeUI.Toolbar.syncOptimizeMode(targetMode);
      }
      const tbMode = document.getElementById('titlebar-mode');
      if (tbMode) {
        tbMode.textContent = targetMode === 'max' ? 'MAX' : 'MIN';
        tbMode.className = `titlebar-badge badge-mode ${targetMode}`;
      }
      return;
    }

    // 1. Establecer explícitamente en el motor de cálculo
    if (typeof optimizeMode !== 'undefined') {
      optimizeMode = targetMode;
    }
    try {
      global.optimizeMode = targetMode;
    } catch (e) {}

    // 2. Sincronizar control legado #btn-minmax para retrocompatibilidad total
    const btnLegacy = document.getElementById('btn-minmax');
    if (btnLegacy) {
      btnLegacy.textContent = targetMode === 'min' ? '↓ Minimizar' : '↑ Maximizar';
      if (targetMode === 'min') {
        btnLegacy.classList.add('minimizing');
      } else {
        btnLegacy.classList.remove('minimizing');
      }
    }

    // 3. Notificación accesible de estado
    if (typeof global.setStatus === 'function') {
      if (targetMode === 'min') {
        global.setStatus('Modo Minimizar activado — se selecciona la rama de menor valor esperado');
      } else {
        global.setStatus('Modo Maximizar activado — se selecciona la rama de mayor valor esperado');
      }
    }

    // 4. Recalcular árbol, ramas óptimas y panel de resultados
    const activeTree = (typeof tree !== 'undefined') ? tree : global.tree;
    const renderFn = (typeof render === 'function') ? render : global.render;
    if (activeTree && typeof renderFn === 'function') {
      renderFn();
    }

    // 5. Actualizar botones del Ribbon (mutuamente excluyentes)
    if (global.DecisionTreeUI && global.DecisionTreeUI.Toolbar) {
      global.DecisionTreeUI.Toolbar.syncOptimizeMode(targetMode);
    }

    // 6. Actualizar badge de la Titlebar inmediatamente
    const tbMode = document.getElementById('titlebar-mode');
    if (tbMode) {
      tbMode.textContent = targetMode === 'max' ? 'MAX' : 'MIN';
      tbMode.className = `titlebar-badge badge-mode ${targetMode}`;
    }
  };

  global.DecisionTreeUI.setOptimizeMode = global.setOptimizeMode;

  // Interceptar amigablemente toggleMinMax para sincronizar el Ribbon si es invocado externamente
  if (typeof global.toggleMinMax === 'function') {
    const originalToggle = global.toggleMinMax;
    global.toggleMinMax = function() {
      originalToggle();
      const current = (typeof optimizeMode !== 'undefined') ? optimizeMode : global.optimizeMode;
      if (global.DecisionTreeUI && global.DecisionTreeUI.Toolbar) {
        global.DecisionTreeUI.Toolbar.syncOptimizeMode(current);
      }
      const tbMode = document.getElementById('titlebar-mode');
      if (tbMode) {
        tbMode.textContent = current === 'max' ? 'MAX' : 'MIN';
        tbMode.className = `titlebar-badge badge-mode ${current}`;
      }
    };
  }

  // Exponer alias globales para modales si se invocan desde inline HTML
  global.closeValueInfoModal = function() {
    global.DecisionTreeUI.Events.closeValueInfoModal();
  };
  global.switchValueInfoTab = function(type) {
    global.DecisionTreeUI.Events.switchValueInfoTab(type);
  };
  global.clearTreeConfirm = function() {
    global.DecisionTreeUI.Events.handleNewFile();
  };
  global.exportSummary = function() {
    global.DecisionTreeUI.Events.handleExportSummary();
  };

})(typeof window !== 'undefined' ? window : this);
