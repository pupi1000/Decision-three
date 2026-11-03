/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DECISIONTREE PRO — UI MODULE: RIBBON BUILDER & COORDINATOR (FEAT-04)
 * Módulo: src/ui/ribbon.js
 * Responsabilidad: Construcción, ensamblado e inicialización de la barra Ribbon,
 * organización de las pestañas y gestión de los paneles de herramientas.
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function(global) {
  'use strict';

  global.DecisionTreeUI = global.DecisionTreeUI || {};

  global.DecisionTreeUI.Ribbon = {
    /**
     * Construye y monta la barra Ribbon en el elemento objetivo
     * @param {HTMLElement|string} mountTarget Elemento DOM o selector CSS
     */
    init: function(mountTarget) {
      const container = typeof mountTarget === 'string'
        ? document.querySelector(mountTarget)
        : mountTarget;

      if (!container) {
        console.error('[DecisionTreeUI.Ribbon] Contenedor de montaje no encontrado:', mountTarget);
        return;
      }

      // 1. Construir barra de pestañas (Tabs Bar)
      const tabsBar = document.createElement('div');
      tabsBar.className = 'ribbon-tabs';
      tabsBar.setAttribute('role', 'tablist');

      const tabDefs = global.DecisionTreeUI.Tabs.TAB_DEFINITIONS;
      tabDefs.forEach((def, idx) => {
        const tabBtn = document.createElement('button');
        tabBtn.className = 'ribbon-tab' + (idx === 0 ? ' active' : '');
        tabBtn.setAttribute('data-tab', def.id);
        tabBtn.setAttribute('role', 'tab');
        tabBtn.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
        tabBtn.textContent = def.label;
        tabsBar.appendChild(tabBtn);
      });

      // 2. Construir contenedor de contenido y paneles (Content & Panels)
      const contentContainer = document.createElement('div');
      contentContainer.className = 'ribbon-content';

      tabDefs.forEach((def, idx) => {
        const panel = document.createElement('div');
        panel.className = 'ribbon-panel' + (idx === 0 ? ' active' : '');
        panel.id = def.id;
        panel.setAttribute('role', 'tabpanel');

        // Renderizar herramientas del panel mediante Toolbar
        global.DecisionTreeUI.Toolbar.renderPanel(def.id, panel);

        contentContainer.appendChild(panel);
      });

      // 3. Montar en el contenedor principal
      container.innerHTML = '';
      container.appendChild(tabsBar);
      container.appendChild(contentContainer);

      // 4. Inicializar navegación de pestañas
      global.DecisionTreeUI.Tabs.init(container, (tabId) => {
        // Callback opcional al cambiar de pestaña
      });

      // 5. Vincular eventos de herramientas
      global.DecisionTreeUI.Events.bindAll(container);

      // 6. Aplicar accesibilidad y tooltips
      if (global.DecisionTreeUI.Components && global.DecisionTreeUI.Components.Tooltips) {
        global.DecisionTreeUI.Components.Tooltips.init(container);
      }

      // 7. Sincronización inicial
      this.syncStatus();
    },

    /**
     * Sincroniza la barra de título superior con el estado del modelo
     */
    syncStatus: function() {
      const docTitle = document.getElementById('ribbon-doc-title');
      if (docTitle) {
        docTitle.textContent = global.tree ? (global.tree.label || 'Árbol de Decisión') : 'Sin proyecto activo';
      }

      const tbNodes = document.getElementById('titlebar-nodes');
      if (tbNodes) {
        const nodeCount = (global.tree && typeof global.countNodes === 'function') 
          ? global.countNodes(global.tree) 
          : 0;
        tbNodes.textContent = `${nodeCount} nodos`;
      }

      const tbMode = document.getElementById('titlebar-mode');
      if (tbMode) {
        const mode = global.optimizeMode || 'max';
        tbMode.textContent = mode === 'max' ? 'MAX' : 'MIN';
        tbMode.className = `titlebar-badge badge-mode ${mode}`;
      }

      // Sincronizar botones de Toolbar
      if (global.DecisionTreeUI && global.DecisionTreeUI.Toolbar) {
        global.DecisionTreeUI.Toolbar.syncOptimizeMode(global.optimizeMode || 'max');
        if (typeof global.history !== 'undefined' && typeof global.historyIdx !== 'undefined') {
          global.DecisionTreeUI.Toolbar.syncHistory(
            global.historyIdx > 0,
            global.historyIdx < global.history.length - 1
          );
        }
      }
    }
  };

  // Exponer función global switchRibbonTab para compatibilidad
  global.switchRibbonTab = function(tabId) {
    if (global.DecisionTreeUI && global.DecisionTreeUI.Tabs) {
      global.DecisionTreeUI.Tabs.switchTo(tabId);
    }
  };

})(typeof window !== 'undefined' ? window : this);
