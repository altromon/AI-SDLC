# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS.md
# ID Requerimiento: UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
# Versión: 0.1.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS @functional @automated
Feature: Recursive Multi-Ecosystem SCA Scanning and Stack-Aware Doctor Toolchains
  As a developer or AI agent using AI-SDLC
  I want verify licenses to recursively scan nested multi-ecosystem manifests and aisdlc doctor to probe detected stack toolchains
  So that polyglot repositories get accurate SCA license checks and relevant toolchain diagnostics

  @nominal
  Scenario: Recursive native SCA scan extracts .NET, Gradle, and Python dependencies and doctor checks detected stack toolchains
    Given a polyglot repository containing nested ".NET" ("*.csproj", "Directory.Packages.props", "packages.lock.json"), "Gradle" ("build.gradle.kts", "gradle.lockfile"), and "Python" ("requirements.txt") manifests within depth 3
    When "scanWithNativeFs" runs on the repository root and "ToolchainHealthCheck.inspect" runs on the repository
    Then "scanWithNativeFs" emits "pkg:nuget/", "pkg:maven/", and "pkg:pypi/" dependencies resolved via their ecosystem license resolvers
    And "ToolchainHealthCheck.inspect" probes the native binaries for the stacks returned by "detectProjectStacks"

  @boundary
  Scenario Outline: Traversal depth bounds, artifact exclusions, symlinks, and conditional pnpm checks are enforced
    Given a repository state with "<condition>"
    When "<operation>" executes on the repository
    Then the outcome satisfies "<expected_behavior>"

    Examples:
      | condition                                                    | operation                    | expected_behavior                                                      |
      | manifests placed at depth 3 and depth 4                      | scanWithNativeFs             | depth 3 manifests are scanned and depth 4 manifests are skipped        |
      | manifests inside node_modules, .git, target, bin, obj, .venv | scanWithNativeFs             | artifact directory manifests and symlinks are skipped                  |
      | repository without pnpm-lock.yaml and without pnpm in PATH   | ToolchainHealthCheck.inspect | pnpm is not flagged as ERR_TOOLCHAIN_PNPM_MISSING                      |

  @invalid
  Scenario: Malformed manifests or missing detected stack binaries degrade gracefully with structured diagnostics
    Given a repository with a malformed manifest or a detected stack whose native binary is missing from PATH
    When "scanWithNativeFs" and "ToolchainHealthCheck.inspect" run
    Then "scanWithNativeFs" completes without throwing on malformed manifests
    And "ToolchainHealthCheck.inspect" reports a structured "fail" finding with remediation for the missing binary
