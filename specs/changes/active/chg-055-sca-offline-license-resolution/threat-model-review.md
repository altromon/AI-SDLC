---
id: TMR-CHG-055-TSK-001
type: threat-model-review
change-id: CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION
task-id: TSK-001
reviewer: agent-threat-modeler
date: "2026-11-14"
verdict: APROBADO
---

# Threat Model Review: CHG-055 (`TSK-001`)

**Veredicto:** `APROBADO`

## 1. Alcance Revisado

- [`BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION.md`](../../../../product/business-rules/BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION.md) (v1.1.0)
- [`SEC-REQ-055-SAFE-EXEC-HARDENING-001.md`](../../../../security/requirements/SEC-REQ-055-SAFE-EXEC-HARDENING-001.md) (v1.0.0)
- [`SEC-REQ-055-CLI-HIJACK-RESISTANCE-001.md`](../../../../security/requirements/SEC-REQ-055-CLI-HIJACK-RESISTANCE-001.md) (v1.0.0)
- [`design.md`](./design.md) (v1.1.0)
- [`spec.md`](./spec.md)

## 2. Verificación de Controles STRIDE / OWASP ASVS V5.3

### 2.1 Tabla cerrada de `argv` y entorno (`CWE-78`, `OWASP-ASVS-V5.3`)
- **Estado:** Conforme.
- `runSafe(bin, rootDir, manifestDir)` no acepta `argv` del llamador; los 7 binarios permitidos (`cargo`, `go`, `mvn`, `dotnet`, `npm`, `pnpm`, `pip-licenses`) usan comandos y flags cerrados, offline y de solo lectura (`--ignore-scripts`, `--offline --locked --frozen`, `-o -B -ntp -q dependency:list` sin `license:download-licenses`, sin `restore`).
- Binario fuera de lista devuelve `ERR_UNAUTHORIZED_SCA_TOOL` sin invocación.
- Entorno hijo por lista blanca (`PATH` absoluto de sistema, `SYSTEMROOT`, `TMP`, `TEMP`, `HOME`, `USERPROFILE`) con `HOME`/cachés temporales y purga explícita de proxies, tokens, `NODE_OPTIONS`, `NODE_PATH`, `RUSTC_WRAPPER`, `RUSTC_WORKSPACE_WRAPPER`, `MAVEN_OPTS`, `MAVEN_ARGS`, `JAVA_TOOL_OPTIONS`, `DOTNET_*`, `GOFLAGS` heredado, `PYTHONPATH`, `PYTHONSTARTUP`, `LD_PRELOAD`, `DYLD_*`, `GIT_*`.
- Ejecución con `shell: false`, `timeout <= 10000 ms`, `maxBuffer <= 5 MiB`, 1 invocación por manifiesto, presupuesto global de 60 s y `cwd` confinado por `realpath`.

### 2.2 Archivos bloqueantes y recorrido ascendente
- **Estado:** Conforme.
- Cobertura completa de archivos de configuración peligrosos: `.mvn/extensions.xml`, `.mvn/maven.config`, `Directory.Build.props`, `Directory.Build.targets`, `Directory.Packages.props`, `global.json` (con `msbuild-sdks`), `nuget.config` / `NuGet.Config` (case-insensitive en Linux), `.pnpmfile.cjs`, `.npmrc`, `.cargo/config.toml`, `.cargo/config` y `rust-toolchain.toml`.
- El recorrido ascendente desde `manifestDir` hasta `rootDir` (incluyendo directorios intermedios) está especificado de forma consistente en la BR, ambos `SEC-REQ-*` y `spec.md`, degradando a `UNRESOLVED` (`blocked_by_repo_config`) sin lanzar proceso.

### 2.3 Resolución de binarios (Windows cwd-hijack y prohibición de shims `.cmd`/`.bat`)
- **Estado:** Conforme (`CWE-426`).
- Resolución restringida a entradas absolutas del `PATH` del sistema fuera de `rootDir`, excluyendo `.`, rutas relativas, `cwd`, `node_modules/.bin` y entornos virtuales (`venv`) del repositorio.
- En Windows: sin búsqueda en `cwd` y prohibición explícita de shims `.cmd`/`.bat` (solo `.exe` resuelto directamente con `shell: false`), mitigando hijacking por `cwd` e inyección de argumentos vía `cmd.exe`.

## 3. Notas de Implementación para `TSK-002` (No Bloqueantes)

1. En Windows, normalizar nombres de variables de entorno de forma case-insensitive al construir el entorno hijo (`Path` vs `PATH`) para evitar fugas involuntarias.
2. Aplicar `realpath` antes de comprobar confinamiento fuera de `rootDir` tanto para el binario resuelto como para `manifestDir`.
3. Realizar la detección de `nuget.config` / `NuGet.Config` comparando entradas de directorio sin distinguir mayúsculas/minúsculas también en Linux/macOS.

## 4. Decisión

Se levanta el bloqueo sobre `TSK-002` para proceder con el ciclo Red-Green-Refactor de `safe-exec.ts`.
