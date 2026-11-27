---
id: UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
type: use-case
title: Recursive Multi-Ecosystem SCA Scanning and Stack-Aware Doctor Toolchains
status: active
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-DEVELOPER
supporting-actors:
  - ACT-AI-AGENT
  - ACT-DEVOPS
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---



# UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS: Recursive Multi-Ecosystem SCA Scanning and Stack-Aware Doctor Toolchains

## 1. Intent and Outcome
As an ACT-DEVELOPER
I want `verify licenses` (`scanWithNativeFs` in `packages/core/src/verifiers/sca/scanner.ts`) to recursively discover multi-ecosystem manifests and lockfiles across monorepo/subproject directories and `aisdlc doctor` (`ToolchainHealthCheck` in `packages/core/src/doctor/toolchain-check.ts`) to check native binaries for the stacks detected in the repository
To ensure polyglot repositories (Node, .NET, Java/Gradle/Maven, Python, Go, Rust, C/C++) receive accurate SCA license verification and stack-relevant toolchain health diagnostics without false-positive `pnpm` errors or missed nested manifests.

### Increment (`chg-079-sca-recursive-doctor-toolchains`)
1. **Bounded Recursive Manifest & Lockfile Discovery in `scanWithNativeFs`**:
   - `scanWithNativeFs` (`packages/core/src/verifiers/sca/scanner.ts`) performs bounded recursive traversal (`maxDepth = 3`) from `rootDir`, consistent with `detectProjectStacks`.
   - Artifact and build directories (`node_modules`, `.git`, `dist`, `target`, `bin`, `obj`, `.venv`, `venv`) and symlinks are skipped during traversal.
   - Discovered manifests and lockfiles in nested subprojects (up to `maxDepth = 3`) are scanned by `scanWithNativeFs` to extract raw `ScannedDependency` entries (with `purl` and `path` pointing to the discovered manifest/lockfile), deduplicated into `ScannedDependency[]`; `scanDependencies` (`verify licenses`) then invokes `resolveLicense(dep, rootDir)`.
2. **Native Multi-Ecosystem Dependency Extraction in `scanWithNativeFs`**:
   - **.NET**: Extracts `<PackageReference>` entries from `*.csproj` and `Directory.Packages.props` as well as resolved packages from `packages.lock.json`, emitting `pkg:nuget/...` PURLs resolved via `license-dotnet.ts`.
   - **Gradle**: Extracts dependencies from `build.gradle`, `build.gradle.kts`, and `gradle.lockfile`, emitting `pkg:maven/...` PURLs resolved via `license-java.ts`.
   - **Python**: Extracts dependencies from `requirements.txt` (in addition to `pyproject.toml`/`Pipfile.lock`/`poetry.lock`), emitting `pkg:pypi/...` PURLs; `resolvePythonLicenseDetailed` (`license-python.ts`) checks `path.dirname(dep.path)` (if inside `rootDir`) in addition to `rootDir` for `.venv`/`venv` `site-packages` so nested Python projects resolve local metadata offline.
3. **Stack-Aware `ToolchainHealthCheck` in `aisdlc doctor`**:
   - `ToolchainHealthCheck` (`packages/core/src/doctor/toolchain-check.ts`) consults `detectProjectStacks(rootDir)` to determine which native stack binaries to probe (e.g., `dotnet` for `.NET`, `python`/`python3` for Python, `go` for Go, `cargo` for Rust, `java`/`mvn`/`gradle` for Java/Kotlin, `cmake`/`clang-tidy` for C/C++).
   - `pnpm` is treated as required only when `pnpm-lock.yaml` is present in `rootDir` (avoiding false failures in non-pnpm repositories).

## 2. Preconditions
- `detectProjectStacks(targetDir, maxDepth = 3)` is available in `packages/core/src/init/coding-rules-templates.ts`.
- Ecosystem license resolvers (`license-dotnet.ts`, `license-java.ts`, `license-python.ts`) are available in `packages/core/src/verifiers/sca/`.
- The `minor` profile applies (`1 UC-* = 1 CHG-*`), with no mandatory schema changes in `schemas/`.

## 3. Main Flow (Nominal)
1. A developer or AI agent runs `aisdlc verify licenses` (or MCP `verify_licenses`), which invokes `scanDependencies` -> `scanWithNativeFs(rootDir, options)`.
2. `scanWithNativeFs` traverses `rootDir` up to `maxDepth = 3`, skipping artifact directories (`node_modules`, `.git`, `dist`, `target`, `bin`, `obj`, `.venv`, `venv`) and symlinks, and extracts raw `ScannedDependency` entries (with `purl` and `path` pointing to the discovered manifest/lockfile) from root and nested manifests/lockfiles including `.NET` (`*.csproj`, `Directory.Packages.props`, `packages.lock.json` -> `pkg:nuget/...`), `Gradle` (`build.gradle`, `build.gradle.kts`, `gradle.lockfile` -> `pkg:maven/...`), and `Python` (`requirements.txt` -> `pkg:pypi/...`); `scanDependencies` then calls `resolveLicense(dep, rootDir)` (with `resolvePythonLicenseDetailed` in `license-python.ts` checking `path.dirname(dep.path)` inside `rootDir` as well as `rootDir` for `.venv`/`venv` `site-packages`).
3. A developer or AI agent runs `aisdlc doctor`, which invokes `ToolchainHealthCheck.inspect(options)`.
4. `ToolchainHealthCheck` calls `detectProjectStacks(rootDir)` and probes `node`, `git`, `pnpm` (when `pnpm-lock.yaml` exists in `rootDir`), and the native binaries corresponding to each detected stack, reporting `pass`, `warn`, or `fail` findings.

## 4. Alternative and Exception Flows
- **Alternative Flow A (Non-pnpm Polyglot Repository)**:
  - When `rootDir` has no `pnpm-lock.yaml`, `ToolchainHealthCheck` does not fail on a missing `pnpm` binary and instead checks `node`, `git`, and the detected stack binaries.
- **Exception Flow B (Deep Nesting Beyond `maxDepth = 3`, Artifact Directories, or Symlinks)**:
  - Manifests located deeper than `maxDepth = 3`, inside skipped artifact directories (`node_modules`, `.git`, `dist`, `target`, `bin`, `obj`, `.venv`, `venv`), or behind symlinks are ignored without error or infinite recursion.
- **Exception Flow C (Malformed or Unreadable Manifest / Missing Native Binary)**:
  - Malformed or empty manifests/lockfiles do not crash `scanWithNativeFs`; missing required native binaries in `ToolchainHealthCheck` produce structured `ERR_TOOLCHAIN_<TOOL>_MISSING` findings with remediation guidance.

## 5. Non-Functional Constraints
- **Bounded Traversal & Symlink Safety**: Recursive directory traversal MUST enforce `maxDepth = 3` and skip symlinks and build/cache artifact directories to prevent symlink loops and unbounded I/O.
- **Zero-Network / Offline Resilience**: Native manifest/lockfile parsing in `scanWithNativeFs` MUST work without requiring external network calls or external CLI tools (`trivy`/`syft`).
- **No Mandatory Schema Changes**: Operates under `minor` profile without adding required fields to `schemas/`.

## 6. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS @functional @automated
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
```

## Revision History

| Version | Date | Author / Agent | Change Description | Change / PR Ref |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-27 | agent-product-analyst | Initial use case definition for CHG-079: recursive multi-ecosystem SCA scanning and stack-aware doctor toolchains (Issue #234) | CHG-079 |
