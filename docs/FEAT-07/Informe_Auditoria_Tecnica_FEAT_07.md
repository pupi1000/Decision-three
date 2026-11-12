# INFORME DE AUDITORÍA TÉCNICA Y MATEMÁTICA
## Funcionalidad FEAT-07: Motor Bayesiano Completo y Validación de Normalización (Eppen)
### DecisionTree Pro v5.0.0 — Sprint 2

---

### METADATOS DEL DOCUMENTO
- **Proyecto / Módulo:** DecisionTree Pro v5.0.0 — Motor y UI Probabilística
- **Funcionalidad / ID:** FEAT-07 (Backlog Sprint 2: Motor Bayesiano y Normalización Eppen)
- **Sprint / Ciclo:** Sprint 2 — Inferencia Bayesiana y Calidad Probabilística
- **Estado de la Auditoría:** **COMPLETADA — DIAGNÓSTICO MATEMÁTICO REALIZADO**
- **Rama Git de Trabajo:** `feature/feat-07-motor-bayesiano-eppen`
- **Dependencias Técnicas:** BUG-03 Resuelto e Integrado (Commit `9d6ceb8`)

---

### 1. IDENTIFICACIÓN DE LA FUNCIONALIDAD
La funcionalidad objeto de la presente auditoría está identificada oficialmente como **FEAT-07: Motor Bayesiano Completo y Validación de Normalización (Eppen)**. Su propósito es dotar a DecisionTree Pro de una infraestructura probabilística rigurosa, desacoplada y formal basada en el modelo de toma de decisiones bajo información imperfecta de Eppen, Taha y Hillier & Lieberman.

---

### 2. DESCRIPCIÓN OFICIAL DE LA TARJETA EN TRELLO
> *«Implementar y auditar el flujo probabilístico bayesiano formal según el modelo de información imperfecta de Eppen».*

---

### 3. ALCANCE Y CRITERIOS DE ACEPTACIÓN (TRELLO CHECKLIST)

| ID Criterio | Descripción del Requisito | Fórmula / Condición Matemática |
| :--- | :--- | :--- |
| **FEAT-07-AC-01** | Validación de probabilidades conjuntas | $\sum_i \sum_j P(\theta_i \cap z_j) = 1.0$ |
| **FEAT-07-AC-02** | Cálculo de probabilidades marginales | $P(z_j) = \sum_i [P(\theta_i) \times P(z_j \mid \theta_i)]$ |
| **FEAT-07-AC-03** | Cálculo y validación de probabilidades posteriores | $P(\theta_i \mid z_j) = \frac{P(\theta_i \cap z_j)}{P(z_j)}$ con $\sum_i P(\theta_i \mid z_j) = 1.00$ |
| **FEAT-07-AC-04** | Normalización de nodos de azar | $\sum P(\text{rama}) = 1.00$ y $0 \le P(\text{rama}) \le 1$ |

---

### 4. ARQUITECTURA ACTUAL DEL SISTEMA PROBABILÍSTICO
El sistema actual gestiona las probabilidades a través de dos mecanismos parcialmente desacoplados:
1. **Motor Jerárquico de Nodos (`tree_engine.js`):** Cada nodo de azar (`chance`) almacena ramas terminales o subárboles con su probabilidad en la propiedad `prob`. La función `validateNodeProbabilities(node)` examina que $0 \le \text{prob} \le 1$ y que $|\sum \text{prob} - 1.0| < 0.001$.
2. **Calculadora Bayesiana de Interfaz (`tree_engine.js` / `canvas_ui.js`):** Existe un modal HTML (`#bayes-overlay`) que permite definir hipótesis (`bayesHyps`) y evidencias (`bayesEvs`). La rutina `runBayes()` realiza cálculos de probabilidades conjuntas por evidencia aislada y calcula posteriores simples.

---

### 5. ARCHIVOS Y FUNCIONES INSPECCIONADOS

| Archivo Fuente | Función / Componente | Diagnóstico Actual |
| :--- | :--- | :--- |
| `tree_engine.js` | `runBayes()` | **PARCIAL:** Calcula marginal y posterior pero sin matriz conjunta unificada ni validación de sumas cruzadas. |
| `tree_engine.js` | `validateNodeProbabilities(node)` | **FUNCIONA:** Valida rango $[0,1]$ y sumatoria $= 1.000$ con tolerancia $0.001$. |
| `tree_engine.js` | `collectProbErrors(node, errors)` | **FUNCIONA:** Recorre recursivamente el árbol y recopila nodos de azar con errores. |
| `canvas_ui.js` | `renderBayesInputs()`, `openBayes()` | **FUNCIONA:** Gestiona la entrada de datos visual en la modal pero sin validación reactiva de verosimilitudes. |
| `tree_engine.js` | `calculateVEIM(rootNode)` | **FUNCIONA:** Utiliza probabilidades marginales y decisiones posteriores en árboles bayesianos. |

---

### 6. ESTADO DETALLADO DE LOS COMPONENTES PROBABILÍSTICOS

