---
id: DSG-CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
type: spec-design
change-id: CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
title: "Diseño Técnico: SCA Recursive Multi-Ecosystem & Doctor Native Toolchains"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS"
architecture-component: "CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS"
enclave: "SEC-ENC-DMZ"
status: draft
contracts:
  - "scanWithNativeFs"
  - "resolveLicense"
  - "ToolchainHealthCheck"
  - "SafeProcessRunnerAdapter"
citations:
  - id: UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
    digest: sha256:649c1a9846278be031474280ca4ad664c0eb799ad548e453ba372ce0fbea485c
    comment: Citación de use-case (Recursive Multi-Ecosystem SCA Scanning and Stack-Aware Doctor Toolchains)
  - id: FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001
    digest: sha256:2452fb97d9c3e8654f1f1ae98269e0fb97f25c805728091e0cbc0a3994ba0a0c
    comment: Requerimiento derivado de UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
  - id: CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
    digest: sha256:b69ffcd78d3041e8ece6fc208a2c5ea931ae12ecf056df520bb41ea7d432667f
    comment: Subcomponente arquitectónico en CMP-CORE para SCA recursivo y Doctor Toolchains
---

# Diseño Técnico: CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS

## 1. Mapeo Arquitectónico y Enclave Zero Trust
Materializa `UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS` y `FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001` dentro de `CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS` (subcomponente de `CMP-CORE`, `@aisdlc/core`) en el enclave `SEC-ENC-DMZ`, siguiendo **Modular & Hexagonal Architecture (Ports & Adapters)** y **Simplicity First (YAGNI)**:

