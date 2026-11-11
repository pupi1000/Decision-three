# Módulo [FEAT-02]: Cálculo Automatizado de VEIP (Valor Esperado de la Información Perfecta)

**Autor / Responsable:** Einar Andrés Guillén Boero (`pupi1000` / `einar.guillen@ucb.edu.bo`)  
**Rama:** `feature/feat-02-calculo-veip`  
**Archivos Intervenidos:** [`tree_engine.js`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/tree_engine.js), [`canvas_ui.js`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/canvas_ui.js), [`index.html`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/index.html), [`styles.css`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/styles.css), [`src/ui/toolbar.js`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/src/ui/toolbar.js), [`src/ui/ui-events.js`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/src/ui/ui-events.js)  
**Estado:** Implementado, Verificado y Documentado  

---

## 1. Fundamentos Teóricos (Eppen / Hillier & Lieberman)

El **Valor Esperado de la Información Perfecta (VEIP)** representa el beneficio económico incremental que un decisor racional obtendría si contara con un predictor perfecto o "clarividente" que le indicara con certeza absoluta qué estado de la naturaleza $\theta_j$ ocurrirá antes de seleccionar la alternativa de acción $d_i$.

### A. Valor Esperado Sin Información Perfecta (VEsIP)
Corresponde al valor óptimo obtenido mediante el algoritmo de retroceso inductivo (*Rollback / Backward Induction*) sobre el árbol actual:
$$\text{VEsIP} = \text{Rollback}(\text{Árbol}) = \max_i \left\{ \sum_j P(\theta_j) \cdot R_{ij} \right\}$$
*(En caso de minimización de costos, se aplica $\min_i$).*

### B. Valor Esperado Con Información Perfecta (VEcIP)
Si el tomador de decisiones conociera de antemano el estado $\theta_j$, seleccionaría inmediatamente la mejor alternativa para dicho estado:
$$\text{Mejor\_Resultado}(\theta_j) = \max_i \{ R_{ij} \}$$
El valor esperado ponderado sobre todos los estados de la naturaleza es:
$$\text{VEcIP} = \sum_{j} P(\theta_j) \cdot \text{Mejor\_Resultado}(\theta_j)$$

### C. Valor Esperado de la Información Perfecta (VEIP)
$$\text{VEIP} = | \text{VEcIP} - \text{VEsIP} |$$

> **Regla de Decisión Gerencial:** El VEIP constituye el **techo presupuestario superior**. Ninguna organización racional debería pagar un monto superior al VEIP por un estudio de mercado, consultoría o investigación preliminar.

---

## 2. Implementación en el Motor (`tree_engine.js`)

Se diseñó la función analítica `calculateVEIP(rootNode, mode = 'max')`:
1. **Identificación de la Decisión Principal:** Detecta el nodo raíz o el primer nodo de decisión subsiguiente con alternativas bajo incertidumbre.
2. **Extracción y Deducción Neta:** Extrae las alternativas $d_i$, las ramas de azar $\theta_j$ con sus probabilidades $P(\theta_j)$ y los pagos terminales, deduciendo de forma neta cualquier costo de inversión o valor inicial:
   $$\text{Pago Neto} = \text{Pago Terminal} - \text{Costo Rama} - \text{Costo Inicial}$$
3. **Manejo de Alternativas Deterministas:** Si existen ramas como *"No lanzar"* o *"Depósito bancario"* sin nodos de azar, su rendimiento garantizado compite contra cada uno de los estados de la naturaleza.
4. **Matriz de Detalle y Cálculo:** Retorna un objeto estructurado:
   ```javascript
   {
     success: true,
     mode: 'max', // o 'min'
     vesip: Number,
     vecip: Number,
     veip: Number,
     alternatives: ['Lanzar', 'No lanzar'],
     detailTable: [
       {
         state: 'Alta demanda',
         prob: 0.6,
         bestDecision: 'Lanzar',
         bestPayoff: 150000,
         contribution: 90000
       },
       ...
     ]
   }
   ```
