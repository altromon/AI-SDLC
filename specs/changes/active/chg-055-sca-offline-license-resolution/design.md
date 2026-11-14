---
id: DSG-CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION
type: spec-design
change-id: CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION
title: "Diseño Técnico: SCA offline license resolution"
version: "1.1.0"
schema-version: "1.0"
handoff: "HOF-CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION"
architecture-component: "CMP-054-SCA-LICENSE-RESOLUTION"
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
citations:
  - id: UC-055-SCA-OFFLINE-LICENSE-RESOLUTION
    digest: sha256:38d5b5d3b076f939ac06ff8b7c9970f46cfea53e343282b37da8783978dfc5e9
    comment: Citación upstream
  - id: FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
    digest: sha256:3c5d2e59cbeec0bac5bd87a94595bff7a3c5c3789943fd2b582b836997942562
    comment: Citación upstream
  - id: BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
    digest: sha256:b967c3e510f66024ee48be54ae3c0175a02055fa7a4a5dd265e313e3672f4a94
    comment: Citación upstream
  - id: BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
    digest: sha256:c1c9b92393daa5056a0721c8ee1b54213ee78d140646d38c953ccbc762e76c13
    comment: Citación upstream
  - id: CMP-054-SCA-LICENSE-RESOLUTION
    digest: sha256:6415b7c4495732b493b658c9046e4a579564a708b99e7edd9bd65283d97a7996
    comment: Citación upstream
---

# Diseño Técnico: CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION

## 1. Mapeo Arquitectónico y Enclave Zero Trust
`CMP-054-SCA-LICENSE-RESOLUTION` en `packages/core/src/verifiers/sca/`, enclave `SEC-ENC-DMZ`. Depende de CHG-054 (Maven sin herencia de licencia raíz y `buildPurl`). Controles: SEC-REQ-055-SAFE-EXEC-HARDENING-001, SEC-REQ-055-CLI-HIJACK-RESISTANCE-001, SEC-REQ-055-OUTPUT-SANITIZATION-INTEGRITY-001.

## 2. Contratos de Datos e Interfaces
Funciones planas, sin interfaces/factorías, extendiendo `scanXDependencies(rootDir, seen)`. **Se prefiere siempre el parseo puro de archivos; el CLI es el segundo paso.**
- `safe-exec.ts`: `runSafe(bin: AllowedBin, rootDir: string, manifestDir: string): { ok: true; stdout: string } | { ok: false; reason: UnresolvedReason }`. El argv NO lo aporta el llamador: sale de la tabla cerrada de BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION §2 (cargo, go, mvn, dotnet, npm, pnpm, pip-licenses). `shell:false`; entorno por lista blanca con HOME/cachés temporales; `timeout` ≤ 10 s; `maxBuffer` 5 MiB; una invocación por manifiesto y presupuesto global de 60 s; binario resuelto solo en entradas absolutas del PATH del sistema fuera de `rootDir` (Windows: sin cwd, `.exe` explícito, sin shims `.cmd`); rechazo previo si existen archivos bloqueantes (§3 de la BR) → `blocked_by_repo_config`; stdout vacío/corrupto → `invalid_output`; binario fuera de lista → `ERR_UNAUTHORIZED_SCA_TOOL`.
- `license-python.ts`, `license-rust.ts`, `license-go.ts`, `license-java.ts`, `license-dotnet.ts`, `license-node.ts`: `resolveXLicense(dep, rootDir): string | undefined` (archivos locales primero; CLI después). Lecturas confinadas con `realpath` + `path.relative`.
- `license-resolve.ts`: `resolveLicense(dep, rootDir)` orquesta archivos → CLI → `UNRESOLVED`. **Propiedad de `unresolvedReason`**: la fija únicamente `license-resolve.ts` a partir de la razón devuelta por `runSafe`/`resolveXLicense`; `scanner.ts` solo la propaga. `ScaDependency` gana `unresolvedReason?: 'cli_not_installed' | 'cli_timeout' | 'cache_missing' | 'invalid_output' | 'output_too_large' | 'cli_failed' | 'blocked_by_repo_config' | 'path_rejected' | 'budget_exceeded'` y `provenance?: 'local-metadata' | 'cli' | 'sbom-declared'`.
- **UNRESOLVED ≡ UNKNOWN**: `UNRESOLVED` se normaliza a la misma rama que `UNKNOWN` en Gate 6, código de salida e informes (`unknown-license` de `license-policy.yaml`).
- Integración: `scanInstalledLicenses` invoca `resolveLicense` para dependencias `UNKNOWN`.
- Los fallbacks `trivy`/`syft` no se tocan en este cambio.

## 3. Protocolos de Manejo de Errores y Mitigación
Binario ausente, timeout, salida excesiva o vacía → `UNRESOLVED` con razón, nunca excepción fatal ni licencia inventada. Salida saneada (sin rutas absolutas, usuario, entorno ni stderr crudo). Mitigaciones STRIDE de la BR: sin shell y tabla cerrada (Tampering/EoP), archivos bloqueantes (EoP), timeout/presupuesto (DoS), PATH del sistema fuera de la raíz (Spoofing). **Gate de revisión de modelo de amenazas (TSK-001, strict-invariant) obligatorio antes de implementar `safe-exec.ts` (TSK-002 bloqueada por TSK-001).** Pruebas con red denegada.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Sin dependencias nuevas; solo `node:child_process`, `node:fs`, `node:path`.
## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-12 | agent-system-architect | Diseño técnico formal | CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION |
| **1.1.0** | 2026-11-13 | agent-system-architect | Corrección checkpoint 1 (decisiones PO) | CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION |
