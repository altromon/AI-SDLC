---
id: DSN-CHG-040-RELEASE-SUPPLY-CHAIN-PROVENANCE
type: design-delta
title: "release-supply-chain-provenance"
version: 1.0.0
schema-version: "1.0"
status: draft
change-id: CHG-040-RELEASE-SUPPLY-CHAIN-PROVENANCE
citations:
  - id: FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001
    digest: sha256:35af146dc483e76559bdba42db0de10b84c475f72df0de17d9900408e9a5544e
    comment: Citación de requirement
---

# Diseño de Implementación: CHG-040-RELEASE-SUPPLY-CHAIN-PROVENANCE

## 1. Arquitectura de Firma y Procedencia
```mermaid
flowchart TD
    Build["pnpm build"] --> ChangesetPublish["pnpm changeset publish --provenance"]
    ChangesetPublish --> CheckPublished{"¿Publicado?"}
    CheckPublished -- Sí --> Pack["pnpm pack tarballs -> release-artifacts/"]
    Pack --> CosignInstall["uses: sigstore/cosign-installer@v3"]
    CosignInstall --> CosignSign["cosign sign-blob keyless (OIDC)"]
    CosignSign --> SLSAAttest["uses: actions/attest-build-provenance@v2"]
    SLSAAttest --> GitHubRelease["Subir artefactos y bundles a GitHub Release"]
    CheckPublished -- No (PR creada) --> Done["Fin del Job"]
```

## 2. Invariantes de Seguridad
- Cero claves criptográficas estáticas o privadas almacenadas en secretos del repositorio (modelo Keyless con Sigstore Fulcio/Rekor).
- Autenticación OIDC efímera ligada exclusivamente al repositorio `altromon/AI-SDLC` y la rama `main`.
- Verificación simétrica y reproducible documentada en manuales operativos.
