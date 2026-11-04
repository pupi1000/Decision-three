/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DECISIONTREE PRO — UI COMPONENT: TOOLTIPS & ACCESSIBILITY (FEAT-04)
 * Módulo: src/ui/components/tooltips.js
 * Responsabilidad: Gestión de tooltips contextuales oscuros con retardo discreto,
 * soporte de atajos de teclado y atributos de accesibilidad WAI-ARIA.
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function(global) {
  'use strict';

  global.DecisionTreeUI = global.DecisionTreeUI || {};
  global.DecisionTreeUI.Components = global.DecisionTreeUI.Components || {};

  let tooltipEl = null;
  let showTimer = null;
  let currentTarget = null;

  /**
   * Crea el elemento flotante del tooltip en el DOM si no existe
   */
  function createTooltipElement() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'ribbon-tooltip';
    tooltipEl.id = 'ribbon-floating-tooltip';
    tooltipEl.setAttribute('role', 'tooltip');
    tooltipEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(tooltipEl);
    return tooltipEl;
  }

  /**
   * Muestra el tooltip flotante sobre el elemento destino
   */
  function showTooltip(target) {
    if (!target) return;
    const rawText = target.getAttribute('data-tooltip') || target.getAttribute('title');
    if (!rawText) return;

    // Evitar que aparezca el tooltip nativo del navegador eliminando el atributo title
    if (target.hasAttribute('title')) {
      target.setAttribute('data-tooltip', target.getAttribute('title'));
      target.removeAttribute('title');
    }

    const tip = createTooltipElement();

    // Extraer atajo de teclado si existe entre paréntesis (ej: Ctrl+Z, Esc, etc.)
    let title = rawText;
    let shortcut = null;
    let desc = null;

    const shortcutMatch = rawText.match(/\((Ctrl\+[A-Z]|Esc)\)/i);
    if (shortcutMatch) {
      shortcut = shortcutMatch[1];
      title = rawText.replace(shortcutMatch[0], '').trim();
    }

    // Extraer descripción secundaria si contiene dos puntos (ej: "Plantilla: Decisión...")
    if (title.includes(':')) {
      const parts = title.split(':');
      title = parts[0].trim();
      desc = parts.slice(1).join(':').trim();
    }

    let html = `<span class="ribbon-tooltip-title">${title}</span>`;
    if (desc) {
      html += `<span class="ribbon-tooltip-desc">${desc}</span>`;
    }
    if (shortcut) {
      html += `<span class="ribbon-tooltip-shortcut">${shortcut}</span>`;
    }

    tip.innerHTML = html;

    // Posicionamiento dinámico bajo el botón
    const rect = target.getBoundingClientRect();
    tip.classList.add('visible');
    tip.setAttribute('aria-hidden', 'false');

    const tipRect = tip.getBoundingClientRect();
    let left = rect.left + (rect.width / 2) - (tipRect.width / 2);
    let top = rect.bottom + 6;

    // Control de bordes de pantalla
    if (left < 10) left = 10;
    if (left + tipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tipRect.width - 10;
    }

    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
  }

  /**
   * Oculta el tooltip flotante
   */
  function hideTooltip() {
    clearTimeout(showTimer);
    if (tooltipEl) {
      tooltipEl.classList.remove('visible');
      tooltipEl.setAttribute('aria-hidden', 'true');
    }
    currentTarget = null;
  }

  global.DecisionTreeUI.Components.Tooltips = {
    /**
     * Asocia atributos de accesibilidad a un elemento interactivo
     */
    attach: function(element, tooltipText, role) {
      if (!element) return;
      if (tooltipText) {
        element.setAttribute('data-tooltip', tooltipText);
        element.setAttribute('aria-label', tooltipText);
        element.removeAttribute('title');
      }
      if (role) {
        element.setAttribute('role', role);
      }
    },

    /**
     * Inicializa accesibilidad y listeners de tooltips en el contenedor
     */
    init: function(container) {
      if (!container) return;
      createTooltipElement();

      // Configurar botones, pestañas y controles interactivos
      const interactiveEls = container.querySelectorAll('.ribbon-btn, .ribbon-tab, .ribbon-control-input');
      interactiveEls.forEach(el => {
        if (el.hasAttribute('title') && !el.hasAttribute('data-tooltip')) {
          el.setAttribute('data-tooltip', el.getAttribute('title'));
          el.setAttribute('aria-label', el.getAttribute('title'));
          el.removeAttribute('title');
        }

        // Retardo discreto de 280ms para no ser intrusivo
        el.addEventListener('mouseenter', () => {
          currentTarget = el;
          clearTimeout(showTimer);
          showTimer = setTimeout(() => {
            if (currentTarget === el) showTooltip(el);
          }, 280);
        });

        el.addEventListener('mouseleave', hideTooltip);
        el.addEventListener('mousedown', hideTooltip);
        el.addEventListener('click', hideTooltip);
      });

      // Asegurar roles WAI-ARIA
      const tabs = container.querySelectorAll('.ribbon-tab');
      tabs.forEach(tab => tab.setAttribute('role', 'tab'));

      const buttons = container.querySelectorAll('button:not([role])');
      buttons.forEach(btn => btn.setAttribute('role', 'button'));

      // Ocultar en escape o scroll
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') hideTooltip();
      });
      window.addEventListener('scroll', hideTooltip, true);
    },

    hide: hideTooltip
  };

})(typeof window !== 'undefined' ? window : this);
