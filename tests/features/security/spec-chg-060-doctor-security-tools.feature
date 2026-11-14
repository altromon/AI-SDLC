# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/changes/active/chg-060-doctor-security-tools/spec.md
# ID Requerimiento: SPEC-CHG-060-DOCTOR-SECURITY-TOOLS
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@CHG-060-DOCTOR-SECURITY-TOOLS @functional @automated @doctor-security-tools
Feature: Doctor diagnostics for optional security CLIs (semgrep, trivy, gitleaks)
  As a DevSecOps engineer
  I want aisdlc doctor to report availability and canonical install hints for semgrep, trivy, and gitleaks under category security_tools
  So that optional security CLI readiness is visible without failing normal local workflows

  @nominal
  Scenario: All optional security CLIs are installed and respond to version probes
    Given all base doctor categories pass
    And "semgrep", "trivy", and "gitleaks" are resolved on trusted PATH and exit 0 with version output
    When "DoctorService.diagnose" is executed
    Then the DoctorReport includes category "security_tools" with status "pass" and zero findings
    And overallStatus is "pass" with exitCode 0

  @boundary
  Scenario Outline: Missing optional security CLI produces warn status and canonical OS remediation
    Given all base doctor categories pass
    And "<tool>" is missing from PATH on platform "<platform>"
    When "DoctorService.diagnose" is executed
    Then category "security_tools" has status "warn"
    And finding "<finding_id>" has status "warn" and remediation "<remediation_hint>"
    And overallStatus is "warn" with exitCode 1

    Examples:
      | tool     | platform | finding_id                          | remediation_hint                                  |
      | semgrep  | win32    | WARN_SECURITY_TOOL_SEMGREP_MISSING  | pip install semgrep                               |
      | semgrep  | darwin   | WARN_SECURITY_TOOL_SEMGREP_MISSING  | brew install semgrep                              |
      | semgrep  | linux    | WARN_SECURITY_TOOL_SEMGREP_MISSING  | pip3 install --user semgrep                       |
      | trivy    | win32    | WARN_SECURITY_TOOL_TRIVY_MISSING    | winget install AquaSecurity.Trivy                 |
      | trivy    | darwin   | WARN_SECURITY_TOOL_TRIVY_MISSING    | brew install trivy                                |
      | trivy    | linux    | WARN_SECURITY_TOOL_TRIVY_MISSING    | apt-get install -y trivy                          |
      | gitleaks | win32    | WARN_SECURITY_TOOL_GITLEAKS_MISSING | winget install Gitleaks.Gitleaks                  |
      | gitleaks | darwin   | WARN_SECURITY_TOOL_GITLEAKS_MISSING | brew install gitleaks                             |
      | gitleaks | linux    | WARN_SECURITY_TOOL_GITLEAKS_MISSING | go install github.com/gitleaks/gitleaks/v8@latest |

  @invalid
  Scenario: Strict mode escalates security_tools warnings to exitCode 2 without auto-installing
    Given all base doctor categories pass
    And "trivy" is missing from PATH
    When "DoctorService.diagnose" is executed with "strict: true"
    Then category "security_tools" has status "warn"
    And no install command or network request is executed
    And overallStatus is "warn" with exitCode 2

@CHG-060-DOCTOR-SECURITY-TOOLS @security @mitigation
Feature: Security Mitigation for CHG-060-DOCTOR-SECURITY-TOOLS
  Scenario: Untrusted PATH entry in workspace root is ignored (CWE-426) and shell is disabled
    Given a malicious "semgrep" binary placed inside the workspace rootDir or relative "." PATH entry
    When "SecurityToolsHealthCheck.inspect" runs
    Then the untrusted binary is never executed
    And "semgrep" is reported as "WARN_SECURITY_TOOL_SEMGREP_MISSING" with status "warn"
