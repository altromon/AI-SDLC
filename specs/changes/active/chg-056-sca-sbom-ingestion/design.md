---
id: DSG-CHG-056-SCA-SBOM-INGESTION
type: spec-design
change-id: CHG-056-SCA-SBOM-INGESTION
title: "Diseño Técnico: SCA SBOM ingestion"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-056-SCA-SBOM-INGESTION"
architecture-component: "CMP-054-SCA-LICENSE-RESOLUTION"
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
citations:
  - id: UC-056-SCA-SBOM-INGESTION
    digest: sha256:aba45db23f408c3fc783b46bd10571b318d1d115098402667483b3cbaf17e985
    comment: Citación upstream
  - id: FR-056-SCA-SBOM-INGESTION-001
    digest: sha256:833be4b494db8570d4c388f0a97e15c94a16d19c1b90849d1ad0cb2bae8f3a44
    comment: Citación upstream
---

# Diseño Técnico: CHG-056-SCA-SBOM-INGESTION

## 1. Mapeo Arquitectónico y Enclave Zero Trust
`CMP-054-SCA-LICENSE-RESOLUTION`, enclave `SEC-ENC-DMZ`. Independiente de PATCH-054/CHG-055 (puede usar `buildPurl` si ya existe).

## 2. Contratos de Datos e Interfaces
- `sbom-ingest.ts`: `ingestSbom(rootDir: string, sbomPath: string): ScannedDependency[]` — resuelve la ruta con `realpath` confinada a `rootDir` (`ERR_SBOM_PATH_OUTSIDE_ROOT`), límite de tamaño, `JSON.parse` (`ERR_SBOM_MALFORMED`), detección de formato por `bomFormat: CycloneDX` / `spdxVersion: SPDX-2.x` (`ERR_SBOM_UNSUPPORTED`). Lanza error cerrado; nunca devuelve resultados parciales.
- `sbom-parse.ts`: `parseCycloneDx(doc)` y `parseSpdx(doc)` → `ScannedDependency[]` ordenado de forma determinista; licencia = `license.id` / `expression` SPDX o `UNKNOWN` (BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY). Maven PURL `pkg:maven/g/a@v` → nombre `g:a`.
- Integración: en `scanInstalledLicenses` una opción `sbomPath` (descubrimiento por ruta indicada) hace que las dependencias del SBOM **sustituyan siempre** a la resolución local (decisión del PO; sin fusión), emitiendo aviso. OSV fuera de alcance (issue #194).

## 3. Protocolos de Manejo de Errores y Mitigación
Errores explícitos `ERR_SBOM_MALFORMED`, `ERR_SBOM_UNSUPPORTED`, `ERR_SBOM_PATH_OUTSIDE_ROOT`. Offline, determinista, sin ejecutar código del SBOM, tope de tamaño de archivo (DoS).

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Sin dependencias nuevas.
## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-12 | agent-system-architect | Diseño técnico formal | CHG-056-SCA-SBOM-INGESTION |

