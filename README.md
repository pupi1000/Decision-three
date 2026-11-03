# DecisionTree Pro — AIGENOTECH

**Versión:** 5.0.0  
**Arquitectura:** SPA Modular Autónoma (Vanilla HTML5, CSS3, JavaScript ES6+)  
**Feature:** FEAT-04 — Refactorización Exclusiva de UI e Implementación de Ribbon  
**Estado:** Producción / Verificado  

---

## 📌 Descripción General

**DecisionTree Pro** es una plataforma web profesional para el modelado, resolución analítica y visualización interactiva de **árboles de decisión bajo condiciones de incertidumbre y riesgo**.

Integra retroceso inductivo (*backward induction / rollback*), cálculo probabilístico mediante el **Teorema de Bayes**, análisis de sensibilidad paramétrica, teoría de la decisión bajo utilidad exponencial (**Equivalente Cierto - CE**) y exportación gráfica de alta definición (PNG 2x y SVG).

---

## 🏗️ Arquitectura Modular Exclusiva de UI (FEAT-04)

En estricto cumplimiento de los principios arquitectónicos del proyecto, la refactorización de **FEAT-04** se diseñó e implementó **exclusivamente sobre la capa de interfaz de usuario (UI)**, desacoplándola del motor de cálculo y del canvas:

```text
Decision-three/
│
├── index.html                   # Documento principal, Titlebar y punto de montaje #ribbon-bar
├── styles.css                   # Hoja maestra de estilos que enlaza módulos CSS
├── canvas_ui.js                 # IMPLEMENTACIÓN DEL CANVAS (Intacta / No refactorizada)
├── tree_engine.js               # MOTOR DE CÁLCULO Y ALGORITMOS (Intacto / No refactorizado)
│
├── styles/                      # Capa modular de hojas de estilo
│   ├── layout.css               # Titlebar, layout superior, modos de presentación
│   ├── ribbon.css               # Contenedor Ribbon, pestañas horizontales y paneles
│   ├── toolbar.css              # Grupos de herramientas, botones, iconos y controles
│   └── modals.css               # Modales amplios y fichas de VEIP/VEIM (Roadmap v5.1)
│
└── src/
    └── ui/                      # Capa modular de componentes de interfaz
        ├── ui.js                # Punto de entrada, arranque y coordinación de la UI
        ├── ribbon.js            # Construcción y montaje de la barra Ribbon
        ├── tabs.js              # Gestión y navegación entre las 5 pestañas
        ├── toolbar.js           # Esquema declarativo de herramientas y botones
        ├── ui-events.js         # Delegación de eventos e integración con el proyecto
        └── components/
            ├── buttons.js       # Fábrica de botones y catálogo de iconos SVG
            └── tooltips.js      # Accesibilidad WAI-ARIA y tooltips descriptivos
```

### Principio de No Invasión y Respeto a Módulos Core
- **`tree_engine.js`:** **100% Intacto**. No fue refactorizado, no fue dividido, no se alteró su estructura interna ni se tocaron sus algoritmos analíticos (`calcEV`, `validateProbabilities`, `calcCE`, `findThreshold`, `runBayes`).
- **`canvas_ui.js`:** **100% Intacto**. No se alteró la lógica de renderizado SVG, transformaciones afines de zoom/pan, minimapa ni gestión del viewport.
- **Capa UI independiente:** La interfaz funciona como un consumidor desacoplado que invoca las funciones expuestas de forma no intrusiva mediante delegación de eventos.

---

## 🎨 Barra de Herramientas Ribbon (5 Pestañas Temáticas)

La Ribbon organiza todas las herramientas del sistema en cinco pestañas funcionales:

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
  - `Nuevo`: Inicializa un árbol en blanco previa confirmación de seguridad si hay un modelo activo.
  - `Cargar JSON`: Permite importar modelos `.json` previamente exportados.
  - `Guardar JSON`: Descarga la topología y datos completos en formato JSON estructurado.
- **Grupo Historial:**
  - `Deshacer (Ctrl+Z)` y `Rehacer (Ctrl+Y)`: Control temporal paso a paso con estado deshabilitado reactivo.
- **Grupo Plantillas de Ejemplo:**
  - `Lanzamiento`: Caso comercial clásico de desarrollo de nuevo producto.
  - `Inversión`: Decisión de portafolio y asignación de capital bajo volatilidad.
  - `Bayesiano`: Estructura analítica avanzada con pruebas diagnósticas previas.

### 2. Pestaña «Modelado»
- **Grupo Insertar Nodos:**
  - `Decisión (◼)`: Cuadrado azul (`#4f8ef7`) representativo de alternativas bajo control gerencial.
  - `Azar / Evento (●)`: Círculo verde azulado (`#3BA2A4`) para eventos inciertos.
  - `Terminal (▶)`: Triángulo violeta (`#9b7ff4`) que fija los pagos finales.
- **Grupo Criterio de Optimización:**
  - `Maximizar`: Botón dedicado para optimizar hacia mayor beneficio esperado.
  - `Minimizar`: Botón dedicado para optimizar hacia menor costo esperado.
  - Estado `.active` sincronizado con el motor analítico y la Titlebar.
