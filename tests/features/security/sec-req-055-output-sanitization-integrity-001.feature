# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001.md
# ID Requerimiento: SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001 @security @mitigation @output-sanitization
Feature: Saneamiento de salida e integridad de atribución de licencias
  As a Security Officer
  I want untrusted CLI output validated before it becomes a license verdict
  So that spoofed or leaky output cannot bypass the license policy

  Scenario: Licencia con secuencias de control o excesiva longitud
    Given a CLI that returns a license containing ANSI escapes or 5000 characters
    When the license resolver parses the output
    Then the dependency must be UNRESOLVED
    And the invalid value is not written to any report

  Scenario: JSON con claves de contaminación de prototipo
    Given CLI output JSON containing "__proto__" keys
    When the resolver parses it
    Then Object.prototype must remain unmodified

  Scenario: Sin herencia de licencia raíz
    Given a Maven dependency pom without license in "~/.m2"
    When resolveLicense runs
    Then the dependency must be UNRESOLVED
    And the root project license is not attributed to it

  Scenario: Informes sin rutas absolutas ni stderr crudo
    Given a CLI failing with stderr containing "C:\Users\alice\secret"
    When the report is generated
    Then the report must contain only the unresolvedReason enum value
    And no absolute path or stderr text appears

  Scenario: Fallo de CLI no aborta el escaneo
    Given the "go" binary is not installed
    When scanInstalledLicenses runs
    Then Go dependencies are UNRESOLVED with reason "cli_not_installed"
    And the other ecosystems are still scanned
