# Hito 2: Arquitectura Ribbon UI y Refactorización de Vistas (FEAT-04 / FEAT-06)

**Autor / Responsable:** SaiPlusSai (`refgu774@gmail.com`)  
**Commits:** `1cbc2be` a `e4e018b` (PR `#1`, integrado en `a73cc6a`)  
**Estado:** Integrado y Verificado  

---

## 1. Visión y Objetivos

El objetivo de este desarrollo fue transformar la barra de herramientas clásica en una interfaz moderna y ergonómica inspirada en el sistema **Microsoft Ribbon**, agrupando de manera funcional y contextual todas las capacidades del sistema.

### Principio Fundamental:
**Desacoplamiento Absoluto (Cero Invasión al Núcleo):**
- La refactorización se restringió estrictamente a la capa de interfaz de usuario.
- No se modificaron las firmas matemáticas ni los algoritmos analíticos de [`tree_engine.js`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/tree_engine.js).
- Se diseñó un sistema de eventos desacoplado (`ui-events.js`) que interactúa con el motor y el canvas a través de sus APIs públicas.

---

## 2. Estructura de Componentes UI (`src/ui/`)

La interfaz de usuario se modularizó en submódulos especializados:

```text
src/ui/
├── ui.js                   # Coordinador central y ciclo de arranque de la UI
├── ribbon.js               # Constructor y renderizador del contenedor Ribbon
├── tabs.js                 # Gestor de navegación y estados de las 5 pestañas
├── toolbar.js              # Definición declarativa de comandos, botones y grupos
├── ui-events.js            # Delegación de eventos e integración con el canvas
└── components/
    ├── buttons.js          # Fábrica de botones y catálogo de iconos vectoriales SVG
    └── tooltips.js         # Tooltips contextuales y accesibilidad WAI-ARIA
```

---

## 3. Las 5 Pestañas Temáticas del Ribbon

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  AIGENOTECH · DecisionTree Pro [v5.0.0]   |  Lanzamiento de Producto  |  [MAX] [5 nodos]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ Inicio ]  [ Modelado ]  [ Métodos Cuantitativos ]  [ Vista ]  [ Exportar ]           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [Nuevo] [Cargar] [Guardar] │ [Deshacer] [Rehacer] │ [Lanzamiento] [Inversión] [Bayes] │
│           Archivo           │       Historial      │             Plantillas            │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Pestaña «Inicio»
- **Grupo Archivo:**
  - `Nuevo`: Reinicia el modelo a un nodo raíz en blanco (con confirmación modal si hay cambios sin guardar).
  - `Cargar JSON`: Permite importar archivos `.json` previamente exportados.
  - `Guardar JSON`: Serializa y descarga la topología completa del árbol.
- **Grupo Historial:**
  - `Deshacer (Ctrl+Z)` y `Rehacer (Ctrl+Y)` con desactivación reactiva según el stack de deshacer.
- **Grupo Plantillas de Ejemplo:**
  - `Lanzamiento`: Caso comercial clásico de producto.
  - `Inversión`: Decisión de portafolio bajo incertidumbre.
  - `Bayesiano`: Estructura analítica con actualización de probabilidades a posteriori.

### 2. Pestaña «Modelado»
- **Grupo Insertar Nodos:**
  - `Decisión (◼)`: Cuadrado azul (`#4f8ef7`).
  - `Azar / Evento (●)`: Círculo verde azulado (`#3BA2A4`).
  - `Terminal (▶)`: Triángulo violeta (`#9b7ff4`).
- **Grupo Criterio:** Conmutación entre Maximizar (ganancias) y Minimizar (costos).
- **Grupo Edición Rápida:** Botones de `Agregar Rama`, `Editar Propiedades` y `Eliminar Nodo`.

### 3. Pestaña «Métodos Cuantitativos»
- **Grupo Probabilidad:** Modal interactivo para el Teorema de Bayes y panel de análisis de sensibilidad paramétrica ($\partial$).
- **Grupo Valor de la Información (Roadmap v5.1):** Paneles formativos y metodológicos de VEIP (*Valor Esperado de la Información Perfecta*) y VEIM (*Información Muestral*).
- **Grupo Teoría de Utilidad:** Conmutador $VE \leftrightarrow CE$ (*Equivalente Cierto*) y control de entrada numérico para el coeficiente de tolerancia al riesgo $R$.

### 4. Pestaña «Vista» (FEAT-06)
- **Grupo Zoom y Navegación:** Acercar (`+`), Alejar (`−`), Zoom 100% (1:1) y Ajustar Todo (centrado y encuadre automático en el viewport SVG).
- **Grupo Presentación:** Modo de pantalla completa libre de menús para reuniones directivas (con salida mediante tecla `Esc`).
- **Grupo Paneles:** Alternancia de visualización para la barra lateral y el minimapa.

### 5. Pestaña «Exportar»
- **Grupo Gráficos de Alta Fidelidad:** Exportación rasterizada en alta definición Retina 2x (`PNG`) y descarga vectorial sin pérdida (`SVG`).
- **Grupo Resumen Ejecutivo:** Generador de reporte sintético de resultados formateado en texto plano listo para el portapapeles.

---

## 4. Hojas de Estilos Modulares (`styles/`)

Se crearon hojas CSS específicas para aislar la presentación:
- **`styles/layout.css`:** Barra superior institucional (Titlebar), distribución de columnas y modo presentación.
- **`styles/ribbon.css`:** Contenedor Ribbon, animaciones de pestañas activas y diseño adaptativo.
- **`styles/toolbar.css`:** Botones de herramientas, divisores visuales, iconos SVG y estados `.disabled` / `.active`.

