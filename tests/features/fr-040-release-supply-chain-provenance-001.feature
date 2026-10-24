# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: product/requirements/FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001.md
# ID Requerimiento: FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

@FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001 @automated @regression
Feature: Procedencia npm, Firma Sigstore/Cosign y Atestación SLSA en Pipeline de Release
  @nominal
  Scenario: El workflow de release contiene procedencia npm y steps de firma Sigstore y atestación SLSA
    Given el archivo de workflow de GitHub Actions ".github/workflows/release.yml"
    When se audita la configuración de permisos y publicación
    Then contiene el permiso "id-token: write" y "attestations: write"
    And el comando de publicación de changesets incluye "--provenance"
    And incluye la instalación de Cosign con "sigstore/cosign-installer"
    And incluye la acción de atestación de procedencia SLSA "actions/attest-build-provenance"

  @boundary
  Scenario: La plantilla del manual de producción documenta comandos completos de verificación
    Given la plantilla de documentación técnica "templates/manuals/production-manual.template.md"
    When se audita la sección de verificación criptográfica de la release
    Then incluye el comando de verificación con Cosign utilizando "cosign verify-blob"
    And incluye el comando de verificación de atestación SLSA utilizando "gh attestation verify"
    And la plantilla satisface el esquema institucional "production-manual.schema.json"

  @invalid
  Scenario: Intento de publicación en npm sin flag de procedencia o sin permisos OIDC
    Given una configuración de pipeline donde se omite "--provenance" o falta el permiso "id-token: write"
    When se ejecuta la auditoría estricta de Supply Chain Security
    Then la validación detecta incumplimiento de procedencia
    And se marca la configuración como no conforme con el estándar AI-SDLC
