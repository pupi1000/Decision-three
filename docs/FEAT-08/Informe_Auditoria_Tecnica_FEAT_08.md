# INFORME DE AUDITORÍA TÉCNICA
## Funcionalidad FEAT-08: Exportación de Resultados Bayesianos a Excel (.xlsx) y CSV
### DecisionTree Pro v5.0.0 — Sprint 2

---

### METADATOS DEL DOCUMENTO
- **Proyecto / Módulo:** DecisionTree Pro v5.0.0 — Interoperabilidad y Exportación Tabular
- **Funcionalidad / ID:** FEAT-08 (Sprint 2: Exportación Bayesiana a Excel y CSV)
- **Sprint / Ciclo:** Sprint 2 — Formatos Tabulares y Productividad
- **Estado de la Auditoría:** **COMPLETADA — DIAGNÓSTICO DE CAPACIDADES REALIZADO**
- **Rama Git de Trabajo:** `feature/feat-08-exportacion-bayesiana`
- **Dependencia Verificada:** FEAT-07 Completada e Integrada (Commit `d8bcce4`)

---

### 1. IDENTIFICACIÓN DE LA FUNCIONALIDAD
La funcionalidad objeto de la presente auditoría es **FEAT-08: Exportación de Resultados Bayesianos a Excel (.xlsx) y CSV**. Su propósito es permitir a los analistas y decisores exportar, consultar, descargar y copiar la totalidad de los datos analíticos bayesianos generados por el motor de DecisionTree Pro hacia herramientas estándar de hojas de cálculo como Microsoft Excel y LibreOffice Calc.

---

### 2. DESCRIPCIÓN OFICIAL DE TRELLO
> *«Habilitar la descarga de la matriz bayesiana completa (Priori, Verosimilitudes, Conjuntas, Marginales y Posteriori) en formatos tabulares estándar».*

---

### 3. LOS TRES CRITERIOS DE ACEPTACIÓN (TRELLO CHECKLIST)

| ID Criterio | Descripción del Requisito | Condición Técnica Obligatoria |
| :--- | :--- | :--- |
| **FEAT-08-AC-01** | Exportación CSV nativa | Codificación UTF-8 con soporte de BOM y separador configurable (coma `,` o punto y coma `;`). |
| **FEAT-08-AC-02** | Exportación XLSX multilibro | 5 hojas independientes (`Priori`, `Verosimilitudes`, `Conjuntas`, `Marginales`, `Posteriori`). |
| **FEAT-08-AC-03** | Tabla responsiva y acciones directas | Copiado tabular directo (TSV al portapapeles) y descarga inmediata desde el modal de resultados. |

---

### 4. ARQUITECTURA DE DATOS Y DEPENDENCIA CON FEAT-07
La dependencia con **FEAT-07 (Motor Bayesiano Completo)** ha sido verificada satisfactoriamente. El motor `BayesEngine` expone el método estandarizado `BayesEngine.solveSystem(bayesHyps, bayesEvs)` que genera las 5 matrices probabilísticas canónicas de forma limpia, estructurada y validada:
1. `priors`: Vector de probabilidades a priori.
2. `likelihoodMatrix`: Matriz de verosimilitudes condicionales.
3. `jointMatrix`: Matriz de probabilidades conjuntas de Eppen.
4. `marginals`: Vector de probabilidades marginales.
5. `posteriorsByEvidence`: Distribución posterior por señal observada.

---

### 5. ARCHIVOS Y FUNCIONES INSPECCIONADOS

| Archivo Fuente | Componente Inspeccionado | Estado y Hallazgo |
| :--- | :--- | :--- |
| `tree_engine.js` | `BayesEngine.solveSystem()` | **DISPONIBLE:** Fuente de verdad estructurada de las 5 matrices. |
| `canvas_ui.js` | `exportPNG()`, `exportSVG()` | **EXISTENTE:** Solo para gráficos del lienzo; no para datos bayesianos. |
| `canvas_ui.js` | `copySummary()` | **EXISTENTE:** Solo copia resumen de texto plano del árbol a portapapeles. |
| `index.html` | `#bayes-overlay`, `#bayes-result-section` | **EXISTENTE:** Modal visual para cálculo pero sin botones de exportación. |
| Repositorio General | Bibliotecas externas (`.xlsx` / `sheetjs`) | **AUSENTE:** El proyecto tiene 0 dependencias externas (vanilla JS puro). |

---

