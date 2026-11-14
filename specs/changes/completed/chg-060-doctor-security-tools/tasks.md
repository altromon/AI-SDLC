---
id: TSK-PLAN-CHG-060-DOCTOR-SECURITY-TOOLS
type: task-plan
change-id: CHG-060-DOCTOR-SECURITY-TOOLS
title: 'Desglose de Tareas Verificables: Doctor Security Tools'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 1
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: 'Ampliar tipos, ejecutor seguro y allowlist compartida: añadir security_tools a DiagnosticCategory y semgrep/trivy/gitleaks a IProcessRunner (packages/core/src/types/doctor.ts); actualizar SafeProcessRunnerAdapter.execSafe (packages/core/src/doctor/process-runner.ts) para resolver trustedPath vía resolveTrustedBinaryPath(executable, cwd) (sin ejecutar nombre bare con cwd), depurar ./cwd de PATH en buildSafeEnvironment, fijar SEMGREP_ENABLE_VERSION_CHECK=0 y SEMGREP_SEND_METRICS=off, y manejar shims .cmd/.bat en Windows vía ComSpec (/d /s /c, shell: false, WIN_CMD_META_RE); y añadir gitleaks a InstallableTool / TOOL_INSTALL_ALLOWLIST (packages/core/src/verifiers/tool-installer.ts)'
    complexity: LOW
    risk-level: MEDIUM
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/tool-installer.spec.ts packages/core/tests/doctor.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-060-DOCTOR-SECURITY-TOOLS
    satisfies-requirements: &ref_0
      - FR-060-DOCTOR-SECURITY-TOOLS-001
  - id: TSK-002
    title: 'Red test primero (packages/core/tests/security-tools-check.spec.ts): implementar SecurityToolsHealthCheck en packages/core/src/doctor/security-tools-check.ts (CWE-426 via resolveTrustedBinaryPath, execSafe con shell: false y timeout, probes semgrep --version / trivy --version / gitleaks version, redacción de stderr y errores con redactSensitiveDiagnostics + sanitizeDlpText antes de guardar en finding.details/message, hallazgos warn WARN_SECURITY_TOOL_<TOOL>_MISSING e ISSUE con getToolInstallSpec sin sudo) y exportar en packages/core/src/doctor/index.ts'
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/security-tools-check.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    blocked-by:
      - TSK-001
    implements-components:
      - CMP-060-DOCTOR-SECURITY-TOOLS
    satisfies-requirements: *ref_0
  - id: TSK-003
    title: 'Registrar SecurityToolsHealthCheck en DoctorOrchestrator.runAll (packages/core/src/doctor/doctor-service.ts), verificar renderizado de security_tools en DoctorReporter / packages/cli/src/commands/doctor.ts y actualizar/añadir cobertura en packages/core/tests/doctor.spec.ts sin depender de binarios locales instalados'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm vitest run packages/core/tests/doctor.spec.ts packages/core/tests/security-tools-check.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    blocked-by:
      - TSK-002
    implements-components:
      - CMP-060-DOCTOR-SECURITY-TOOLS
    satisfies-requirements: *ref_0
  - id: TSK-004
    title: 'Validar compilación estricta, suite completa de pruebas y puertas de calidad (typecheck, test, verify:quality, verify:all)'
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm run typecheck && pnpm test && pnpm run verify:quality && pnpm run verify:all
    assigned-to: agent-developer
    status: COMPLETED
    blocked-by:
      - TSK-003
    implements-components:
      - CMP-060-DOCTOR-SECURITY-TOOLS
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-060-DOCTOR-SECURITY-TOOLS

Cobertura: `CMP-060-DOCTOR-SECURITY-TOOLS` y `FR-060-DOCTOR-SECURITY-TOOLS-001`.
Orden secuencial: `TSK-001 -> TSK-002 -> TSK-003 -> TSK-004`.
