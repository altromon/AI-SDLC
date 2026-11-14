# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-060-DOCTOR-SECURITY-TOOLS-001.md
# ID Requerimiento: FR-060-DOCTOR-SECURITY-TOOLS-001
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-060-DOCTOR-SECURITY-TOOLS-001 @automated @doctor-security-tools @regression
Feature: doctor-security-tools-diagnostics
  As a DevSecOps engineer
  I want aisdlc doctor to report availability and canonical install hints for semgrep, trivy, and gitleaks under category security_tools
  So that optional security CLI readiness is visible without failing normal doctor runs or triggering unauthorized network installs

  @nominal
  Scenario: Doctor reports security_tools as pass when semgrep, trivy, and gitleaks are installed
    Given all base doctor checks pass
    And "semgrep", "trivy", and "gitleaks" are resolved on trusted PATH and exit 0 with version output
    When "DoctorService.diagnose" is executed
    Then the DoctorReport contains category "security_tools" with status "pass" and zero findings
    And overallStatus is "pass" with exitCode 0

  @boundary
  Scenario Outline: Missing optional security CLI produces warn status and canonical OS remediation
    Given all base doctor checks pass
    And "<tool>" is absent from PATH on "<platform>"
    When "DoctorService.diagnose" is executed
    Then category "security_tools" has status "warn"
    And finding "<finding_id>" has status "warn" and remediation "<remediation_hint>"
    And overallStatus is "warn" with exitCode 1

    Examples:
      | tool     | platform | finding_id                          | remediation_hint                                            |
      | semgrep  | win32    | WARN_SECURITY_TOOL_SEMGREP_MISSING  | pip install semgrep                                         |
      | semgrep  | darwin   | WARN_SECURITY_TOOL_SEMGREP_MISSING  | brew install semgrep                                        |
      | semgrep  | linux    | WARN_SECURITY_TOOL_SEMGREP_MISSING  | pip3 install --user semgrep                                 |
      | trivy    | win32    | WARN_SECURITY_TOOL_TRIVY_MISSING    | winget install AquaSecurity.Trivy                           |
      | trivy    | darwin   | WARN_SECURITY_TOOL_TRIVY_MISSING    | brew install trivy                                          |
      | trivy    | linux    | WARN_SECURITY_TOOL_TRIVY_MISSING    | apt-get install -y trivy                                    |
      | gitleaks | win32    | WARN_SECURITY_TOOL_GITLEAKS_MISSING | winget install Gitleaks.Gitleaks                            |
      | gitleaks | darwin   | WARN_SECURITY_TOOL_GITLEAKS_MISSING | brew install gitleaks                                       |
      | gitleaks | linux    | WARN_SECURITY_TOOL_GITLEAKS_MISSING | go install github.com/gitleaks/gitleaks/v8@latest           |

  @boundary
  Scenario: Version probe failure for installed optional CLI degrades to warn without failing doctor
    Given all base doctor checks pass
    And "trivy" exists on PATH but exits with non-zero code on "--version"
    When "DoctorService.diagnose" is executed
    Then category "security_tools" reports finding "WARN_SECURITY_TOOL_TRIVY_ISSUE" with status "warn"
    And overallStatus is "warn" with exitCode 1

  @invalid
  Scenario: Strict mode escalates security_tools warnings to exitCode 2 without auto-installing
    Given all base doctor checks pass
    And "gitleaks" is missing from PATH
    When "DoctorService.diagnose" is executed with "strict: true"
    Then category "security_tools" has status "warn"
    And no install command or network request is spawned
    And overallStatus is "warn" with exitCode 2
