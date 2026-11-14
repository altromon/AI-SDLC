---
id: BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
type: business-rule
version: "1.1.0"
schema-version: "1.0"
title: Ejecución Segura de CLIs Externos de Gestores de Paquetes
status: draft
enforcement-level: strict-invariant
supersedes: null
superseded-by: null
---

# BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION: Ejecución Segura de CLIs Externos

## 1. Declaración de la Regla
Todo CLI externo del escáner SCA (`pip-licenses`, `cargo`, `go`, `mvn`, `dotnet`, `npm`, `pnpm`) DEBE:
1. Preferir SIEMPRE el parseo puro de archivos (metadatos locales); el CLI es el segundo paso.
2. Ejecutarse SIN shell (`shell: false`), con binario, subcomando y flags de la tabla cerrada (§2); nunca interpolando datos del repositorio.
3. Rechazarse (fallback a parseo de archivos / `UNRESOLVED` con `blocked_by_repo_config`) si el repositorio contiene alguno de los **archivos bloqueantes** (§3).
4. Resolverse el binario solo desde entradas absolutas del PATH del sistema fuera de `rootDir`; en Windows sin búsqueda en cwd y sin shims `.cmd`/`.bat` vía shell (solo `.exe` resuelto explícitamente).
5. Usar entorno por lista blanca, HOME/cachés temporales, `timeout` ≤ 10 s por invocación, `maxBuffer` ≤ 5 MiB, una invocación por manifiesto y presupuesto global de tiempo (60 s por escaneo).
6. Ser offline y de solo lectura; salida vacía o corrupta → `UNRESOLVED` (`invalid_output`); binario ausente o fallo → `UNRESOLVED`, nunca error fatal ni licencia inventada.

## 2. Tabla endurecida de argv y entorno
| CLI | argv exacto | Entorno forzado |
| :--- | :--- | :--- |
| `cargo` | `metadata --offline --locked --frozen --format-version 1` | `CARGO_NET_OFFLINE=true`, `CARGO_HOME` temporal |
| `go` | `list -m -json all` | `GOFLAGS=-mod=readonly`, `GOPROXY=off`, `GOTOOLCHAIN=local`, `GOWORK=off` |
| `mvn` | `-o -B -ntp -q dependency:list` (nunca `license:download-licenses`) | `MAVEN_OPTS`/`MAVEN_ARGS` purgados, repo local solo lectura |
| `dotnet` | `list package --include-transitive` (sin restore) | `DOTNET_*` purgado, `DOTNET_CLI_HOME` temporal |
| `npm` | `ls --json --long --ignore-scripts --offline` | `npm_config_ignore_scripts=true`, `npm_config_userconfig` vacío |
| `pnpm` | `licenses list --json --ignore-scripts` | `NODE_OPTIONS` purgado, store temporal |
| `pip-licenses` | `--format=json` | `PYTHONNOUSERSITE=1`; `PYTHONPATH`/`PYTHONSTARTUP` purgados; nunca el `python` de un venv del repo |

Entorno hijo (lista blanca): `PATH` (solo entradas absolutas del sistema), `SYSTEMROOT`, `TMP`, `TEMP`, `HOME`, `USERPROFILE`. Prohibidos: proxies, tokens, `NODE_OPTIONS`, `RUSTC_WRAPPER`, `RUSTC_WORKSPACE_WRAPPER`, `MAVEN_OPTS`, `JAVA_TOOL_OPTIONS`, `DOTNET_*`, `LD_PRELOAD`, `DYLD_*`, `GIT_*`.

## 3. Archivos bloqueantes (el CLI se rechaza si existe alguno)
`.mvn/extensions.xml`, `.mvn/maven.config`, `Directory.Build.props`, `Directory.Build.targets`, `global.json` con `msbuild-sdks`, `nuget.config`, `.pnpmfile.cjs`, `.npmrc`, `.cargo/config.toml` (con `rustc-wrapper` o fuentes remotas), `rust-toolchain.toml`.

## 4. Nota de Modelo de Amenazas (STRIDE resumido)
| Amenaza | Vector | Mitigación |
| :--- | :--- | :--- |
| Elevation of Privilege / Tampering | Inyección de comandos, extensiones Maven, MSBuild, `.pnpmfile.cjs`, `rustc-wrapper` | Sin shell, tabla cerrada, archivos bloqueantes, `--ignore-scripts` |
| Spoofing | Binario falso en repo/cwd/`node_modules/.bin`, venv python del repo | PATH absoluto del sistema fuera de `rootDir` |
| Denial of Service | CLI colgado o salida gigante | Timeout, `maxBuffer`, presupuesto global |
| Information Disclosure | Rutas/secretos/stderr en informes | Entorno por lista blanca, saneamiento de salida |

## 5. Nivel de Aplicación
- **strict-invariant:** Requiere revisión de `agent-threat-modeler` antes de implementar (gate explícito en tasks de CHG-055).
