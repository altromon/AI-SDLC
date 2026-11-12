---
id: TSK-PLAN-CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
type: task-plan
change-id: CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
title: 'Desglose de Tareas Verificables: SCA Maven license and PURL fix'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: 'Eliminar herencia de licencia raíz en scanMavenDependencies/parseMavenDepBlock (UNKNOWN si la dependencia no declara licencia) con tests BDD'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/sca-maven-license.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
  - id: TSK-002
    title: 'Crear purl.ts (buildPurl por ecosistema: npm, pypi, maven, cargo, golang, nuget) y usarlo en buildCycloneDxComponent y en affects.ref de vulnerabilidades en sbom.ts, con tests'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/sca-purl.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
  - id: TSK-003
    title: 'Regresión completa: typecheck, verify quality (CC<=10, funcion<=40 lineas) y suite SCA/SBOM existente'
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
      - FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
supersedes: null
superseded-by: null
---

# Plan de Tareas: CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX

Cobertura: CMP-054-SCA-LICENSE-RESOLUTION, FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001, BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY en todas las tareas aplicables. Orden: TSK-001 → TSK-003.