- **Grupo Edición Rápida:**
  - `Agregar Rama`: Incorpora una bifurcación hija directamente al nodo seleccionado.
  - `Editar Propiedades`: Modal de edición de etiquetas, valores y probabilidades.
  - `Eliminar`: Suprime el nodo seleccionado y poda su subárbol correspondiente.

### 3. Pestaña «Métodos Cuantitativos»
- **Grupo Probabilidad e Incertidumbre:**
  - `Teorema de Bayes`: Calculadora matricial interactiva para actualizar probabilidades a posteriori $P(H_i|E)$.
  - `Sensibilidad (∂)`: Panel de experimentación paramétrica con control deslizante para identificar umbrales de indiferencia.
- **Grupo Valor de Información (Roadmap v5.1):**
  - `VEIP (Información Perfecta)`: Modal metodológico con la formulación $VEIP = |VE_{con\,IP} - VE_{sin\,IP}|$ y su rol como techo presupuestario máximo.
  - `VEIM (Información Muestral)`: Documentación de la ganancia por muestreo imperfecto $VEIM = VE_{con\,IM} - VE_{sin\,IM}$, eficiencia y Valor Neto ($VNIM$).
- **Grupo Teoría de Utilidad:**
  - `Alternar VE / CE`: Conmuta entre Valor Esperado ($VE$) y Equivalente Cierto ($CE$) con función exponencial $U(x) = 1 - e^{-x/R}$.
  - `Tolerancia R`: Control de entrada numérico integrado en la Ribbon para ajustar el coeficiente de aversión al riesgo.

### 4. Pestaña «Vista»
- **Grupo Navegación y Zoom:**
  - `Acercar (+)` y `Alejar (−)`: Variación incremental del escalado.
  - `Zoom 100%`: Restablece el escalado nativo (relación 1:1).
  - `Ajustar Todo`: Encuadra automáticamente todo el árbol dentro de los límites visibles del lienzo SVG.
- **Grupo Presentación:**
  - `Presentación`: Modo de pantalla completa para comités y reuniones directivas. Oculta la Ribbon, barra lateral y controles auxiliares para otorgar el 100% del área al lienzo. (Salir con `Esc`).
- **Grupo Paneles de Interfaz:**
  - `Barra Lateral`: Alterna la visibilidad del panel de información lateral para ganar espacio de trabajo.
  - `Minimapa`: Conmuta la visibilidad del minimapa flotante inferior.

### 5. Pestaña «Exportar»
- **Grupo Gráficos de Alta Calidad:**
  - `Imagen PNG (2x)`: Exporta una captura rasterizada en alta definición (Retina) con fondo oscuro institucional.
  - `Vectorial SVG`: Descarga el archivo vectorial SVG nativo sin pérdida de fidelidad a cualquier escala.
- **Grupo Resumen Ejecutivo:**
  - `Copiar Resumen`: Genera un reporte formateado en texto plano con el diagnóstico del modelo y lo copia al portapapeles.

---

## 📐 Fundamentos Teóricos y Algorítmicos

### 1. Algoritmo de Rollback (Backward Induction)
- **Nodo Terminal:** $VE(n) = \text{Pago}(n)$
- **Nodo de Azar:** $VE(n) = \text{Costo}(n) + \sum_{c \in \text{hijos}} P(c) \cdot VE(c)$
- **Nodo de Decisión:**
  - Maximizar: $VE(n) = \max_{c \in \text{hijos}} \{ VE(c) \}$
  - Minimizar: $VE(n) = \min_{c \in \text{hijos}} \{ VE(c) \}$

### 2. Equivalente Cierto (CE) y Función de Utilidad Exponencial
$$U(x) = 1 - e^{-x / R}$$
Donde $R > 0$ representa la tolerancia al riesgo. El Equivalente Cierto se despeja mediante:
$$CE = -R \cdot \ln(1 - U_{\text{esperada}})$$

### 3. Teorema de Bayes
$$P(H_i | E) = \frac{P(E | H_i) \cdot P(H_i)}{\sum_{k} P(E | H_k) \cdot P(H_k)}$$

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
| :--- | :--- |
| `Ctrl + Z` | Deshacer última modificación |
| `Ctrl + Y` | Rehacer modificación revertida |
| `Esc` | Cerrar modales / Salir del modo presentación |
| `Rueda del Ratón` | Zoom dinámico centrado en el cursor |
| `Arrastrar Lienzo` | Desplazamiento panorámico continuo (Pan) |
| `Clic Derecho` | Menú contextual sobre nodos |

---

## 💻 Requisitos y Ejecución Local

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/Viviana/Decision-three.git
   cd Decision-three
   ```
2. Abrir `index.html` directamente en cualquier navegador moderno (Edge, Chrome, Firefox, Safari).
3. **100% nativo y autónomo:** No requiere NodeJS, compiladores, empaquetadores ni servidores web locales. Compatible con protocolo `file:///`.

---

## 📄 Licencia y Créditos

Desarrollado para el proyecto **DecisionTree Pro** — © 2025-2026 **AIGENOTECH**.
