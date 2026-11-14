---
id: TSK-PLAN-CHG-057-SARIF-SAST-INGESTION
type: task-plan
change-id: CHG-057-SARIF-SAST-INGESTION
title: 'Desglose de Tareas Verificables: SARIF SAST Ingestion'
version: 1.2.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 2
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: 'Red test primero (sast-sarif-ingest.spec.ts): crear sarif-ingest.ts (ingestSarifFiles) con lstat+open+fstat(fd) verificando isFile() y dev/ino (anti-TOCTOU), confinamiento realpath + path.relative (normalizando unidad Windows), rechazo de symlinks fuera de la raiz y rutas UNC, limite 50 MiB, escaner iterativo de profundidad JSON <= 64 previo a JSON.parse(), <= 100000 resultados acumulados, rechazo de __proto__/constructor/prototype, validacion version === "2.1.0" y runs[]; codigos ERR_SARIF_NOT_FOUND, _NOT_REGULAR_FILE, _PATH_OUTSIDE_ROOT, _TOO_LARGE, _MALFORMED, _UNSUPPORTED_VERSION, _LIMIT_EXCEEDED, _UNSAFE_KEY'
    complexity: MEDIUM
    risk-level: HIGH
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sast-sarif-ingest.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-057-SARIF-SAST-INGESTION
    satisfies-requirements: &ref_0
      - FR-057-SARIF-SAST-INGESTION-001
      - SEC-REQ-057-SARIF-INGESTION-SAFETY-001
      - SEC-REQ-057-SARIF-OUTPUT-SANITIZATION-001
  - id: TSK-002
    title: 'Red test primero (sast-sarif-normalize.spec.ts): crear sarif-sast.ts con funciones exportadas (parseSarifDocument), saneamiento ANSI/C0/C1/Markdown/HTML, normalizacion de URIs (decodeURIComponent con URIError->ERR_SARIF_MALFORMED, uriBaseId via originalUriBaseIds, rechazo UNC/.. y normalizacion unidad Windows), locations vacias/ausentes -> relPath "<unknown>" y lineNumber 1, precedencia estricta de security-severity/level (excluyendo level "none"), deduplicacion multi-archivo (relPath, lineNumber, ruleId) conservando mayor severidad y ordenamiento canonico'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sast-sarif-normalize.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    blocked-by:
      - TSK-001
    implements-components:
      - CMP-057-SARIF-SAST-INGESTION
    satisfies-requirements: *ref_0
  - id: TSK-003
    title: 'Red test primero (sast-sarif-policy.spec.ts): en verifySast() modo SARIF (sarifPaths.length > 0) omitir collectSastFiles/regex/runSemgrepCli, fijar totalFilesScanned = sarifPaths.length y actualizar formatSastViolationRow para CRITICAL/HIGH/MEDIUM/LOW; confinar lectura de supresiones ai-sdlc:allow-sast a rootDir (realpath+open/fstat, guarda lineNumber > lines.length) exigiendo supp.kind === "sast" y supp.rule === ruleId|*; evaluar quality-policy.yaml desde rootDir (fail_on_severity opcional fallback options.minSeverity ?? "HIGH", filtro severity >= effectiveMinSeverity, max_vulnerabilities, PERMISSIVE solo warnings salvo supresiones invalidas/caducadas o ERR_SARIF_*)'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sast-sarif-policy.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    blocked-by:
      - TSK-002
    implements-components:
      - CMP-057-SARIF-SAST-INGESTION
    satisfies-requirements: *ref_0
  - id: TSK-004
    title: 'Red test primero (sast-sarif-cli.spec.ts): exponer opcion explicita --sarif <paths...> en aisdlc verify sast (packages/cli/src/index.ts y packages/cli/src/commands/verify.ts), sin autodescubrimiento ni ejecucion de CLIs externas, propagando errores ERR_SARIF_* con exit code 1 y salida saneada'
    complexity: LOW
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/cli/tests/sast-sarif-cli.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    blocked-by:
      - TSK-003
    implements-components:
      - CMP-057-SARIF-SAST-INGESTION
    satisfies-requirements: *ref_0
  - id: TSK-005
    title: 'Regresion completa y umbrales de calidad: typecheck, verify quality (CC<=10, funcion<=40 lineas), pruebas BDD/unitarias y verify:all'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run typecheck; pnpm test; pnpm run verify:quality; pnpm run verify:all
    assigned-to: agent-developer
    status: COMPLETED
    blocked-by:
      - TSK-004
    implements-components:
      - CMP-057-SARIF-SAST-INGESTION
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-057-SARIF-SAST-INGESTION

Cobertura: `CMP-057-SARIF-SAST-INGESTION`, `FR-057-SARIF-SAST-INGESTION-001`, `SEC-REQ-057-SARIF-INGESTION-SAFETY-001` y `SEC-REQ-057-SARIF-OUTPUT-SANITIZATION-001`.
Orden secuencial: `TSK-001 -> TSK-002 -> TSK-003 -> TSK-004 -> TSK-005`. Cada tarea sigue TDD estricto (test en rojo primero).

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-14 | agent-developer / human-dev | Creación inicial del plan de tareas con gobernanza | CHG-057-SARIF-SAST-INGESTION |
| **1.1.0** | 2026-11-14 | agent-system-architect | Desglose atómico TDD cubriendo CMP-057, FR-057 y SEC-REQ-057 | CHG-057-SARIF-SAST-INGESTION |
| **1.2.0** | 2026-11-14 | agent-system-architect | Remediación Checkpoint 1: YAGNI sin SarifParserPort, modo SARIF en verifySast, alineación quality-policy, profundidad pre-parse y cierres URI/TOCTOU/supresiones | CHG-057-SARIF-SAST-INGESTION |
