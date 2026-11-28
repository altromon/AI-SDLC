---
id: DSG-CHG-073-EXECUTABLE-STRICT-CODING-RULES
type: spec-design
change-id: CHG-073-EXECUTABLE-STRICT-CODING-RULES
title: "Diseño Técnico: Executable Strict Coding Rules Per Stack"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-073-EXECUTABLE-STRICT-CODING-RULES"
architecture-component: "CMP-073-EXECUTABLE-STRICT-CODING-RULES"
enclave: "SEC-ENC-DMZ"
status: draft
contracts:
  - packages/core/src/init/coding-rules-templates.ts
  - packages/core/src/verifiers/coding-rules-bypass.ts
citations:
  - id: UC-073-EXECUTABLE-STRICT-CODING-RULES
    digest: sha256:992d6af2fc6c0363ddf0214988b4d7225111f63aeb953f84af018462d34a0a2d
    comment: Citación de use-case (Reglas estrictas de codificación ejecutables y desacopladas por stack)
  - id: FR-073-EXECUTABLE-STRICT-CODING-RULES-001
    digest: sha256:a68c1e4bf44a87743f180bb3c9040d92d7cab002bbc78eb88cccb8bda0ef7747
    comment: Requerimiento derivado de UC-073-EXECUTABLE-STRICT-CODING-RULES
---

# Diseño Técnico: CHG-073-EXECUTABLE-STRICT-CODING-RULES

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El cambio actualiza los módulos de `CMP-073-EXECUTABLE-STRICT-CODING-RULES` (subcomponente de `CMP-CORE` en enclave `SEC-ENC-DMZ`) bajo Arquitectura Hexagonal (Ports & Adapters) y principio YAGNI:
- **`packages/core/src/init/coding-rules-templates.ts`**: catálogo de plantillas ejecutables, constantes protegidas (`PROTECTED_CODING_RULES_FILES`), detección de stacks a nivel de árbol completo (`detectProjectStacks`), y resolución contextual de archivos requeridos (`getCodingRulesFilesForStacks(stacks, targetDir?)` / `getRequiredCodingRulesFilesForProject(rootDir, stack)`) usada por `init`, `migrate` y `coding-rules-bypass.ts` según gestor de build (`pom.xml` vs `build.gradle*`, `CMakeLists.txt` presente o ausente).
- **`packages/core/src/init/index.ts` & `packages/core/src/migrate/service.ts` & `packages/core/src/git/hook-installer.ts`**: propagan `targetDir`/`rootDir` a `getCodingRulesFilesForStacks(stacks, targetDir)` y actualizan `PRE_COMMIT_SCRIPT` con `ruff.toml` y `mypy.ini`.
- **`packages/core/src/verifiers/coding-rules-bypass.ts`**: verificador de presencia (`[CODING-RULES-MISSING]`) y anti-debilitamiento (`[CODING-RULES-BYPASS]`) adaptado a Maven (`pom.xml` anti-bypass), Gradle, TypeScript/Angular, .NET y Python (`pyproject.toml`/`mypy.ini`).
- **Raíz del monorepo `AI-SDLC`**: `package.json`, `tsconfig.base.json`, `tsconfig.json` y `eslint.config.mjs` (con `ignores` para `dist/`, `coverage/`, `examples/`, `templates/`, `scripts/*.cjs`) conectada a `tsconfig.strict.json`.
- **Relación con `FR-069`**: `CHG-073` refina las reglas de `FR-069` para `javascript` (sin `tsconfig.strict.json`), Maven `pom.xml` (sin `gradle/init.d/...`) y C puro sin `CMakeLists.txt` (sin `cmake/AisdlcStrictCompiler.cmake`), actualizando las pruebas unitarias afectadas (`coding-rules-bypass.spec.ts`, `language-agnostic-coding-rules.spec.ts`, `coding-rules-templates.spec.ts`).

## 2. Contratos de Datos e Interfaces
1. **Python (`TSK-073-01`)**:
   - `VALID_CODING_RULE_STACKS` añade `'python'`; `STACK_ALIASES` añade `'py': 'python'`.
   - `PROTECTED_CODING_RULES_FILES` (y su lista embebida en `STARTER_GUARD_BRANCH_CJS`) añade `'ruff.toml'` y `'mypy.ini'`.
   - `PYTHON_RUFF_TOML` y `PYTHON_MYPY_INI` (exportados): configuración estricta autónoma (`disallow_any_explicit = true`, `strict = true`, sin exclusión de `tests/`).
   - `detectProjectStacks` detecta `'python'` ante `pyproject.toml`, `requirements.txt`, `setup.py` o archivos `*.py`.
2. **JS / TS / Angular (`TSK-073-02`)**:
   - `JS_ESLINT_CONFIG_MJS`: flat config de ESLint 9 nativo con reglas core (cero imports externos como `typescript-eslint` o `@eslint/js`). `STACK_FILE_MAP.javascript` contiene únicamente `eslint.config.mjs` (sin `tsconfig.strict.json`).
   - `TS_STRICT_TSCONFIG`: `tsconfig.strict.json` puro de TypeScript sin `angularCompilerOptions`.
   - `ANGULAR_STRICT_TSCONFIG`: `tsconfig.strict.json` con `angularCompilerOptions`.
   - **Precedencia en monorepos mixtos**: `getCodingRulesFilesForStacks` ordena por precedencia (`angular` > `typescript` > `javascript`) antes de deduplicar por `relPath`, garantizando que `TS_ESLINT_CONFIG_MJS` prevalezca sobre `JS_ESLINT_CONFIG_MJS` y `ANGULAR_STRICT_TSCONFIG` sobre `TS_STRICT_TSCONFIG`.
   - `getReferenceCodingRulesTemplates()` incluye las variantes separadas (`javascript`, `typescript`, `angular`, `python`).
   - En `AI-SDLC`: `typescript-eslint` en `package.json` (`devDependencies`), `tsconfig.base.json`/`tsconfig.json` extendiendo `tsconfig.strict.json` de modo que `tsc` y `eslint` pasen (con `ignores` adecuados en `eslint.config.mjs`).
3. **JVM Maven vs Gradle y Go v2 (`TSK-073-03`)**:
   - `GO_GOLANGCI_YML`: actualizado al esquema `golangci-lint` v2 (`version: "2"` en raíz, `linters.settings:` en lugar de `linters-settings:`, y `forbidigo` con `pattern:` en lugar de `p:`).
   - Para `java`: si el proyecto usa Maven (`pom.xml` presente y ausencia de `build.gradle` / `build.gradle.kts`), los archivos requeridos son `config/pmd/aisdlc-ruleset.xml` (sin `gradle/init.d/aisdlc-strict.init.gradle.kts`), y `coding-rules-bypass.ts` verifica `[CODING-RULES-BYPASS]` en `pom.xml` ante desactivaciones explícitas de compilador/PMD (`<skip>true</skip>`, `<failOnViolation>false</failOnViolation>`, `<showWarnings>false</showWarnings>`), evitando falsos positivos en POMs mínimos o submódulos. Si usa Gradle, mantiene `gradle/init.d/aisdlc-strict.init.gradle.kts`.
4. **Detección C vs C++ y CMake condicional (`TSK-073-04`)**:
   - `detectProjectStacks(targetDir, maxDepth = 3)` acumula todos los archivos del árbol escaneado y ejecuta `detectCAndCppStacks(allFileNames, detected)` una sola vez sobre el conjunto completo del árbol.
   - Si hay archivos `.c` y ningún `.cpp`/`.cc`/`.cxx`/`.hpp` en todo el árbol, clasifica exclusivamente como `'c'` (nunca `'cpp'`).
   - `cmake/AisdlcStrictCompiler.cmake` solo es requerido para `c`/`cpp` cuando `CMakeLists.txt` está presente en el árbol del proyecto.

## 3. Protocolos de Manejo de Errores y Mitigación
- Errores de lectura de directorio en `scanDirectoryEntries` siguen siendo ignorados de forma segura (sin lanzar excepciones no controladas sobre subdirectorios inaccesibles).
- Violaciones de archivos faltantes o debilitados en `collectCodingRulesBypassViolations` emiten prefijos deterministas `[CODING-RULES-MISSING]` y `[CODING-RULES-BYPASS]`.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
- `typescript-eslint` (MIT) cumple con `license-policy.yaml`. No se introducen dependencias copyleft (`GPL`/`AGPL`) ni comerciales restringidas (`BSL`/`SSPL`).

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-26 | agent-system-architect | Diseño técnico detallado para CHG-073 (Issue #230) | CHG-073-EXECUTABLE-STRICT-CODING-RULES |
