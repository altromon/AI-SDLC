---
id: DSG-CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
type: spec-design
change-id: CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
title: "Diseño Técnico: SCA Maven license and PURL fix"
version: "1.1.0"
schema-version: "1.0"
handoff: "HOF-CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX"
architecture-component: "CMP-054-SCA-LICENSE-RESOLUTION"
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
citations:
  - id: UC-054-SCA-MAVEN-LICENSE-PURL-FIX
    digest: sha256:205354315e6f9b6ea28aeccf32526218d5d92fef63fb56fedb6fff839abb37d7
    comment: Citación upstream
  - id: FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
    digest: sha256:2a69ed39684f961e72d8400bdbb695a643828319866c77006e8860f4e95c4a52
    comment: Citación upstream
  - id: BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
    digest: sha256:b967c3e510f66024ee48be54ae3c0175a02055fa7a4a5dd265e313e3672f4a94
    comment: Citación upstream
  - id: CMP-054-SCA-LICENSE-RESOLUTION
    digest: sha256:6415b7c4495732b493b658c9046e4a579564a708b99e7edd9bd65283d97a7996
    comment: Citación upstream
---

# Diseño Técnico: CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX

## 1. Mapeo Arquitectónico y Enclave Zero Trust
Corrección acotada en `CMP-054-SCA-LICENSE-RESOLUTION` (subconjunto de `CMP-CORE`, enclave `SEC-ENC-DMZ`). Sin dependencias nuevas. Perfil `standard` (cambia salida pública del SBOM). Gobernado por BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY.

## 2. Contratos de Datos e Interfaces
**Sitios exactos de cambio**
| Sitio | Hoy | Después |
| :--- | :--- | :--- |
| `scanner.ts` `scanMavenDependencies` (~440) `defaultLic` | licencia del `<licenses>` raíz | eliminado |
| `scanner.ts` `resolveMavenBlockLicense`/`parseMavenDepBlock` (~411-428) | `commentLic \|\| defaultLic` | sin `defaultLic`; comentarios XML descartados; `UNKNOWN` |
| `sbom.ts:31` | `dep.purl \|\| pkg:npm/...` | `dep.purl \|\| buildPurl(...)` |
| `sbom.ts:75` `affects.ref` | `pkg:npm/@...` | `v.purl \|\| buildPurl({ecosystem: v.ecosystem, ...})` |
| `scanner.ts` ~583 (Trivy) y ~631 (Syft) | fallback `pkg:npm` | `buildPurl` (`pkg:generic` + aviso) |

- `ScaVulnerability` gana `ecosystem: string` (y `purl?: string` si el origen lo aporta); es la fuente del ecosistema para `sbom.ts:75`.
- Nuevo `sca/purl.ts`: `buildPurl(p: { ecosystem: string; namespace?: string; name: string; version: string }): string` función plana con tabla ecosistema→tipo (npm, pypi, maven `group/artifact`, cargo, golang, nuget). Percent-encoding: todo carácter fuera de `[A-Za-z0-9.\-_~]` en nombre/namespace/versión (`@scope` → `%40scope`, `+` → `%2B`). Ecosistema desconocido → `pkg:generic` + aviso (canal `warnings`).
- Maven: tokenizador XML estricto propio (sin dependencias): rechaza `<!DOCTYPE`/`<!ENTITY` (pom descartado con aviso saneado), ignora comentarios y CDATA, `${prop}` sin resolver → versión/licencia `UNKNOWN` marcada.
- **trivy/syft**: las invocaciones (`execTrivyCli`, `scanWithSyft`) permanecen sin cambios; solo cambia el fallback de PURL al parsear su salida. Migrarlas a `safe-exec` queda fuera de este cambio (decisión explícita).
- Requisito previo de CHG-055 (la herencia Maven debe corregirse antes de resolver Java). CHG-056 es independiente de `buildPurl`.

## 3. Protocolos de Manejo de Errores y Mitigación
Ecosistema desconocido → `pkg:generic` con aviso; nunca `pkg:npm` por defecto. Licencia no resoluble → `UNKNOWN` (≡ `UNRESOLVED` para Gate 6). XML con DOCTYPE/ENTITY → pom rechazado, sin expansión ni lectura de archivos.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Sin dependencias nuevas.
## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-12 | agent-system-architect | Diseño técnico formal | CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX |
| **1.1.0** | 2026-11-13 | agent-system-architect | Corrección checkpoint 1 (decisiones PO) | CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX |
