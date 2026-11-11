# Módulo [FEAT-03]: Cálculo Automatizado de VEIM (Valor Esperado de la Información Muestral / EVSI) y Eficiencia

**Autor / Responsable:** Einar Andrés Guillén Boero (`pupi1000` / `einar.guillen@ucb.edu.bo`)  
**Rama:** `feature/feat-03-calculo-veim`  
**Archivos Intervenidos:** [`tree_engine.js`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/tree_engine.js), [`canvas_ui.js`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/canvas_ui.js), [`index.html`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/index.html), [`styles.css`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/styles.css), [`src/ui/toolbar.js`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/src/ui/toolbar.js), [`src/ui/ui-events.js`](file:///c:/Users/eguil/OneDrive/Desktop/decisionthree/src/ui/ui-events.js)  
**Estado:** Implementado, Verificado y Documentado  

---

## 1. Fundamentos Teóricos (Eppen / Taha / Hillier & Lieberman)

El **Valor Esperado de la Información Muestral (VEIM)** —en inglés *Expected Value of Sample Information (EVSI)*— mide el beneficio económico esperado que aporta un experimento, prueba piloto, sondeo o estudio de mercado imperfecto cuyas verosimilitudes se actualizan mediante el **Teorema de Bayes**.

### A. Valor Esperado Sin Información Muestral (VEsinIM)
Es el rendimiento óptimo esperado que se obtendría tomando la decisión sin encargar el estudio, guiándose únicamente por las probabilidades a priori:
$$\text{VEsinIM} = \max_i \left\{ \sum_{j} P(\theta_j) \cdot R_{ij} \right\}$$

### B. Valor Esperado Con Información Muestral Bruto (VEconIM)
Es el valor esperado que se alcanza tras obtener el resultado muestral $z_k$ (con probabilidad marginal $P(z_k)$) y seleccionar la alternativa óptima bajo las probabilidades a posteriori $P(\theta_j \mid z_k)$, **antes de descontar el costo del estudio**:
$$\text{VEconIM} = \sum_{k} P(z_k) \cdot \max_i \left\{ \sum_{j} P(\theta_j \mid z_k) \cdot R_{ij} \right\}$$

### C. Valor Esperado de la Información Muestral (VEIM)
$$\text{VEIM} = \text{VEconIM} - \text{VEsinIM}$$

### D. Valor Neto de la Información Muestral (VNIM) y Criterio de Decisión
$$\text{VNIM} = \text{VEIM} - \text{Costo del Estudio}$$
- **Si $\text{VNIM} > 0$:** El estudio es económicamente aconsejable y rentable.
- **Si $\text{VNIM} \le 0$:** No se justifica pagar por el estudio; se recomienda decidir directamente con la información a priori.

### E. Eficiencia de la Información ($E$)
$$\text{Eficiencia} = \left( \frac{\text{VEIM}}{\text{VEIP}} \right) \times 100\%$$
Mide qué porcentaje del valor de la información perfecta (techo máximo) logra capturar la prueba muestral.

---

## 2. Implementación en el Motor (`tree_engine.js`)

Se programó la función dual `calculateVEIM(rootNode, bayesMatrix = null, options = { objective: 'max' })`:
1. **Modo Directo por Matriz Bayesiana:** Procesa matrices de probabilidades a priori, verosimilitudes y pagos para calcular de forma analítica exacta `VEconIM`, `VEsinIM`, `VEIM`, `VNIM` y `Eficiencia`.
2. **Modo de Detección Automática en Árbol Jerárquico:**
   - Detecta la bifurcación inicial del árbol que compara la rama con estudio frente a la rama sin estudio.
   - Extrae automáticamente el costo del estudio (campo `cost` o `value` negativo).
   - Calcula el `VEsinIM` y reconstituye el `VEconIM` bruto sumando el costo al valor esperado neto calculado por Rollback:
     $$\text{VEconIM} = \text{Rollback}(\text{Rama Estudio}) + \text{Costo del Estudio}$$
   - Genera el desglose `sampleBreakdown` con cada resultado muestral $z_k$, su probabilidad marginal $P(z_k)$, la decisión óptima asociada y su contribución ponderada.
3. **Exposición Global:** Se exportó en `window.calculateVEIM`.

---

## 3. Interfaz de Usuario y Presentación Visual

1. **Activación en el Ribbon:**
   - El botón **VEIM** en la pestaña *Métodos Cuantitativos $\rightarrow$ Valor de Información* ejecuta el análisis dinámico (`openVEIM()`).
2. **Ventana Modal Especializada (`#modal-veim`):**
   - **Grid de 4 tarjetas:** `VE sin Muestra`, `VE con Muestra (Bruto)`, `VEIM (Valor Bruto)` y `Eficiencia (%)` destacada en verde.
   - **Recuadro de Viabilidad Económica:**
     - Si es viable ($\text{VNIM} > 0$): banner verde informando la ganancia neta.
     - Si no es rentable ($\text{VNIM} \le 0$): banner rojo alertando que el costo supera el valor aportado.
   - **Tabla Desglosada:** Muestra cada escenario $z_k$ con su probabilidad marginal y valor esperado posterior.
   - **Exportación Gráfica:** Botón **"🖼️ Descargar Resumen (PNG)"** (`downloadVEIMImage()`) que genera una tarjeta gráfica en alta resolución con fondo oscuro institucional.
   - **Navegación Teórica:** Botón para consultar el marco teórico metodológico.

---

## 4. Resultados de la Batería de Pruebas Automatizadas

Se ejecutó la suite de verificación con el caso estándar de Eppen y el árbol bayesiano nativo:

```text
========================================================
 BATERÍA DE PRUEBAS DE VERIFICACIÓN: MÓDULO VEIM (FEAT-03)
========================================================

[TEST 1] Caso Clásico de Eppen / Taha (Validación requerida)
[PASS] Test 1.1: Cálculo exitoso en caso directo Eppen
[PASS] Test 1.2: VEsinIM = 60.000
[PASS] Test 1.3: VEconIM = 82.000
[PASS] Test 1.4: VEIM = 22.000 (82.000 - 60.000)
[PASS] Test 1.5: Eficiencia = 73.33% ((22k / 30k) * 100)
[PASS] Test 1.6: VNIM = 17.000 (22.000 - 5.000 de costo)
[PASS] Test 1.7: Estudio económicamente viable

[TEST 2] Detección Automática en Árbol Bayesiano Nativo
[PASS] Test 2.1: Cálculo exitoso sobre el árbol cargado
[PASS] Test 2.2: Detección correcta de rama con estudio
[PASS] Test 2.3: Detección correcta de rama sin estudio
[PASS] Test 2.4: VEsinIM del árbol = $15.000
[PASS] Test 2.5: VEconIM bruto (antes de $5k de costo) = $26.150
[PASS] Test 2.6: VEIM = $11.150 ($26.150 - $15.000)
[PASS] Test 2.7: Costo del estudio detectado = $5.000
[PASS] Test 2.8: VNIM neto = $6.150 ($11.150 - $5.000)
[PASS] Test 2.9: Estudio viable (VNIM > 0)
[PASS] Test 2.10: 3 resultados muestrales (Bajo, Medio, Alto)

[TEST 3] Viabilidad Económica con Costo Excesivo
[PASS] Test 3.1: VEIM = 5.000
[PASS] Test 3.2: Costo = 10.000
[PASS] Test 3.3: VNIM = -5.000 (Pérdida)
[PASS] Test 3.4: Estudio rechazado correctamente (No rentable)

[TEST 4] Interoperabilidad en Window / Global
[PASS] Test 4.1: calculateVEIM disponible
[PASS] Test 4.2: openVEIM disponible
[PASS] Test 4.3: closeVEIM disponible
[PASS] Test 4.4: downloadVEIMImage disponible

========================================================
 RESUMEN: 25 superadas, 0 fallidas.
========================================================
```

