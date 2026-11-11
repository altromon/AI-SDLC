---
id: TSK-PLAN-CHG-052-CLI-DOCTOR
type: task-plan
change-id: CHG-052-CLI-DOCTOR
title: 'Desglose de Tareas Verificables: CLI Doctor Environment Health Diagnostics'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 5
  human-review-plan-count: 1
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Definición de Tipos, Contratos e Interfaces de CMP-052-DOCTOR-ENGINE
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm run typecheck
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-052-DOCTOR-ENGINE
    satisfies-requirements:
      - FR-052-CLI-DOCTOR-001
      - SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001
      - SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001
      - SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001
      - SEC-REQ-052-RESILIENT-DIAGNOSTIC-TIMEOUTS-001
  - id: TSK-002
    title: Implementación del Safe Process Runner y Sondas del Dominio (Toolchain, Hooks, Branch)
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/doctor-probes.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-052-DOCTOR-ENGINE
    satisfies-requirements:
      - FR-052-CLI-DOCTOR-001
      - SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001
      - SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001
  - id: TSK-003
    title: Implementación de Chequeos de Esquemas/PDaC y Firma Criptográfica con DLP y Timeouts
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/doctor-security.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-052-DOCTOR-ENGINE
    satisfies-requirements:
      - FR-052-CLI-DOCTOR-001
      - SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001
      - SEC-REQ-052-RESILIENT-DIAGNOSTIC-TIMEOUTS-001
  - id: TSK-004
    title: Implementación del Orquestador de Diagnósticos y Formateadores (Terminal y JSON)
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/doctor-service.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-052-DOCTOR-ENGINE
    satisfies-requirements:
      - FR-052-CLI-DOCTOR-001
  - id: TSK-005
    title: Integración de Comando CLI 'aisdlc doctor' y Herramienta MCP 'doctor'
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/cli/tests/doctor-command.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-052-DOCTOR-ENGINE
      - CMP-CLI
      - CMP-MCP-SERVER
    satisfies-requirements:
      - FR-052-CLI-DOCTOR-001
  - id: TSK-006
    title: Ejecución de BDD End-to-End y Verificación Integral de Quality Gates
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm exec aisdlc check --fix && pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-052-DOCTOR-ENGINE
    satisfies-requirements:
      - FR-052-CLI-DOCTOR-001
      - SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001
      - SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001
      - SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001
      - SEC-REQ-052-RESILIENT-DIAGNOSTIC-TIMEOUTS-001
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-052-CLI-DOCTOR

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### TSK-001: Definición de Tipos, Contratos e Interfaces de CMP-052-DOCTOR-ENGINE
- **ID**: `TSK-001`
- **Descripción**: Crear las interfaces, DTOs y tipos TypeScript en `packages/core/src/doctor/types.ts` y contratos de puertos de salida en `ports.ts` estipulados en `design.md`, incluyendo soporte para la opción `offline?: boolean` en `DoctorOptions`, códigos de error específicos (`ERR_HOOKS_SYMLINK_REJECTED`, etc.) y contratos de sanitización DLP.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm run typecheck`

### TSK-002: Implementación del Safe Process Runner y Sondas del Dominio (Toolchain, Hooks, Branch)
- **ID**: `TSK-002`
- **Descripción**: Implementar `SafeProcessRunnerAdapter` con `execFile({ shell: false })`, lista blanca estricta (`node`, `pnpm`, `git`), higienización forzosa del entorno purgando `NODE_OPTIONS`, `NODE_PATH`, `LD_PRELOAD`, `DYLD_INSERT_LIBRARIES` y `GIT_EXEC_PATH` y restringiendo a whitelist segura de variables de entorno del sistema, junto con truncamiento a 1024 bytes. Implementar `GitHooksHealthCheck` con defensa anti-symlink (`fs.lstatSync`), verificación estructural diferenciada (`pre-commit` con guard y lógica de rechazo `exit 1`; `prepare-commit-msg` con trailers), soporte de respaldo timestamped (`.bak.<timestamp>`) en `--fix`, `BranchSafetyCheck` e integración inicial de pruebas unitarias.
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Verificación**: `pnpm test packages/core/tests/doctor-probes.spec.ts`

### TSK-003: Implementación de Chequeos de Esquemas/PDaC y Firma Criptográfica con DLP y Timeouts
- **ID**: `TSK-003`
- **Descripción**: Implementar `SchemasPdacHealthCheck` y `SignatureReadinessCheck` aplicando censura DLP para que ninguna clave privada o token sea expuesto en el reporte (`[REDACTED_SECRET]`) y timeout determinista <= 2000ms degradando a advertencia no bloqueante ante lentitud de red.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test packages/core/tests/doctor-security.spec.ts`

### TSK-004: Implementación del Orquestador de Diagnósticos y Formateadores (Terminal y JSON)
- **ID**: `TSK-004`
- **Descripción**: Implementar `DoctorService` y `DoctorOrchestrator` consolidando las 5 categorías con cálculo determinista de código de salida (0, 1, 2). Integrar redacción recursiva obligatoria mediante `DlpSanitizer` sobre todos los campos de `findings` (`message`, `details`) y capturas de excepciones (`err.message`, `err.stack`). Implementar soporte para modo offline/air-gapped (`--offline` o `AI_SDLC_OFFLINE=1`) omitiendo sondas remotas para no inducir fallos falsos bajo `--strict`. Implementar formateadores deterministas para terminal y JSON.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test packages/core/tests/doctor-service.spec.ts`

### TSK-005: Integración de Comando CLI 'aisdlc doctor' y Herramienta MCP 'doctor'
- **ID**: `TSK-005`
- **Descripción**: Conectar los adaptadores inbound de CLI (`packages/cli/src/commands/doctor.ts`) con soporte para las banderas `--json`, `--fix`, `--strict`, `--offline`, `--timeout <ms>` y variable de entorno `AI_SDLC_OFFLINE=1`, y MCP (`packages/mcp/src/tools/doctor.ts`), registrando el comando en el router CLI principal con documentación de ayuda y códigos de salida conformes.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test packages/cli/tests/doctor-command.spec.ts`

### TSK-006: Ejecución de BDD End-to-End y Verificación Integral de Quality Gates
- **ID**: `TSK-006`
- **Descripción**: Ejecutar suites BDD cucumber/gherkin correspondientes a los escenarios nominales, de frontera y abusos mitigados de `FR-052-CLI-DOCTOR-001` y los cuatro `SEC-REQ-052-*`. Validar el cumplimiento de todas las Quality Gates del proyecto.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm exec aisdlc check --fix && pnpm test`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-system-architect | Desglose atómico y gobernanza de tareas con 100% de cobertura de requerimientos | CHG-052-CLI-DOCTOR |
