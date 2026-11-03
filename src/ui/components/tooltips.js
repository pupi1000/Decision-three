/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DECISIONTREE PRO — UI COMPONENT: TOOLTIPS & ACCESSIBILITY (FEAT-04)
 * Módulo: src/ui/components/tooltips.js
 * Responsabilidad: Gestión de tooltips contextuales y atributos de accesibilidad
 * WAI-ARIA para los controles de la interfaz Ribbon.
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function(global) {
  'use strict';

  global.DecisionTreeUI = global.DecisionTreeUI || {};
  global.DecisionTreeUI.Components = global.DecisionTreeUI.Components || {};

  global.DecisionTreeUI.Components.Tooltips = {
    /**
     * Asocia atributos de accesibilidad a un elemento interactivo
     */
    attach: function(element, tooltipText, role) {
      if (!element) return;
      if (tooltipText) {
        element.title = tooltipText;
        element.setAttribute('aria-label', tooltipText);
      }
      if (role) {
        element.setAttribute('role', role);
      }
    },

    /**
     * Inicializa accesibilidad y atajos de teclado en el contenedor de la Ribbon
     */
    init: function(container) {
      if (!container) return;
      
      const buttons = container.querySelectorAll('button:not([role])');
      buttons.forEach(btn => {
        btn.setAttribute('role', 'button');
        if (!btn.getAttribute('aria-label') && btn.title) {
          btn.setAttribute('aria-label', btn.title);
        }
      });

      const tabs = container.querySelectorAll('.ribbon-tab');
      tabs.forEach(tab => {
        tab.setAttribute('role', 'tab');
      });
    }
  };

})(typeof window !== 'undefined' ? window : this);
