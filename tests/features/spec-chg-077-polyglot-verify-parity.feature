# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/changes/active/chg-077-polyglot-verify-parity/spec.md
# ID Requerimiento: SPEC-CHG-077-POLYGLOT-VERIFY-PARITY
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@CHG-077-POLYGLOT-VERIFY-PARITY @functional @automated
Feature: Polyglot parity in verify traceability, verify quality, and test-discovery
  As an AI agent verifying polyglot repositories with AI-SDLC
  I want verify traceability, verify quality, and test-discovery.ts to support all polyglot test patterns, extensions, idiomatic layouts, driver signatures, and string-safe comment stripping
  So that polyglot codebases are accurately indexed, scanned, and verified without misclassification or truncated selectors

  @nominal
  Scenario: Traceability, quality gate, and test discovery classify and scan polyglot projects accurately
    Given a polyglot repository with tests like "test_auth.py", "AuthTests.cs", "AuthTest.kt", and "tests/auth_test.rs"
    When "verify traceability", "verify quality", and "test-discovery" execute
    Then polyglot unit and UI tests are indexed in "codeTestMap" and "testCorpus" rather than "prodCorpus"
    And "DEFAULT_EXTENSIONS" and "STARTER_QUALITY_POLICY" include ".kt", ".mjs", ".cjs", ".cc", ".cxx", and ".hpp"

  @boundary
  Scenario Outline: Idiomatic language layouts, UI test patterns, and driver signatures are discovered
    Given a repository artifact matching "<artifact_case>"
    When "collectFilesToScan", "isUiTestFile", or "hasModalityDriverSignature" evaluates it
    Then the verifier produces "<expected_outcome>"

    Examples:
      | artifact_case                                              | expected_outcome                                         |
      | Go cmd/internal/pkg, Rust crates, Python app, or .csproj   | collectFilesToScan discovers production source files     |
      | app_e2e_test.go or app_ui_test.rs                          | isUiTestFile classifies the file as a UI test            |
      | C# Expect(page) or Java/Kotlin com.microsoft.playwright    | hasModalityDriverSignature matches web modality          |
      | Go exec.Command/cobra or Rust assert_cmd/Command::cargo_bin | hasModalityDriverSignature matches console modality      |

  @invalid
  Scenario: stripTestComments does not truncate XPath selectors containing double slashes inside string literals
    Given a UI test containing 'page.locator("//button[@type=\'submit\']") // click submit'
    When "stripTestComments" processes the content
    Then the string literal '"//button[@type=\'submit\']"' is preserved intact
    And the trailing line comment '// click submit' is stripped

@CHG-077-POLYGLOT-VERIFY-PARITY @security @mitigation
Feature: Security Mitigation for CHG-077-POLYGLOT-VERIFY-PARITY
  Scenario: Excluded directories and symlink boundaries are respected during polyglot layout scanning
    Given a polyglot repository containing excluded directories such as "node_modules", "target", "bin", or "obj" alongside idiomatic source folders
    When "collectFilesToScan" and "collectCodeAndTestCorpora" traverse the repository
    Then excluded directories and test files are never promoted into production source scanning
