# INFORME DE DISEÑO TÉCNICO Y MATEMÁTICO
## Funcionalidad FEAT-07: Motor Bayesiano Completo y Validación de Normalización (Eppen)
### DecisionTree Pro v5.0.0 — Sprint 2

---

### METADATOS DEL DOCUMENTO
- **Proyecto / Módulo:** DecisionTree Pro v5.0.0 — Motor y UI Probabilística
- **Funcionalidad / ID:** FEAT-07 (Sprint 2: Motor Bayesiano y Normalización Eppen)
- **Fase de Ingeniería:** **FASE II — DISEÑO ARQUITECTÓNICO Y MATEMÁTICO**
- **Estado del Diseño:** **APROBADO PARA IMPLEMENTACIÓN**
- **Rama Git de Trabajo:** `feature/feat-07-motor-bayesiano-eppen`
- **Objetivo Principal:** Satisfacer plenamente los cuatro criterios de aceptación de Trello mediante un motor desacoplado.

---

### 1. RESUMEN DE HALLAZGOS Y DEFICIENCIAS DE LA AUDITORÍA
La auditoría técnica formal (documentada en `Informe_Auditoria_Tecnica_FEAT_07.docx`) demostró que, si bien DecisionTree Pro contaba con una calculadora bayesiana visual básica y validación local de nodos de azar, existían tres brechas arquitectónicas y matemáticas críticas:
1. **Ausencia de Validación de Probabilidades Conjuntas (AC-01):** El sistema calculaba productos aislados por evidencia pero no evaluaba la suma de toda la tabla conjunta $\sum_i \sum_j P(\theta_i \cap z_j) = 1.0$.
2. **Ausencia de Validación Condicional por Estado:** No se exigía que las verosimilitudes de cada estado sumaran 1 a través de las señales ($\sum_j P(z_j \mid \theta_i) = 1.0$), permitiendo distribuciones físicamente imposibles.
3. **Acoplamiento DOM y Falta de Motor Puro:** La lógica estaba incrustada en `runBayes()` interactuando directamente con el DOM sin exponer una API matemática reutilizable ni permitir aplicar las probabilidades resultantes a los nodos de azar del canvas.

---

### 2. ARQUITECTURA PROPUESTA: MÓDULO BAYESENGINE DESACOPLADO
Se diseña un subsistema con arquitectura de tres capas claramente separadas:

- **Capa 1: Motor Matemático Puro (`BayesEngine`):** Colección de funciones deterministas sin dependencias del DOM, responsables de validar distribuciones, generar la matriz de Eppen, computar marginales, calcular posteriores y manejar indeterminaciones.
- **Capa 2: Adaptador de Integración y Sincronización:** Funciones puente que conectan los resultados bayesianos con los nodos de azar (`chance`) del árbol jerárquico, permitiendo inyectar distribuciones posteriores y actualizar las etiquetas `probLabel` (`prior`, `posterior`, `marginal`).
- **Capa 3: Interfaz de Usuario y Presentación (Modal Eppen):** Visualización unificada que presenta la Matriz Conjunta de Eppen (estados en filas, señales en columnas, marginales en pie de columna y total 1.0000), tabla de posteriores por señal, y controles interactivos.

---

### 3. FLUJO MATEMÁTICO FORMAL SEGÚN EL MODELO DE EPPEN

1. **Validación a priori:** Verificar que $\forall i, 0 \le P(\theta_i) \le 1$ y que $|\sum_i P(\theta_i) - 1.0| < \epsilon$.
2. **Validación condicional:** Para cada estado $\theta_i$, verificar que $\forall j, 0 \le P(z_j \mid \theta_i) \le 1$ y que $|\sum_j P(z_j \mid \theta_i) - 1.0| < \epsilon$.
3. **Matriz Conjunta (Eppen):** Calcular cada celda $(i, j)$:
   $$P(\theta_i \cap z_j) = P(\theta_i) \times P(z_j \mid \theta_i)$$
   Verificar que $|\sum_i \sum_j P(\theta_i \cap z_j) - 1.0| < \epsilon$ (**FEAT-07-AC-01**).
4. **Vector de Probabilidades Marginales:** Para cada señal $z_j$:
   $$P(z_j) = \sum_i P(\theta_i \cap z_j) = \sum_i [P(\theta_i) \times P(z_j \mid \theta_i)]$$
   Verificar que $|\sum_j P(z_j) - 1.0| < \epsilon$ (**FEAT-07-AC-02**).
5. **Distribuciones Posteriores:** Para cada señal $z_j$ con $P(z_j) > \epsilon$:
   $$P(\theta_i \mid z_j) = \frac{P(\theta_i \cap z_j)}{P(z_j)}$$
   Verificar que $|\sum_i P(\theta_i \mid z_j) - 1.0| < \epsilon$ (**FEAT-07-AC-03**).
