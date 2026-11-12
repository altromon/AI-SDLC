---
id: BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
type: business-rule
version: "1.0.0"
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
2. Todo identificador PURL emitido (componentes y `affects.ref` de vulnerabilidades) DEBE usar el tipo del ecosistema real de la dependencia (`npm`, `pypi`, `maven`, `cargo`, `golang`, `nuget`).
3. La resolución de licencias es offline y ordenada: metadatos locales → CLI oficial local → `UNRESOLVED` explícito. Nunca se infiere ni se inventa una licencia.

## 2. Nivel de Aplicación
- **strict-invariant:** El Gate 6 no puede reportar una licencia que no provenga de una fuente trazable de la propia dependencia.
