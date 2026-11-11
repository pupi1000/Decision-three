/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DECISIONTREE PRO — UI MODULE: TOOLBAR & GROUPS (FEAT-04)
 * Módulo: src/ui/toolbar.js
 * Responsabilidad: Organización, estructura declarativa y renderizado de los
 * grupos de herramientas de cada una de las 5 pestañas de la Ribbon.
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function(global) {
  'use strict';

  global.DecisionTreeUI = global.DecisionTreeUI || {};

  const Buttons = global.DecisionTreeUI.Components ? global.DecisionTreeUI.Components.Buttons : null;

  /**
   * Configuración declarativa de herramientas y grupos por pestaña
   */
  const TOOLBAR_SCHEMA = {
    // ── 1. PESTAÑA INICIO ──
    'tab-inicio': [
      {
        title: 'Archivo',
        items: [
          { action: 'new-file', label: 'Nuevo', icon: 'file-new', title: 'Crear un nuevo árbol en blanco (con confirmación de seguridad)' },
          { action: 'load-file', label: 'Cargar JSON', icon: 'file-open', title: 'Cargar árbol de decisión desde un archivo JSON' },
          { action: 'save-file', label: 'Guardar JSON', icon: 'file-save', title: 'Guardar árbol completo como archivo JSON descargable' }
        ]
      },
      {
        title: 'Historial',
        items: [
          { id: 'btn-undo', action: 'undo', label: 'Deshacer', icon: 'undo', title: 'Deshacer última modificación (Ctrl+Z)', disabled: true },
          { id: 'btn-redo', action: 'redo', label: 'Rehacer', icon: 'redo', title: 'Rehacer modificación revertida (Ctrl+Y)', disabled: true }
        ]
      },
      {
        title: 'Plantillas',
        items: [
          { action: 'template', actionParam: 'launch', label: 'Lanzamiento', icon: 'template-launch', title: 'Plantilla: Decisión de lanzamiento de nuevo producto comercial' },
          { action: 'template', actionParam: 'invest', label: 'Inversión', icon: 'template-invest', title: 'Plantilla: Estrategia de inversión y asignación de capital' },
          { action: 'template', actionParam: 'bayes', label: 'Bayesiano', icon: 'template-bayes', title: 'Plantilla: Árbol bayesiano con estudio de mercado previo' }
        ]
      }
    ],

    // ── 2. PESTAÑA MODELADO ──
    'tab-modelado': [
      {
        title: 'Insertar Nodos',
        items: [
          { action: 'add-node', actionParam: 'decision', label: 'Decisión', icon: 'node-decision', title: 'Insertar nodo de decisión (cuadrado azul)' },
          { action: 'add-node', actionParam: 'chance', label: 'Azar / Evento', icon: 'node-chance', title: 'Insertar nodo de azar o evento incierto (círculo verde azulado)' },
          { action: 'add-node', actionParam: 'terminal', label: 'Terminal', icon: 'node-terminal', title: 'Insertar nodo terminal o resultado (triángulo violeta)' }
        ]
      },
      {
        title: 'Criterio de Optimización',
        items: [
          { id: 'ribbon-btn-max', action: 'set-optimize', actionParam: 'max', label: 'Maximizar', icon: 'opt-max', title: 'Criterio de Maximización: Seleccionar ramas de mayor beneficio esperado', className: 'active opt-active-max' },
          { id: 'ribbon-btn-min', action: 'set-optimize', actionParam: 'min', label: 'Minimizar', icon: 'opt-min', title: 'Criterio de Minimización: Seleccionar ramas de menor costo esperado' }
        ]
      },
      {
        title: 'Edición Rápida',
        items: [
          { id: 'ribbon-btn-quick-add', action: 'quick-add-branch', label: 'Agregar Rama', icon: 'branch-add', title: 'Agregar rama hijo al nodo actualmente seleccionado', disabled: true },
          { id: 'ribbon-btn-quick-edit', action: 'quick-edit', label: 'Editar Nodo', icon: 'branch-edit', title: 'Editar propiedades del nodo actualmente seleccionado', disabled: true },
          { id: 'ribbon-btn-quick-delete', action: 'quick-delete', label: 'Eliminar', icon: 'branch-delete', title: 'Eliminar el nodo seleccionado y sus descendientes', className: 'text-danger', disabled: true }
        ]
      }
    ],

    // ── 3. PESTAÑA MÉTODOS CUANTITATIVOS ──
    'tab-cuantitativo': [
      {
        title: 'Probabilidad',
        items: [
          { action: 'open-bayes', label: 'Teorema Bayes', icon: 'bayes', title: 'Abrir Calculadora Bayesiana para actualizar probabilidades a posteriori' },
          { action: 'open-sensitivity', label: 'Sensibilidad (α)', icon: 'sensitivity', title: 'Abrir panel de análisis de sensibilidad probabilístico' }
        ]
      },
      {
        title: 'Valor de Información',
        items: [
          { action: 'open-veip', label: 'VEIP', icon: 'veip', title: 'Calcular Valor Esperado de Información Perfecta (VEIP) y análisis detallado de estados' },
          { action: 'open-veim', label: 'VEIM', icon: 'veim', title: 'Consultar fundamentos, formulación y roadmap de VEIM (Valor Esperado de Información Muestral)', subBadge: 'v5.1' }
        ]
      },
      {
        title: 'Teoría de Utilidad',
        items: [
          { id: 'btn-utility', action: 'toggle-utility', label: 'Alternar VE / CE', icon: 'utility-ce', title: 'Alternar entre Valor Esperado (VE) y Equivalente Cierto (CE) mediante función exponencial de utilidad' },
          { type: 'input', inputType: 'number', id: 'ribbon-inp-r', action: 'change-r', label: 'Tolerancia R:', value: 100000, step: 10000, title: 'Tolerancia al riesgo del tomador de decisiones' }
        ]
      }
    ],

    // ── 4. PESTAÑA VISTA ──
    'tab-vista': [
      {
        title: 'Navegación y Zoom',
        items: [
          { action: 'zoom-in', label: 'Acercar', icon: 'zoom-in', title: 'Acercar lienzo (+)' },
          { action: 'zoom-out', label: 'Alejar', icon: 'zoom-out', title: 'Alejar lienzo (−)' },
          { action: 'zoom-reset', label: 'Zoom 100%', icon: 'zoom-reset', title: 'Restablecer escala al 100% (1:1)' },
          { action: 'zoom-fit', label: 'Ajustar Todo', icon: 'zoom-fit', title: 'Ajustar árbol completo al área visible' }
        ]
      },
      {
        title: 'Presentación',
        items: [
          { id: 'btn-present', action: 'toggle-presentation', label: 'Presentación', icon: 'presentation', title: 'Activar modo proyección / presentación a pantalla completa (Esc para salir)' }
        ]
      },
      {
        title: 'Paneles de Interfaz',
        items: [
          { action: 'toggle-sidebar', label: 'Barra Lateral', icon: 'panel-sidebar', title: 'Mostrar u ocultar la barra lateral' },
          { action: 'toggle-minimap', label: 'Minimapa', icon: 'panel-minimap', title: 'Mostrar u ocultar el minimapa flotante' }
        ]
      }
    ],

    // ── 5. PESTAÑA EXPORTAR ──
    'tab-exportar': [
      {
        title: 'Gráficos de Alta Calidad',
        items: [
          { action: 'export-png', label: 'Imagen PNG', icon: 'export-png', title: 'Exportar árbol como imagen PNG rasterizada en alta resolución (2x Retina)' },
          { action: 'export-svg', label: 'Vectorial SVG', icon: 'export-svg', title: 'Exportar árbol como gráfico vectorial SVG escalable', isPrimary: true }
        ]
      },
      {
        title: 'Resumen Ejecutivo',
        items: [
          { action: 'export-summary', label: 'Copiar Resumen', icon: 'export-summary', title: 'Generar y copiar un resumen ejecutivo completo al portapapeles' }
        ]
      }
    ]
  };

  global.DecisionTreeUI.Toolbar = {
    /**
     * Obtiene el esquema declarativo de la Ribbon
     */
    getSchema: function() {
      return TOOLBAR_SCHEMA;
    },

    /**
     * Renderiza los grupos funcionales y botones dentro del panel de una pestaña
     * @param {string} tabId ID de la pestaña (ej: 'tab-inicio')
     * @param {HTMLElement} panelElement Contenedor del panel
     */
    renderPanel: function(tabId, panelElement) {
      if (!panelElement) return;
      const groups = TOOLBAR_SCHEMA[tabId] || [];
      const BtnFactory = global.DecisionTreeUI.Components.Buttons;

      panelElement.innerHTML = '';

      groups.forEach((groupDef, gIdx) => {
        // Separador vertical previo (excepto en el primer grupo)
        if (gIdx > 0) {
          const sep = document.createElement('div');
          sep.className = 'ribbon-sep';
          panelElement.appendChild(sep);
        }

        // Grupo
        const groupEl = document.createElement('div');
        groupEl.className = 'ribbon-group';

        // Fila de controles
        const controlsRow = document.createElement('div');
        controlsRow.className = 'ribbon-group-controls';

        groupDef.items.forEach(item => {
          if (item.type === 'input') {
            const inputEl = BtnFactory.createInputControl(item);
            controlsRow.appendChild(inputEl);
          } else {
            const btnEl = BtnFactory.createButton(item);
            controlsRow.appendChild(btnEl);
          }
        });

        groupEl.appendChild(controlsRow);

        // Título del grupo al pie
        const titleEl = document.createElement('div');
        titleEl.className = 'ribbon-group-title';
        titleEl.textContent = groupDef.title;
        groupEl.appendChild(titleEl);

        panelElement.appendChild(groupEl);
      });
    },

    /**
     * Sincroniza visualmente los botones de Optimización Max/Min
     */
    syncOptimizeMode: function(mode) {
      const btnMax = document.getElementById('ribbon-btn-max');
      const btnMin = document.getElementById('ribbon-btn-min');
      if (btnMax) {
        const isMax = mode === 'max';
        btnMax.classList.toggle('active', isMax);
        btnMax.classList.toggle('opt-active-max', isMax);
        btnMax.setAttribute('aria-pressed', isMax ? 'true' : 'false');
      }
      if (btnMin) {
        const isMin = mode === 'min';
        btnMin.classList.toggle('active', isMin);
        btnMin.classList.toggle('opt-active-min', isMin);
        btnMin.setAttribute('aria-pressed', isMin ? 'true' : 'false');
      }
    },

    /**
     * Sincroniza reactivamente el estado de habilitación (disabled) de las herramientas contextuales
     * DEF-MOD-04: Editar y Eliminar se habilitan con selección; Agregar Rama solo para Decisión y Azar
     */
    syncSelectionState: function(selNode) {
      const btnAdd = document.getElementById('ribbon-btn-quick-add');
      const btnEdit = document.getElementById('ribbon-btn-quick-edit');
      const btnDelete = document.getElementById('ribbon-btn-quick-delete');

      const hasSel = !!selNode;
      const canAddBranch = hasSel && (selNode.type === 'decision' || selNode.type === 'chance');

      if (btnAdd) {
        btnAdd.disabled = !canAddBranch;
        btnAdd.setAttribute('aria-disabled', (!canAddBranch).toString());
      }
      if (btnEdit) {
        btnEdit.disabled = !hasSel;
        btnEdit.setAttribute('aria-disabled', (!hasSel).toString());
      }
      if (btnDelete) {
        btnDelete.disabled = !hasSel;
        btnDelete.setAttribute('aria-disabled', (!hasSel).toString());
      }
    },

    /**
     * Sincroniza visualmente el botón de Utilidad de Riesgo y el valor R
     */
    syncUtilityMode: function(isCE, rVal) {
      const btn = document.getElementById('btn-utility');
      if (btn) {
        btn.classList.toggle('active', !!isCE);
        btn.classList.toggle('active-utility', !!isCE);
        const icon = global.DecisionTreeUI.Components.Buttons.getIcon('utility-ce');
        const label = isCE ? 'Modo CE' : 'Modo VE';
        btn.innerHTML = `${icon}<span>${label}</span>`;
      }
      const inpR = document.getElementById('ribbon-inp-r');
      if (inpR && rVal != null && document.activeElement !== inpR) {
        inpR.value = rVal;
      }
    },

    /**
     * Sincroniza visualmente el estado de Deshacer / Rehacer
     */
    syncHistory: function(canUndo, canRedo) {
      const undoBtn = document.getElementById('btn-undo');
      const redoBtn = document.getElementById('btn-redo');
      if (undoBtn) undoBtn.disabled = !canUndo;
      if (redoBtn) redoBtn.disabled = !canRedo;
    },

    /**
     * Sincroniza el botón de presentación
     */
    syncPresentation: function(isActive) {
      const btn = document.getElementById('btn-present');
      if (btn) {
        btn.classList.toggle('active', !!isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      }
    },

    /**
     * Sincroniza visualmente el botón de la barra lateral (DEF-VIS-02)
     */
    syncSidebar: function(isCollapsed) {
      const btn = document.querySelector('button[data-action="toggle-sidebar"]');
      if (btn) {
        btn.classList.toggle('active', !!isCollapsed);
        btn.setAttribute('aria-pressed', isCollapsed ? 'true' : 'false');
      }
      const toggleBtn = document.getElementById('sidebar-toggle-btn');
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
        toggleBtn.title = isCollapsed ? 'Expandir panel lateral (Alt+B)' : 'Contraer panel lateral (Alt+B)';
        toggleBtn.setAttribute('aria-label', isCollapsed ? 'Expandir panel lateral' : 'Contraer panel lateral');
      }
    },

    /**
     * Sincroniza visualmente el botón del minimapa (DEF-VIS-03)
     */
    syncMinimap: function(isVisible) {
      const btn = document.querySelector('button[data-action="toggle-minimap"]');
      if (btn) {
        btn.classList.toggle('active', !!isVisible);
        btn.setAttribute('aria-pressed', isVisible ? 'true' : 'false');
      }
    }
  };

})(typeof window !== 'undefined' ? window : this);
