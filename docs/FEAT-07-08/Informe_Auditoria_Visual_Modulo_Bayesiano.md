# INFORME DE AUDITORÍA VISUAL Y DIAGNÓSTICO TÉCNICO
## Módulo Calculadora Bayesiana (FEAT-07 / FEAT-08)
### DecisionTree Pro v5.0.0 — Sprint 2

---

### METADATOS DEL DOCUMENTO
- **Proyecto / Módulo:** DecisionTree Pro v5.0.0 — Calculadora Bayesiana
- **Etapa de Trabajo:** **ETAPA 1 — AUDITORÍA DIAGNÓSTICA SIN MODIFICACIONES**
- **Defectos Investigados:** BUG-UI-01, BUG-UI-02, BUG-UI-03, BUG-UI-04, BUG-UI-05
- **Estado de la Auditoría:** **COMPLETADA — 5 DEFECTOS DEMOSTRADOS CON EVIDENCIA CDP**
- **Rama Git de Trabajo:** `feature/feat-07-08-refinamiento-visual`
- **Archivos Auditados:** `canvas_ui.js`, `tree_engine.js`, `styles.css`, `index.html`

---

### 1. OBJETIVO Y METODOLOGÍA

Esta auditoría técnica visual y funcional inspecciona en profundidad la interfaz de la **Calculadora Bayesiana** en DecisionTree Pro v5.0.0. Siguiendo las directrices estrictas de la orden de trabajo, **no se modificó código fuente durante esta etapa**.

Para reproducir los problemas con rigor científico:
1. Se inicializó la aplicación en **Edge Headless vía Chrome DevTools Protocol (CDP)**.
2. Se cargó el caso estándar de información imperfecta de Eppen ($\theta_1, \theta_2$ y señales $z_1, z_2$).
3. Se midieron propiedades de computación geométrica DOM (`scrollWidth`, `offsetWidth`, `clientWidth`, `position`, `flexWrap`).
4. Se generaron capturas de pantalla de alta resolución y se realizaron pruebas responsivas en 6 factores de forma:
   - **1920 × 1080** (Full HD Desktop)
   - **1366 × 768** (Laptop estándar)
   - **1024 × 768** (Tablet Landscape / XGA)
   - **768 × 1024** (Tablet Portrait)
   - **390 × 844** (iPhone 12-15)
   - **360 × 740** (Android Compact)

---

### 2. MATRIZ RESUMEN DE DEFECTOS IDENTIFICADOS

| Identificador | Descripción del Defecto | Ubicación del Código | Severidad | Impacto |
| :--- | :--- | :--- | :---: | :--- |
| **BUG-UI-01** | Etiquetas cortadas en la primera columna de verosimilitudes (`scrollWidth > 80px`). | `canvas_ui.js:3132` | **Alta** | Ilegibilidad de nombres de señales informativas. |
| **BUG-UI-02** | Etiqueta matemática de normalización `Σ P(z|θ)` y notación mixta $E/H$ en lugar de modelo canónico de Eppen $P(z_j \mid \theta_i)$. | `canvas_ui.js:3142`<br>`index.html:392, 405` | **Media** | Inconsistencia con el formalismo teórico de la materia. |
| **BUG-UI-03** | Pérdida del encabezado y botón de cierre (`✕`) al realizar scroll vertical en el modal. | `styles.css:926`<br>`index.html:388` | **Alta** | Atrapamiento de navegación; usabilidad degradada. |
| **BUG-UI-04** | Desalineación, wrapping irregular y falta de espaciado adaptativo en los controles de exportación. | `styles.css:1037`<br>`tree_engine.js:1945` | **Media** | Botones huérfanos o asimétricos en anchos medios/bajos. |
| **BUG-UI-05** | Adaptación responsiva deficiente en viewports móviles (390×844 y 360×740) con compresión y desborde horizontal. | `styles.css: global modal` | **Alta** | Ruptura visual en smartphones y tablets verticales. |

---

### 3. DIAGNÓSTICO DETALLADO Y CAUSA RAÍZ DEMOSTRADA

