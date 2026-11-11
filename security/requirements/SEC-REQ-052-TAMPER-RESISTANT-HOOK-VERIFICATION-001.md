---
id: SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001
type: security-requirement
title: Verificación de Integridad y Detección de Suplantación en Git Hooks
status: active
version: 1.0.0
schema-version: '1.0'
security-domain: input-validation
mitigates-abuse-case:
  - ABUSE-052-HOOK-SPOOFING-001
compliance-references:
  - OWASP-ASVS-V10.3
  - OWASP-ASVS-V14.2
  - NIST-SSDF-SP-800-218-PW.1.2
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001'
  - '@security'
  - '@mitigation'
  - '@doctor'
  - '@git-hooks'
supersedes: null
superseded-by: null
---

# SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001: Verificación de Integridad y Detección de Suplantación en Git Hooks

## 1. Enunciado del Control Técnico
Cuando el diagnóstico `aisdlc doctor` o su herramienta MCP homóloga evalúe la salud de los Git hooks del repositorio (`.git/hooks/pre-commit` y `.git/hooks/prepare-commit-msg`), el evaluador NO DEBE limitarse a comprobar la existencia del archivo en el sistema de archivos ni simples subcadenas genéricas. El evaluador DEBE verificar de forma determinista:
1. **Defensa contra Enlaces Simbólicos (Symlink Defense)**: Verificar que los hooks no sean enlaces simbólicos (`fs.lstatSync(hookPath).isSymbolicLink() === false`). Cualquier symlink encontrado DEBE ser rechazado (`ERR_HOOKS_SYMLINK_REJECTED`) o desvinculado de forma segura en modo `--fix` para evitar escalada de privilegios o sobrescritura arbitraria de archivos fuera del repositorio.
2. **Presencia y Permisos de Ejecución**: Comprobar existencia real en disco y permisos de ejecución (en entornos POSIX `0o755` o comprobación equivalente multiplataforma).
3. **No Vacío**: Longitud del archivo mayor a 0 bytes (`size > 0`).
4. **Verificación Estructural Anti-Bypass por Archivo Específico**:
   - Para `.git/hooks/pre-commit`: DEBE contener el encabezado identificador `# AI-SDLC: Universal Protected Branches Guard` Y ADEMÁS verificar estructuralmente la presencia de lógica de bloqueo/rechazo explícita (e.g., comprobación de ramas protegidas `main|master|release` y sentencia de salida con error `exit 1`).
   - Para `.git/hooks/prepare-commit-msg`: DEBE contener el encabezado identificador `# AI-SDLC: Automated Commit Trailers Injection Hook` y la lógica de inyección de trailers (`Task-ID` / `Parent-Ref`).
5. **Copia de Seguridad Segura en Reparación Automática (`--fix`)**: Si se ejecuta con `--fix` y existe un hook previo no canónico o sin firma AI-SDLC, el sistema DEBE preservarlo creando un respaldo timestamped (`.bak.<timestamp>`) antes de sobreescribir o instalar los hooks canónicos.

Si algún hook está ausente, vacío, es un enlace simbólico no confiable, carece de permisos de ejecución o ha sido manipulado eliminando los marcadores canónicos o la lógica estructural de rechazo, el diagnóstico DEBE reportar fallo crítico `ERR_HOOKS_NOT_INSTALLED`, `ERR_HOOKS_SYMLINK_REJECTED` o `ERR_HOOKS_TAMPERED` y terminar con código de salida 2.

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-052-HOOK-SPOOFING-001` | Mitigates Abuse Case | Validated |
| **Use Case (Product)** | `UC-052-CLI-DOCTOR` | Governs Use Case | Validated |
| **Requisito Funcional** | `FR-052-CLI-DOCTOR-001` | Enforces Security | Validated |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
@SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001 @security @mitigation @doctor @git-hooks
Feature: Verificación Antimanipulación de Hooks Git en aisdlc doctor
  As a DevSecOps Engineer or automated auditor
  I want aisdlc doctor to strictly verify the integrity and structural enforcement logic of git hook contents
  So that empty, bypassed, or symlinked hooks cannot falsely report a healthy repository state

  Scenario: Detección de hook pre-commit vaciado o suplantado con bypass exit 0
    Given a git hook file ".git/hooks/pre-commit" that is empty or contains only a dummy "exit 0" without AI-SDLC markers
    When the diagnostic health check "aisdlc doctor" runs
    Then the hooks category must fail with error code "ERR_HOOKS_TAMPERED"
    And the process must terminate with exit code 2

  Scenario: Detección de hook pre-commit que contiene marcador pero omite lógica de rechazo
    Given a git hook file ".git/hooks/pre-commit" containing the header "# AI-SDLC: Universal Protected Branches Guard" but missing branch rejection logic
    When the diagnostic health check "aisdlc doctor" runs
    Then the hooks category must fail with error code "ERR_HOOKS_TAMPERED"
    And the process must terminate with exit code 2

  Scenario: Detección de enlaces simbólicos maliciosos en .git/hooks
    Given a git hook ".git/hooks/pre-commit" pointing as a symbolic link to an external target
    When the diagnostic health check "aisdlc doctor" runs
    Then the hooks category must fail with error code "ERR_HOOKS_SYMLINK_REJECTED"
    And the process must terminate with exit code 2

  Scenario: Aprobación de hooks canónicos con salvaguarda estructural y copia de seguridad en fix
    Given a git hook file ".git/hooks/pre-commit" containing canonical AI-SDLC protected branches enforcement logic and exit 1 guard
    And a git hook file ".git/hooks/prepare-commit-msg" containing canonical automated commit trailers injection hook
    And executable permissions are granted on both hook files without symlinks
    When the diagnostic health check "aisdlc doctor" runs
    Then the hooks category reports passing status with active tamper verification
    And the process continues diagnostic evaluation without hook-related failures

  Scenario: Reparación segura con respaldo timestamped en aisdlc doctor --fix
    Given an existing non-canonical hook ".git/hooks/pre-commit"
    When "aisdlc doctor --fix" is executed
    Then the original hook is backed up to ".git/hooks/pre-commit.bak.<timestamp>"
    And the canonical AI-SDLC hook is installed safely
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Especificación de control de integridad de hooks contra suplantación | CHG-052-CLI-DOCTOR |
