# Hito 4: Corrección Crítica BUG-02 — Continuidad de Rollback y Propagación Neta de Costos

**Autor / Responsable:** Einar Andrés Guillén Boero (`pupi1000` / `einar.guillen@ucb.edu.bo`)  
**Rama:** `bugfix/bug-02-secuencia-rollback`  
**Archivos Modificados:** [`tree_engine.js`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/tree_engine.js), [`canvas_ui.js`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/canvas_ui.js)  
**Estado:** Resuelto y Verificado mediante Pruebas Automatizadas  

---

## 1. Diagnóstico del Defecto

Se identificaron dos fallas operativas graves en el comportamiento del árbol secuencial:

### Defecto 1: Discontinuidad Gráfica de la Ruta Óptima (Secuencia Azar $\rightarrow$ Decisión)
- **Escenario:** Un nodo de Azar (en la raíz o en una posición intermedia) tiene como hijo directo un nodo de Decisión.
- **Comportamiento Anómalo:** El algoritmo evaluaba correctamente los números ($100 y $50 en la decisión; $68 en el azar), pero la curva Bézier que conectaba al nodo de Azar con la Decisión **permanecía en color gris** (inactiva).
- **Impacto:** La línea dorada de "ruta óptima" solo se iluminaba desde la Decisión hacia su alternativa terminal ganadora, dejando el camino óptimo huérfano y desconectado de la raíz.

### Defecto 2: Omisión del Costo de Rama Intermedia en el Valor Esperado
- **Escenario:** Una rama intermedia tiene un costo asociado (por ejemplo, realizar un estudio de mercado previo que cuesta \$10).
- **Comportamiento Anómalo:** El nodo padre calculaba el Valor Esperado sumando el valor bruto del hijo sin deducir el costo incurrido en la rama correspondiente:
  $$\text{Esperado:} \quad VE = \sum p_i \cdot (\text{Valor Hijo}_i - \text{Costo Rama}_i)$$
  $$\text{Anterior (Erróneo):} \quad VE = \sum p_i \cdot \text{Valor Hijo}_i$$

---

## 2. Fundamento Teórico y Reglas de Propagación

En la teoría de árboles de decisión:
1. **Un nodo de Decisión ($\square$) ejerce elección:** El decisor selecciona la alternativa de mayor rendimiento (o menor costo) y descarta las demás. Por eso, **solo una rama se ilumina en dorado**, mientras las demás se podan visualmente (en gris punteado).
2. **Un nodo de Azar ($\bigcirc$) no ejerce elección:** El decisor no controla el azar. Todos los eventos de la naturaleza son realizables con sus respectivas probabilidades. Por ende, **todas las ramas activas de un nodo de azar en la ruta óptima deben propagar el camino activo** para que las decisiones subsecuentes queden vinculadas a la raíz.

---

## 3. Implementación Técnica

### A. Algoritmo Recursivo `propagateOptimalPath` en [tree_engine.js](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/tree_engine.js)

Se implementó la función recursiva que recorre el árbol de arriba hacia abajo tras calcular los valores:

```javascript
function propagateOptimalPath(node, active) {
    if (!node || !node.children) return;
    
    if (node.type === 'decision') {
        node.children.forEach(c => {
            const isChosen = active && (c._isChosen === true);
            c._optimal = isChosen;
            propagateOptimalPath(c, isChosen);
        });
    } else if (node.type === 'chance') {
        // En un nodo de azar en ruta activa, TODAS sus ramas hijas válidas son activas
        node.children.forEach(c => {
            c._optimal = active;
            propagateOptimalPath(c, active);
        });
    } else {
        node.children.forEach(c => {
            c._optimal = active;
            propagateOptimalPath(c, active);
        });
    }
}
```

### B. Descuento Neto de Costos de Rama

En `calcEV(node)` y `calcCE(node)`:

```javascript
// Obtención del costo de la rama (soporta campo cost o value negativo)
const branchCost = (c.cost !== undefined && !isNaN(c.cost))
  ? Number(c.cost)
  : (c.type === 'decision' && c.value !== undefined ? -Number(c.value) : 0);

// Deducción neta antes de ponderar por la probabilidad
const effectiveChildValue = (cev !== null ? cev : 0) - branchCost;
sum += (c.prob || 0) * effectiveChildValue;
```

### C. Conexiones Visuales Doradas en [canvas_ui.js](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/canvas_ui.js)

En `drawConnectors()`:
```javascript
const isOpt = child._optimal === true;
if (isOpt) {
    el.setAttribute('class', 'path-optimal');
}
```
Esto activa la clase CSS `.path-optimal` (`stroke: #f5c842`, trazo de 3.5px y animación de resplandor).

---

## 4. Batería de Pruebas de Verificación Automatizadas

Se diseñó y ejecutó el script de validación `scratch/test_bug02_runner.js`:

```text
========================================================
 BATERÍA DE PRUEBAS DE VERIFICACIÓN (BUG-02)
========================================================

[TEST 1] Continuidad de Ruta Óptima en Secuencia Azar -> Decisión:
  - EV Raíz Azar: $68 (0.6 * 100 + 0.4 * 20)
  - EV Decisión D1: $100
  - Conexión Raíz -> Decisión (D1._optimal): true
  - Conexión Decisión -> Alt 1 (T1._optimal): true
  - Conexión Decisión -> Alt 2 (T2._optimal): false
  - Conexión Raíz -> Terminal (T3._optimal): true
  -> RESULTADO TEST 1: [PASS] Continuidad completa desde la raíz hasta la hoja ganadora.

[TEST 2] Propagación Neta de Costos en Ramas Intermedias (costo $10):
  - VE bruto en Decisión D1: $100
  - Costo de la rama D1: $10
  - Valor Neto en Decisión D1 (VE - Costo): $90
  - EV final en Raíz Azar: $62 (0.6 * 90 + 0.4 * 20)
  - Conexión Raíz -> D1 (D1._optimal): true
  -> RESULTADO TEST 2: [PASS] Costo descontado netamente y Valor Esperado exacto ($62).

[TEST 2B] Retrocompatibilidad de Costos vía value: -10:
  - EV final con value = -10: $62
  -> RESULTADO TEST 2B: [PASS] Total retrocompatibilidad con value negativo.

[TEST 3] Integridad de Ejemplos Nativos del Sistema:
  - Ejemplo "launch": EV = $82.000 [PASS]
  - Ejemplo "invest": EV = $62.000 [PASS]
  - Ejemplo "bayes": EV = $89.200 [PASS]

========================================================
 TODAS LAS PRUEBAS DE BUG-02 COMPLETADAS EXITOSAMENTE
========================================================
```