#### BUG-UI-01: Etiquetas cortadas en la matriz de verosimilitudes
- **Diagnóstico:** Los inputs de texto para las etiquetas de las señales informativas tienen asignado en línea `style="width:80px"`. La señal 1 tiene como valor `"z1 (Estudio Favorable)"` (22 caracteres, `scrollWidth = 105px`) y la señal 2 tiene `"z2 (Estudio Desfavorable)"` (25 caracteres, `scrollWidth = 123px`). Ambos elementos reportan `scrollWidth > clientWidth`, forzando al navegador a recortar el texto horizontalmente (`studio Favorable)` y `z2 (Estudio Desf...`).
- **Causa Raíz:** Estilo en línea hardcodeado `style="width:80px"` en [`canvas_ui.js:3132`](file:///C:/Users/Viviana/Documents/GitHub/Decision-three/canvas_ui.js#L3132) sin ancho flexible ni contenedor con scroll horizontal propio.
- **Solución Recomendada:** Eliminar `style="width:80px"`, permitir `width: 100%; min-width: 170px;` y envolver la tabla en `.bayes-table-responsive`.

#### BUG-UI-02: Etiqueta matemática de normalización y notación de Eppen
- **Diagnóstico:** En la fila inferior de la matriz de verosimilitudes, la etiqueta reza `Σ P(z|θ)`. En [`index.html:405`](file:///C:/Users/Viviana/Documents/GitHub/Decision-three/index.html#L405) el título indica `Evidencia y verosimilitudes P(E|Hᵢ)` y el subtítulo general [`index.html:392`](file:///C:/Users/Viviana/Documents/GitHub/Decision-three/index.html#L392) reza `P(Hᵢ|E) = P(E|Hᵢ)·P(Hᵢ) / P(E)`.
- **Causa Raíz y Criterio Matemático:** En la teoría formal de toma de decisiones bajo información imperfecta (Eppen, Taha, Hillier), los estados de la naturaleza son $\theta_i$ y las señales informativas $z_j$. La condición de exhaustividad condicional se evalúa para cada estado sumando sobre las señales:
  $$\sum_{j=1}^m P(z_j \mid \theta_i) = 1.0 \quad (\forall \theta_i)$$
  Aunque el motor suma correctamente por columna, la etiqueta actual no indica el índice $j$ de la sumatoria y utiliza notación genérica $E/H$.
- **Solución Recomendada:** Actualizar la etiqueta a `Σⱼ P(zⱼ | θᵢ) = 1.0`, y alinear títulos a $P(z_j \mid \theta_i)$ y $P(\theta_i \mid z_j)$.

#### BUG-UI-03: Pérdida del encabezado del modal al desplazarse (Sticky Header)
- **Diagnóstico:** Al calcular las matrices, el contenido del modal crece a 1771px de altura frente a una ventana de 727px. Al desplazarse hacia abajo, el encabezado (`.bayes-title`) y el botón `✕` desaparecen de la vista.
- **Causa Raíz:** `.bayes-modal` tiene `overflow-y: auto` pero `.bayes-title` tiene `position: static` en lugar de `position: sticky`.
- **Solución Recomendada:** Convertir el encabezado en un bloque adhesivo (`position: sticky; top: -20px; z-index: 30; background: var(--surface2);`) para que el botón de cierre y el título permanezcan visibles en todo momento.

#### BUG-UI-04: Distribución y wrapping de controles de exportación
- **Diagnóstico:** `.bayes-export-actions` utiliza `justify-content: space-between; flex-wrap: wrap;`. En pantallas de menos de 640px los botones saltan de renglón con anchos dispares, generando una apariencia desordenada.
- **Causa Raíz:** Ausencia de reglas de diseño responsivo adaptativo para la barra de exportación.
- **Solución Recomendada:** Agregar media queries para reorganizar los controles en cuadrícula regular o flex vertical en pantallas estrechas.

#### BUG-UI-05: Adaptación responsiva en móviles y tablets
- **Diagnóstico:** En viewports de 390×844 y 360×740, las tablas multivariable exceden el ancho visible del modal (~340px) y no todas disponen de contenedor con scroll horizontal protegido, causando recortes laterales.
- **Causa Raíz:** Falta de reglas específicas `@media (max-width: 640px)` para padding del modal, fuentes y scroll horizontal encapsulado en inputs.
- **Solución Recomendada:** Aplicar contenedor `.bayes-table-responsive` a la tabla de verosimilitudes y afinar estilos móviles.

---

### 4. INVENTARIO DE EVIDENCIAS GENERADAS (ETAPA 1)

Las evidencias se encuentran respaldadas en `docs/FEAT-07-08/evidencias/`:

- `AUDIT_01_Recorte_Etiquetas_Verosimilitudes.png` (108 KB)
- `AUDIT_02_Notacion_Matematica_Normalizacion.png` (108 KB)
- `AUDIT_03_Modal_Scroll_Perdida_Header.png` (166 KB)
- `AUDIT_04_Toolbar_Controles_Exportacion.png` (166 KB)
- `AUDIT_RESP_1920x1080.png` (225 KB)
- `AUDIT_RESP_1366x768.png` (158 KB)
- `AUDIT_RESP_1024x768.png` (137 KB)
- `AUDIT_RESP_768x1024.png` (151 KB)
- `AUDIT_RESP_390x844.png` (57 KB)
- `AUDIT_RESP_360x740.png` (45 KB)
- `EVIDENCIA_AUDITORIA_VISUAL_INICIAL.json` (5 KB)
