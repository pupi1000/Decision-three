# INFORME DE DISEÑO TÉCNICO Y ARQUITECTÓNICO
## Funcionalidad FEAT-08: Exportación de Resultados Bayesianos a Excel (.xlsx) y CSV
### DecisionTree Pro v5.0.0 — Sprint 2

---

### METADATOS DEL DOCUMENTO
- **Proyecto / Módulo:** DecisionTree Pro v5.0.0 — Interoperabilidad y Exportación Tabular
- **Funcionalidad / ID:** FEAT-08 (Sprint 2: Exportación Bayesiana a Excel y CSV)
- **Fase de Ingeniería:** **FASE II — DISEÑO ARQUITECTÓNICO Y DE INTERFACES**
- **Estado del Diseño:** **APROBADO PARA IMPLEMENTACIÓN**
- **Rama Git de Trabajo:** `feature/feat-08-exportacion-bayesiana`
- **Objetivo Principal:** Habilitar descarga y copia de las 5 matrices en XLSX y CSV sin dependencias externas.

---

### 1. RESUMEN DE HALLAZGOS DE LA AUDITORÍA
La auditoría técnica constató que DecisionTree Pro cuenta con un motor bayesiano validado (`FEAT-07` / `BayesEngine`) capaz de producir con rigor analítico las 5 matrices requeridas. Sin embargo, no existía ningún mecanismo de exportación tabular ni copiado al portapapeles, limitando la interoperabilidad con herramientas ofimáticas como Excel.

---

### 2. ARQUITECTURA DE EXPORTACIÓN: MÓDULO BAYESEXPORTER
Se diseña un módulo desacoplado `BayesExporter` que centraliza la extracción, transformación y serialización de los datos probabilísticos:
1. **Extractor Canónico (`getExportDataset`):** Consume el objeto estructurado devuelto por `BayesEngine.solveSystem()` y lo transforma en un dataset con 5 colecciones tabulares homogéneas (`headers`, `rows`, `totalRow`).
2. **Serializador CSV Nativo (`exportToCSV`):** Convierte las matrices en texto CSV conforme a RFC 4180 con separador configurable (`,` o `;`), prefijo BOM UTF-8 y sanitización de inyección de fórmulas.
3. **Serializador XLSX Multilibro Nativo (`exportToXLSX`):** Construye en memoria un paquete ZIP legítimo con especificación OOXML ECMA-376 conteniendo exactamente las 5 hojas sin librerías externas.
4. **Conector de Portapapeles (`copyToClipboard`):** Convierte la matriz seleccionada en formato TSV (Tab-Separated Values) para pegado directo en hojas de cálculo.

---

### 3. ESTRUCTURA COMÚN DE DATOS TABULARES (5 MATRICES)

