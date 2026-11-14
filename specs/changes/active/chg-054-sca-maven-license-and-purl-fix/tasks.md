---
id: TSK-PLAN-CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
type: task-plan
change-id: CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
title: 'Desglose de Tareas Verificables: SCA Maven license and PURL fix'
version: 1.1.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 5
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: 'Red test primero (sca-maven-license.spec.ts): dependencia sin licencia -> UNKNOWN, licencia en comentario XML descartada, version ${prop} sin resolver marcada UNKNOWN; luego eliminar defaultLic en parseMavenDepBlock/resolveMavenBlockLicense y rechazar pom con DOCTYPE/ENTITY mediante tokenizador XML estricto propio (sin dependencias)'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-maven-license.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
  - id: TSK-002
    title: 'Red test primero (sca-purl.spec.ts): crear sca/purl.ts buildPurl(ecosystem,namespace,name,version) con gramatica estricta, percent-encoding (@scope -> %40scope, + -> %2B) y pkg:generic con aviso para ecosistema desconocido; sin pkg:npm por defecto'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-purl.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
  - id: TSK-003
    title: 'Red test primero (sca-sbom-purl.spec.ts): anadir ecosystem (y purl opcional) a ScaVulnerability; sbom.ts:31 (componente) y sbom.ts:75 (affects.ref) usan buildPurl; ref == purl del componente'
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-sbom-purl.spec.ts
    assigned-to: agent-developer
    status: BLOCKED
    blocking-reason: 'blocked-by TSK-002'
    blocked-by:
      - TSK-002
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
  - id: TSK-004
    title: 'Red test primero (sca-purl-fallback.spec.ts): fallbacks de parseTrivyOutput (scanner.ts ~583) y parseSyftOutput (~631) dejan de usar pkg:npm y usan buildPurl (pkg:generic + aviso); las invocaciones a trivy/syft (argv, spawn) permanecen SIN cambios, verificado por test de argv'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-purl-fallback.spec.ts
    assigned-to: agent-developer
    status: BLOCKED
    blocking-reason: 'blocked-by TSK-002'
    blocked-by:
      - TSK-002
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
  - id: TSK-005
    title: 'Regresion completa: typecheck, verify quality (CC<=10, funcion<=40 lineas) y suite SCA/SBOM existente; verificar salida SBOM publica reproducible'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run typecheck; pnpm test; pnpm run verify:all
    assigned-to: agent-developer
    status: BLOCKED
    blocking-reason: 'blocked-by TSK-001, TSK-003, TSK-004'
    blocked-by:
      - TSK-001
      - TSK-003
      - TSK-004
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY

supersedes: null
superseded-by: null
---

# Plan de Tareas: CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX

Cobertura: CMP-054-SCA-LICENSE-RESOLUTION, FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001 y BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY. Orden: TSK-001 y TSK-002 en paralelo; TSK-003/TSK-004 tras TSK-002; TSK-005 al final. Cada tarea escribe primero el test en rojo y despues la correccion.
