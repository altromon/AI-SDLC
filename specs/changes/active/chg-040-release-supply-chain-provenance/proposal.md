---
id: CHG-040-RELEASE-SUPPLY-CHAIN-PROVENANCE
type: spec-change-proposal
title: "release-supply-chain-provenance"
status: draft
author: "agent-devops / human-dev"
citations:
  - id: UC-040-RELEASE-SUPPLY-CHAIN-PROVENANCE
    digest: sha256:a1fc62e93e16fa9fd45cfd09ee70faeef0ca1864f9ebfb6e5b2789c476724f11
    comment: Citación de use-case (Firma Criptográfica con Sigstore/Cosign y Procedencia SLSA en Publicación de Release)
  - id: FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001
    digest: sha256:35af146dc483e76559bdba42db0de10b84c475f72df0de17d9900408e9a5544e
    comment: Citación de requirement (Procedencia npm, Firma Sigstore/Cosign y Atestación SLSA en Pipeline de Release)
---

# Propuesta de Cambio: CHG-040-RELEASE-SUPPLY-CHAIN-PROVENANCE

## 1. Motivación y Alcance
La directriz institucional en `production-manual.template.md` (Sección 3.2 y 3.3) estipula la firma criptográfica con Cosign y la procedencia SLSA como requisitos contractuales para la promoción y despliegue de artefactos. Sin embargo, el workflow de publicación `.github/workflows/release.yml` carecía del flag de procedencia en npm (`--provenance`), no instalaba Sigstore/Cosign para firmar los tarballs distribuidos ni emitía atestaciones de procedencia SLSA v1.0.

Este cambio cierra de forma integral la brecha de integridad de la cadena de suministro (Supply Chain Integrity) incorporando:
1. Flag `--provenance` en la publicación mediante changesets (`pnpm changeset publish --provenance`).
2. Declaración explícita de permisos `id-token: write` y `attestations: write` en `.github/workflows/release.yml`.
3. Integración de `sigstore/cosign-installer` y firma keyless de tarballs generados.
4. Generación de atestaciones SLSA de compilación con `actions/attest-build-provenance`.
5. Actualización del manual de producción y plantillas de inicialización documentando los comandos exactos de verificación determinista (`cosign verify-blob` y `gh attestation verify`).

## 2. Dependencias Externas Evaluadas
- `sigstore/cosign-installer@v3`: Acción estándar oficial de GitHub / Sigstore.
- `actions/attest-build-provenance@v2`: Acción oficial de GitHub para atestaciones SLSA v1.0.
