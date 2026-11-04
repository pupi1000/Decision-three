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

      // 8. Restaurar preferencia de contracción/expansión (FEAT-04)
      this.initCollapsedPreference();
    },

    /**
     * Alterna el estado colapsado / expandido de la barra Ribbon
     */
    toggle: function() {
      const bar = document.getElementById('ribbon-bar');
      if (!bar) return;
      this.setCollapsed(!bar.classList.contains('collapsed'), true);
    },

    /**
     * Establece el estado colapsado / expandido de la barra Ribbon
     * @param {boolean} isCollapsed Verdadero para colapsar, falso para expandir
     * @param {boolean} [savePreference=true] Si debe guardar en localStorage
     */
    setCollapsed: function(isCollapsed, savePreference = true) {
      const bar = document.getElementById('ribbon-bar');
      const btn = document.getElementById('ribbon-toggle-btn');
      if (!bar) return;

      bar.classList.toggle('collapsed', isCollapsed);

      if (btn) {
        btn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
        btn.title = isCollapsed ? 'Expandir barra de herramientas (Ctrl+F1)' : 'Contraer barra de herramientas (Ctrl+F1)';
        btn.setAttribute('aria-label', isCollapsed ? 'Expandir barra de herramientas' : 'Contraer barra de herramientas');
        btn.classList.toggle('active', isCollapsed);
      }

      if (savePreference) {
        try {
          localStorage.setItem('dtp_ribbon_collapsed', isCollapsed ? 'true' : 'false');
        } catch (e) {}
      }

      if (typeof global.setStatus === 'function') {
        global.setStatus(isCollapsed ? 'Barra Ribbon contraída — área de trabajo maximizada' : 'Barra Ribbon expandida');
      }

      requestAnimationFrame(() => {
        setTimeout(() => {
          if (typeof global.fitToScreen === 'function') {
            global.fitToScreen();
          }
        }, 120);
      });
    },

    /**
     * Inicializa la preferencia de colapso desde localStorage
     */
    initCollapsedPreference: function() {
      try {
        const saved = localStorage.getItem('dtp_ribbon_collapsed');
        if (saved === 'true') {
          this.setCollapsed(true, false);
        } else {
          this.setCollapsed(false, false);
        }
      } catch (e) {
        this.setCollapsed(false, false);
      }
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
      const currentMode = (typeof optimizeMode !== 'undefined') ? optimizeMode : (global.optimizeMode || 'max');
      if (tbMode) {
        tbMode.textContent = currentMode === 'max' ? 'MAX' : 'MIN';
        tbMode.className = `titlebar-badge badge-mode ${currentMode}`;
      }

      // Sincronizar botones de Toolbar
      if (global.DecisionTreeUI && global.DecisionTreeUI.Toolbar) {
        global.DecisionTreeUI.Toolbar.syncOptimizeMode(currentMode);
        const currentSel = (typeof selectedNode !== 'undefined') ? selectedNode : global.selectedNode;
        if (typeof global.DecisionTreeUI.Toolbar.syncSelectionState === 'function') {
          global.DecisionTreeUI.Toolbar.syncSelectionState(currentSel);
        }
        if (typeof global.utilityMode !== 'undefined') {
          global.DecisionTreeUI.Toolbar.syncUtilityMode(global.utilityMode, global.R);
        }
        if (typeof global.presentationMode !== 'undefined') {
          global.DecisionTreeUI.Toolbar.syncPresentation(global.presentationMode);
        }
        if (typeof global.history !== 'undefined' && typeof global.historyIdx !== 'undefined') {
          global.DecisionTreeUI.Toolbar.syncHistory(
            global.historyIdx > 0,
            global.historyIdx < global.history.length - 1
          );
        }
        if (typeof global.DecisionTreeUI.Toolbar.syncSidebar === 'function') {
          const sidebar = document.querySelector('.sidebar');
          global.DecisionTreeUI.Toolbar.syncSidebar(sidebar ? sidebar.classList.contains('collapsed') : false);
        }
        if (typeof global.DecisionTreeUI.Toolbar.syncMinimap === 'function') {
          const mm = document.getElementById('minimap-container');
          const isMmVisible = mm ? (mm.style.display !== 'none') : true;
          global.DecisionTreeUI.Toolbar.syncMinimap(isMmVisible);
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

  // Exponer funciones globales de Ribbon para control y compatibilidad (FEAT-04)
  global.toggleRibbon = function() {
    if (global.DecisionTreeUI && global.DecisionTreeUI.Ribbon) {
      global.DecisionTreeUI.Ribbon.toggle();
    }
  };

  global.setRibbonCollapsed = function(isCollapsed, savePreference) {
    if (global.DecisionTreeUI && global.DecisionTreeUI.Ribbon) {
      global.DecisionTreeUI.Ribbon.setCollapsed(isCollapsed, savePreference);
    }
  };

})(typeof window !== 'undefined' ? window : this);
