---
id: FR-057-SARIF-SAST-INGESTION-001
type: requirement
title: sarif-sast-ingestion
status: active
version: 0.2.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-057-SARIF-SAST-INGESTION
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-057-SARIF-SAST-INGESTION-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---


# FR-057-SARIF-SAST-INGESTION-001: sarif-sast-ingestion

## 1. Enunciado Normativo
1. El sistema DEBE parsear y validar reportes OASIS SARIF v2.1.0 en JSON (`version === "2.1.0"` y propiedad `runs` de tipo array) SOLO mediante ruta(s) explícita(s) (`--sarif <ruta>`, admitiendo múltiples archivos) dentro de la raíz del repositorio; sin autodescubrimiento.
2. El sistema DEBE mapear de forma determinista el `level` de SARIF (`error`, `warning`, `note`, `none`) y `properties["security-severity"]` (o `properties.securitySeverity`) con precedencia `result.properties['security-severity']` -> `rule.properties['security-severity']` (vía `ruleIndex` o `ruleId`) -> `result.level` -> `rule.defaultConfiguration.level` -> `'MEDIUM'`:
   - `security-severity` solo se parsea si es un número finito en `[0, 10]` o un string recortado que cumpla `/^\d+(\.\d+)?$/` en `[0, 10]` (nunca convertir `""`, `null` o `false` a `0`): `>= 9.0` → `CRITICAL`; `>= 7.0` → `HIGH`; `>= 4.0` → `MEDIUM`; `< 4.0` → `LOW`.
   - En ausencia de `security-severity` válido, `error` → `HIGH`, `warning` → `MEDIUM`, `note` → `LOW`; `level: 'none'` (sin `security-severity`) se excluye de `SastViolation[]` bloqueantes.
   - Para cada hallazgo normalizado a `SastViolation`, se DEBE extraer `ruleId`, `message` (`message.text`), `relPath` (desde `locations[0].physicalLocation.artifactLocation.uri` normalizado; si `result.locations` falta o está vacío, no descartar el hallazgo silenciosamente sino emitir `relPath: '<unknown>'`, `lineNumber: 1`), `lineNumber` (desde `locations[0].physicalLocation.region.startLine`, mínimo `1`) y el origen de herramienta (`tool.driver.name`).
