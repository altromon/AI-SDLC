---
id: SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001
type: security-requirement
title: Respaldo Preventivo Criptográficamente Verificado y No Destructivo
status: active
version: 1.0.0
schema-version: '1.0'
security-domain: data-protection
mitigates-abuse-case:
  - ABUSE-053-SILENT-SECURITY-POLICY-DOWNGRADE-001
compliance-references:
  - OWASP-ASVS-V1.1
  - OWASP-ASVS-V10.3
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001'
  - '@security'
  - '@mitigation'
  - '@migrate'
  - '@backup'
supersedes: null
superseded-by: null
---

# SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001: Respaldo Preventivo Criptográficamente Verificado

## 1. Enunciado del Control Técnico
Antes de ejecutar cualquier modificación en disco sobre esquemas, plantillas o archivos de políticas de gobernanza (`quality-policy.yaml`, `license-policy.yaml`, `privacy-policy.yaml`, `dlp-policy.yaml`), el sistema DEBE garantizar la preservación íntegra del estado preexistente:
1. **Generación Obligatoria de Respaldo con Sufijo Anti-Colisión**: Toda mutación DEBE respaldar los archivos a modificar en `.backup/migration-<timestamp>-<random6>/` (utilizando timestamp en milisegundos y un sufijo aleatorio criptográfico o pseudoaleatorio de al menos 6 caracteres) antes de tocar el archivo original, impidiendo colisiones entre ejecuciones concurrentes o sub-segundo.
2. **Digest Criptográfico Preventivo**: Cada archivo respaldado DEBE registrar su hash SHA-256 (normalizado Unix LF) en un manifiesto `manifest.json` dentro del directorio de respaldo para garantizar auditabilidad e inmutabilidad.
3. **Preservación por Omisión de Overrides Locales**: Si un archivo presenta discrepancia con respecto a la versión base previa sin el flag `--force`, el sistema DEBE rehusarse a modificar dicho archivo, registrar una advertencia explícita en terminal y finalizar con código de salida `1` para requerir confirmación explícita del operador humano.
4. **Protección Contra Filtración y Orden de Operaciones Gitignore**: Antes de crear el directorio `.backup/` físicamente en el disco, el sistema DEBE verificar o actualizar `.gitignore` para asegurar la entrada `.backup/`. El directorio `.backup/` DEBE asegurar permisos restringidos de sistema de archivos (`0700` / lectura-escritura exclusiva del usuario) evitando la subida inadvertida de respaldos a repositorios remotos públicos.

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-053-SILENT-SECURITY-POLICY-DOWNGRADE-001` | Mitigates Abuse Case | Validated |
| **Use Case (Product)** | `UC-053-CLI-MIGRATE` | Governs Use Case | Validated |
| **Requisito Funcional** | `FR-053-CLI-MIGRATE-001` | Enforces Security | Validated |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
@SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001 @security @mitigation @migrate @backup
Feature: Respaldo Preventivo Criptográficamente Verificado
  As a Security Officer
  I want aisdlc migrate to automatically create verifiable backups before mutating policies
  So that enterprise customizations and security thresholds can never be irreversibly destroyed

  Scenario: Creación de respaldo con manifiesto de digests SHA-256 antes de mutar
    Given a repository with existing policy files "quality-policy.yaml" and "license-policy.yaml"
    When the migration command is executed with write actions
    Then a timestamped backup directory is created under ".backup"
    And a "manifest.json" containing Unix LF SHA-256 digests for all backed up files is generated
    And original policy content matches the backed up replica byte-by-byte

  Scenario: Preservación no destructiva de archivos modificados localmente sin force
    Given a repository where "quality-policy.yaml" contains customized enterprise thresholds
    When the command "aisdlc migrate" is executed without "--force"
    Then the local "quality-policy.yaml" file is retained untouched on disk
    And a warning is output indicating an override conflict was preserved
    And the command exits with exit code 1

  Scenario: Protección de permisos y privacidad en el directorio de respaldo
    Given an automated migration backup operation
    When the backup directory ".backup" is initialized
    Then the directory permissions must be restricted to the active user
    And the ".backup" path is ensured to be tracked in ".gitignore"
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Especificación de respaldo preventivo no destructivo y preservación de overrides | CHG-053-CLI-MIGRATE |
