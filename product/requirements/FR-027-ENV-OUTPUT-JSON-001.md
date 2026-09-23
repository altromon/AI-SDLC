---
id: FR-027-ENV-OUTPUT-JSON-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: Configuración Global de Formato JSON por AISDLC_OUTPUT o AISDLC_FORMAT
status: active
category: functional
derives-from:
  - UC-027-ENV-OUTPUT-JSON
verifiable-by: automated-unit-test
acceptance-format: declarative-prose
supersedes: null
superseded-by: null
---

# FR-027-ENV-OUTPUT-JSON-001: Variables de Entorno de Formato JSON

## 1. Enunciado Normativo
La CLI DEBE inspeccionar las variables de entorno `AISDLC_OUTPUT` y `AISDLC_FORMAT`. Si alguna de ellas está establecida en `json` (insensible a mayúsculas), el comportamiento por defecto de salida de todos los comandos de verificación y reporte DEBE ser JSON estructurado, salvo que se especifique explícitamente un formato alternativo mediante línea de comandos.

## 2. Criterios de Aceptación
- **Criterio 1 (Prioridad de Flags)**: Los argumentos de línea de comandos explícitos (`--format text` o `--no-json`) anulan el valor de las variables de entorno.
- **Criterio 2 (Activación por Entorno)**: En ausencia de flags de línea de comandos, si `AISDLC_OUTPUT=json` o `AISDLC_FORMAT=json`, la salida se formatea en JSON válido sin texto decorativo.