3. Cuando `sarifPaths && sarifPaths.length > 0`, `verifySast()` DEBE ejecutarse en modo ingesta SARIF (omitiendo `collectSastFiles`, reglas regex y `runSemgrepCli`), establecer `totalFilesScanned = sarifPaths.length` y actualizar `formatSastViolationRow` para renderizar badges diferenciados para `CRITICAL`, `HIGH`, `MEDIUM` y `LOW`.
4. El sistema DEBE cargar `quality-policy.yaml` desde `rootDir` (con valores por defecto seguros si está ausente) y evaluar deterministamente los hallazgos: `sast_analysis.fail_on_severity` es opcional (fallback `options.minSeverity ?? 'HIGH'`); las violaciones se filtran por `severity >= effectiveMinSeverity` antes de comparar contra `sast_analysis.max_vulnerabilities` (por defecto `0`). Con `enforcement_mode: 'PERMISSIVE'` se emiten advertencias sin fallar `success` (salvo supresiones inválidas/caducadas o errores fail-closed `ERR_SARIF_*`). Las supresiones requieren `supp.kind === 'sast'` con `ai-sdlc:allow-sast` y coincidencia explícita `supp.rule === ruleId` (o `supp.rule === '*'`), fallando ante supresiones caducadas o inválidas.
5. El sistema DEBE fallar cerrado (fail-closed) ante entradas inválidas con códigos de error explícitos y sin emitir violaciones parciales: `ERR_SARIF_NOT_FOUND`, `ERR_SARIF_NOT_REGULAR_FILE`, `ERR_SARIF_PATH_OUTSIDE_ROOT`, `ERR_SARIF_TOO_LARGE` (> 50 MiB), `ERR_SARIF_MALFORMED`, `ERR_SARIF_UNSUPPORTED_VERSION` (`version !== "2.1.0"` o `runs` ausente/no-array), `ERR_SARIF_LIMIT_EXCEEDED` (> 100 000 resultados o profundidad JSON > 64), `ERR_SARIF_UNSAFE_KEY` (`__proto__`/`constructor`/`prototype`).
6. En invocaciones con múltiples `--sarif`, el sistema DEBE deduplicar entradas idénticas `(relPath, lineNumber, ruleId)` conservando la mayor severidad, y ordenar canónica y deterministamente todas las violaciones `SastViolation[]` por `relPath` (ascendente lexicográfico), `lineNumber` (ascendente numérico) y `ruleId` (ascendente lexicográfico).

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-057-SARIF-SAST-INGESTION-001 @automated @regression
Feature: sarif-sast-ingestion
  As a DevSecOps engineer
  I want Gate SAST to ingest external OASIS SARIF v2.1.0 reports deterministically
  So that polyglot security findings are evaluated against quality-policy.yaml

  @nominal
  Scenario: Valid SARIF 2.1.0 findings are normalized, sorted canonically, and evaluated against policy
    Given a valid SARIF 2.1.0 report from "semgrep" with findings in "src/b.ts:20" and "src/a.ts:10"
    And quality-policy.yaml sets sast_analysis.max_vulnerabilities to 0
    When the verifier runs with "--sarif semgrep.sarif"
    Then violations are sorted canonically with "src/a.ts:10" before "src/b.ts:20"
    And the SAST gate fails because violations exceed max_vulnerabilities

  @nominal
  Scenario: Valid ai-sdlc:allow-sast suppression exempts matching SARIF finding
    Given a valid SARIF 2.1.0 report with a finding for rule "B101" at "src/app.py:12"
    And "src/app.py:12" has an active "ai-sdlc:allow-sast" suppression for rule "B101"
    When the verifier runs with "--sarif bandit.sarif"
    Then the finding for "B101" at "src/app.py:12" is suppressed
    And the SAST gate passes when no unsuppressed violations remain

  @boundary
  Scenario Outline: SARIF level and security-severity map deterministically to SastSeverity
    Given a valid SARIF 2.1.0 result with level "<level>" and security-severity "<sec_sev>"
    When the verifier runs with "--sarif report.sarif"
    Then the normalized SastViolation has severity "<severity>"

    Examples:
      | level   | sec_sev | severity |
      | error   | 9.5     | CRITICAL |
      | error   |         | HIGH     |
      | warning | 7.5     | HIGH     |
      | warning |         | MEDIUM   |
      | note    |         | LOW      |

  @boundary
  Scenario: Multiple --sarif files are aggregated and sorted deterministically
    Given two valid SARIF 2.1.0 reports "bandit.sarif" and "gosec.sarif"
    When the verifier runs with "--sarif bandit.sarif --sarif gosec.sarif"
    Then findings from both tools are combined and sorted by relPath, lineNumber, and ruleId

  @invalid
  Scenario Outline: Invalid SARIF input fails closed with explicit error code
    Given a SARIF input with defect "<defect>"
    When the verifier runs with "--sarif input.sarif"
    Then the verification fails with error "<error>"
    And no partial violations are reported

    Examples:
      | defect               | error                         |
      | missing_file         | ERR_SARIF_NOT_FOUND           |
      | not_regular_file     | ERR_SARIF_NOT_REGULAR_FILE    |
      | path_outside_root    | ERR_SARIF_PATH_OUTSIDE_ROOT   |
      | file_too_large       | ERR_SARIF_TOO_LARGE           |
      | malformed_json       | ERR_SARIF_MALFORMED           |
      | unsupported_version  | ERR_SARIF_UNSUPPORTED_VERSION |
      | limit_exceeded       | ERR_SARIF_LIMIT_EXCEEDED      |
      | unsafe_proto_key     | ERR_SARIF_UNSAFE_KEY          |
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.2.0** | 2026-11-14 | AI-SDLC Integration Engine | Implementación verificada (TSK-001, TSK-002, TSK-003, TSK-004, TSK-005) | chg-057-sarif-sast-ingestion |
| **0.1.0** | 2026-11-14 | agent-product-analyst | Definición inicial (issue #162, Bloque A: ingesta SARIF v2.1.0 y evaluación contra quality-policy.yaml) | CHG-057-SARIF-SAST-INGESTION |
| **0.2.0** | 2026-11-14 | agent-system-architect | Remediación Checkpoint 1: modo SARIF en verifySast, alineación quality-policy.yaml, precedencia de severidad, deduplicación y locations vacías | CHG-057-SARIF-SAST-INGESTION |
