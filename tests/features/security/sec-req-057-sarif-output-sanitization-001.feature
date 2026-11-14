# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-057-SARIF-OUTPUT-SANITIZATION-001.md
# ID Requerimiento: SEC-REQ-057-SARIF-OUTPUT-SANITIZATION-001
# Versión: 0.2.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-057-SARIF-OUTPUT-SANITIZATION-001 @security @mitigation @sarif-sanitization
Feature: Saneamiento de salida y normalización de URIs en reportes SARIF v2.1.0
  As a Security Officer
  I want untrusted SARIF string fields and URIs sanitized and confined
  So that malicious SARIF reports cannot inject terminal sequences, spoof Markdown reports, or escape the project root

  @nominal
  Scenario: Campos limpios y URI relativa válida se normalizan correctamente
    Given a valid SARIF 2.1.0 finding with clean tool name, ruleId, message.text, and uri "src/app.ts"
    When the SAST verifier normalizes and renders the finding
    Then relPath is "src/app.ts"
    And the CLI and report output preserve the sanitized finding details

  @boundary
  Scenario: URI file:// dentro de la raíz del proyecto se normaliza a ruta relativa
    Given a valid SARIF 2.1.0 finding whose artifactLocation.uri is a "file://" URI inside the project root
    When the SAST verifier normalizes the artifact location
    Then relPath resolves deterministically to the relative path inside the project root

  @attack
  Scenario Outline: Secuencias ANSI y caracteres de control son neutralizados en campos SARIF
    Given a SARIF 2.1.0 finding where "<field>" contains ANSI escape sequences and control characters
    When the SAST verifier renders the finding in CLI output and reports
    Then no raw ANSI escape sequences or control characters appear in the output

    Examples:
      | field                |
      | message.text         |
      | ruleId               |
      | artifactLocation.uri |
      | tool.driver.name     |

  @attack
  Scenario: Inyección Markdown o HTML en message.text y ruleId es neutralizada en reportes
    Given a SARIF 2.1.0 finding with Markdown headings, injected links, or HTML tags in "message.text" and "ruleId"
    When the SAST verifier renders the Markdown gate report
    Then injected Markdown structures and raw HTML tags are neutralized

  @invalid
  Scenario Outline: URI file:// fuera de la raíz o con segmentos .. tras normalización es rechazada
    Given a SARIF 2.1.0 finding with artifactLocation.uri "<malicious_uri>"
    When the SAST verifier validates and normalizes the URI
    Then the verification fails with error "ERR_SARIF_PATH_OUTSIDE_ROOT"
    And no partial violations are reported

    Examples:
      | malicious_uri                  |
      | file:///etc/passwd             |
      | src/../../../etc/shadow        |
      | ../outside-repo/secret.ts      |
