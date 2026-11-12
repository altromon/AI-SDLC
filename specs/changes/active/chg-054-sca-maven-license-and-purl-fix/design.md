---
id: DSG-CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
type: spec-design
change-id: CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
title: "Diseño Técnico: SCA Maven license and PURL fix"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX"
architecture-component: "CMP-054-SCA-LICENSE-RESOLUTION"
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
citations:
  - id: UC-054-SCA-MAVEN-LICENSE-PURL-FIX
    digest: sha256:df41e18920b9cf5700455fc6e3c1912bf4a18ca6851fe3dcd26126744ea1b08d
    comment: Citación upstream
  - id: FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
    digest: sha256:b04c529f81e43f4180efcb711788c285680da5ba92f413c0edf888b238305050
    comment: Citación upstream
---

# Diseño Técnico: CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX

## 1. Mapeo Arquitectónico y Enclave Zero Trust
Corrección acotada en `CMP-054-SCA-LICENSE-RESOLUTION` (subconjunto de `CMP-CORE`, enclave `SEC-ENC-DMZ`). Sin I/O nuevo ni dependencias.

## 2. Contratos de Datos e Interfaces
- `scanner.ts`: `resolveMavenBlockLicense`/`parseMavenDepBlock` dejan de recibir `defaultLic` (licencia del `<licenses>` raíz de `scanMavenDependencies`). Licencia de la dependencia = tag/comentario propio o `UNKNOWN` (BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY).
- Nuevo `sca/purl.ts`: `buildPurl(dep: ScannedDependency): string` función plana con tabla ecosistema→tipo (npm, pypi, maven `group/artifact`, cargo, golang, nuget). Usada por `buildCycloneDxComponent` (reemplaza el fallback `pkg:npm`) y por `mapScaVulnToCycloneDx` para `affects[].ref`, garantizando ref == purl del componente.
- Requisito previo de CHG-055 (la herencia de licencia Maven debe corregirse antes de resolver Java).

## 3. Protocolos de Manejo de Errores y Mitigación
Ecosistema desconocido → `pkg:generic`; nunca `pkg:npm` por defecto. Licencia no resoluble → `UNKNOWN`.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Sin dependencias nuevas.
## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-12 | agent-system-architect | Diseño técnico formal | CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX |

