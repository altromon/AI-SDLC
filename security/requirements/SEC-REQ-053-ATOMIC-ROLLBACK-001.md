---
id: SEC-REQ-053-ATOMIC-ROLLBACK-001
type: security-requirement
title: Transaccionalidad de Migración y Rollback Automático ante Errores de Ejecución
status: active
version: 1.0.0
schema-version: '1.0'
security-domain: data-protection
mitigates-abuse-case:
  - ABUSE-053-PARTIAL-MIGRATION-DOS-CORRUPTION-001
compliance-references:
  - OWASP-ASVS-V1.1
  - OWASP-ASVS-V14.2
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-053-ATOMIC-ROLLBACK-001'
  - '@security'
  - '@mitigation'
  - '@migrate'
  - '@atomic-rollback'
supersedes: null
superseded-by: null
---

# SEC-REQ-053-ATOMIC-ROLLBACK-001: Transaccionalidad de Migración y Rollback Automático

## 1. Enunciado del Control Técnico
La sincronización y escritura de artefactos mediante `aisdlc migrate` DEBE operar bajo principios estrictos de atomicidad transaccional:
1. **Escritura en Área de Staging Temporal Aislada y Única**: Todos los artefactos a actualizar o generar DEBEN escribirse inicialmente en un directorio temporal aislado y unívocamente identificado (`.backup/.staging-<uuid>/` o staging in-memory) para prevenir colisiones o sobreescrituras concurrentes, y validarse semánticamente antes de comprometerlos en el árbol de trabajo.
2. **Rollback Automático y Manejo de Interrupciones de Proceso (SIGINT/SIGTERM)**: Si cualquier operación de escritura, validación de esquemas o sincronización falla, o si el proceso recibe una señal de interrupción del sistema operativo (`SIGINT`, `SIGTERM`), el `TransactionManager` DEBE registrar manejadores síncronos de señales que ejecuten `rollbackSync()` inmediatamente, restauren el estado original previo a partir del respaldo y eliminen el directorio temporal de staging, terminando con código de salida `2`.
3. **Validación Pre-Commit de Esquemas (Fail-Safe Integrity Check)**: Antes de dar por finalizada la migración, el sistema DEBE autoverificar que los nuevos esquemas y políticas son sintácticamente válidos (`JSON.parse` / `yaml.parse`) y que ningún archivo quedó truncado a 0 bytes. En caso de detectar corrupción, DEBE ejecutar el rollback automático.
4. **Finalización Determinista en Fallo**: Si la migración se aborta con rollback, el proceso DEBE reportar el diagnóstico detallado del fallo y finalizar de forma limpia y determinista con código de salida `2`.

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-053-PARTIAL-MIGRATION-DOS-CORRUPTION-001` | Mitigates Abuse Case | Validated |
| **Use Case (Product)** | `UC-053-CLI-MIGRATE` | Governs Use Case | Validated |
| **Requisito Funcional** | `FR-053-CLI-MIGRATE-001` | Enforces Security | Validated |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
@SEC-REQ-053-ATOMIC-ROLLBACK-001 @security @mitigation @migrate @atomic-rollback
Feature: Transaccionalidad de Migración y Rollback Automático
  As a DevSecOps Engineer
  I want aisdlc migrate to execute all file migrations atomically with automatic rollback on error
  So that partial failure cannot leave schemas in an inconsistent corrupted state that breaks quality gates

  Scenario: Rollback automático completo ante un fallo de I/O durante la migración
    Given a migration process in progress where an I/O write error occurs midway
    When the error is trapped by the migration transaction manager
    Then all partially modified files are rolled back to their exact pre-migration state
    And temporary staging directories are cleaned up
    And the command exits with exit code 2

  Scenario: Verificación de integridad pre-commit y reversión ante esquema corrupto
    Given a candidate schema file that is syntactically invalid or truncated to 0 bytes
    When the pre-commit integrity validator inspects the staged schema files
    Then the staged migration transaction is aborted
    And no corrupted files are promoted to the active "schemas/" directory
    And diagnostic error "ERR_MIGRATION_VALIDATION_FAILED" is logged

  Scenario: Limpieza garantizada de staging temporal en salida limpia
    Given a successful migration execution
    When all validated files are promoted to the active workspace
    Then any temporary staging artifacts are completely removed
    And the process exits with exit code 0
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Especificación de atomicidad transaccional y rollback automático en migración | CHG-053-CLI-MIGRATE |
