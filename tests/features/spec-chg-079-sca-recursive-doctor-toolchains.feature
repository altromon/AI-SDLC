# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/changes/completed/chg-079-sca-recursive-doctor-toolchains/spec.md
# ID Requerimiento: SPEC-CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS @functional @automated
Feature: Recursive Multi-Ecosystem SCA Scanning and Stack-Aware Doctor Toolchains
  As a developer or AI agent using AI-SDLC
  I want verify licenses to recursively scan nested multi-ecosystem manifests and aisdlc doctor to probe detected stack toolchains
  So that polyglot repositories get accurate SCA license checks and relevant toolchain diagnostics

  @nominal
  Scenario: Recursive native SCA scan extracts .NET, Gradle, and Python dependencies and doctor checks detected stack toolchains
    Given a polyglot repository containing nested ".NET" ("*.csproj", "Directory.Packages.props", "packages.lock.json"), "Gradle" ("build.gradle.kts", "gradle.lockfile"), and "Python" ("requirements.txt") manifests within depth 3
    When "scanWithNativeFs" and "scanDependencies" run on the repository root and "ToolchainHealthCheck.inspect" runs on the repository
    Then "scanWithNativeFs" emits raw "pkg:nuget/", "pkg:maven/", and "pkg:pypi/" dependencies with "path" pointing to the discovered manifest/lockfile and "scanDependencies" resolves their licenses via "resolveLicense" (including nested ".venv"/"venv" "site-packages")
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

@CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS @security @mitigation
Feature: Security Mitigation for CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
  Scenario: Symlink traversal and unauthorized binary execution are blocked during SCA scan and Doctor probes
    Given a repository containing a symlinked directory pointing outside rootDir and detected native stacks
    When "scanWithNativeFs" traverses the directory tree and "ToolchainHealthCheck.inspect" probes stack binaries via "SafeProcessRunnerAdapter"
    Then symlinks are skipped without escaping rootDir or entering infinite loops
    And only allowlisted stack executables are invoked with "shell: false" and sanitized environment
