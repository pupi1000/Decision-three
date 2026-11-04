# Hito 3: Corrección Crítica BUG-01 — Validación de Axiomas de Probabilidad

**Autor / Responsable:** Einar Andrés Guillén Boero (`pupi1000` / `einar.guillen@ucb.edu.bo`)  
**Rama:** `bugfix/bug-01-probabilidades`  
**Commits:** `a720999` y `c51475a` (PR `#2`, integrado en `35bb366`)  
**Estado:** Integrado y Verificado  

---

## 1. Fundamento Teórico (Axiomas de Kolmogorov)

En la teoría formal de probabilidades, una distribución discreta asignada a los $k$ eventos disjuntos de un nodo de azar debe satisfacer estrictamente dos axiomas fundamentales:

1. **Axioma de No-Negatividad y Acotación (Rango Válido):**
   $$0 \le p_i \le 1, \quad \forall i \in \{1, 2, \dots, k\}$$
   Ninguna probabilidad puede ser negativa ni superar la certeza absoluta ($1.0$).

2. **Axioma de Normalización (Suma Unitaria):**
   $$\sum_{i=1}^{k} p_i = 1.0$$

---

## 2. Diagnóstico del Defecto

En la implementación previa del motor, la función de validación de probabilidades únicamente realizaba la suma aritmética de las ramas hijas y evaluaba:

```javascript
// Código anterior vulnerable:
const sum = node.children.reduce((acc, c) => acc + (c.prob || 0), 0);
const isValid = Math.abs(sum - 1.0) < 0.001;
```

### Vulnerabilidad Crítica Detectada:
Si un usuario ingresaba valores absurdos o erróneos como:
- Rama 1: $p_1 = 1.4$
- Rama 2: $p_2 = -0.4$

La suma aritmética resultaba exactamente $1.4 + (-0.4) = 1.0$. Por consiguiente:
1. El sistema marcaba erróneamente el badge en color **verde** (`ok`).
2. El motor calculaba un Valor Esperado ($VE$) matemática y lógicamente corrupto.
3. El árbol propagaba la ruta óptima sobre datos teóricamente imposibles.

---

## 3. Solución Implementada en el Código

### A. Cláusula de Guarda por Rama Individual en [tree_engine.js](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/tree_engine.js)

Se modificó la lógica de validación para inspeccionar cada rama de forma aislada antes de evaluar la suma:

```javascript
let hasRangeError = false;
let sum = 0;

for (const c of node.children) {
    const p = (c.prob !== undefined && !isNaN(c.prob)) ? Number(c.prob) : null;
    if (p !== null) {
        // Cláusula de guarda: Axioma 0 <= p <= 1
        if (p < 0.0 || p > 1.0) {
            hasRangeError = true;
        }
        sum += p;
    }
}

// Determinación del estado de error y configuración del badge
if (hasRangeError) {
    node.hasProbabilityError = true;
    node._probBadgeText = 'Err: p ∉ [0, 1]';
    node._probBadgeClass = 'prob-badge warn';
} else if (Math.abs(sum - 1.0) >= 0.001) {
    node.hasProbabilityError = true;
    node._probBadgeText = `Σ=${sum.toFixed(2)} ≠ 1`;
    node._probBadgeClass = 'prob-badge warn';
} else {
    node.hasProbabilityError = false;
    node._probBadgeText = 'Σ=1.00';
    node._probBadgeClass = 'prob-badge ok';
}
```

### B. Bloqueo de la Inducción Hacia Atrás (Rollback)

En `calcEV(node)` y `calcCE(node)`:
- Si el nodo de azar tiene `hasProbabilityError === true`, se anula el cálculo numérico asignando `node.value = null` (o `NaN`).
- Se impide que se dibuje la ruta dorada si el árbol contiene nodos con probabilidades inválidas, garantizando que el usuario nunca tome decisiones basadas en axiomas violados.

### C. Actualización Gráfica en [canvas_ui.js](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/canvas_ui.js)

El generador de insignias sobre nodos de azar consume directamente `node._probBadgeText` y `node._probBadgeClass`, mostrando en color rojo/naranja el mensaje explícito `Err: p ∉ [0, 1]`.

---

## 4. Matriz de Comportamiento del Badge

| Escenario | Ejemplo de Probabilidades | Estado Visual | Texto del Badge | ¿Calcula VE? |
| :--- | :--- | :--- | :--- | :--- |
| **Probabilidad negativa** | $p_1 = -0.2, p_2 = 1.2$ | Rojo / Naranja (`warn`) | `Err: p ∉ [0, 1]` | ❌ No (`null`) |
| **Probabilidad superior a 1** | $p_1 = 1.4, p_2 = 0.2$ | Rojo / Naranja (`warn`) | `Err: p ∉ [0, 1]` | ❌ No (`null`) |
| **Suma menor a 1.0** | $p_1 = 0.5, p_2 = 0.3$ | Rojo / Naranja (`warn`) | `Σ=0.80 ≠ 1` | ❌ No (`null`) |
| **Suma mayor a 1.0** | $p_1 = 0.6, p_2 = 0.6$ | Rojo / Naranja (`warn`) | `Σ=1.20 ≠ 1` | ❌ No (`null`) |
| **Distribución Válida** | $p_1 = 0.6, p_2 = 0.4$ | Verde (`ok`) | `Σ=1.00` | ✔️ Sí (VE exacto) |

