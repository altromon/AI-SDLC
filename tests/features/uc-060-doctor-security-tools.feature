# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-060-DOCTOR-SECURITY-TOOLS.md
# ID Requerimiento: UC-060-DOCTOR-SECURITY-TOOLS
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-060-DOCTOR-SECURITY-TOOLS @automated @doctor-security-tools
Feature: Diagnóstico de herramientas opcionales de seguridad en aisdlc doctor
  As a DevSecOps engineer
  I want aisdlc doctor to inspect optional security CLIs (semgrep, trivy, gitleaks) under category security_tools
  So that I know which scanners are ready and how to install missing ones without blocking local workflows

  @nominal
  Scenario: Todas las herramientas opcionales de seguridad están disponibles en PATH
    Given a repository with healthy base doctor categories
    And "semgrep", "trivy", and "gitleaks" are available on trusted PATH and return valid versions
    When the user runs "aisdlc doctor"
    Then the DoctorReport includes category "security_tools" with status "pass"
    And the command exits with exitCode 0

  @boundary
  Scenario Outline: Herramienta opcional de seguridad ausente se reporta como warn con remediación canónica
    Given a repository with healthy base doctor categories
    And "<tool>" is missing from PATH on platform "<platform>"
    When the user runs "aisdlc doctor"
    Then the DoctorReport includes category "security_tools" with status "warn"
    And the finding "<finding_id>" has status "warn" and a canonical non-sudo install remediation
    And the command exits with exitCode 1

    Examples:
      | tool     | platform | finding_id                         |
      | semgrep  | linux    | WARN_SECURITY_TOOL_SEMGREP_MISSING |
      | trivy    | win32    | WARN_SECURITY_TOOL_TRIVY_MISSING   |
      | gitleaks | darwin   | WARN_SECURITY_TOOL_GITLEAKS_MISSING|

  @invalid
  Scenario: Modo --strict escala advertencias de security_tools a exitCode 2 sin realizar instalaciones
    Given a repository with healthy base doctor categories
    And "semgrep" is missing from PATH
    When the user runs "aisdlc doctor --strict"
    Then the DoctorReport reports category "security_tools" with status "warn"
    And no automatic installation or network request is executed
    And the command exits with exitCode 2
