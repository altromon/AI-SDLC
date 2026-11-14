# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-057-SARIF-SAST-INGESTION-001.md
# ID Requerimiento: FR-057-SARIF-SAST-INGESTION-001
# Versión: 0.2.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-057-SARIF-SAST-INGESTION-001 @automated @regression
Feature: sarif-sast-ingestion
  As a DevSecOps engineer
  I want Gate SAST to ingest external OASIS SARIF v2.1.0 reports deterministically
  So that polyglot security findings are evaluated against quality-policy.yaml

  @nominal
  Scenario: Valid SARIF 2.1.0 findings are normalized, sorted canonically, and evaluated against policy
    Given a valid SARIF 2.1.0 report from "semgrep" with findings in "src/b.ts:20" and "src/a.ts:10"
    And quality-policy.yaml sets sast_analysis.max_vulnerabilities to 0
    When the verifier runs with "--sarif semgrep.sarif"
    Then violations are sorted canonically with "src/a.ts:10" before "src/b.ts:20"
    And the SAST gate fails because violations exceed max_vulnerabilities

  @nominal
  Scenario: Valid ai-sdlc:allow-sast suppression exempts matching SARIF finding
    Given a valid SARIF 2.1.0 report with a finding for rule "B101" at "src/app.py:12"
    And "src/app.py:12" has an active "ai-sdlc:allow-sast" suppression for rule "B101"
    When the verifier runs with "--sarif bandit.sarif"
    Then the finding for "B101" at "src/app.py:12" is suppressed
    And the SAST gate passes when no unsuppressed violations remain

  @boundary
  Scenario Outline: SARIF level and security-severity map deterministically to SastSeverity
    Given a valid SARIF 2.1.0 result with level "<level>" and security-severity "<sec_sev>"
    When the verifier runs with "--sarif report.sarif"
    Then the normalized SastViolation has severity "<severity>"

    Examples:
      | level   | sec_sev | severity |
      | error   | 9.5     | CRITICAL |
      | error   |         | HIGH     |
      | warning | 7.5     | HIGH     |
      | warning |         | MEDIUM   |
      | note    |         | LOW      |

  @boundary
  Scenario: Multiple --sarif files are aggregated and sorted deterministically
    Given two valid SARIF 2.1.0 reports "bandit.sarif" and "gosec.sarif"
    When the verifier runs with "--sarif bandit.sarif --sarif gosec.sarif"
    Then findings from both tools are combined and sorted by relPath, lineNumber, and ruleId

  @invalid
  Scenario Outline: Invalid SARIF input fails closed with explicit error code
    Given a SARIF input with defect "<defect>"
    When the verifier runs with "--sarif input.sarif"
    Then the verification fails with error "<error>"
    And no partial violations are reported

    Examples:
      | defect               | error                         |
      | missing_file         | ERR_SARIF_NOT_FOUND           |
      | not_regular_file     | ERR_SARIF_NOT_REGULAR_FILE    |
      | path_outside_root    | ERR_SARIF_PATH_OUTSIDE_ROOT   |
      | file_too_large       | ERR_SARIF_TOO_LARGE           |
      | malformed_json       | ERR_SARIF_MALFORMED           |
      | unsupported_version  | ERR_SARIF_UNSUPPORTED_VERSION |
      | limit_exceeded       | ERR_SARIF_LIMIT_EXCEEDED      |
      | unsafe_proto_key     | ERR_SARIF_UNSAFE_KEY          |
