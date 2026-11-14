---
id: BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
type: business-rule
version: "1.1.0"
schema-version: "1.0"
title: Integridad de Atribución de Licencias y Referencias PURL en SCA
status: draft
enforcement-level: strict-invariant
supersedes: null
superseded-by: null
---

# BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY: Integridad de Atribución de Licencias y PURL

## 1. Declaración de la Regla
1. Una dependencia NUNCA hereda la licencia del proyecto raíz. Si su licencia no puede resolverse de forma verificable desde una fuente propia de la dependencia, su licencia es `UNKNOWN`.
2. **`UNRESOLVED` ≡ `UNKNOWN`** a efectos de Gate 6, código de salida e informes: ambos se evalúan con la misma política (`license-policy.yaml`, `unknown-license`), nunca como "permitido". `UNRESOLVED` solo añade un `unresolvedReason` diagnóstico.
3. Todo PURL emitido (componentes y `affects.ref`) DEBE usar el tipo del ecosistema real (`npm`, `pypi`, `maven`, `cargo`, `golang`, `nuget`), con percent-encoding según la especificación PURL. Ecosistema desconocido → `pkg:generic` con aviso; nunca `pkg:npm` por defecto.
4. La resolución es offline y ordenada: metadatos locales → CLI local (con medidas de bloqueo, ver BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION) → `UNRESOLVED` explícito. Nunca se infiere ni se inventa una licencia.
5. Procedencia obligatoria por licencia: `local-metadata` | `cli` | `sbom-declared`.
6. **SBOM solo rellena huecos**: la resolución local SIEMPRE prevalece; una licencia del SBOM nunca sobrescribe una licencia resuelta localmente (fusión, local primero). Solo se aplica a dependencias `UNKNOWN`/`UNRESOLVED` y queda etiquetada `sbom-declared`.
7. Precedencia SPDX de licencias externas: `NOASSERTION`, `NONE`, vacío o `LicenseRef-*` sin texto verificable → `UNKNOWN`; expresión SPDX válida → se conserva; cadena no SPDX de ≤ 200 caracteres sin control/ANSI → se conserva como nombre literal; resto → `UNKNOWN`.

## 2. Nivel de Aplicación
- **strict-invariant:** El Gate 6 no puede reportar una licencia que no provenga de una fuente trazable de la propia dependencia.