5. **Cláusulas de Guarda:** Si el árbol no presenta alternativas válidas, tiene errores de probabilidad o carece de eventos de azar, retorna un mensaje explicativo informando los requisitos estructurales.

---

## 3. Interfaz de Usuario y Presentación Visual

1. **Activación en el Ribbon (`src/ui/toolbar.js` y `src/ui/ui-events.js`):**
   - El botón **VEIP** en la pestaña *Métodos Cuantitativos $\rightarrow$ Valor de Información* ejecuta directamente el análisis analítico (`openVEIP()`).
2. **Ventana Modal Especializada (`#modal-veip` en `index.html`):**
   - **Tarjetas Métricas (Grid 3x):**
     - **VEsIP:** Valor actual por Rollback.
     - **VEcIP:** Rendimiento óptimo con información perfecta.
     - **VEIP (Destacado en dorado):** Límite presupuestario máximo con resplandor.
   - **Tabla Desglosada:** Estado de la Naturaleza | Probabilidad $P(\theta)$ | Decisión Óptima | Pago Asociado | Contribución Ponderada.
   - **Interpretación Gerencial:** Párrafo explicativo dinámico adaptado a los números del modelo.
   - **Acciones:** Botón de copiado de reporte ejecutivo al portapapeles (`copyVEIPSummary()`), acceso al marco teórico y botón de cierre.
3. **Estilos Institucionales en `styles.css`:**
   - Clases `.veip-grid`, `.veip-card.highlight`, `.veip-table`, `.veip-info-box` integradas con la paleta oscura de la plataforma.

---

## 4. Batería de Pruebas de Verificación Automatizadas

Se diseñó la suite unitaria en `scratch/run_veip_suite.js`, evaluando casos estándar de la literatura:

```text
========================================================
 BATERÍA DE PRUEBAS DE VERIFICACIÓN: MÓDULO VEIP (FEAT-02)
========================================================

[TEST 1] Caso Clásico de Lanzamiento de Producto
[PASS] Test 1.1: Cálculo exitoso en árbol launch
[PASS] Test 1.2: VEsIP correcto = $82.000
[PASS] Test 1.3: VEcIP correcto = $90.000 (0.6*150k + 0.4*0)
[PASS] Test 1.4: VEIP exacto = $8.000 (|90k - 82k|)
[PASS] Test 1.5: 2 estados de la naturaleza desglosados

[TEST 2] Problema Clásico de Expansión (Hillier / Lieberman)
[PASS] Test 2.1: Cálculo exitoso en modelo Hillier
[PASS] Test 2.2: VEsIP = $52.000 (Planta pequeña: 0.6*100k + 0.4*(-20k) = 52k)
[PASS] Test 2.3: VEcIP = $120.000 (0.6*200k + 0.4*0)
[PASS] Test 2.4: VEIP = $68.000 (|120k - 52k|)

[TEST 3] Criterio de Minimización (Costos)
[PASS] Test 3.1: Cálculo exitoso en minimización
[PASS] Test 3.2: VEsIP de costos = 75
[PASS] Test 3.3: VEcIP de costos = 65
[PASS] Test 3.4: VEIP de costos = 10 (|65 - 75|)

[TEST 4] Robustez y Manejo de Errores
[PASS] Test 4.1: Rechazo correcto de árbol nulo
[PASS] Test 4.2: Rechazo correcto de árbol sin decisiones ni azar

[TEST 5] Interoperabilidad en Window / Global
[PASS] Test 5.1: calculateVEIP disponible
[PASS] Test 5.2: openVEIP disponible
[PASS] Test 5.3: closeVEIP disponible
[PASS] Test 5.4: copyVEIPSummary disponible

========================================================
 RESUMEN: 19 superadas, 0 fallidas.
========================================================
```

