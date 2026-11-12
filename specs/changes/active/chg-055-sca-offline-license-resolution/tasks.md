---
id: TSK-PLAN-CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION
type: task-plan
change-id: CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION
title: 'Desglose de Tareas Verificables: SCA offline license resolution'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 4
  human-review-plan-count: 2
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: 'Crear safe-exec.ts: wrapper spawnSync sin shell, binario y args de lista cerrada, cwd acotado a la raíz, timeout, maxBuffer, entorno offline; resultado UNRESOLVED con motivo (cli_not_installed, cli_timeout, cache_missing). Binario resuelto desde PATH del sistema'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/sca-safe-exec.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
  - id: TSK-002
    title: 'Crear license-python.ts y license-rust.ts (metadatos locales site-packages/dist-info y ~/.cargo registry; CLI: pip-licenses, cargo metadata --offline) con tests'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/sca-license-python-rust.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
  - id: TSK-003
    title: 'Crear license-go.ts y license-java.ts (cache de módulos Go/LICENSE; ~/.m2 pom de dependencia sin heredar licencia raíz; CLI go list -m -json con GOFLAGS=-mod=mod sin proxy, mvn offline solo lectura sin license:download-licenses) con tests'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/sca-license-go-java.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
  - id: TSK-004
    title: 'Crear license-dotnet.ts (nuspec en ~/.nuget/packages; CLI dotnet list package offline) y reutilizar resolución Node existente con motivo UNRESOLVED; con tests'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/sca-license-dotnet-node.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
  - id: TSK-005
    title: 'Crear license-resolve.ts (orden metadatos locales -> CLI -> UNRESOLVED con campo unresolvedReason) e integrarlo en scanInstalledLicenses/scanXDependencies; el fallo de un CLI nunca aborta el escaneo; sin red'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/sca-license-resolve.spec.ts
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
  - id: TSK-006
    title: 'Regresión completa: typecheck, verify quality (CC<=10, funcion<=40 lineas), sin dependencias nuevas (license-policy) y suite completa'
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
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
supersedes: null
superseded-by: null
---

# Plan de Tareas: CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION

Cobertura: CMP-054-SCA-LICENSE-RESOLUTION, FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001, BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY, BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION en todas las tareas aplicables. Orden: TSK-001 → TSK-006.