### 6. ESTRUCTURA Y DISPONIBILIDAD DE LAS CINCO MATRICES
- **1. Matriz Priori $P(\theta_i)$:** Contiene el catálogo de estados de la naturaleza y su probabilidad inicial. Se dispone de `res.hypotheses` y `res.priors` con total garantizado $= 1.0000$.
- **2. Matriz Verosimilitudes $P(z_j \mid \theta_i)$:** Matriz de dimensiones $n$ (señales) $\times$ $m$ (estados). Se dispone de `res.likelihoodMatrix` con sumas por columna normalizadas a $1.0000$ según Eppen.
- **3. Matriz Conjuntas $P(\theta_i \cap z_j)$:** Matriz de información imperfecta $m$ (estados) $\times$ $n$ (señales). Se dispone de `res.jointMatrix` con total global verificado $= 1.0000$ (**AC-01**).
- **4. Matriz Marginales $P(z_j)$:** Vector marginal incondicional con etiquetas de señales y probabilidades. Se dispone de `res.marginals` y total $= 1.0000$ (**AC-02**).
- **5. Matriz Posteriori $P(\theta_i \mid z_j)$:** Distribuciones actualizadas para cada señal observada. Se dispone de `res.posteriorsByEvidence` con sumas $= 1.0000$ e identificación explícita de señales imposibles (**AC-03**).

---

### 7. DIAGNÓSTICO DE CAPACIDADES ACTUALES DE EXPORTACIÓN
- No existe generador de archivos CSV para datos probabilísticos.
- No existe generador de libros Excel (`.xlsx`).
- No existe mecanismo para copiar tablas bayesianas al portapapeles en formato TSV/hoja de cálculo.
- El modal actual despliega la información pero carece de barra de herramientas de exportación tabular.

---

### 8. EVALUACIÓN DE ALTERNATIVAS TÉCNICAS Y RECOMENDACIÓN
Se evaluaron tres opciones técnicas para la exportación a Excel:
1. **Opción 1 (SheetJS - `xlsx.full.min.js`):** Añade una dependencia externa pesada (~1 MB) que no existe en el repositorio actual, comprometiendo la política de código autónomo.
2. **Opción 2 (XML Spreadsheet 2003):** Formato XML nativo con soporte de múltiples hojas y tipos de datos fuertes (`Number`, `String`), pero utiliza extensiones `.xml` o `.xls` legadas.
3. **Opción 3 (Generador Nativo OpenXML / PKZip en Vanilla JS - RECOMENDADA):** Implementar un serializador nativo en JavaScript que construya un archivo binario `.xlsx` legítimo (contenedor ZIP con especificación OOXML ECMA-376) con exactamente 5 hojas independientes (`Priori`, `Verosimilitudes`, `Conjuntas`, `Marginales`, `Posteriori`), conservando tipos numéricos puros y abriendo con doble clic en Microsoft Excel 2007-365 y LibreOffice Calc sin ninguna advertencia ni dependencia externa.

---

### 9. TRAZABILIDAD DE HALLAZGOS CON CRITERIOS DE TRELLO

| Criterio Trello | Estado Auditado | Acción de Implementación Planificada |
| :--- | :---: | :--- |
| **FEAT-08-AC-01**<br>Exportación CSV nativa | **NO IMPLEMENTADO** | Crear generador nativo con BOM UTF-8, escape RFC 4180, mitigación de inyección de fórmulas y separador (`,` o `;`) configurable. |
| **FEAT-08-AC-02**<br>Exportación XLSX multilibro | **NO IMPLEMENTADO** | Crear generador nativo OOXML en zip sin dependencias externas con 5 hojas dedicadas y tipos numéricos reales. |
| **FEAT-08-AC-03**<br>Tabla responsiva y acciones | **PARCIAL** | Incorporar barra de acciones en modal con botones 'Copiar TSV', 'Descargar CSV' y 'Descargar Excel' y selector de matriz. |

---

### 10. EVIDENCIAS TÉCNICAS
- JSON de diagnóstico de capacidades: [`docs/FEAT-08/evidencias/EVIDENCIA_01_Auditoria_Exportacion_Estado_Actual.json`](file:///c:/Users/Viviana/Documents/GitHub/Decision-three/docs/FEAT-08/evidencias/EVIDENCIA_01_Auditoria_Exportacion_Estado_Actual.json)
- Captura de estado previo del modal: [`docs/FEAT-08/evidencias/CAPTURA_01_Modal_Bayesiano_Sin_Exportadores.png`](file:///c:/Users/Viviana/Documents/GitHub/Decision-three/docs/FEAT-08/evidencias/CAPTURA_01_Modal_Bayesiano_Sin_Exportadores.png)
