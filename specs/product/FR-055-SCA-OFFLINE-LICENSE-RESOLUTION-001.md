---
id: FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
type: requirement
title: sca-offline-license-resolution
status: draft
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-055-SCA-OFFLINE-LICENSE-RESOLUTION
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---

# FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001: sca-offline-license-resolution

## 1. Enunciado Normativo
1. El escáner SCA DEBE resolver licencias SPDX de dependencias Python, Rust, Go, Java, .NET y Node de forma 100% offline, en este orden: metadatos locales, CLI local, `UNRESOLVED` explícito (con motivo).
2. Los CLIs externos DEBEN ejecutarse conforme a BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION: sin shell, `cwd` acotado, timeout y límite de salida, solo lectura, sin red.
3. Ausencia o fallo de un CLI NO DEBE abortar el escaneo ni producir licencias inventadas.
4. Para proyectos con dependencias instaladas/cacheadas, ninguna dependencia resoluble DEBE quedar como `UNKNOWN`.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001 @automated @regression
Feature: sca-offline-license-resolution
  As a DevSecOps engineer
  I want ordered offline license resolution
  So that Gate 6 audits non-Node projects accurately

  @nominal
  Scenario: Local metadata takes precedence over CLI
    Given a python project with .venv METADATA declaring "MIT" for "requests"
    When the SCA scan runs offline
    Then "requests" has license "MIT"
    And no external CLI is spawned

  @boundary
  Scenario: CLI fallback is spawned safely
    Given a go project without LICENSE in GOMODCACHE for module "github.com/a/b"
    And "go" is available in PATH
    When the SCA scan runs offline
    Then "go list -m -json all" is spawned with shell disabled, bounded cwd and timeout

  @invalid
  Scenario Outline: Unresolvable licenses are explicit
    Given a dependency whose resolution fails with "<cause>"
    When the SCA scan runs offline
    Then the license is "UNRESOLVED" with cause "<cause>"
    And the scan completes without fatal error

    Examples:
      | cause             |
      | cli_not_installed |
      | cli_timeout       |
      | cache_missing     |
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-12 | agent-product-analyst | Definición inicial (issue #161, cambio B) | CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION |
