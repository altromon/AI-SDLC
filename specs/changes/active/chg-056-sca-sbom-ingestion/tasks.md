---
id: TSK-PLAN-CHG-056-SCA-SBOM-INGESTION
type: task-plan
change-id: CHG-056-SCA-SBOM-INGESTION
title: 'Desglose de Tareas Verificables: SCA SBOM ingestion'
version: 1.1.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 2
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: 'Red test primero (sca-sbom-ingest.spec.ts): crear sbom-ingest.ts con lectura por descriptor (open + fstat sobre fd), confinamiento realpath + path.relative, solo archivos regulares, rechazo de symlinks fuera de la raiz y rutas UNC, limite 50 MiB, JSON con profundidad<=64 y <=100000 componentes, rechazo de __proto__/constructor/prototype; codigos ERR_SBOM_NOT_FOUND, _NOT_REGULAR_FILE, _PATH_OUTSIDE_ROOT, _TOO_LARGE, _MALFORMED, _UNSUPPORTED, _LIMIT_EXCEEDED, _UNSAFE_KEY'
    complexity: MEDIUM
    risk-level: HIGH
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-sbom-ingest.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-056-SCA-SBOM-INGESTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - SEC-REQ-055-SBOM-INGESTION-SAFETY-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
  - id: TSK-002
    title: 'Red test primero (sca-sbom-parse.spec.ts): sbom-parse.ts extrae componentes y licencias de CycloneDX 1.x y SPDX 2.x; parser PURL de gramatica estricta propio (independiente de buildPurl); clave de dedupe ecosistema+namespace+nombre+version; NOASSERTION/NONE/LicenseRef-* -> UNKNOWN con tabla de precedencia; SBOM sin componentes -> ERR_SBOM_EMPTY; orden canonico; sin dependencias parciales'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-sbom-parse.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    blocked-by:
      - TSK-001
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-056-SCA-SBOM-INGESTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - SEC-REQ-055-SBOM-INGESTION-SAFETY-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
  - id: TSK-003
    title: 'Red test primero (sca-sbom-merge.spec.ts): fusion de huecos: la resolucion local siempre gana, el SBOM solo rellena UNKNOWN/UNRESOLVED con procedencia sbom-declared; verificacion cruzada contra lockfiles (faltantes/sobrantes) emitida por el canal warnings (ScaScanResult.warnings, ordenado canonicamente, saneado, stderr en CLI); sin OSV (issue #194)'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-sbom-merge.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    blocked-by:
      - TSK-002
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-056-SCA-SBOM-INGESTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - SEC-REQ-055-SBOM-INGESTION-SAFETY-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
  - id: TSK-004
    title: 'Red test primero (sca-sbom-cli.spec.ts): exponer la opcion explicita --sbom <ruta> en verify licenses (sin autodescubrimiento); sin la opcion no se lee ningun SBOM'
    complexity: LOW
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-sbom-cli.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    blocked-by:
      - TSK-003
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-056-SCA-SBOM-INGESTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - SEC-REQ-055-SBOM-INGESTION-SAFETY-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
  - id: TSK-005
    title: 'Regresion completa: typecheck, verify quality (CC<=10, funcion<=40 lineas) y suite completa con red denegada'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run typecheck; pnpm test; pnpm run verify:all
    assigned-to: agent-developer
    status: COMPLETED
    blocked-by:
      - TSK-004
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-056-SCA-SBOM-INGESTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - SEC-REQ-055-SBOM-INGESTION-SAFETY-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001

supersedes: null
superseded-by: null
---

# Plan de Tareas: CHG-056-SCA-SBOM-INGESTION

Cobertura: CMP-054-SCA-LICENSE-RESOLUTION, FR-056-SCA-SBOM-INGESTION-001, BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY y SEC-REQ-055-SBOM-INGESTION-SAFETY-001. Orden: TSK-001 -> TSK-005. Independiente de CHG-054 (buildPurl) y de CHG-055. Cada tarea escribe primero el test en rojo.
