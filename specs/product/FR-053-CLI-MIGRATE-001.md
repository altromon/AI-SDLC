---
id: FR-053-CLI-MIGRATE-001
type: requirement
title: cli-migrate-lifecycle-sync
status: active
version: 1.0.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-053-CLI-MIGRATE
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-053-CLI-MIGRATE-001'
  - '@automated'
  - '@migrate'
supersedes: null
superseded-by: null
---

# FR-053-CLI-MIGRATE-001: cli-migrate-lifecycle-sync

## 1. Enunciado Normativo
El sistema DEBE proveer el comando CLI `aisdlc migrate` para la sincronización y actualización automatizada y no destructiva de esquemas JSON (`schemas/`), plantillas canónicas (`templates/`) y políticas de gobernanza (`quality-policy.yaml`, `license-policy.yaml`, `privacy-policy.yaml`, `dlp-policy.yaml`). El comando DEBE detectar modificaciones u overrides locales en el repositorio de destino y NUNCA sobreescribirlos de manera implícita. El comando DEBE soportar la bandera `--dry-run` para previsualizar planes de migración y diffs sin mutar el sistema de archivos, la bandera `--backup` para generar un respaldo preventivo con marca de tiempo en `.backup/`, y la bandera `--force` para autorizar la sobreescritura de modificaciones locales. El comando DEBE terminar con código de salida determinista: `0` (actualizado o migrado exitosamente), `1` (conflictos u overrides locales detectados requiriendo atención manual), y `2` (fallo crítico de ejecución o rama protegida activa durante la mutación).

### Incremento (chg-053-cli-migrate)
CLI Migrate Lifecycle Command (`aisdlc migrate`) para la actualización no destructiva, gobernada y determinista de esquemas JSON, plantillas y políticas AI-SDLC preservando la personalización del usuario (#168 part 3).

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-053-CLI-MIGRATE-001 @automated @migrate
Feature: cli-migrate-lifecycle-sync
  As a developer, DevSecOps engineer, or AI autonomous agent
  I want to invoke the aisdlc migrate command
  So that repository schemas, templates, and governance policies are synchronized safely without losing custom configurations

  @nominal
  Scenario: Clean synchronization of canonical assets without local modifications
    Given the repository has unmodified baseline schemas, templates, and policies
    When the command "aisdlc migrate" is executed
    Then all canonical schemas, templates, and policies are synchronized
    And a timestamped backup directory is created under ".backup"
    And the command exits with exit code 0

  @nominal
  Scenario: Dry-run execution generates preview plan without touching filesystem
    Given pending upstream updates exist for repository schemas and policies
    When the command "aisdlc migrate --dry-run" is executed
    Then a detailed migration preview plan is displayed in standard output
    And no files in the workspace are modified or created
    And the command exits with exit code 0

  @boundary
  Scenario: Detection of local custom overrides preserves user files with warning exit code
    Given the repository contains local user modifications in "quality-policy.yaml"
    When the command "aisdlc migrate" is executed without "--force"
    Then the locally modified "quality-policy.yaml" is preserved unchanged
    And the migration report notes the skipped override
    And the command exits with exit code 1

  @boundary
  Scenario: Explicit force migration overrides local modifications with backup safeguard
    Given the repository contains local user modifications in "quality-policy.yaml"
    When the command "aisdlc migrate --force --backup" is executed
    Then a timestamped backup of existing files is created under ".backup"
    And "quality-policy.yaml" is updated to the latest canonical version
    And the command exits with exit code 0

  @invalid
  Scenario Outline: Critical execution errors abort migration with exit code 2
    Given the migration environment encounters a critical condition "<critical_condition>"
    When the command "aisdlc migrate" is executed
    Then the execution terminates reporting critical error "<error_code>"
    And the command exits with exit code 2

    Examples:
      | critical_condition                | error_code                         |
      | active_branch_is_protected_main   | ERR_PROTECTED_BRANCH_MIGRATION     |
      | filesystem_permission_denied      | ERR_MIGRATION_IO_PERMISSION_DENIED |
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-product-analyst | Definición de requerimiento funcional para comando aisdlc migrate (#168 part 3) | CHG-053-CLI-MIGRATE |
