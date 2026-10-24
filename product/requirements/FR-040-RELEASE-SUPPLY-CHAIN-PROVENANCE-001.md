---
id: FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: "Procedencia npm, Firma Sigstore/Cosign y Atestación SLSA en Pipeline de Release"
status: active
category: functional
derives-from:
  - UC-040-RELEASE-SUPPLY-CHAIN-PROVENANCE
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001"
  - "@automated"
supersedes: null
superseded-by: null
---

# FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001: Procedencia npm, Firma Sigstore/Cosign y Atestación SLSA

## 1. Enunciado Normativo
El pipeline de release y la documentación operativa DEBEN implementar y verificar la integridad de la cadena de suministro según los siguientes requisitos:
1. **Procedencia en npm**: El comando de publicación de changesets en `.github/workflows/release.yml` DEBE incluir el parámetro `--provenance` para vincular criptográficamente el paquete con el repositorio y commit fuente en el registro oficial de npm.
2. **Permisos OIDC y Atestaciones**: El workflow de release DEBE declarar los permisos `id-token: write` y `attestations: write` para autorizar la emisión de tokens OIDC y atestaciones criptográficas de GitHub.
3. **Instalación y Firma Sigstore/Cosign**: El job de release DEBE integrar `sigstore/cosign-installer` y ejecutar firma de artefactos en modo sin clave (keyless) mediante identidad OIDC efímera.
4. **Generación de Atestaciones SLSA**: El workflow DEBE generar o declarar la atestación de procedencia de compilación SLSA v1.0 para los paquetes distribuidos.
5. **Verificación Documentada en Manual de Producción**: La plantilla `templates/manuals/production-manual.template.md` (y sus fuentes inicializadoras) DEBE documentar de manera determinista los procedimientos y comandos exactos de verificación (`cosign verify-blob` y `gh attestation verify`).

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
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
```