```javascript
// Estructura homogénea generada por BayesExporter.getExportDataset():
{
  priori: {
    name: 'Priori',
    title: 'Probabilidades a Priori P(θ)',
    headers: ['ID_Estado', 'Estado_Naturaleza', 'Probabilidad_Priori'],
    rows: [['θ1', 'Demanda Alta', 0.60], ['θ2', 'Demanda Baja', 0.40]],
    totalRow: ['Total', '—', 1.0000]
  },
  verosimilitudes: {
    name: 'Verosimilitudes',
    title: 'Verosimilitudes P(z|θ)',
    headers: ['ID_Senal', 'Senal_Informativa', 'P(z|θ1)', 'P(z|θ2)'],
    rows: [['z1', 'Estudio Favorable', 0.80, 0.30], ['z2', 'Estudio Desfavorable', 0.20, 0.70]],
    totalRow: ['Total Condicional', '—', 1.0000, 1.0000]
  },
  conjuntas: {
    name: 'Conjuntas',
    title: 'Matriz Conjunta de Eppen P(θ ∩ z)',
    headers: ['ID_Estado', 'Estado_Naturaleza', 'P(θ) Priori', 'z1', 'z2', 'Total P(θ)'],
    rows: [['θ1', 'Demanda Alta', 0.60, 0.48, 0.12, 0.60], ['θ2', 'Demanda Baja', 0.40, 0.12, 0.28, 0.40]],
    totalRow: ['Total Marginal P(z)', '—', 1.0000, 0.60, 0.40, 1.0000]
  },
  marginales: {
    name: 'Marginales',
    title: 'Probabilidades Marginales P(z)',
    headers: ['ID_Senal', 'Senal_Informativa', 'Probabilidad_Marginal', 'Estado_Observacion'],
    rows: [['z1', 'Estudio Favorable', 0.60, 'Posible'], ['z2', 'Estudio Desfavorable', 0.40, 'Posible']],
    totalRow: ['Total', '—', 1.0000, 'Normalizada']
  },
  posteriori: {
    name: 'Posteriori',
    title: 'Probabilidades a Posteriori P(θ|z)',
    headers: ['ID_Estado', 'Estado_Naturaleza', 'P(θ|z1)', 'P(θ|z2)'],
    rows: [['θ1', 'Demanda Alta', 0.80, 0.30], ['θ2', 'Demanda Baja', 0.20, 0.70]],
    totalRow: ['Total Posterior', '—', 1.0000, 1.0000]
  }
}
```

---

### 4. DISEÑO DE LA EXPORTACIÓN CSV (FEAT-08-AC-01)
- **Codificación UTF-8 con BOM (`\uFEFF`):** Antepuesto para garantizar reconocimiento inmediato en Microsoft Excel sin alterar tildes, eñes o caracteres griegos ($\theta$).
- **Separador Configurable:** Selección entre coma (`,`) o punto y coma (`;`).
- **Escape RFC 4180:** Delimitación con comillas dobles y duplicación interna (`""`) ante valores que contengan separadores o saltos de línea.
- **Protección contra Inyección de Fórmulas:** Prefijado con apóstrofo (`'`) ante cadenas de texto que comiencen con `=`, `+`, `-`, `@`.

---

### 5. DISEÑO DE LA EXPORTACIÓN XLSX MULTILIBRO (FEAT-08-AC-02)
- Empaquetador PKZip en memoria puro con algoritmo STORE y sumas CRC-32.
- 5 hojas dedicadas: `Priori`, `Verosimilitudes`, `Conjuntas`, `Marginales` y `Posteriori`.
- Tipos de celda reales: numéricos (`t="n"`) para valores probabilísticos y cadenas (`t="inlineStr"`) para etiquetas.
- Apertura garantizada mediante doble clic en Microsoft Excel y LibreOffice Calc.

---

### 6. DISEÑO DEL MODAL RESPONSIVO Y ACCIONES DIRECTAS (FEAT-08-AC-03)
- **Barra de Herramientas:** Selector de separador CSV, botones `"📋 Copiar TSV"`, `"📄 Descargar CSV"` y `"📊 Descargar Excel (.xlsx)"`.
- **Selector de Vista:** Pestañas tipo pill para alternar entre la Matriz de Eppen y cada una de las 5 matrices.
- **Responsividad:** Contenedores con scroll horizontal `overflow-x: auto` preservando legibilidad total.

---

### 7. ESTRATEGIA DE PRUEBAS Y VALIDACIÓN

| Tipo de Prueba | Escenario Clave | Criterio Trello |
| :--- | :--- | :--- |
| **Validación CSV Nativo** | Generación UTF-8 con BOM, separadores `,` y `;`, escape RFC 4180 | **AC-01** (Exportación CSV) |
| **Validación XLSX Multilibro** | Inspección de 5 hojas, tipos numéricos puros e integridad ZIP | **AC-02** (Exportación XLSX) |
| **Validación Copiado TSV** | Copiado a portapapeles y pegado tabular conservando celdas | **AC-03** (Acciones directas) |
| **Interoperabilidad y UI** | Apertura en Edge CDP y pruebas con caracteres especiales ($\theta$, comas) | **AC-03** (Tabla responsiva) |