6. **Gestión de Señales Imposibles ($P(z_j) = 0$):** Si $P(z_j) \le \epsilon$, la posterior no está definida matemáticamente. El motor clasifica $z_j$ como evento imposible, asigna `defined: false` y advierte al usuario sin arrojar `NaN` ni `Infinity`.

---

### 4. MODELO DE DATOS CANÓNICO

```javascript
// Estructura canónica del resultado de BayesEngine.solveSystem():
{
  success: true, // boolean
  hypotheses: ['θ1', 'θ2'], // etiquetas
  evidences: ['z1', 'z2'], // etiquetas
  priors: [0.60, 0.40],
  likelihoods: [
    [0.80, 0.30], // z1 dado [θ1, θ2]
    [0.20, 0.70]  // z2 dado [θ1, θ2]
  ],
  jointMatrix: [
    [0.48, 0.12], // θ1 con [z1, z2]
    [0.12, 0.28]  // θ2 con [z1, z2]
  ],
  totalJointSum: 1.0000,
  marginals: [
    { label: 'z1', prob: 0.60, isPossible: true },
    { label: 'z2', prob: 0.40, isPossible: true }
  ],
  totalMarginalSum: 1.0000,
  posteriorsByEvidence: [
    {
      evidenceLabel: 'z1',
      marginal: 0.60,
      isPossible: true,
      distribution: [
        { hypLabel: 'θ1', prob: 0.80 },
        { hypLabel: 'θ2', prob: 0.20 }
      ],
      sum: 1.0000
    },
    {
      evidenceLabel: 'z2',
      marginal: 0.40,
      isPossible: true,
      distribution: [
        { hypLabel: 'θ1', prob: 0.30 },
        { hypLabel: 'θ2', prob: 0.70 }
      ],
      sum: 1.0000
    }
  ],
  errors: [],
  warnings: []
}
```

---

### 5. POLÍTICA DE VALIDACIÓN Y TOLERANCIA NUMÉRICA
Se establece como política estándar del motor una tolerancia configurable:
$$\epsilon = 0.001 \quad (10^{-3})$$
Esta tolerancia absorbe imprecisiones numéricas de punto flotante IEEE 754 en JavaScript, diferenciando errores sustantivos de representación. Todo valor fuera de $[- \epsilon, 1 + \epsilon]$ es rechazado estrictamente.

---

### 6. INTEGRACIÓN CON NODOS DE AZAR (FEAT-07-AC-04)
1. **Validación Universal en Canvas:** `validateNodeProbabilities(node)` se preserva como guardián de integridad para cada nodo de azar, impidiendo que el motor de Rollback resuelva modelos con probabilidades distorsionadas.
2. **Inyección de Probabilidades desde la Calculadora:** Se incorpora el botón `"Aplicar a Nodo de Azar"` en la interfaz modal. Cuando el usuario selecciona una señal (ej. $z_1$) y pulsa este botón con un nodo de azar seleccionado en el árbol, las ramas hijas adoptan automáticamente las probabilidades posteriores $P(\theta_i \mid z_1)$, actualizando sus etiquetas y recalculando el árbol de forma instantánea.

---

### 7. ESTRATEGIA DE PRUEBAS Y VALIDACIÓN

| Tipo de Prueba | Escenario Clave | Criterio Trello Validado |
| :--- | :--- | :--- |
| **Pruebas Matemáticas Canónicas** | Caso Clásico Eppen 2×2 ($P(\theta)=[0.6,0.4]$, liks) | **AC-01** (Conjuntas), **AC-02** (Marginales), **AC-03** (Posteriores) |
| **Pruebas de Límites y Cero** | Señal con $P(z)=0$ (evento imposible, sin NaN) | **AC-03** y robustez numérica |
| **Pruebas Negativas de Entrada** | Sumatorias $\ne 1.0$ y valores fuera de $[0,1]$ | Detección temprana y comunicación de errores |
| **Pruebas de Integración y UI** | Inyección de distribución a nodo de azar y Rollback | **AC-04** (Normalización de nodos en árbol) |

---

### 8. ARCHIVOS QUE SE MODIFICARÁN
1. `tree_engine.js`: Implementación del namespace canónico `BayesEngine` con todas las funciones matemáticas puras y su exportación en `window`.
2. `canvas_ui.js`: Actualización de la función `renderBayesInputs()`, `runBayes()`, tabla unificada de Eppen y función `applyBayesToSelectedNode()`.
3. `index.html` / `styles.css`: Soporte de renderizado visual para la Matriz Conjunta de Eppen y botones de acción.
