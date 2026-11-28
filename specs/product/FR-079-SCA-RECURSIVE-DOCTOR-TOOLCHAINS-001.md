---
id: FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001
type: requirement
title: sca-recursive-doctor-toolchains
status: active
version: 0.1.0
schema-version: '1.0'
category: functional
derives-from:
  - UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
verifiable-by: cucumber-bdd
acceptance-format: gherkin
enforce-bdd-variants: true
cucumber-tags:
  - '@FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001'
  - '@automated'
  - '@regression'
supersedes: null
superseded-by: null
---



# FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001: sca-recursive-doctor-toolchains

> **Upstream Citation**: `UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS` (`specs/product/UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS.md`, Unix LF SHA-256: `649c1a9846278be031474280ca4ad664c0eb799ad548e453ba372ce0fbea485c`)

## 1. Normative Specification
1. **Bounded Recursive Manifest & Lockfile Discovery (`packages/core/src/verifiers/sca/scanner.ts`)**:
   - `scanWithNativeFs(rootDir, options)` MUST traverse subdirectories up to `maxDepth = 3` (consistent with `detectProjectStacks` in `packages/core/src/init/coding-rules-templates.ts`).
   - Traversal MUST skip symlinks and artifact/build directories (`node_modules`, `.git`, `dist`, `target`, `bin`, `obj`, `.venv`, `venv`).
   - Discovered ecosystem manifests and lockfiles across `rootDir` and nested subdirectories within `maxDepth = 3` MUST be scanned and merged into the deduplicated dependency list.
2. **Native Multi-Ecosystem Dependency Extraction (`packages/core/src/verifiers/sca/scanner.ts`)**:
   - `scanWithNativeFs` MUST extract raw `ScannedDependency` entries (with `purl` and `path` pointing to the discovered manifest/lockfile), and `scanDependencies` (`verify licenses`) MUST invoke `resolveLicense(dep, rootDir)` for license resolution.
   - **.NET**: MUST extract `<PackageReference>` dependencies from `*.csproj` and `Directory.Packages.props` as well as resolved packages from `packages.lock.json`, constructing `pkg:nuget/...` PURLs resolved via `license-dotnet.ts`.
   - **Gradle**: MUST extract dependencies from `build.gradle`, `build.gradle.kts`, and `gradle.lockfile`, constructing `pkg:maven/...` PURLs resolved via `license-java.ts`.
   - **Python**: MUST extract dependencies from `requirements.txt`, constructing `pkg:pypi/...` PURLs; `resolvePythonLicenseDetailed` (`license-python.ts`) MUST check `path.dirname(dep.path)` (if inside `rootDir`) in addition to `rootDir` for `.venv`/`venv` `site-packages` so nested Python projects resolve local metadata offline.
3. **Stack-Aware `ToolchainHealthCheck` (`packages/core/src/doctor/toolchain-check.ts`)**:
   - `ToolchainHealthCheck.inspect(options)` MUST consult `detectProjectStacks(rootDir)` to identify the project's active technology stacks and probe the presence and version of corresponding native binaries (including `dotnet`, `python`/`python3`, `go`, `cargo`, `java`/`mvn`/`gradle`, `cmake`/`clang-tidy`).
   - `ToolchainHealthCheck` MUST treat `pnpm` as required only when `pnpm-lock.yaml` is present in `rootDir`.

### Increment (`chg-079-sca-recursive-doctor-toolchains`)
Add bounded recursive (`maxDepth = 3`, skipping artifact dirs and symlinks) manifest/lockfile discovery and native `.NET`, `Gradle`, and `Python` (`requirements.txt`) dependency extraction to `scanWithNativeFs`, and update `ToolchainHealthCheck` to probe native binaries for stacks detected by `detectProjectStacks(rootDir)` while requiring `pnpm` only when `pnpm-lock.yaml` exists in `rootDir`.

---

## 2. Acceptance Criteria in Gherkin Format (Cucumber)

```gherkin
@FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001 @functional @automated
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

---

## 3. Revision History

| Version | Date | Author / Agent | Change Description | Change / PR Ref |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-27 | agent-product-analyst | Initial functional requirement for CHG-079: recursive multi-ecosystem SCA scanning and stack-aware doctor toolchains (Issue #234) | CHG-079 |
