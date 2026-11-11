---
id: SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001
type: security-requirement
title: Validación Estricta de Rutas y Confinamiento en Raíz de Repositorio (Path Traversal Defense)
status: active
version: 1.0.0
schema-version: '1.0'
security-domain: input-validation
mitigates-abuse-case:
  - ABUSE-053-PATH-TRAVERSAL-CLOBBER-001
compliance-references:
  - OWASP-ASVS-V5.5
  - OWASP-ASVS-V14.2
  - CWE-22-Improper-Limitation-of-a-Pathname-to-a-Restricted-Directory
  - CWE-59-Improper-Link-Resolution-Before-File-Access
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001'
  - '@security'
  - '@mitigation'
  - '@migrate'
  - '@path-traversal'
supersedes: null
superseded-by: null
---


# SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001: Validación Estricta de Rutas y Confinamiento en Raíz de Repositorio

## 1. Enunciado del Control Técnico
Cuando el comando `aisdlc migrate` procese rutas de entrada, plantillas o artefactos a sincronizar y respaldar, el sistema DEBE imponer defensas rigurosas de resolución y confinamiento en el sistema de archivos:
1. **Resolución Canónica y Confinamiento Estricto (Root Jailing)**: Toda ruta de origen y destino DEBE ser normalizada y resuelta canónicamente. Para evitar ataques de prefijo de directorio hermano (sibling prefix bypass como `/app-malicious` iniciando con `/app`), el confinamiento DEBE verificar expresamente que `resolvedPath === repoRoot || resolvedPath.startsWith(repoRoot + path.sep)` o comprobar mediante `path.relative(repoRoot, resolvedPath)` que no inicie con `..` ni contenga separadores de escape absoluto. Asimismo, DEBE normalizar la letra de unidad en Windows (drive-letter casing a mayúsculas/minúsculas canónicas) y despojar o manejar prefijos extendidos (`\\?\`). Cualquier intento de referenciar o escribir fuera de `repoRoot` DEBE ser abortado de inmediato con error crítico `ERR_PATH_TRAVERSAL_DETECTED`.
2. **Rechazo de Secuencias Traversal**: Se DEBE rechazar cualquier ruta o segmento que contenga secuencias relativas de escape (`../`, `..\`) o caracteres nulos (`\0`).
3. **Neutralización de Symlinks y Junctions Traversal**: El sistema DEBE resolver rutas reales (`fs.realpathSync`) y verificar que el `realpath` de cualquier archivo de destino o directorio intermedio permanezca confinado dentro del `realpath` de `repoRoot`. Si un enlace simbólico o junction apunta fuera del confinamiento del repositorio, la operación DEBE ser rechazada inmediatamente con `ERR_SYMLINK_ESCAPE_DETECTED`.
4. **Validación de Directorios Permitidos**: Las operaciones de escritura durante la migración DEBEN estar restringidas exclusivamente a los subdirectorios canónicos gobernados (`schemas/`, `templates/`, `.backup/`) y a los archivos de políticas en la raíz (`quality-policy.yaml`, `license-policy.yaml`, `privacy-policy.yaml`, `dlp-policy.yaml`).

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-053-PATH-TRAVERSAL-CLOBBER-001` | Mitigates Abuse Case | Validated |
| **Use Case (Product)** | `UC-053-CLI-MIGRATE` | Governs Use Case | Validated |
| **Requisito Funcional** | `FR-053-CLI-MIGRATE-001` | Enforces Security | Validated |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
@SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001 @security @mitigation @migrate @path-traversal
Feature: Validación Estricta de Rutas y Confinamiento en Raíz de Repositorio
  As a DevSecOps Engineer
  I want aisdlc migrate to strictly validate file paths against repository boundaries
  So that malicious templates or traversal attempts cannot clobber files outside the project root

  Scenario: Detección y bloqueo de secuencias de escape de directorio
    Given a migration source or target path containing "../../../etc/passwd" or "..\\..\\system.ini"
    When the path resolver evaluates the target migration candidate
    Then the operation must be aborted with error "ERR_PATH_TRAVERSAL_DETECTED"
    And no file outside the repository boundary is opened, created, or modified

  Scenario: Confinamiento estricto en la raíz del repositorio
    Given a resolved file path that resolves outside the canonical repository root
    When the migration engine validates the write target
    Then the validation must fail with "ERR_PATH_OUTSIDE_REPO_ROOT"
    And the process must terminate with exit code 2

  Scenario: Detección y rechazo de enlaces simbólicos que escapan de la raíz
    Given a target file path pointing to a symlink referencing "/etc/shadow" or outside workspace
    When the migration engine inspects the destination target
    Then the symlink write must be rejected with diagnostic "ERR_SYMLINK_ESCAPE_DETECTED"
    And the migration must be aborted cleanly
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | AI-SDLC Integration Engine | Implementación verificada (TSK-001, TSK-002, TSK-003, TSK-004, TSK-005, TSK-006, TSK-007) | chg-053-cli-migrate |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Especificación de control de contención de rutas y defensa contra path traversal | CHG-053-CLI-MIGRATE |