- **6.1. Probabilidades a priori $P(\theta_i)$:**  
  El sistema valida que cada $P(\theta_i) \in [0, 1]$ y que $\sum P(\theta_i) = 1.000$ (tolerancia 0.001). Si falla, bloquea el cálculo y emite mensaje en `#bayes-warn`. *(ESTADO: FUNCIONA)*.
- **6.2. Probabilidades condicionales $P(z_j \mid \theta_i)$:**  
  El sistema verifica que cada celda individual esté en $[0, 1]$. Sin embargo, **NO** valida la condición fundamental de Eppen: para cada estado $\theta_i$, las verosimilitudes deben sumar 1 a lo largo de las evidencias: $\sum_j P(z_j \mid \theta_i) = 1$. *(ESTADO: DEFICIENTE)*.
- **6.3. Probabilidades conjuntas $P(\theta_i \cap z_j)$:**  
  Calcula el producto $P(\theta_i) \times P(z_j \mid \theta_i)$ en cada evidencia por separado. **NO** genera la matriz conjunta bidimensional de Eppen ($m$ estados $\times$ $n$ señales) y **NO** valida que la suma de todas las celdas conjuntas sea 1.0 ($\sum_i \sum_j P(\theta_i \cap z_j) = 1.0$). *(ESTADO: INCUMPLE FEAT-07-AC-01)*.
- **6.4. Probabilidades marginales $P(z_j)$:**  
  Calcula la suma marginal por evidencia. No valida que el vector marginal completo sume 1.0 ($\sum_j P(z_j) = 1.0$). *(ESTADO: PARCIAL)*.
- **6.5. Probabilidades posteriores $P(\theta_i \mid z_j)$:**  
  Calcula conjunta / marginal. Cuando $P(z_j) = 0$, genera `[0, 0]` y muestra `0.0000 (Indef.)` sin un objeto semántico estructurado. No valida numéricamente la normalización de la posterior. *(ESTADO: PARCIAL)*.

---

### 7. AUDITORÍA DE NODOS DE AZAR EN EL LIENZO
La normalización de nodos de azar en `tree_engine.js` está regida por `validateNodeProbabilities(node)`:
- **Rango $[0, 1]$:** Detecta valores $< 0$ o $> 1$, asignando `hasRangeError = true` y texto `Err: p ∉ [0, 1]`.
- **Sumatoria $= 1.000$:** Verifica que $|\sum p - 1.0| < 0.001$. Si no cumple, asigna `hasProbabilityError = true` y texto `Σ=... ≠ 1`.
- **Rollback:** La función `calcEV(node)` aborta el cálculo devolviendo `null` para el nodo cuando tiene error de probabilidad, impidiendo cálculos engañosos.
- **Conexión Bayes-Árbol:** Actualmente no existe un botón o método en la Calculadora Bayesiana para transferir las probabilidades posteriores o marginales calculadas hacia un nodo de azar seleccionado en el árbol.

---

### 8. ESCENARIOS DE DIAGNÓSTICO CONTROLADOS (ESCENARIOS A - J)

| Escenario | Condición Probabilística Evaluada | Comportamiento del Código Actual | Estado |
| :--- | :--- | :--- | :---: |
| **Escenario A** | Distribución bayesiana válida (2x2) | Calcula conjuntas, marginales y posteriores correctamente | **OK** |
| **Escenario B** | Tabla conjunta cuya suma es $\ne 1.0$ | **NO valida sumatoria de conjuntas; permite suma 1.70** | **DEFICIENCIA** |
| **Escenario C** | Condicionales inválidas ($\sum \text{lik} \ne 1$) | **NO valida que verosimilitudes por estado sumen 1.0** | **DEFICIENCIA** |
| **Escenario D** | A priori fuera de rango o suma $\ne 1$ | Detecta error de suma y rango; emite advertencia | **OK** |
| **Escenario E** | Distribución posterior suma $\ne 1$ | No valida formalmente sumatoria de posteriores | **PARCIAL** |
| **Escenario F** | Marginal igual a cero ($P(z) = 0$) | Asigna ceros `[0,0]` y muestra "Indef.", sin objeto semántico | **PARCIAL** |
| **Escenario G** | Nodo azar suma ramas $\ne 1.0$ | Detecta error, asigna badge rojo y `calcEV` retorna `null` | **OK** |
| **Escenario H** | Nodo azar con probabilidad $<0$ o $>1$ | Detecta error de rango `Err: p ∉ [0, 1]` | **OK** |
| **Escenario I** | Múltiples nodos de azar independientes | `collectProbErrors` aísla nodos y valida individualmente | **OK** |
| **Escenario J** | Árbol importado vía `loadTreeFromJSON` | Deserializa limpiamente y valida normalización | **OK** |

---

### 9. DEFICIENCIAS TÉCNICAS IDENTIFICADAS

1. **Deficiencia Crítica 1 (Incumplimiento FEAT-07-AC-01):** No se valida la suma global de la tabla de probabilidades conjuntas $\sum_i \sum_j P(\theta_i \cap z_j) = 1.0$. Esto permite ingresar verosimilitudes inconsistentes sin que el sistema lo alerte.
2. **Deficiencia Crítica 2:** Falta de validación condicional por estado $\sum_j P(z_j \mid \theta_i) = 1.0$. En el modelo formal de Eppen, las señales para un estado dado constituyen una partición del espacio muestral.
3. **Deficiencia 3:** La calculadora bayesiana está acoplada al DOM en `runBayes()` y no existe un motor matemático reutilizable y desacoplado (`BayesEngine`).

---

### 10. RIESGOS TÉCNICOS Y MATEMÁTICOS
1. **Distorsión del Valor Esperado con Información Muestral (VEIM):** Si las probabilidades conjuntas y marginales son inconsistentes, el cálculo del VEIM y la eficiencia del estudio de mercado generarán valores falsos o fuera de límites.
2. **Inestabilidad por División entre Cero:** Casos con marginal $P(z_j) = 0$ deben ser manejados de forma determinista y explícita, evitando propagar NaN o distribuciones posteriores ficticias.

---

### 11. PROPUESTA DE ARQUITECTURA Y SOLUCIÓN
Se propone estructurar un módulo matemático puro y canónico exportado globalmente (`window.BayesEngine`):
- `validateBayesianInputs(hyps, evs, tolerance)`: Valida que $P(\theta_i) \in [0,1]$, $\sum P(\theta_i)=1$, y que para cada $\theta_i$, $\sum_j P(z_j \mid \theta_i) = 1$.
- `computeJointMatrix(hyps, evs)`: Calcula matriz $m \times n$ y valida que el gran total $\sum \sum P(\theta_i \cap z_j) = 1.0$ (**FEAT-07-AC-01**).
- `computeMarginals(jointMatrix)`: Calcula $P(z_j)$ sumando columnas y valida que $\sum P(z_j) = 1.0$ (**FEAT-07-AC-02**).
- `computePosteriors(jointMatrix, marginals)`: Calcula $P(\theta_i \mid z_j)$ y valida $\sum_i P(\theta_i \mid z_j) = 1.00$ para cada señal válida, manejando $P(z_j)=0$ como señal imposible (**FEAT-07-AC-03**).
- **Interfaz de Tabla Unificada Eppen:** Visualizar en la modal la matriz de probabilidades conjuntas y marginales de Eppen en una sola tabla elegante, y permitir aplicar probabilidades al nodo de azar seleccionado (**FEAT-07-AC-04**).

---

### 12. TRAZABILIDAD DE HALLAZGOS CON CRITERIOS DE ACEPTACIÓN

| Criterio Trello | Estado Auditado | Acción de Corrección / Implementación |
| :--- | :---: | :--- |
| **FEAT-07-AC-01**<br>Validación conjuntas $= 1.0$ | **NO CUMPLE** | Implementar cálculo de matriz conjunta $m \times n$ y validación obligatoria $\sum \sum = 1.000$. |
| **FEAT-07-AC-02**<br>Cálculo de marginales | **PARCIAL** | Calcular sumas por columna y verificar normalización de la distribución marginal. |
| **FEAT-07-AC-03**<br>Posteriores y sumas $= 1.0$ | **PARCIAL** | Verificar $\sum_i P(\theta_i \mid z_j) = 1.00$ para cada señal y gestionar $P(z_j)=0$ como observación imposible. |
| **FEAT-07-AC-04**<br>Normalización nodos de azar | **CUMPLE (MOTOR)** | Preservar `validateNodeProbabilities` e incorporar transferencia directa desde Bayes al nodo de azar. |

---

### 13. EVIDENCIAS TÉCNICAS
- JSON de ejecución de escenarios: [`docs/FEAT-07/evidencias/EVIDENCIA_01_Auditoria_Escenarios_A_a_J.json`](file:///c:/Users/Viviana/Documents/GitHub/Decision-three/docs/FEAT-07/evidencias/EVIDENCIA_01_Auditoria_Escenarios_A_a_J.json)
- Capturas de pantalla:
  - [`docs/FEAT-07/evidencias/CAPTURA_01_Calculadora_Bayesiana_Inicial.png`](file:///c:/Users/Viviana/Documents/GitHub/Decision-three/docs/FEAT-07/evidencias/CAPTURA_01_Calculadora_Bayesiana_Inicial.png)
  - [`docs/FEAT-07/evidencias/CAPTURA_02_Lienzo_Validacion_Nodos_Azar.png`](file:///c:/Users/Viviana/Documents/GitHub/Decision-three/docs/FEAT-07/evidencias/CAPTURA_02_Lienzo_Validacion_Nodos_Azar.png)
  - [`docs/FEAT-07/evidencias/CAPTURA_03_Modal_VEIM_Relacion_Metodologica.png`](file:///c:/Users/Viviana/Documents/GitHub/Decision-three/docs/FEAT-07/evidencias/CAPTURA_03_Modal_VEIM_Relacion_Metodologica.png)
