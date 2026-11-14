# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: security/requirements/SEC-REQ-055-SBOM-INGESTION-SAFETY-001.md
# ID Requerimiento: SEC-REQ-055-SBOM-INGESTION-SAFETY-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@SEC-REQ-055-SBOM-INGESTION-SAFETY-001 @security @mitigation @sbom-ingestion
Feature: Ingesta segura de SBOM externos
  As a Security Officer
  I want SBOM files treated as untrusted input
  So that a crafted SBOM cannot cause file disclosure, SSRF or DoS

  Scenario: SBOM excesivo es rechazado
    Given an SBOM file larger than 50 MiB
    When the SBOM ingestor loads it
    Then it must be rejected with "ERR_SBOM_TOO_LARGE" before parsing

  Scenario: XML no soportado
    Given an SBOM in XML containing an external entity "file:///etc/passwd"
    When the ingestor loads it
    Then it must be rejected with "ERR_SBOM_UNSUPPORTED"
    And no file content appears in the output

  Scenario: Clave de contaminación de prototipo
    Given an SBOM JSON containing the key "__proto__"
    When the ingestor parses it
    Then it must be rejected with "ERR_SBOM_UNSAFE_KEY"

  Scenario: Profundidad JSON excesiva
    Given an SBOM JSON nested deeper than 64 levels
    When the ingestor parses it
    Then it must be rejected with "ERR_SBOM_LIMIT_EXCEEDED"

  Scenario: Symlink o archivo no regular
    Given an SBOM path that is a symlink leaving the root or a non-regular file
    When the ingestor opens it
    Then it must be rejected without reading its content

  Scenario: externalReferences no generan red
    Given an SBOM with externalReferences and purl URLs
    When the ingestor processes it
    Then no network request is made

  Scenario: Ruta fuera de la raíz
    Given an SBOM path whose realpath is outside the allowed root
    When the ingestor resolves the path
    Then it must be rejected

  Scenario: Licencia del SBOM no sobrescribe resolución local
    Given a dependency resolved locally as "MIT" and an SBOM declaring "GPL-3.0"
    When licenses are merged
    Then the local license "MIT" is kept
    And no SBOM license is applied to that dependency
