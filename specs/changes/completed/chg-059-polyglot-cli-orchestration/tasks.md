---
id: TSK-PLAN-CHG-059-POLYGLOT-CLI-ORCHESTRATION
type: task-plan
change-id: CHG-059-POLYGLOT-CLI-ORCHESTRATION
title: 'Desglose de Tareas Verificables: Polyglot CLI Orchestration'
version: 1.1.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 2
  human-review-plan-count: 2
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: 'Red test primero (tool-installer.spec.ts): crear packages/core/src/verifiers/tool-installer.ts con allowlist inmutable (Object.freeze) por SO (win32, darwin, linux) sin sudo; resolveTrustedBinaryPath (CWE-426: PATH estricto omitiendo . y rootDir, shims .cmd/.bat en Windows sin cwd), isToolInstalled, getToolInstallSpec, ensureToolAvailable (nonInteractive, noInstallPrompt, ci, CI normalizado true/1, isTTY, confirmInstall, fail_on_missing_tool consistente en no-interactivo/rechazo/fallo, shell: false con timeout) y redactSensitiveDiagnostics en todo stderr'
    complexity: MEDIUM
    risk-level: HIGH
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/tool-installer.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-059-POLYGLOT-CLI-ORCHESTRATION
    satisfies-requirements: &ref_0
      - FR-059-POLYGLOT-CLI-ORCHESTRATION-001
      - SEC-REQ-059-CLI-ORCHESTRATION-SAFETY-001
  - id: TSK-002
    title: 'Red test primero (sast-orchestrator.spec.ts): crear packages/core/src/verifiers/sast-orchestrator.ts con detectProjectEcosystems(rootDir) (Python, Go, .NET, Java, Node/TS) y orchestratePolyglotSast(rootDir, options) usando resolveTrustedBinaryPath, spawnSync (exit 0/1 validos si .sarif existe y no esta vacio; ETIMEDOUT/ENOENT, status null/>1, SARIF faltante/invalido o @microsoft/eslint-formatter-sarif ausente como diagnostico no bloqueante con stderr redactado), mkdtempSync (0o700) con limpieza en finally, e ingesta en dos raices (ingestSarifFiles(tmpDir, tmpSarifPaths) + parseSarifDocuments(rootDir, docs))'
    complexity: MEDIUM
    risk-level: HIGH
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sast-orchestrator.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    blocked-by:
      - TSK-001
    implements-components:
      - CMP-059-POLYGLOT-CLI-ORCHESTRATION
    satisfies-requirements: *ref_0
  - id: TSK-003
    title: 'Red test primero (sast-orchestrate-integration.spec.ts): integrar orchestratePolyglotSast y ensureToolAvailable en sast.ts (verifySastAsync con orchestrate: true, semgrep faltante y fail_on_missing_tool desde quality-policy.yaml release_thresholds.sast_analysis.fail_on_missing_tool o raiz), sca/scanner.ts (ensureTrivyAvailable, scanWithTrivyAsync) y licenses.ts (verifyLicensesAsync leyendo fail_on_missing_tool de quality-policy.yaml / license-policy.yaml ci_gates.fail_on_missing_tool)'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/sast-orchestrate-integration.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    blocked-by:
      - TSK-002
    implements-components:
      - CMP-059-POLYGLOT-CLI-ORCHESTRATION
    satisfies-requirements: *ref_0
  - id: TSK-004
    title: 'Red test primero (polyglot-cli.spec.ts): exponer --orchestrate, --non-interactive, --no-install-prompt y --ci en verify sast y --non-interactive, --no-install-prompt y --ci en verify licenses (packages/cli/src/index.ts y packages/cli/src/commands/verify.ts), preservando runVerifySast/runVerifyLicenses sincronos, anadiendo runVerifySastAsync/runVerifyLicensesAsync, actualizando runVerifySecurity/runVerifyAll + Commander .action(async ...) y prompt TTY via node:readline/promises; ejecutar regresion completa (typecheck, test, verify:quality, verify:all)'
    complexity: LOW
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm vitest run packages/cli/tests/polyglot-cli.spec.ts; pnpm run typecheck; pnpm test; pnpm run verify:quality; pnpm run verify:all
    assigned-to: agent-developer
    status: COMPLETED
    blocked-by:
      - TSK-003
    implements-components:
      - CMP-059-POLYGLOT-CLI-ORCHESTRATION
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-059-POLYGLOT-CLI-ORCHESTRATION

Cobertura: `CMP-059-POLYGLOT-CLI-ORCHESTRATION`, `FR-059-POLYGLOT-CLI-ORCHESTRATION-001` y `SEC-REQ-059-CLI-ORCHESTRATION-SAFETY-001`.
Orden secuencial: `TSK-001 -> TSK-002 -> TSK-003 -> TSK-004`. Cada tarea sigue TDD estricto (test en rojo primero).

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-14 | agent-developer / human-dev | Creación inicial del plan de tareas con gobernanza | CHG-059-POLYGLOT-CLI-ORCHESTRATION |
| **1.1.0** | 2026-11-14 | agent-system-architect | Desglose atómico TDD TSK-001..TSK-004 cubriendo CMP-059, FR-059-001 y SEC-REQ-059-001 | CHG-059-POLYGLOT-CLI-ORCHESTRATION |
| **1.2.0** | 2026-11-14 | agent-system-architect | Remediación Checkpoint 1: actualización TSK-001..TSK-004 con ingesta en dos raíces, spawnSync 0/1, CWE-426 PATH/shims, fail_on_missing_tool y --ci | CHG-059-POLYGLOT-CLI-ORCHESTRATION |
