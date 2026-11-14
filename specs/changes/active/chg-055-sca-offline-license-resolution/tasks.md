---
id: TSK-PLAN-CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION
type: task-plan
change-id: CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION
title: 'Desglose de Tareas Verificables: SCA offline license resolution'
version: 1.1.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 6
  human-review-plan-count: 3
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: 'Gate de revision del modelo de amenazas (threat-model-review, strict-invariant): revisar tabla argv/env, archivos bloqueantes y resolucion de binarios (Windows incluido) contra SEC-REQ-055-SAFE-EXEC-HARDENING-001 y SEC-REQ-055-CLI-HIJACK-RESISTANCE-001 antes de escribir safe-exec.ts; ejecutado por agent-threat-modeler (revisor), registrado como aprobacion humana/auditor'
    complexity: MEDIUM
    risk-level: HIGH
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: manual-inspection
      command-or-criteria: Informe de revision en specs/changes/active/chg-055-sca-offline-license-resolution/ con veredicto APROBADO
    assigned-to: agent-security-auditor
    status: PENDING
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
      - SEC-REQ-055-SAFE-EXEC-HARDENING-001
      - SEC-REQ-055-CLI-HIJACK-RESISTANCE-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
  - id: TSK-002
    title: 'Red test primero (sca-safe-exec.spec.ts, red denegada): crear safe-exec.ts runSafe: spawnSync shell:false, tabla argv/env cerrada, entorno por lista blanca, HOME/cache temporales, timeout<=10s, maxBuffer 5MiB, una invocacion por manifiesto con presupuesto global 60s, binario desde PATH absoluto fuera de rootDir (Windows: sin cwd, sin shims .cmd), archivos bloqueantes, stdout vacio/corrupto -> UNRESOLVED invalid_output, ERR_UNAUTHORIZED_SCA_TOOL'
    complexity: HIGH
    risk-level: HIGH
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-safe-exec.spec.ts
    assigned-to: agent-developer
    status: BLOCKED
    blocking-reason: 'blocked-by TSK-001'
    blocked-by:
      - TSK-001
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
      - SEC-REQ-055-SAFE-EXEC-HARDENING-001
      - SEC-REQ-055-CLI-HIJACK-RESISTANCE-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
  - id: TSK-003
    title: 'Red test primero: license-python.ts (dist-info/METADATA; CLI pip-licenses con PYTHONNOUSERSITE=1, nunca python del venv del repo)'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-license-python.spec.ts
    assigned-to: agent-developer
    status: BLOCKED
    blocking-reason: 'blocked-by TSK-002'
    blocked-by:
      - TSK-002
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
      - SEC-REQ-055-SAFE-EXEC-HARDENING-001
      - SEC-REQ-055-CLI-HIJACK-RESISTANCE-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
  - id: TSK-004
    title: 'Red test primero: license-rust.ts (registro ~/.cargo/registry Cargo.toml; CLI cargo metadata --offline --locked --frozen; rechazo .cargo/config.toml con rustc-wrapper y rust-toolchain.toml)'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-license-rust.spec.ts
    assigned-to: agent-developer
    status: BLOCKED
    blocking-reason: 'blocked-by TSK-002'
    blocked-by:
      - TSK-002
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
      - SEC-REQ-055-SAFE-EXEC-HARDENING-001
      - SEC-REQ-055-CLI-HIJACK-RESISTANCE-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
  - id: TSK-005
    title: 'Red test primero: license-go.ts (LICENSE en GOMODCACHE; CLI go list -m -json all con GOFLAGS=-mod=readonly GOPROXY=off GOTOOLCHAIN=local GOWORK=off; go.mod/go.sum byte-identicos)'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-license-go.spec.ts
    assigned-to: agent-developer
    status: BLOCKED
    blocking-reason: 'blocked-by TSK-002'
    blocked-by:
      - TSK-002
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
      - SEC-REQ-055-SAFE-EXEC-HARDENING-001
      - SEC-REQ-055-CLI-HIJACK-RESISTANCE-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
  - id: TSK-006
    title: 'Red test primero: license-java.ts (pom en ~/.m2 con realpath confinado y parent propio, parser XML estricto sin DOCTYPE/ENTITY; CLI mvn -o -B -ntp, nunca license:download-licenses; rechazo .mvn/extensions.xml y .mvn/maven.config)'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-license-java.spec.ts
    assigned-to: agent-developer
    status: BLOCKED
    blocking-reason: 'blocked-by TSK-002'
    blocked-by:
      - TSK-002
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
      - SEC-REQ-055-SAFE-EXEC-HARDENING-001
      - SEC-REQ-055-CLI-HIJACK-RESISTANCE-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
  - id: TSK-007
    title: 'Red test primero: license-dotnet.ts (.nuspec en ~/.nuget/packages; CLI dotnet list package sin restore; rechazo Directory.Build.props|targets, global.json msbuild-sdks, nuget.config)'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-license-dotnet.spec.ts
    assigned-to: agent-developer
    status: BLOCKED
    blocking-reason: 'blocked-by TSK-002'
    blocked-by:
      - TSK-002
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
      - SEC-REQ-055-SAFE-EXEC-HARDENING-001
      - SEC-REQ-055-CLI-HIJACK-RESISTANCE-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
  - id: TSK-008
    title: 'Red test primero: license-node.ts (package.json en node_modules; CLI npm/pnpm con --ignore-scripts; rechazo .pnpmfile.cjs y .npmrc)'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-license-node.spec.ts
    assigned-to: agent-developer
    status: BLOCKED
    blocking-reason: 'blocked-by TSK-002'
    blocked-by:
      - TSK-002
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
      - SEC-REQ-055-SAFE-EXEC-HARDENING-001
      - SEC-REQ-055-CLI-HIJACK-RESISTANCE-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
  - id: TSK-009
    title: 'Red test primero (sca-license-resolve.spec.ts): license-resolve.ts orquesta archivos -> CLI -> UNRESOLVED; unresolvedReason (enum ampliado) es propiedad exclusiva de license-resolve.ts (safe-exec.ts solo devuelve la razon); UNRESOLVED == UNKNOWN en Gate 6, exit code e informes; fallo de CLI no aborta; integrar en scanInstalledLicenses'
    complexity: HIGH
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sca-license-resolve.spec.ts
    assigned-to: agent-developer
    status: BLOCKED
    blocking-reason: 'blocked-by TSK-003, TSK-004, TSK-005, TSK-006, TSK-007, TSK-008'
    blocked-by:
      - TSK-003
      - TSK-004
      - TSK-005
      - TSK-006
      - TSK-007
      - TSK-008
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
      - SEC-REQ-055-SAFE-EXEC-HARDENING-001
      - SEC-REQ-055-CLI-HIJACK-RESISTANCE-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
  - id: TSK-010
    title: 'Regresion completa con red denegada: typecheck, verify quality (CC<=10, funcion<=40 lineas), verify licenses sin dependencias nuevas y suite completa'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run typecheck; pnpm test; pnpm run verify:all
    assigned-to: agent-developer
    status: BLOCKED
    blocking-reason: 'blocked-by TSK-009'
    blocked-by:
      - TSK-009
    implements-components:
      - CMP-054-SCA-LICENSE-RESOLUTION
    satisfies-requirements:
      - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
      - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
      - BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
      - SEC-REQ-055-SAFE-EXEC-HARDENING-001
      - SEC-REQ-055-CLI-HIJACK-RESISTANCE-001
      - SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001

supersedes: null
superseded-by: null
---

# Plan de Tareas: CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION

Cobertura: CMP-054-SCA-LICENSE-RESOLUTION, FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001, BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY y BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION. Orden: TSK-001 (gate de revision del modelo de amenazas, bloquea TSK-002) -> TSK-002 (safe-exec) -> TSK-003..TSK-008 (un ecosistema por tarea, paralelizables) -> TSK-009 -> TSK-010. Depende de CHG-054. Cada tarea escribe primero el test en rojo; los tests de CLI se ejecutan con red denegada.