- **Puerto de Escaneo SCA Recursivo (`packages/core/src/verifiers/sca/scanner.ts` y `license-resolve.ts`)**:
  - **Descubrimiento Recursivo Acotado (`maxDepth = 3`)**:
    - Se extraen helpers pequeños y cohesivos (`SKIPPED_SCAN_DIRS`, `collectManifestDirs(rootDir, maxDepth = 3)`, `walkManifestTree(...)`) para mantener `Cyclomatic <= 10`, `Cognitive <= 15` y `Lines <= 40`.
    - `SKIPPED_SCAN_DIRS` excluye `node_modules`, `.git`, `dist`, `target`, `bin`, `obj`, `.venv`, `venv`.
    - Cada entrada de directorio se inspecciona con `fs.readdirSync(dir, { withFileTypes: true })`; si `entry.isSymbolicLink()` es verdadero, se omite inmediatamente para prevenir bucles y escapes fuera de `rootDir`.
    - Para cada directorio recolectado (`[rootDir, ...subDirs]`), se ejecutan los escáneres de ecosistema (`Node`, `Python`, `Go`, `Rust`, `Maven`, `.NET`, `Gradle`) volcando resultados deduplicados en `seen: Map<string, ScannedDependency>`.
    - **Contrato `scanWithNativeFs` -> `resolveLicense`**: `scanWithNativeFs` extrae entradas `ScannedDependency` crudas (con `purl` y `path` apuntando al manifiesto/lockfile descubierto), y `scanDependencies` (`verify licenses`) invoca `resolveLicense(dep, rootDir)` sobre cada dependencia extraída.
  - **Extractores Nativos Multi-Ecosistema y Endurecimiento de Parsers**:
    - **.NET (`scanDotnetDependencies`)**:
      - Escanea archivos `*.csproj` y `Directory.Packages.props`: rechaza `<!DOCTYPE`/`<!ENTITY`, elimina comentarios `<!-- ... -->` y secciones `<![CDATA[ ... ]]>`, correlaciona `<PackageVersion Include="..." Version="..." />` de `Directory.Packages.props` con `<PackageReference Include="..." />` en `*.csproj` (Central Package Management, incluyendo formato elemento hijo `<Version>...</Version>`), e ignora propiedades MSBuild sin expandir (`$(...)`).
      - Escanea `packages.lock.json` (`dependencies` por target framework, extrayendo `type === 'Direct'` y `resolved` version).
      - Construye PURLs `pkg:nuget/<name>@<version>` resueltos vía `resolveLicense` (`license-dotnet.ts`).
    - **Gradle (`scanGradleDependencies`)**:
      - Escanea `build.gradle` y `build.gradle.kts` (eliminando comentarios `//` y `/* ... */`, soportando DSL Groovy `implementation 'g:a:v'` / map `group: '...', name: '...', version: '...'` y Kotlin DSL `implementation("g:a:v")`, omitiendo versiones interpoladas `$var` / `${...}`) y `gradle.lockfile` (`group:artifact:version=configurations`).
      - Construye PURLs `pkg:maven/<group>/<artifact>@<version>` resueltos vía `resolveLicense` (`license-java.ts`).
    - **Python (`scanPythonDependencies` + `parseRequirementsTxt`)**:
      - Añade soporte para `requirements.txt`: une continuaciones de línea (`\`), elimina comentarios en línea (`# ...`), marcadores de entorno (`; ...`) y opciones `--hash=...` / `-r` / `--...` antes de extraer `name` y `version` (`pkg==ver`, `pkg>=ver`, `pkg~=ver`, extras `pkg[extra]==ver`).
      - Construye PURLs `pkg:pypi/<name>@<version>`. En `license-python.ts`, `resolvePythonLicenseDetailed` inspecciona `path.dirname(dep.path)` (si está dentro de `rootDir`) además de `rootDir` para `.venv`/`venv` `site-packages`, permitiendo resolver metadatos locales offline en subproyectos Python anidados.
    - **`license-resolve.ts`**: añade sufijos `directory.packages.props`, `build.gradle`, `build.gradle.kts`, `gradle.lockfile` y `requirements.txt` a `PATH_ECOSYSTEM_SUFFIXES` como respaldo cuando no se inspecciona por PURL.

- **Puerto de Diagnóstico de Toolchain (`packages/core/src/doctor/toolchain-check.ts`, `process-runner.ts`, `types/doctor.ts`)**:
  - **`ToolchainHealthCheck.inspect(options)`**:
    - Sondea siempre `node` (`--version`) y `git` (`--version`).
    - Verifica `fs.existsSync(path.join(rootDir, 'pnpm-lock.yaml'))`; solo añade `pnpm` (`--version`) si el lockfile existe en `rootDir`.
    - Invoca `detectProjectStacks(rootDir)` (`packages/core/src/init/coding-rules-templates.ts`) y busca archivos de build (`pom.xml`, `build.gradle`/`build.gradle.kts`, `CMakeLists.txt`, `.clang-tidy`) en el árbol de directorios acotado (`maxDepth = 3`, consistente con `detectProjectStacks`) en lugar de solo `rootDir`, mapeando cada stack detectado mediante una tabla declarativa (`STACK_TOOL_MAP`) a sus binarios nativos:
      - `dotnet` -> `dotnet` (`--version`)
      - `python` -> sondea primero `python --version` y hace fallback secuencial a `python3 --version` únicamente si `python` falta o falla (emitiendo `ERR_TOOLCHAIN_PYTHON_MISSING` solo si ambos fallan)
      - `go` -> `go` (`version`)
      - `rust` -> `cargo` (`--version`)
      - `java` / `kotlin` -> `java` (`-version`), más `mvn` (`--version`) si existe `pom.xml` o `gradle` (`--version`) si existe `build.gradle`/`build.gradle.kts` en el árbol acotado (`maxDepth = 3`)
      - `c` / `cpp` -> `cmake` (`--version`) si existe `CMakeLists.txt` y/o `clang-tidy` (`--version`) si existe `.clang-tidy` en el árbol acotado (`maxDepth = 3`)
    - En `probeTool`, considera saludable una sonda cuando `res.exitCode === 0 && Boolean(res.stdout.trim() || res.stderr.trim())` para que `java -version` (que imprime en `stderr`) tenga éxito sin falsas advertencias.
    - Deduplica herramientas antes de ejecutar `Promise.all(...)` sobre `probeTool` (manteniendo la sonda secuencial `python` -> `python3`).
  - **Seguridad Zero Trust (`types/doctor.ts` & `process-runner.ts`)**:
    - Amplía `SafeProbeExecutable` y `ALLOWED_TOOLS` con `'dotnet' | 'python' | 'python3' | 'go' | 'cargo' | 'java' | 'mvn' | 'gradle' | 'cmake' | 'clang-tidy'`, manteniendo `shell: false`, `buildSafeEnvironment(cwd)` y `resolveTrustedBinaryPath`.

## 2. Contratos de Datos e Interfaces
Sin cambios en `schemas/`.
- `scanWithNativeFs(rootDir: string, options?: ScanOptions): ScannedDependency[]` mantiene su firma pública y orden determinista.
- `ToolchainHealthCheck.inspect(options: DoctorOptions): Promise<CategoryReport>` mantiene su firma pública y códigos `ERR_TOOLCHAIN_<TOOL>_MISSING` / `WARN_TOOLCHAIN_<TOOL>_ISSUE`.

## 3. Protocolos de Manejo de Errores y Mitigación (Degradación Elegante)
- **Directorios inaccesibles / symlinks / profundidad > 3**: `walkManifestTree` captura errores de lectura locales sin abortar el escaneo completo, omite `isSymbolicLink()` y detiene la recursión en `depth >= maxDepth`.
- **Manifiestos malformados o vacíos**: los parsers de `*.csproj`, `Directory.Packages.props`, `packages.lock.json`, `build.gradle*`, `gradle.lockfile` y `requirements.txt` devuelven listas vacías ante JSON inválido o entradas incompletas sin lanzar excepciones.
- **Binario nativo ausente en `PATH`**: `probeTool` captura `ERR_UNTRUSTED_OR_MISSING_BINARY` y emite `ERR_TOOLCHAIN_<TOOL>_MISSING` (`status: 'fail'`) con remediación accionable.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
No se introducen librerías ni dependencias externas nuevas. Todo el código reutiliza módulos propios de `@aisdlc/core` bajo licencia MIT/Apache-2.0 conforme a `license-policy.yaml`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-27 | agent-system-architect | Diseño técnico inicial para CHG-079 (SCA recursivo multi-ecosistema y Doctor Toolchains consciente del stack) | CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS |
