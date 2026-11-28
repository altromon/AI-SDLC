---
id: DSG-CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS
type: spec-design
change-id: CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS
title: "Diseño Técnico: Polyglot Coding Rules Anti-Bypass and Protected Friction Paths"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS"
architecture-component: "CMP-075-POLYGLOT-CODING-RULES-ANTIBYPASS"
enclave: "SEC-ENC-DMZ"
status: draft
contracts:
  - "packages/core/src/verifiers/coding-rules-bypass.ts"
  - "packages/core/src/verifiers/progressive-friction.ts"
  - "packages/core/src/init/coding-rules-templates.ts"
  - "scripts/guard-branch.cjs"
citations:
  - id: UC-075-POLYGLOT-CODING-RULES-ANTIBYPASS
    digest: sha256:4a6cd0f32aa6a0a6efd0422b1bbad8863ca8171eb98d04878e9340e9db2b109b
    comment: Citación de use-case (Polyglot Coding Rules Anti-Bypass Detection and Protected Path Alignment in Verify Friction)
  - id: FR-075-POLYGLOT-CODING-RULES-ANTIBYPASS-001
    digest: sha256:aef4160179f579c3301a3196d87f208f38dcebf0cd0e802dcb7dea2fd3fbbe82
    comment: Requerimiento derivado de UC-075-POLYGLOT-CODING-RULES-ANTIBYPASS
  - id: CMP-075-POLYGLOT-CODING-RULES-ANTIBYPASS
    digest: sha256:fefd77038d322c831fa52ed4225485de6cc4553bf37f36196808e5db4a7a6fd0
    comment: Componente arquitectónico de detección anti-bypass políglota y alineación de rutas protegidas
---

# Diseño Técnico: CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El componente `CMP-075-POLYGLOT-CODING-RULES-ANTIBYPASS` opera en `SEC-ENC-DMZ` dentro de `@aisdlc/core` siguiendo **Modular & Hexagonal Architecture (Ports & Adapters)** y **Simplicity First (YAGNI)**:

1. **Recorrido Seguro y Directorios Excluidos Unificados (`packages/core/src/verifiers/coding-rules-bypass.ts`)**:
   - Se elimina `IGNORED_DIRS` local y se importa `POLYGLOT_EXCLUDED_DIR_SET` desde `./polyglot-registry.js`.
   - `walkFiles(dir, rootDir, out)` verifica `if (entry.isSymbolicLink()) continue;` antes de evaluar `entry.isDirectory()` o `entry.isFile()`, evitando bucles de enlaces simbólicos y lecturas fuera de raíz.
   - `collectCodingRulesBypassViolations` verifica `fs.lstatSync` sobre las rutas de `PROTECTED_CODING_RULES_FILES` y emite `[CODING-RULES-BYPASS]` si alguna es un enlace simbólico (`isSymbolicLink()`).
2. **Registro Uniforme de Inspectores Políglotas (`StackRuleInspector`)**:
   - Se modela una tabla declarativa de inspectores por stack/familia (`dotnet`, `typescript`/`angular`, `javascript`/ESLint, `python`, `java`, `kotlin`, `rust`, `go`, `c`/`cpp`) con firma uniforme:
     - `isActive(rootDir: string): boolean`
     - `matchesFile(relPath: string): boolean`
     - `inspect(relPath: string, content: string, rootDir: string): string[]`
   - Cobertura por stack:
     - **`.NET`**: `Directory.Build.props` activo; `MSBUILD_WEAKENING` y `Directory.Build.props` anidado sin `GetPathOfFileAbove`.
     - **`TypeScript / Angular`**: `tsconfig.strict.json` activo; `tsconfig*.json` (distinto de `tsconfig.strict.json`) elimina comentarios JSONC (`//`, `/* ... */`) y resuelve la cadena `extends` (string o array `extends`, rutas relativas con protección contra ciclos) hasta `tsconfig.strict.json` (p. ej. `packages/core/tsconfig.json -> ../../tsconfig.base.json -> ./tsconfig.strict.json`), emitiendo violación solo si no alcanza `tsconfig.strict.json` o si declara `"strict": false`, `"noImplicitAny": false` o `"strictNullChecks": false`.
     - **`JavaScript / ESLint`**: `eslint.config.mjs` activo; `eslint.config.*`, `.eslintrc*` y `.eslintignore` detectando `export default []`, `export default [{}]`, `export default tseslint.config()`, `ignores: ["**/*"]` / `["**"]`, `.eslintignore` (`*`), o `"off"` / `0` en reglas críticas.
     - **`Python`**: `mypy.ini`, `ruff.toml` o `.ruff.toml` activo; `pyproject.toml`, `mypy.ini`, `ruff.toml`, `.ruff.toml` con `strict = false`, `ignore_errors = true`, `disallow_any_explicit = false`, `ignore = ["ALL"]` o `select = []`.
     - **`Java`**: `config/pmd/aisdlc-ruleset.xml` activo; `pom.xml` (`<skip>true</skip>`, `<maven.pmd.skip>true</maven.pmd.skip>`, `<failOnViolation>false</failOnViolation>`, `<showWarnings>false</showWarnings>`), `build.gradle(.kts)` (`ignoreFailures = true`) y `aisdlc-ruleset.xml` sin `<rule` o con `<exclude-pattern>.*</exclude-pattern>`.
     - **`Kotlin`**: `config/detekt/detekt.yml` o `gradle/init.d/aisdlc-strict.init.gradle.kts` activo; `detekt.yml` con `maxIssues: -1` o `> 0`, `active: false`; `build.gradle(.kts)` con `allWarningsAsErrors = false`, `allWarningsAsErrors.set(false)`, `ignoreFailures = true` o `-Werror` deshabilitado.
     - **`Rust`**: `.cargo/config.toml`, `.cargo/config` o `.clippy.toml` activo; `Cargo.toml` con `[lints.rust]` / `[workspace.lints.rust]` (`warnings = "allow"`) o `[lints.clippy]` / `[workspace.lints.clippy]` permisivo; `.cargo/config.toml` / `.cargo/config` sobrescribiendo `rustflags` / `[target.*]` sin flags estrictos o con `--cap-lints allow`; `.rs` con `#![allow(warnings)]` o `#![allow(clippy::all)]` (tolerante a espacios en blanco).
     - **`Go`**: `.golangci.yml`, `.golangci.yaml` o `.golangci.toml` activo; `disable: all`, `disable-all: true`, `default: none` sin `enable`, o ausencia de linters obligatorios.
     - **`C / C++`**: `.clang-tidy` o `cmake/AisdlcStrictCompiler.cmake` activo; `.clang-tidy` con `WarningsAsErrors: ''` / `""` o `Checks: '-*'`, y `CMakeLists.txt` raíz o `CMakeLists.txt` que declare `project(...)` sin `include(...cmake/AisdlcStrictCompiler.cmake)` (evitando falsos positivos en `add_subdirectory` como `src/CMakeLists.txt`).
3. **Alineación de Rutas Protegidas (`progressive-friction.ts`, `coding-rules-templates.ts`, `scripts/guard-branch.cjs`)**:
   - `progressive-friction.ts` importa `PROTECTED_CODING_RULES_FILES` desde `../init/coding-rules-templates.js`.
   - `PROTECTED_BYPASS_PATTERNS` añade `/^specs[\\/]privacy[\\/]/i`, `/^packages[\\/]security[\\/]/i`, `/privacy-policy\.ya?ml$/i` y `/^\.github\/CODEOWNERS$/i` para paridad exacta con `scripts/guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS`.
   - `isPathProtectedFromPatch(filePath)` normaliza la ruta (`path.posix.normalize`, eliminando `./` y `/` iniciales) y evalúa `PROTECTED_BYPASS_PATTERNS`, coincidencias insensibles a mayúsculas/minúsculas contra `PROTECTED_CODING_RULES_FILES` (`normalizedLower === ruleFileLower || normalizedLower.endsWith('/' + ruleFileLower)`) y `normalizedLower.startsWith('templates/coding-rules/')`.
   - `scripts/guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS` usan `/^\.github\/CODEOWNERS$/i` y coincidencia insensible a mayúsculas/minúsculas de `PROTECTED_CODING_RULES_FILES` sobre rutas normalizadas.

## 2. Contratos de Datos e Interfaces
- `StackRuleInspector`: `{ id: string; isActive: (rootDir: string) => boolean; matchesFile: (rel: string) => boolean; inspect: (rel: string, content: string, rootDir: string) => string[] }`
- `collectCodingRulesBypassViolations(rootDir: string): string[]` (firma pública preservada)
- `isPathProtectedFromPatch(filePath: string): boolean` (firma pública preservada, ampliada con `PROTECTED_CODING_RULES_FILES` y patrones alineados)
- `PROTECTED_BYPASS_PATTERNS: RegExp[]` (exportado en `progressive-friction.ts`, sincronizado con `scripts/guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS`)

## 3. Protocolos de Manejo de Errores y Mitigación
- **CWE-59 (Symlinks)**: `walkFiles` descarta `entry.isSymbolicLink()` antes de cualquier `readFileSync` o recursión.
- **Anti-Bypass Determinista**: Cada violación de reglas emite prefijo `[CODING-RULES-BYPASS]` y cada modificación protegida bajo `patch` emite `[ANTI-PATCH-BYPASS]`, ambos sin llamadas de red.
- **Umbrales AST (`quality-policy.yaml`)**: Cada inspector se implementa mediante funciones puras pequeñas (`<= 40` líneas, complejidad ciclomática `<= 10`, cognitiva `<= 15`).

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Sin nuevas dependencias npm. Conforme al 100% con `license-policy.yaml`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-27 | agent-system-architect | Diseño técnico formal para detección anti-bypass políglota, traversal seguro y alineación de rutas protegidas | CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS |
