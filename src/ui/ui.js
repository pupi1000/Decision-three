/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DECISIONTREE PRO — UI LAYER ENTRY POINT & ORCHESTRATOR (FEAT-04)
 * Módulo: src/ui/ui.js
 * Responsabilidad: Punto de entrada, arranque y coordinación de los módulos
 * independientes de interfaz de usuario de DecisionTree Pro.
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function(global) {
  'use strict';

  global.DecisionTreeUI = global.DecisionTreeUI || {};

  /**
   * Inicialización global de la capa de interfaz
   */
  global.DecisionTreeUI.init = function() {
    const mountEl = document.getElementById('ribbon-bar');
    if (!mountEl) {
      console.warn('[DecisionTreeUI] Punto de montaje #ribbon-bar no encontrado en el DOM.');
      return;
    }

    // Inicializar componente Ribbon
    if (this.Ribbon && typeof this.Ribbon.init === 'function') {
      this.Ribbon.init(mountEl);
    }

    // Configurar observador reactivo para actualizar Titlebar y estado visual
    this.setupStateSync();

    console.log('[DecisionTreeUI] Capa modular de interfaz FEAT-04 inicializada con éxito.');
  };

  /**
   * Configura la sincronización periódica y reactiva del estado con la Titlebar
   */
  global.DecisionTreeUI.setupStateSync = function() {
    let lastTree = null;
    let lastMode = null;
    let lastIdx = -1;
    let lastUtil = null;
    let lastPres = null;
    let lastSel = undefined;
    let lastCollapsed = null;
    let lastMinimap = null;

    const checkSync = () => {
      const currentMode = (typeof optimizeMode !== 'undefined') ? optimizeMode : global.optimizeMode;
      const currentTree = (typeof tree !== 'undefined') ? tree : global.tree;
      const currentIdx = typeof global.historyIdx !== 'undefined' ? global.historyIdx : -1;
      const currentUtil = global.utilityMode;
      const currentPres = global.presentationMode;
      const currentSel = (typeof selectedNode !== 'undefined') ? selectedNode : global.selectedNode;
      const isCollapsed = document.querySelector('.sidebar')?.classList.contains('collapsed') || false;
      const mm = document.getElementById('minimap-container');
      const isMinimap = mm ? (mm.style.display !== 'none') : true;

      if (currentMode !== lastMode || currentTree !== lastTree || currentIdx !== lastIdx || currentUtil !== lastUtil || currentPres !== lastPres || currentSel !== lastSel || isCollapsed !== lastCollapsed || isMinimap !== lastMinimap) {
        lastMode = currentMode;
        lastTree = currentTree;
        lastIdx = currentIdx;
        lastUtil = currentUtil;
        lastPres = currentPres;
        lastSel = currentSel;
        lastCollapsed = isCollapsed;
        lastMinimap = isMinimap;

        if (this.Ribbon && typeof this.Ribbon.syncStatus === 'function') {
          this.Ribbon.syncStatus();
        }
      }
    };

    // Sincronización continua de bajo impacto (150ms)
    setInterval(checkSync, 150);
  };

  // Arranque automático al completar la carga del DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      global.DecisionTreeUI.init();
    });
  } else {
    global.DecisionTreeUI.init();
  }

})(typeof window !== 'undefined' ? window : this);
