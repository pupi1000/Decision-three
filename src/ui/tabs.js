/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DECISIONTREE PRO — UI MODULE: TABS NAVIGATION (FEAT-04)
 * Módulo: src/ui/tabs.js
 * Responsabilidad: Gestión de navegación entre pestañas de la Ribbon,
 * estado visual de la pestaña activa y persistencia del lienzo sin recargas.
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function(global) {
  'use strict';

  global.DecisionTreeUI = global.DecisionTreeUI || {};

  let activeTabId = 'tab-inicio';
  let tabChangeCallback = null;
  let tabsContainer = null;

  global.DecisionTreeUI.Tabs = {
    /**
     * Lista oficial de las 5 pestañas de la Ribbon
     */
    TAB_DEFINITIONS: [
      { id: 'tab-inicio', label: 'Inicio' },
      { id: 'tab-modelado', label: 'Modelado' },
      { id: 'tab-cuantitativo', label: 'Métodos Cuantitativos' },
      { id: 'tab-vista', label: 'Vista' },
      { id: 'tab-exportar', label: 'Exportar' }
    ],

    /**
     * Inicializa la navegación entre pestañas
     * @param {HTMLElement} container Contenedor padre de la Ribbon
     * @param {Function} onTabChange Callback opcional invocado al conmutar
     */
    init: function(container, onTabChange) {
      tabsContainer = container;
      tabChangeCallback = onTabChange;

      if (!tabsContainer) return;

      const tabs = tabsContainer.querySelectorAll('.ribbon-tab');
      tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
          e.preventDefault();
          const targetTab = tab.getAttribute('data-tab');
          if (targetTab) {
            this.switchTo(targetTab);
          }
        });
      });

      // Asegurar estado inicial
      this.switchTo(activeTabId);
    },

    /**
     * Conmuta hacia una pestaña específica sin alterar el lienzo ni el árbol
     * @param {string} tabId Identificador de la pestaña de destino
     */
    switchTo: function(tabId) {
      if (!tabsContainer) return;

      const tabs = tabsContainer.querySelectorAll('.ribbon-tab');
      const panels = tabsContainer.querySelectorAll('.ribbon-panel');

      let found = false;

      tabs.forEach(tab => {
        const isTarget = tab.getAttribute('data-tab') === tabId;
        tab.classList.toggle('active', isTarget);
        tab.setAttribute('aria-selected', isTarget ? 'true' : 'false');
        if (isTarget) found = true;
      });

      panels.forEach(panel => {
        const isTarget = panel.id === tabId;
        panel.classList.toggle('active', isTarget);
      });

      if (found) {
        activeTabId = tabId;
        if (typeof tabChangeCallback === 'function') {
          tabChangeCallback(tabId);
        }
      }
    },

    /**
     * Obtiene el identificador de la pestaña actualmente activa
     */
    getActiveTab: function() {
      return activeTabId;
    }
  };

})(typeof window !== 'undefined' ? window : this);
