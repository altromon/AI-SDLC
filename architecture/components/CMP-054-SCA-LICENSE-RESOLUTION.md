---
id: CMP-054-SCA-LICENSE-RESOLUTION
type: component
title: Resolución Offline de Licencias, PURL e Ingesta de SBOM del Escáner SCA
status: proposed
version: 1.1.0
schema-version: '1.0'
level: 2
bounded-context: AI-SDLC Governance
parent-component: CMP-CORE
implementation-type: dll
implements-use-cases:
  - UC-054-SCA-MAVEN-LICENSE-PURL-FIX
  - UC-055-SCA-OFFLINE-LICENSE-RESOLUTION
  - UC-056-SCA-SBOM-INGESTION
satisfies-requirements:
  - FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
  - FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
  - FR-056-SCA-SBOM-INGESTION-001
hosted-in-enclave: SEC-ENC-DMZ
interfaces:
  - name: SCA Scanner In-Process API
    protocol: In-Process API
supersedes: null
superseded-by: null
---

# CMP-054-SCA-LICENSE-RESOLUTION: Resolución de licencias, PURL e ingesta de SBOM (SCA)

## 1. Responsabilidad
Subconjunto de `CMP-CORE` bajo `packages/core/src/verifiers/sca/` que extiende `scanner.ts` (patrón `scanXDependencies(rootDir, seen)`) con:
1. **Integridad de atribución** (FR-054, BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY): una dependencia Maven nunca hereda la licencia del `pom.xml` raíz (`UNKNOWN`); PURL por ecosistema real en componentes y `affects.ref` (`purl.ts`, `ScaVulnerability.ecosystem`).
2. **Resolución offline** (FR-055, BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION): parseo de archivos → CLI endurecido (todos los de issue #161 con archivos bloqueantes) → `UNRESOLVED` (≡ `UNKNOWN` para Gate 6) con `unresolvedReason`.
3. **Ingesta de SBOM** (FR-056): solo por ruta explícita (flag CLI); CycloneDX/SPDX JSON confinado a la raíz; **solo rellena huecos** (la resolución local siempre gana; procedencia `sbom-declared`); verificación cruzada contra lockfiles. Independiente de `buildPurl`. OSV fuera de alcance (issue #194).

Los fallbacks externos existentes `scanWithTrivy`/`scanWithSyft` permanecen **sin cambios** de ejecución (solo el fallback de PURL deja de ser `pkg:npm`).

Diseño YAGNI: funciones planas por ecosistema, sin interfaces/factorías; sin dependencias nuevas.

## 2. Estructura interna
```mermaid
graph TD
    SC[scanner.ts scanInstalledLicenses] --> RES[license-resolve.ts]
    SC --> ING[sbom-ingest.ts]
    RES --> EXE[safe-exec.ts]
    RES --> ECO[license-python / rust / go / java / dotnet / node .ts]
    ECO --> EXE
    ING --> PAR[sbom-parse.ts]
    SC --> PURL[purl.ts]
    PURL --> SB[sbom.ts]
```

## 3. Restricciones
- Ejecución según BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION (tabla endurecida y archivos bloqueantes); SEC-REQ-055-SAFE-EXEC-HARDENING-001 y SEC-REQ-055-CLI-HIJACK-RESISTANCE-001.
- Entradas no confiables (CLI, metadatos, SBOM): SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001 y SEC-REQ-055-SBOM-INGESTION-SAFETY-001.
- Lecturas por descriptor (`fstat` sobre fd), confinadas con `path.relative`, solo archivos regulares; sin UNC ni symlinks fuera de la raíz.
- CC ≤ 10 y funciones ≤ 40 líneas (`quality-policy.yaml`); un archivo por ecosistema.
