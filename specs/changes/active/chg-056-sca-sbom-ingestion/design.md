---
id: DSG-CHG-056-SCA-SBOM-INGESTION
type: spec-design
change-id: CHG-056-SCA-SBOM-INGESTION
title: "Diseño Técnico: SCA SBOM ingestion"
version: "1.1.0"
schema-version: "1.0"
handoff: "HOF-CHG-056-SCA-SBOM-INGESTION"
architecture-component: "CMP-054-SCA-LICENSE-RESOLUTION"
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
citations:
  - id: UC-056-SCA-SBOM-INGESTION
    digest: sha256:55a3930202cf6a2b189d314ece3855bcf9dce4dd747894482ee0f917b128a63f
    comment: Citación upstream
  - id: FR-056-SCA-SBOM-INGESTION-001
    digest: sha256:798419682a1d8b413f2c8e3d72fd16f4905b74832abcdceb2eb1d7a51b2dfc4a
    comment: Citación upstream
  - id: BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
    digest: sha256:b967c3e510f66024ee48be54ae3c0175a02055fa7a4a5dd265e313e3672f4a94
    comment: Citación upstream
  - id: CMP-054-SCA-LICENSE-RESOLUTION
    digest: sha256:6415b7c4495732b493b658c9046e4a579564a708b99e7edd9bd65283d97a7996
    comment: Citación upstream
---

# Diseño Técnico: CHG-056-SCA-SBOM-INGESTION

## 1. Mapeo Arquitectónico y Enclave Zero Trust
`CMP-054-SCA-LICENSE-RESOLUTION`, enclave `SEC-ENC-DMZ`. **Independiente** de CHG-054 y CHG-055: no depende de `buildPurl` (usa su propio parser PURL estricto). Controles: SEC-REQ-055-SBOM-INGESTION-SAFETY-001 y SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001.

## 2. Contratos de Datos e Interfaces
- `sbom-ingest.ts`: `ingestSbom(rootDir: string, sbomPath: string): SbomDocument`. Apertura por descriptor (`open` + `fstat` sobre el fd), `realpath` + `path.relative` para confinamiento, solo archivo regular, sin UNC ni symlinks fuera de la raíz; límites: **50 MiB**, **100 000 componentes**, **profundidad JSON 64**, cadenas ≤ 1024; claves `__proto__`/`constructor`/`prototype` rechazadas.
- **Códigos de error** (lanza `ScaSbomError` con `code`): `ERR_SBOM_NOT_FOUND`, `ERR_SBOM_NOT_REGULAR_FILE`, `ERR_SBOM_PATH_OUTSIDE_ROOT`, `ERR_SBOM_TOO_LARGE`, `ERR_SBOM_MALFORMED`, `ERR_SBOM_UNSUPPORTED`, `ERR_SBOM_EMPTY`, `ERR_SBOM_LIMIT_EXCEEDED`, `ERR_SBOM_UNSAFE_KEY`. Mensajes sin rutas absolutas. Nunca resultados parciales.
- `sbom-parse.ts`: `parseCycloneDx(doc)`/`parseSpdx(doc)` → `SbomComponent[]` con orden canónico (`canonicalSort`). Licencia: precedencia SPDX (`NOASSERTION`/`NONE`/vacío/`LicenseRef-*` → `UNKNOWN`; expresión SPDX válida; nombre literal ≤ 200 caracteres sin control/ANSI; resto `UNKNOWN`). PURL: gramática estricta `pkg:<type>/<namespace>?/<name>@<version>` con decodificación percent válida; clave de dedupe = ecosistema + namespace + nombre + versión.
- **Fusión (decisión final del PO)**: `mergeSbomGaps(local, sbom)`: la resolución local siempre gana; el SBOM solo rellena dependencias `UNKNOWN`/`UNRESOLVED` con procedencia `sbom-declared`. Verificación cruzada contra lockfiles: componentes faltantes/sobrantes.
- **Canal de avisos**: `ScaScanResult.warnings: string[]` (saneado, ordenado canónicamente); `verify licenses` los imprime en stderr y no alteran el JSON del gate.
- **Opción explícita**: `--sbom <ruta>` en `verify licenses`; sin ella no se lee ningún SBOM (sin autodescubrimiento). OSV fuera de alcance (issue #194).

## 3. Protocolos de Manejo de Errores y Mitigación
Error cerrado con código explícito; SBOM vacío = `ERR_SBOM_EMPTY`; offline y determinista; sin ejecutar código ni resolver URLs del SBOM; sin CLI derivado del contenido del SBOM.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Sin dependencias nuevas (JSON nativo; XML fuera de alcance).
## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-12 | agent-system-architect | Diseño técnico formal | CHG-056-SCA-SBOM-INGESTION |
| **1.1.0** | 2026-11-13 | agent-system-architect | Corrección checkpoint 1 (decisiones PO) | CHG-056-SCA-SBOM-INGESTION |
