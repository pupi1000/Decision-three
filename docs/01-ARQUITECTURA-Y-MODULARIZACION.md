# Hito 1: Arquitectura y Modularización del Sistema (FEAT-01)

**Autor / Responsable:** Einar Andrés Guillén Boero (`pupi1000` / `einar.guillen@ucb.edu.bo`)  
**Commit Base:** `4613744` (*modularización del codigo*)  
**Estado:** Integrado y Verificado  

---

## 1. Contexto y Diagnóstico Previo

En sus primeras iteraciones, el proyecto **DecisionTree Pro** se concentraba en un archivo monolítico `index.html` de más de 2.700 líneas de código. En dicho archivo coexistían sin delimitación:
- Definición estructural del DOM HTML.
- Declaraciones de estilo CSS en bloques `<style>`.
- Lógica de cálculo matemático (Rollback, Bayes, Sensibilidad, Utilidad).
- Renderizado gráfico y manipulación directa del SVG/Canvas.
- Controladores y escuchadores de eventos interactivos.

### Problemas Detectados:
1. **Deuda Técnica y Acoplamiento Severo:** Cualquier cambio visual corría el riesgo de romper el cálculo matemático de Valor Esperado ($VE$).
2. **Dificultad de Mantenimiento y Colaboración:** Imposibilidad de trabajar en paralelo mediante ramas de Git sin generar conflictos constantes de mezcla (*merge conflicts*).
3. **Poca Escalabilidad:** Complejidad para agregar nuevas herramientas analíticas o interfaces avanzadas.

---

## 2. Estrategia de Modularización

Se aplicó el principio de **Separación de Responsabilidades (*Separation of Concerns*)** descomponiendo el monolito en 3 grandes capas independientes:

```text
Decision-three/
├── index.html         # Punto de montaje del DOM (Reducido de 2.700 a ~250 líneas)
├── styles.css         # Hoja de estilos central y variables de diseño
├── tree_engine.js     # Motor analítico, matemático y de estructuras de datos
└── canvas_ui.js       # Motor gráfico, transformaciones afines y renderizado SVG
```

---

## 3. Detalle de los Módulos Extraídos

### A. [tree_engine.js](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/tree_engine.js) (Motor Analítico)
Encapsula la inteligencia analítica del árbol de decisiones:
- **Estructura de Datos del Árbol:** Representación recursiva de nodos (`decision`, `chance`, `terminal`) y sus relaciones parentales.
- **Rollback / Inducción Hacia Atrás (`calcEV`):** Cálculo de valores esperados según el criterio activo (`maximize` o `minimize`).
- **Teoría de Utilidad (`calcCE`):** Cómputo del Equivalente Cierto mediante función de utilidad exponencial $U(x) = 1 - e^{-x/R}$.
- **Inferencia Bayesiana (`runBayes`):** Cálculo de probabilidades a posteriori $P(H_i|E)$ a partir de probabilidades a priori y verosimilitudes.
- **Análisis de Sensibilidad Paramétrica (`findThreshold`):** Búsqueda de puntos de indiferencia entre alternativas.
- **Operaciones Estructurales:** Inserción, eliminación, poda de subárboles y clonación profunda (`deepCloneWithNewIds`).

### B. [canvas_ui.js](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/canvas_ui.js) (Motor Gráfico Vectorial)
Encapsula la capa de presentación y visualización interactiva:
- **Renderizado SVG Dinámico:** Dibujado de formas geométricas para cada tipo de nodo:
  - Cuadrados azules (`#4f8ef7`) para decisiones.
  - Círculos verde azulado (`#3BA2A4`) para eventos de azar.
  - Triángulos violeta (`#9b7ff4`) para desenlaces terminales.
- **Conectores Curvos Bézier:** Generación paramétrica de trayectorias cúbicas suaves entre coordenadas padre e hijo.
- **Transformaciones Afines:** Implementación de pan (arrastre del lienzo) y zoom continuo centrado en el cursor del ratón.
- **Minimapa Reactivo:** Visualización en miniatura con rectángulo de viewport en tiempo real.
- **Badges Contextuales:** Renderizado flotante de probabilidades, costos de rama y etiquetas de estado.

### C. [styles.css](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/styles.css) (Estilos Globales)
- Variables CSS para la paleta de colores institucional oscura (Dark Glassmorphism).
- Estilos para la ruta óptima (`.path-optimal` con resplandor dorado y animación).
- Estilos para badges de advertencia (`.prob-badge.warn`) y de éxito (`.prob-badge.ok`).

### D. [index.html](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/index.html) (Contenedor Limpio)
- Contenedor declarativo semántico con elementos de montaje (`#tree-canvas`, `#ribbon-bar`, `#sidebar`, `#minimap`).
- Importación ordenada de scripts en modo global, preservando la compatibilidad nativa para abrir con doble clic.

