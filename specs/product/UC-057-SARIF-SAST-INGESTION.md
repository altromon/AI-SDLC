---
id: UC-057-SARIF-SAST-INGESTION
type: use-case
title: Ingesta de reportes OASIS SARIF v2.1.0 externos para evaluación SAST determinista
status: active
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-DEVSECOPS-ENGINEER
supporting-actors:
  - ACT-AI-AGENT
governed-by:
  - BR-SECURITY-GATE-INTEGRITY
supersedes: null
superseded-by: null
---


# UC-057-SARIF-SAST-INGESTION: Ingesta de reportes OASIS SARIF v2.1.0 externos para evaluación SAST determinista

## 1. Intención y Resultado
As a ACT-DEVSECOPS-ENGINEER
I want que el verificador SAST consuma uno o varios reportes OASIS SARIF v2.1.0 externos generados por analizadores políglotas (bandit, gosec, Roslyn, SpotBugs, Semgrep, ESLint, etc.)
To normalizar los hallazgos a `SastViolation[]` y evaluarlos de forma determinista contra los umbrales de `quality-policy.yaml` sin reimplementar analizadores por lenguaje.

Contexto: issue #162, Bloque A (ingesta SARIF v2.1.0 y evaluación determinista contra `quality-policy.yaml`).

## 2. Precondiciones
- Existen uno o más archivos de reporte OASIS SARIF v2.1.0 (`version === "2.1.0"`, con arreglo `runs`) accesibles dentro de la raíz del repositorio.
- Existe el archivo de política `quality-policy.yaml` con las secciones `release_thresholds.sast_analysis` y/o `release_thresholds.technical_debt`.

## 3. Flujo Principal (Nominal)
1. El usuario o pipeline indica explícitamente uno o más reportes SARIF mediante la opción CLI/verificador `--sarif <ruta>` (admite múltiples rutas; sin autodescubrimiento; cada ruta debe residir dentro de la raíz del proyecto).
2. El sistema valida cada archivo (existencia, archivo regular, confinamiento dentro de la raíz, tamaño máximo, profundidad JSON, ausencia de claves inseguras `__proto__`/`constructor`/`prototype`, estructura JSON y `version === "2.1.0"`).
3. El sistema extrae los resultados de cada entrada en `runs[]` (incluyendo `tool.driver.name`, `ruleId`, `message`, `artifactLocation.uri`, `region.startLine`, `level`, `properties.security-severity` y `defaultConfiguration.level` de la regla) y los normaliza a `SastViolation[]` con severidad `SastSeverity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), ordenados canónicamente por `relPath`, `lineNumber` y `ruleId`.
4. El sistema respeta las supresiones válidas y vigentes `ai-sdlc:allow-sast` en el archivo afectado (rechazando o marcando como fallo las supresiones caducadas o inválidas).
5. El sistema evalúa de forma determinista los hallazgos activos contra los umbrales de `quality-policy.yaml` (`sast_analysis.max_vulnerabilities`, `sast_analysis.fail_on_severity` o `technical_debt.zero_tolerance_severities`) y emite el veredicto del gate.

## 4. Flujos Alternativos y de Excepción
- **A (JSON malformado o esquema inválido)**: fallo cerrado con `ERR_SARIF_MALFORMED`; no se reportan hallazgos parciales.
- **B (Versión SARIF no soportada)**: si `version !== "2.1.0"` o falta `runs`, fallo cerrado con `ERR_SARIF_UNSUPPORTED_VERSION`.
- **C (Ruta fuera de la raíz del proyecto)**: rechazada con `ERR_SARIF_PATH_OUTSIDE_ROOT` (prevención de path traversal).
- **D (Archivo inexistente o no regular)**: fallo cerrado con `ERR_SARIF_NOT_FOUND` o `ERR_SARIF_NOT_REGULAR_FILE`.
- **E (SARIF vacío / 0 runs o 0 results)**: válido como reporte sin hallazgos (0 violaciones normalizadas; el gate evalúa 0 contra `max_vulnerabilities`).
- **F (Límites excedidos o claves inseguras)**: archivo > 50 MiB → `ERR_SARIF_TOO_LARGE`; > 100 000 resultados o profundidad JSON > 64 → `ERR_SARIF_LIMIT_EXCEEDED`; claves `__proto__`/`constructor`/`prototype` → `ERR_SARIF_UNSAFE_KEY`.

## 5. Restricciones No Funcionales
- **Offline**: la ingesta y evaluación no realizan peticiones de red ni descargan esquemas remotos (`$schema`).
- **Determinismo y ordenamiento canónico**: resultados idénticos ante las mismas entradas, con ordenamiento canónico por `relPath`, `lineNumber`, `ruleId`.
- **Validación fail-closed**: ante cualquier error de lectura, validación, límite o clave insegura, la ejecución falla cerrada sin emitir resultados parciales.
- **Seguridad**: sin ejecución de código contenido en el SARIF y con normalización de URIs relativa al repositorio.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-057-SARIF-SAST-INGESTION @automated @sast
Feature: Ingesta de reportes OASIS SARIF v2.1.0 externos para evaluación SAST determinista
  As a DevSecOps engineer
  I want to ingest external OASIS SARIF v2.1.0 reports
  So that SAST findings from polyglot tools are normalized and evaluated against quality-policy.yaml

  @nominal
  Scenario Outline: Reporte SARIF válido de herramienta externa es normalizado y evaluado
    Given a valid SARIF 2.1.0 report from "<tool>" with a "<level>" finding
    When the SAST verifier ingests the report with "--sarif report.sarif"
    Then the finding is normalized into a SastViolation with severity "<severity>"
    And the gate evaluates the findings against quality-policy.yaml

    Examples:
      | tool     | level   | severity |
      | bandit   | error   | HIGH     |
      | gosec    | warning | MEDIUM   |
      | spotbugs | note    | LOW      |

  @boundary
  Scenario: Reporte SARIF válido con 0 runs o 0 resultados pasa sin violaciones
    Given a valid SARIF 2.1.0 report with 0 results
    When the SAST verifier ingests the report with "--sarif empty.sarif"
    Then 0 SastViolation entries are produced
    And the SAST gate passes

  @invalid
  Scenario Outline: Reporte SARIF inválido falla cerrado
    Given a SARIF input with defect "<defect>"
    When the SAST verifier ingests the report with "--sarif bad.sarif"
    Then the verification fails with error "<error>"
    And no partial violations are reported

    Examples:
      | defect               | error                         |
      | malformed_json       | ERR_SARIF_MALFORMED           |
      | unsupported_version  | ERR_SARIF_UNSUPPORTED_VERSION |
      | path_outside_project | ERR_SARIF_PATH_OUTSIDE_ROOT   |
      | limit_exceeded       | ERR_SARIF_LIMIT_EXCEEDED      |
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-14 | AI-SDLC Integration Engine | Implementación verificada (TSK-001, TSK-002, TSK-003, TSK-004, TSK-005) | chg-057-sarif-sast-ingestion |
| **0.1.0** | 2026-11-14 | agent-product-analyst | Definición inicial (issue #162, Bloque A: ingesta SARIF v2.1.0) | CHG-057-SARIF-SAST-INGESTION |
