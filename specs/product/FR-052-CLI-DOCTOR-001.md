---
id: FR-052-CLI-DOCTOR-001
type: requirement
title: cli-doctor-health-check
status: active
version: 1.0.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-052-CLI-DOCTOR
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-052-CLI-DOCTOR-001'
  - '@automated'
  - '@doctor'
supersedes: null
superseded-by: null
---

# FR-052-CLI-DOCTOR-001: cli-doctor-health-check

## 1. Enunciado Normativo
El sistema DEBE proveer el comando CLI `aisdlc doctor` y la herramienta MCP `doctor` para ejecutar un diagnóstico determinista de salud del entorno de desarrollo y del repositorio. El diagnóstico DEBE comprobar cinco categorías críticas: (1) instalación e integridad de hooks Git (`.git/hooks/pre-commit` y `prepare-commit-msg`), (2) salvaguarda de rama protegida prohibiendo operar directamente sobre `main`, `master` o `release/*`, (3) sincronización e integridad de esquemas JSON y PDaC, (4) presencia de runtime y toolchain (Node.js LTS, pnpm, Git CLI), y (5) preparación para firma criptográfica y atestaciones (claves Ed25519/GPG o OIDC keyless). El comando DEBE retornar código de salida `0` cuando todas las comprobaciones sean saludables, `1` ante advertencias no bloqueantes, y `2` ante defectos críticos bloqueantes.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-052-CLI-DOCTOR-001 @automated @doctor
Feature: cli-doctor-health-check
  As a developer, DevSecOps engineer, or AI autonomous agent
  I want to invoke the aisdlc doctor health check
  So that repository safety, toolchains, hooks, schemas, and signing readiness are verified before starting work

  @nominal
  Scenario: All diagnostic checks pass with healthy status
    Given the repository has valid Git hooks installed in .git/hooks/
    And the active Git branch is a dedicated non-protected branch
    And JSON schemas and PDaC are synchronized without errors
    And required runtimes Node.js LTS, pnpm, and Git CLI are available in PATH
    And signing keys or keyless OIDC configuration are ready
    When the command "aisdlc doctor" is executed
    Then all diagnostic checks report passing status
    And the command exits with exit code 0

  @boundary
  Scenario: Non-blocking warnings detected during diagnosis
    Given the repository has Git hooks installed and valid branch safety
    And JSON schemas and toolchain runtimes are valid
    But optional local signing keys are missing with fallback available
    When the command "aisdlc doctor" is executed
    Then the diagnostic report highlights non-blocking warnings
    And the command exits with exit code 1

  @invalid
  Scenario Outline: Critical defects block execution with exit code 2
    Given the repository environment has a critical defect "<defect_type>"
    When the command "aisdlc doctor" is executed
    Then the diagnostic report flags a critical failure with error "<error_message>"
    And the command exits with exit code 2

    Examples:
      | defect_type                 | error_message               |
      | missing_git_hooks           | ERR_HOOKS_NOT_INSTALLED     |
      | on_protected_branch_main    | ERR_PROTECTED_BRANCH_ACTIVE |
      | desynchronized_json_schemas | ERR_SCHEMAS_DESYNCHRONIZED  |
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-product-analyst | Definición de requerimiento funcional para diagnóstico determinista aisdlc doctor (#168 part 2) | CHG-052-CLI-DOCTOR |
