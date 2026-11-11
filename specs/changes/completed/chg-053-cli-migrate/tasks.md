---
id: TSK-PLAN-CHG-053-CLI-MIGRATE
type: task-plan
change-id: CHG-053-CLI-MIGRATE
title: 'Desglose de Tareas Verificables: CLI Migration Tool for Schemas Templates and Policies'
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
    title: Definición de Tipos, Contratos e Interfaces de CMP-053-MIGRATE-ENGINE
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm run typecheck
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-053-MIGRATE-ENGINE
    satisfies-requirements:
      - FR-053-CLI-MIGRATE-001
      - SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001
      - SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001
      - SEC-REQ-053-ATOMIC-ROLLBACK-001
      - SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001
  - id: TSK-002
    title: Implementación de FileSystemJail (Confinamiento Safe y Anti-Traversal) y DiffDetector
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/migrate-fs-diff.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-053-MIGRATE-ENGINE
    satisfies-requirements:
      - FR-053-CLI-MIGRATE-001
      - SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001
  - id: TSK-003
    title: Implementación de PolicyRatchetEnforcer y OverrideAnalyzer
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/migrate-policy-ratchet.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-053-MIGRATE-ENGINE
    satisfies-requirements:
      - FR-053-CLI-MIGRATE-001
      - SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001
  - id: TSK-004
    title: Implementación de BackupManager y TransactionManager (Atomic Staging y Rollback)
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/migrate-transaction.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-053-MIGRATE-ENGINE
    satisfies-requirements:
      - FR-053-CLI-MIGRATE-001
      - SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001
      - SEC-REQ-053-ATOMIC-ROLLBACK-001
  - id: TSK-005
    title: Implementación de MigrationService, MigrationOrchestrator y Formateadores (Terminal y JSON)
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/core/tests/migrate-service.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-053-MIGRATE-ENGINE
    satisfies-requirements:
      - FR-053-CLI-MIGRATE-001
      - SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001
      - SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001
      - SEC-REQ-053-ATOMIC-ROLLBACK-001
      - SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001
  - id: TSK-006
    title: Integración de Comando CLI 'aisdlc migrate' y Herramienta MCP 'migrate'
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test packages/cli/tests/migrate-command.spec.ts
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-053-MIGRATE-ENGINE
      - CMP-CLI
      - CMP-MCP-SERVER
    satisfies-requirements:
      - FR-053-CLI-MIGRATE-001
  - id: TSK-007
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
      - CMP-053-MIGRATE-ENGINE
    satisfies-requirements:
      - FR-053-CLI-MIGRATE-001
      - SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001
      - SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001
      - SEC-REQ-053-ATOMIC-ROLLBACK-001
      - SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-053-CLI-MIGRATE

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### TSK-001: Definición de Tipos, Contratos e Interfaces de CMP-053-MIGRATE-ENGINE
- **ID**: `TSK-001`
- **Descripción**: Crear las interfaces, DTOs y tipos TypeScript en `packages/core/src/types/migrate.ts` y contratos de puertos de salida estipulados en `design.md`, incluyendo `MigrationOptions`, `MigrationResult`, `MigrationFileStatus`, `IFileSystemJail`, `IBackupManager` e `IMigrationReporter`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm run typecheck`

### TSK-002: Implementación de FileSystemJail (Confinamiento Safe y Anti-Traversal) y DiffDetector
- **ID**: `TSK-002`
- **Descripción**: Implementar `PathResolutionJailAdapter` cumpliendo `SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001`:
  1. Resolución canónica ineludible con `path.resolve` y verificación de pertenencia `resolvedPath === repoRoot || resolvedPath.startsWith(repoRoot + path.sep)` / `path.relative(repoRoot, resolvedPath)` para prevenir sibling directory prefix bypass.
  2. Normalización de letra de unidad en Windows y soporte de prefijos extendidos (`\\?\`).
  3. Detección y neutralización de symlink/junction escape empleando `fs.realpathSync` contra `fs.realpathSync(repoRoot)`.
  4. Bloqueo de secuencias `../`, `..\` y caracteres nulos.
  5. Contención por lista blanca de directorios gobernados (`schemas/`, `templates/`, `.backup/`, políticas raíz).
  6. Implementar `DiffDetector` comparando digests SHA-256 normalizados en Unix LF (`\n`).
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Verificación**: `pnpm test packages/core/tests/migrate-fs-diff.spec.ts`

### TSK-003: Implementación de PolicyRatchetEnforcer y OverrideAnalyzer
- **ID**: `TSK-003`
- **Descripción**: Implementar `OverrideAnalyzer` para clasificar artefactos en `UP_TO_DATE`, `CLEAN_UPDATE`, `LOCAL_OVERRIDE_PRESERVED` o `CONFLICT`. Implementar `PolicyRatchetEnforcer` garantizando el invariante de no relajación de seguridad según `SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001`:
  1. Validación estricta de tipos numéricos antes de comparaciones relacionales (fallo cerrado con `ERR_INVALID_POLICY_FORMAT` ante `NaN`, tipos no coincidentes o malformados).
  2. Normalización de identificadores SPDX a mayúsculas para listas de licencias bloqueadas y permitidas.
  3. Preservación automática de umbrales locales más estrictos (mayor cobertura, menor complejidad).
  4. Fusión aditiva (union merge) de reglas de DLP y patrones de privacidad/activos de datos.
  5. Requerimiento obligatorio de `--allow-policy-downgrade` ante degradaciones forzadas.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test packages/core/tests/migrate-policy-ratchet.spec.ts`

### TSK-004: Implementación de BackupManager y TransactionManager (Atomic Staging y Rollback)
- **ID**: `TSK-004`
- **Descripción**: Implementar `TimestampedBackupManagerAdapter` (`SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001`):
  1. Inyección y verificación previa de `.backup/` en `.gitignore` antes de crear el directorio en disco.
  2. Generación de nombres de respaldo únicos con timestamp en milisegundos y sufijo pseudoaleatorio `.backup/migration-<timestamp>-<random6>/` para prevenir colisiones concurrentes.
  3. Generación de `manifest.json` con hashes SHA-256 en Unix LF y permisos restringidos `0700`.
  4. Implementar `TransactionManager` (`SEC-REQ-053-ATOMIC-ROLLBACK-001`):
     - Creación de staging unívoco `.backup/.staging-<uuid>/`.
     - Registro de manejadores de señales `SIGINT` y `SIGTERM` para ejecución síncrona de `rollbackSync()` y salida con código `2`.
     - Validación pre-commit de integridad sintáctica (JSON/YAML) y comprobación de tamaño mayor a 0 bytes.
     - Rollback y limpieza automática ante excepciones I/O.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test packages/core/tests/migrate-transaction.spec.ts`

### TSK-005: Implementación de MigrationService, MigrationOrchestrator y Formateadores (Terminal y JSON)
- **ID**: `TSK-005`
- **Descripción**: Implementar `MigrationOrchestrator` y `MigrationService` coordinando el ciclo completo con:
  1. Verificación robusta de ramas protegidas (`main`, `master`, `release/*`) incluyendo gestión de Detached HEAD (`git symbolic-ref`, `git rev-parse`, variables CI `GITHUB_REF_NAME`/`CI_COMMIT_REF_NAME`), con fail-closed y aborto inmediato (`ERR_PROTECTED_BRANCH_MIGRATION`, código `2`) en escrituras si no se puede determinar la rama.
  2. Modo `--dry-run` sin mutación en disco.
  3. Coordinación de diffs, políticas ratchet, respaldos y staging transaccional.
  4. Emisión determinista de códigos de salida (0, 1, 2).
  5. Implementar formateadores interactivos de terminal y serialización JSON.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test packages/core/tests/migrate-service.spec.ts`

### TSK-006: Integración de Comando CLI 'aisdlc migrate' y Herramienta MCP 'migrate'
- **ID**: `TSK-006`
- **Descripción**: Conectar los adaptadores inbound de CLI (`packages/cli/src/commands/migrate.ts`) con soporte para `-r/--root`, `--dry-run`, `--backup`, `--force`, `--allow-policy-downgrade`, `--json`, `--verbose` y MCP (`packages/mcp/src/tools/migrate.ts`), registrando el comando en el router CLI principal con documentación de ayuda y códigos de salida conformes.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test packages/cli/tests/migrate-command.spec.ts`

### TSK-007: Ejecución de BDD End-to-End y Verificación Integral de Quality Gates
- **ID**: `TSK-007`
- **Descripción**: Ejecutar suites BDD cucumber/gherkin correspondientes a los escenarios nominales, de frontera y abusos mitigados de `FR-053-CLI-MIGRATE-001` y los cuatro `SEC-REQ-053-*`. Validar el cumplimiento de todas las Quality Gates del proyecto.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm exec aisdlc check --fix && pnpm test`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-system-architect | Desglose atómico y gobernanza de tareas con 100% de cobertura de requerimientos | CHG-053-CLI-MIGRATE |
