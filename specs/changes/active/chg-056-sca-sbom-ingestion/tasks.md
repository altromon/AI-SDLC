---
id: TSK-PLAN-CHG-056-SCA-SBOM-INGESTION
type: task-plan
change-id: CHG-056-SCA-SBOM-INGESTION
title: 'Desglose de Tareas Verificables: SCA SBOM ingestion'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 2
  human-review-plan-count: 2
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: 'Crear sbom-ingest.ts: resolver ruta del SBOM confinada a la raíz (realpath, rechazo de traversal -> ERR_SBOM_PATH_OUTSIDE_ROOT), límite de tamaño, lectura JSON (ERR_SBOM_MALFORMED), detección de formato CycloneDX 1.x/SPDX 2.x (ERR_SBOM_UNSUPPORTED); sin ejecutar contenido del SBOM'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/sca-sbom-ingest.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-056-SCA-SBOM-INGESTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
  - id: TSK-002
    title: 'Crear sbom-parse.ts: extraer componentes (nombre, versión, PURL) y licencias (id/expression SPDX) de CycloneDX y SPDX a ScannedDependency; sin licencia -> UNKNOWN; fallo cerrado sin dependencias parciales; orden determinista'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/sca-sbom-parse.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-056-SCA-SBOM-INGESTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
  - id: TSK-003
    title: 'Integrar en scanInstalledLicenses: si se indica/descubre SBOM, sus dependencias SUSTITUYEN la resolución local (sin fusión, decisión PO); aviso de sustitución; opción de ruta SBOM expuesta en verify licenses CLI; sin OSV (issue #194)'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/sca-sbom-replace.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-056-SCA-SBOM-INGESTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
  - id: TSK-004
    title: 'Regresión completa: typecheck, verify quality (CC<=10, funcion<=40 lineas) y suite completa'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run typecheck; pnpm test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-056-SCA-SBOM-INGESTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
supersedes: null
superseded-by: null
---

# Plan de Tareas: CHG-056-SCA-SBOM-INGESTION

Cobertura: CMP-054-SCA-LICENSE-RESOLUTION, FR-056-SCA-SBOM-INGESTION-001, BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY en todas las tareas aplicables. Orden: TSK-001 → TSK-004.

