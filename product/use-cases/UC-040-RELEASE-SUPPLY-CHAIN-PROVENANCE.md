---
id: UC-040-RELEASE-SUPPLY-CHAIN-PROVENANCE
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: Firma Criptográfica con Sigstore/Cosign y Procedencia SLSA en Publicación de Release
status: active
primary-actor: ACT-TECH-LEAD
supporting-actors:
  - ACT-AI-AGENT
  - ACT-HUMAN-ENGINEER
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---

# UC-040-RELEASE-SUPPLY-CHAIN-PROVENANCE: Firma Criptográfica y Procedencia SLSA en Release

## 1. Intención y Resultado
Garantizar la integridad de la cadena de suministro de software (Supply Chain Integrity) en la publicación automatizada de paquetes en npm y GitHub Releases, incorporando firma sin claves fijas (keyless signing) mediante Sigstore/Cosign basada en OIDC de GitHub Actions, atestaciones de procedencia SLSA v1.0 y habilitando procedencia verificable en npm (`--provenance`), alineando el workflow de publicación `.github/workflows/release.yml` con los requisitos estipulados en `production-manual.template.md`.

## 2. Precondiciones
- El pipeline de release se ejecuta en GitHub Actions con permisos `id-token: write` y `attestations: write`.
- Los paquetes son construidos de forma determinista mediante `pnpm build`.
- El manual de producción estipula directrices formales de verificación de firma y procedencia para operadores y SecOps.

## 3. Flujo Principal
1. Se desencadena el workflow de release tras la ejecución satisfactoria del pipeline de CI.
2. Changesets publica las nuevas versiones de los paquetes en el registro de npm con procedencia habilitada (`pnpm changeset publish --provenance`).
3. Se empaquetan los artefactos comprimidos (`.tgz`) de la distribución.
4. Sigstore/Cosign se instala en el runner y genera firmas y bundles criptográficos utilizando el token OIDC efímero del workflow de GitHub Actions.
5. Se genera una atestación de procedencia de compilación SLSA v1.0 vinculada a los artefactos generados.
6. El manual de producción (`production-manual.template.md`) proporciona a los ingenieros de DevOps y SecOps los comandos deterministas para verificar las firmas y atestaciones emitidas (`cosign verify-blob` y `gh attestation verify`).
