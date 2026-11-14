# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/changes/active/chg-055-sca-offline-license-resolution/spec.md
# ID Requerimiento: SPEC-CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION @functional @automated
Feature: SCA offline license resolution

  @nominal
  Scenario: Los metadatos locales prevalecen sobre el CLI
    Given a python project with .venv METADATA declaring "MIT" for "requests"
    When the SCA scan runs with network denied
    Then "requests" has license "MIT" with provenance "local-metadata"
    And no external CLI is spawned

  @nominal
  Scenario Outline: El CLI se invoca con el argv y entorno endurecidos
    Given a "<ecosystem>" project without local license metadata
    And "<cli>" is available in an absolute system PATH entry outside the project
    When the SCA scan runs with network denied
    Then "<cli>" is spawned with shell disabled and argv "<argv>"
    And the child environment contains "<env>"

    Examples:
      | ecosystem | cli          | argv                                              | env                                                  |
      | rust      | cargo        | metadata --offline --locked --frozen --format-version 1 | CARGO_NET_OFFLINE=true                         |
      | go        | go           | list -m -json all                                 | GOFLAGS=-mod=readonly GOPROXY=off GOTOOLCHAIN=local GOWORK=off |
      | java      | mvn          | -o -B -ntp -q dependency:list                     | MAVEN_OPTS purged                                    |
      | python    | pip-licenses | --format=json                                     | PYTHONNOUSERSITE=1                                   |
      | node      | npm          | ls --json --long --ignore-scripts --offline       | NODE_OPTIONS purged                                  |

  @boundary
  Scenario Outline: UNRESOLVED es equivalente a UNKNOWN
    Given a dependency whose resolution fails with "<cause>"
    When the SCA scan runs and Gate 6 evaluates the result
    Then the license is "UNRESOLVED" with reason "<cause>"
    And the gate verdict, exit code and report are identical to those of "UNKNOWN"
    And the scan completes without fatal error

    Examples:
      | cause                  |
      | cli_not_installed      |
      | cli_timeout            |
      | cache_missing          |
      | invalid_output         |
      | output_too_large       |
      | cli_failed             |
      | blocked_by_repo_config |
      | path_rejected          |
      | budget_exceeded        |

  @boundary
  Scenario: Salida vacía o corrupta del CLI
    Given a CLI that prints nothing or garbled output
    When its stdout is parsed
    Then the dependency is "UNRESOLVED" with reason "invalid_output"

  @invalid
  Scenario Outline: Archivos del repositorio bloquean el CLI
    Given a repository containing "<blocker>"
    When the resolver evaluates a dependency that needs "<cli>"
    Then no process is spawned
    And the license is "UNRESOLVED" with reason "blocked_by_repo_config"

    Examples:
      | blocker                         | cli    |
      | .mvn/extensions.xml             | mvn    |
      | .mvn/maven.config               | mvn    |
      | Directory.Build.props           | dotnet |
      | Directory.Build.targets         | dotnet |
      | Directory.Packages.props        | dotnet |
      | global.json with msbuild-sdks   | dotnet |
      | nuget.config                    | dotnet |
      | .pnpmfile.cjs                   | pnpm   |
      | .npmrc                          | npm    |
      | .cargo/config.toml o .cargo/config | cargo |
      | rust-toolchain.toml             | cargo  |

  @invalid
  Scenario: Presupuesto global de tiempo
    Given 50 manifests whose CLI each hangs
    When the scan runs
    Then each invocation is killed after at most 10 seconds
    And once the global budget is exhausted the remaining dependencies are "UNRESOLVED" with reason "budget_exceeded"

@CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION @security @mitigation
Feature: Security Mitigation for CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION

  Scenario: Binario plantado en el repositorio no se ejecuta
    Given executables named "cargo" in the repo root and in "node_modules/.bin"
    When the binary is resolved
    Then only absolute system PATH entries outside the root are used
    And the planted executable is never spawned

  Scenario: Windows no resuelve desde cwd ni shims cmd
    Given go.exe and go.cmd in the project root on Windows
    When the binary is resolved
    Then the cwd is not searched and no .cmd shim runs through a shell

  Scenario: Variables de entorno peligrosas se purgan
    Given RUSTC_WRAPPER, PYTHONPATH, NODE_OPTIONS, MAVEN_OPTS, JAVA_TOOL_OPTIONS, DOTNET_ROOT and HTTP_PROXY are set
    When any allowed CLI is launched
    Then none of them reaches the child environment

  Scenario: Salida del CLI no filtra rutas ni stderr
    Given a CLI failing with an absolute path and a secret in stderr
    When the report is generated
    Then only the unresolvedReason enum value is reported

  Scenario: Path traversal en coordenadas de dependencia
    Given a Maven dependency with groupId "../../etc"
    When the pom path under "~/.m2" is built
    Then the realpath must stay inside "~/.m2"
    And the dependency is "UNRESOLVED" with reason "path_rejected"
