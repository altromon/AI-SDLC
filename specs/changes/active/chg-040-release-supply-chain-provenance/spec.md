---
id: SPEC-CHG-040-RELEASE-SUPPLY-CHAIN-PROVENANCE
type: spec-delta
title: "release-supply-chain-provenance"
version: 1.0.0
schema-version: "1.0"
status: draft
change-id: CHG-040-RELEASE-SUPPLY-CHAIN-PROVENANCE
impacts:
  - architecture: CMP-CORE
citations:
  - id: FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001
    digest: sha256:35af146dc483e76559bdba42db0de10b84c475f72df0de17d9900408e9a5544e
    comment: Citación de requirement
---

# Especificación Técnica: CHG-040-RELEASE-SUPPLY-CHAIN-PROVENANCE

## 1. Modificaciones en Pipeline de Release (.github/workflows/release.yml)
- **Permisos**:
  - `id-token: write`: Emisión de token OIDC para autenticación en Sigstore y npm.
  - `attestations: write`: Escritura de atestaciones SLSA en GitHub Attestation Store.
- **Publishing Step**:
  - `publish: pnpm changeset publish --provenance`
- **Firma Cosign (Keyless)**:
  - Acción `sigstore/cosign-installer@v3`.
  - Empaquetado de tarballs `.tgz` y firma mediante `cosign sign-blob --yes --bundle <tarball>.bundle <tarball>`.
- **Atestación SLSA**:
  - Acción `actions/attest-build-provenance@v2` con `subject-path: 'release-artifacts/*.tgz'`.

## 2. Modificaciones en Manual de Producción
- **Sección 1.4**: Añadir Step 5 de verificación de procedencia npm (`npm audit signatures`), firma Cosign (`cosign verify-blob`) y atestación SLSA (`gh attestation verify`).
- **Sección 3.3**: Actualizar tabla de puertas de calidad con la verificación criptográfica y umbral requerido.
