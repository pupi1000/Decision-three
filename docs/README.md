# Índice General de Documentación — DecisionTree Pro

Bienvenido a la documentación técnica oficial de **DecisionTree Pro (AIGENOTECH v5.0.0)**.
Para facilitar la lectura y el mantenimiento, la documentación se ha organizado de forma modular en guías especializadas:

---

## 📚 Estructura de Documentación

| Documento | Enfoque | Responsables |
| :--- | :--- | :--- |
| [**01-ARQUITECTURA-Y-MODULARIZACION.md**](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/docs/01-ARQUITECTURA-Y-MODULARIZACION.md) | Desacoplamiento del monolito original (FEAT-01), estructura de archivos, principios de diseño y responsabilidades de cada capa. | Einar Guillén (`pupi1000`) |
| [**02-RIBBON-UI-Y-VISTAS.md**](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/docs/02-RIBBON-UI-Y-VISTAS.md) | Sistema de interfaz por pestañas Ribbon (FEAT-04), componentes modulares en `src/ui/`, temas en `styles/` y mejoras de vista/exportación (FEAT-06). | SaiPlusSai (`refgu774@gmail.com`) |
| [**03-BUG-01-PROBABILIDADES.md**](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/docs/03-BUG-01-PROBABILIDADES.md) | Diagnóstico, teoría matemática (Axiomas de Kolmogorov), implementación de cláusulas de guarda $0 \le p_i \le 1$, badges visuales y bloqueo de inducción errónea. | Einar Guillén (`pupi1000`) |
| [**04-BUG-02-CONTINUIDAD-Y-COSTOS.md**](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/docs/04-BUG-02-CONTINUIDAD-Y-COSTOS.md) | Continuidad del camino óptimo en secuencias Azar $\rightarrow$ Decisión (`propagateOptimalPath`), deducción neta de costos intermedios y suite de pruebas unitarias. | Einar Guillén (`pupi1000`) |

---

## 👥 Resumen de Créditos y Roles

- **Einar Andrés Guillén Boero (`pupi1000`):**
  - Modularización del núcleo: extracción de `tree_engine.js`, `canvas_ui.js` y `styles.css` del monolito HTML.
  - Corrección de consistencia matemática en nodos de azar (BUG-01).
  - Algoritmo de continuidad para la ruta óptima de rollback y propagación neta de costos (BUG-02).
- **SaiPlusSai (`refgu774@gmail.com`):**
  - Diseño y construcción de la arquitectura Ribbon UI desacoplada (`src/ui/`).
  - Hojas de estilo modulares (`styles/layout.css`, `styles/ribbon.css`, `styles/toolbar.css`).
  - Pestañas funcionales de Vista, Exportación Retina 2x y Modos de Presentación.

---

## 🚀 Filosofía de Ejecución
El proyecto es **100% nativo y autónomo**: utiliza Vanilla JavaScript (ES6+), CSS3 y HTML5. No requiere empaquetadores, servidores locales ni compiladores Node.js en tiempo de ejecución. Puede ejecutarse directamente con doble clic sobre [`index.html`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/index.html).

