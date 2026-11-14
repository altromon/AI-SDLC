# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001.md
# ID Requerimiento: FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
# Versión: 0.2.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
  Scenario: CLI fallback uses the hardened argv
    Given a go project without LICENSE in GOMODCACHE for module "github.com/a/b"
    And "go" is available in the system PATH
    When the SCA scan runs with network denied
    Then "go list -m -json all" is spawned with shell disabled, GOFLAGS "-mod=readonly" and GOPROXY "off"

  @invalid
  Scenario Outline: Unresolvable licenses are explicit
    Given a dependency whose resolution fails with "<cause>"
    When the SCA scan runs offline
    Then the license is "UNRESOLVED" with cause "<cause>"
    And Gate 6 treats it exactly as "UNKNOWN"
    And the scan completes without fatal error

    Examples:
      | cause                   |
      | cli_not_installed       |
      | cli_timeout             |
      | cache_missing           |
      | invalid_output          |
      | blocked_by_repo_config  |

  @invalid
  Scenario Outline: Repository config files block the CLI
    Given a repository containing "<blocker>"
    When the license resolver evaluates a dependency needing the CLI
    Then no CLI process is spawned
    And the license is "UNRESOLVED" with cause "blocked_by_repo_config"

    Examples:
      | blocker                  |
      | .mvn/extensions.xml      |
      | Directory.Build.props    |
      | .pnpmfile.cjs            |
      | .cargo/config.toml       |
