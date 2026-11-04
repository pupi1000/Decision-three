/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DECISIONTREE PRO — UI COMPONENT: BUTTONS & ICONS (FEAT-04)
 * Módulo: src/ui/components/buttons.js
 * Responsabilidad: Fábrica de botones, iconografía SVG vectorial y controles
 * de entrada para la barra de herramientas Ribbon.
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function(global) {
  'use strict';

  global.DecisionTreeUI = global.DecisionTreeUI || {};
  global.DecisionTreeUI.Components = global.DecisionTreeUI.Components || {};

  /**
   * Catálogo de Iconos SVG Vectoriales (Stroke 2px, 24x24 viewBox)
   */
  const SVG_ICONS = {
    'file-new': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="12" y1="18" x2="12" y2="12"></line>
      <line x1="9" y1="15" x2="15" y2="15"></line>
    </svg>`,

    'file-open': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>`,

    'file-save': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
      <polyline points="17 21 17 13 7 13 7 21"></polyline>
      <polyline points="7 3 7 8 15 8"></polyline>
    </svg>`,

    'undo': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="1 4 1 10 7 10"></polyline>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
    </svg>`,

    'redo': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="23 4 23 10 17 10"></polyline>
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
    </svg>`,

    'template-launch': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
    </svg>`,

    'template-invest': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>`,

    'template-bayes': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="18" cy="5" r="3"></circle>
      <circle cx="6" cy="12" r="3"></circle>
      <circle cx="18" cy="19" r="3"></circle>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
    </svg>`,

    'node-decision': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" stroke-width="2.5">
      <rect x="3" y="3" width="18" height="18" rx="2"></rect>
    </svg>`,

    'node-chance': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="#3BA2A4" stroke-width="2.5">
      <circle cx="12" cy="12" r="9"></circle>
    </svg>`,

    'node-terminal': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="#9b7ff4" stroke-width="2.5">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>`,

    'opt-max': `<svg class="ribbon-icon text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="12" y1="19" x2="12" y2="5"></line>
      <polyline points="5 12 12 5 19 12"></polyline>
    </svg>`,

    'opt-min': `<svg class="ribbon-icon text-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <polyline points="19 12 12 19 5 12"></polyline>
    </svg>`,

    'branch-add': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>`,

    'branch-edit': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>`,

    'branch-delete': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>`,

    'bayes': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
      <line x1="9" y1="9" x2="15" y2="9"></line>
      <line x1="9" y1="13" x2="13" y2="13"></line>
    </svg>`,

    'sensitivity': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>`,

    'veip': `<svg class="ribbon-icon text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`,

    'veim': `<svg class="ribbon-icon text-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 6v6l4 2"></path>
    </svg>`,

    'utility-ce': `<svg class="ribbon-icon text-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 17c3-8 6-8 9-2s6 6 9-2"></path>
    </svg>`,

    'zoom-in': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      <line x1="11" y1="8" x2="11" y2="14"></line>
      <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>`,

    'zoom-out': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>`,

    'zoom-reset': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M12 6v12M8 12h8"></path>
    </svg>`,

    'zoom-fit': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
    </svg>`,

    'presentation': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="3" width="20" height="14" rx="2"></rect>
      <line x1="8" y1="21" x2="16" y2="21"></line>
      <line x1="12" y1="17" x2="12" y2="21"></line>
    </svg>`,

    'panel-sidebar': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2"></rect>
      <line x1="9" y1="3" x2="9" y2="21"></line>
    </svg>`,

    'panel-minimap': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
      <line x1="8" y1="2" x2="8" y2="18"></line>
      <line x1="16" y1="6" x2="16" y2="22"></line>
    </svg>`,

    'export-png': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>`,

    'export-svg': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>`,

    'export-summary': `<svg class="ribbon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>`
  };

  /**
   * Componente de Botones
   */
  global.DecisionTreeUI.Components.Buttons = {
    /**
     * Obtiene el código SVG para un icono dado
     */
    getIcon: function(name) {
      return SVG_ICONS[name] || '';
    },

    /**
     * Crea un elemento de botón Ribbon estructurado
     */
    createButton: function(options) {
      const btn = document.createElement('button');
      const isLg = options.isLarge !== false;
      
      btn.className = 'ribbon-btn' + (isLg ? ' ribbon-btn-lg' : '') + 
        (options.isPrimary ? ' ribbon-btn-primary' : '') +
        (options.className ? ' ' + options.className : '');
      
      if (options.id) btn.id = options.id;
      if (options.title) btn.title = options.title;
      if (options.disabled) btn.disabled = true;
      if (options.action) btn.setAttribute('data-action', options.action);
      if (options.actionParam) btn.setAttribute('data-param', options.actionParam);

      // Icono
      const iconHtml = this.getIcon(options.icon);
      
      // Sub-badge (ej: v5.1)
      const badgeHtml = options.subBadge 
        ? `<span class="ribbon-sub-badge">${options.subBadge}</span>` 
        : '';

      btn.innerHTML = `${iconHtml}<span>${options.label}${badgeHtml}</span>`;

      return btn;
    },

    /**
     * Crea un control de entrada numérico integrado (ej: Tolerancia R)
     */
    createInputControl: function(options) {
      const col = document.createElement('div');
      col.className = 'ribbon-control-col';

      const label = document.createElement('label');
      label.className = 'ribbon-control-label';
      label.htmlFor = options.id;
      label.textContent = options.label;

      const input = document.createElement('input');
      input.className = 'ribbon-control-input';
      input.id = options.id;
      input.type = options.inputType || 'number';
      input.value = options.value || 0;
      if (options.step) input.step = options.step;
      if (options.title) input.title = options.title;
      if (options.action) input.setAttribute('data-action', options.action);

      col.appendChild(label);
      col.appendChild(input);
      return col;
    }
  };

})(typeof window !== 'undefined' ? window : this);
