---
id: DSG-CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION
type: spec-design
change-id: CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION
title: "Diseño Técnico: SCA offline license resolution"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION"
architecture-component: "CMP-054-SCA-LICENSE-RESOLUTION"
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
citations:
  - id: UC-055-SCA-OFFLINE-LICENSE-RESOLUTION
    digest: sha256:06dab455adef09a426584b0ad0ea4be2b473e0a5884459ebe661f3373e837475
    comment: Citación upstream
  - id: FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
    digest: sha256:e30758a662030166efe15f86abbf0cb35a9bfccb77c36f5fc7f86fbe83d34fb9
    comment: Citación upstream
---

# Diseño Técnico: CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION

## 1. Mapeo Arquitectónico y Enclave Zero Trust
`CMP-054-SCA-LICENSE-RESOLUTION` en `packages/core/src/verifiers/sca/`, enclave `SEC-ENC-DMZ`. Depende de PATCH-054 (Maven sin herencia de licencia raíz).

## 2. Contratos de Datos e Interfaces
Funciones planas, sin interfaces/factorías de proveedores, extendiendo el patrón `scanXDependencies(rootDir, seen)`:
- `safe-exec.ts`: `runSafe(bin: AllowedBin, args: string[], cwd: string): { ok: true; stdout: string } | { ok: false; reason: UnresolvedReason }`. `spawnSync` con `shell:false`, lista cerrada (`pip-licenses`, `cargo`, `go`, `mvn`, `dotnet`, `pnpm`, `npm`), `cwd` validado dentro de la raíz, `timeout` y `maxBuffer`, env offline; binario del PATH del sistema (BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION).
- `license-python.ts`, `license-rust.ts`, `license-go.ts`, `license-java.ts`, `license-dotnet.ts`: `resolveXLicense(dep, rootDir): string | undefined` (metadatos locales primero; CLI como segundo paso).
- `license-resolve.ts`: `resolveLicense(dep, rootDir)` orquesta metadatos → CLI → `UNRESOLVED`. `ScannedDependency` gana `unresolvedReason?: 'cli_not_installed' | 'cli_timeout' | 'cache_missing'`.
- Integración: `scanInstalledLicenses` invoca `resolveLicense` para dependencias con licencia `UNKNOWN`.

## 3. Protocolos de Manejo de Errores y Mitigación
Binario ausente, timeout o salida excesiva → `UNRESOLVED` con motivo, nunca excepción fatal ni licencia inventada. Salida del CLI sanitizada (sin rutas absolutas ni secretos) en informes. Mitigaciones STRIDE de la BR: sin shell (Tampering/EoP), timeout (DoS), PATH del sistema (Spoofing). **Revisión de `agent-threat-modeler` requerida (strict-invariant) antes de implementar `safe-exec.ts`.**

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Sin dependencias nuevas; solo `node:child_process`, `node:fs`, `node:path`.
## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-12 | agent-system-architect | Diseño técnico formal | CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION |

