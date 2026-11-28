---
id: DSG-CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
type: spec-design
change-id: CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
title: "Diseño Técnico: Polyglot Registry and BDD Support for Java, Kotlin, C, and C++"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP"
architecture-component: "CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP"
enclave: "SEC-ENC-DMZ"
status: draft
contracts:
  - POLYGLOT_LANGUAGE_REGISTRY
  - POLYGLOT_EXCLUDED_DIRS
  - PolyglotLanguageSpec
  - GherkinScaffoldLanguage
  - GHERKIN_GENERATOR_SPECS
  - normalizeScaffoldLanguage
  - normalizeScaffoldLanguages
  - detectDefaultScaffoldLanguage
citations:
  - id: UC-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
    digest: sha256:62eb51c0d1be1e83dff467acc98e0a3f0f65f5992f68f1ca5c9e1419971d834b
    comment: Citación de use-case (Registro políglota unificado y soporte BDD para JVM (Java/Kotlin) y C/C++)
  - id: FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001
    digest: sha256:eeb3c48e0c8fc93472df8085f12ce9113853975432db25fcfb28253bccb65341
    comment: Requerimiento derivado de UC-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
  - id: CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
    digest: sha256:567916992ce77aea52dcc8f0f9d5a439a8242ccfd1efe387bc7eccd73d8753a2
    comment: Componente arquitectónico que materializa el registro políglota unificado y el soporte BDD para Java, Kotlin, C y C++
---

# Diseño Técnico: CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El cambio materializa `CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP` en `@aisdlc/core` (`packages/core/src/verifiers/polyglot-registry.ts` y consumidores) y `@aisdlc/cli` (`packages/cli/src/commands/check.ts`), operando en el enclave local `SEC-ENC-DMZ` sin cambios en `schemas/` ni dependencias de ejecución externas. Todas las funciones nuevas o modificadas cumplen `Lines <= 40`, `Cyclomatic <= 10` y `Cognitive <= 15`.

## 2. Contratos de Datos e Interfaces

### 2.1 `POLYGLOT_LANGUAGE_REGISTRY` y `POLYGLOT_EXCLUDED_DIRS` (`packages/core/src/verifiers/polyglot-registry.ts`)
- Exportado desde `packages/core/src/index.ts` (`@aisdlc/core`).
- `POLYGLOT_EXCLUDED_DIRS`: `readonly string[]` + `POLYGLOT_EXCLUDED_DIR_SET: ReadonlySet<string>` con los 15 directorios unificados:
  `node_modules`, `.git`, `bin`, `obj`, `dist`, `build`, `target`, `.venv`, `venv`, `__pycache__`, `.pytest_cache`, `reports`, `templates`, `examples`, `coverage`.
- `PolyglotLanguageSpec` y `POLYGLOT_LANGUAGE_REGISTRY: Readonly<Record<GherkinScaffoldLanguage, PolyglotLanguageSpec>>`:
  Cada entrada define:
  - `lang: GherkinScaffoldLanguage` (`'ts' | 'py' | 'go' | 'rs' | 'cs' | 'java' | 'kt' | 'c' | 'cpp'`)
  - `aliases: readonly string[]` (ej. `['kotlin']` para `'kt'`)
  - `sourceExtensions: readonly string[]` (ej. `['.java']`, `['.kt', '.kts']`, `['.c', '.h']`, `['.cpp', '.cc', '.cxx', '.hpp']`, `['.cs']`, `['.go']`, `['.rs']`, `['.py']`, `['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']`)
  - `primaryManifests: readonly string[]` (ej. `pyproject.toml` para `py`; `go.mod` para `go`; `Cargo.toml` para `rs`; `.csproj`/`.sln`/`.slnx` para `cs`; `pom.xml`, `build.gradle` para `java`; `build.gradle.kts` para `kt`/`java` según presencia de archivos `.kt` vs `.java`; `CMakeLists.txt` para `cpp`/`c` según presencia de `.cpp`/`.cc`/`.cxx`/`.hpp` vs `.c`; `tsconfig.json`, `package.json` para `ts`)
  - `auxiliaryManifests: readonly string[]` (ej. `requirements.txt`, `setup.py` para `py`)
  - `codingRuleStacks: readonly CodingRuleStack[]`
- Helpers puros exportados:
  - `normalizeScaffoldLanguage(raw: unknown): GherkinScaffoldLanguage | null` (normaliza `'kotlin'` → `'kt'` y valida contra el registro).
  - `buildExtToLangMap(): Readonly<Record<string, GherkinScaffoldLanguage>>` para `gherkin-language-resolver.ts`.

### 2.2 `GherkinScaffoldLanguage` y `GHERKIN_GENERATOR_SPECS` (`types/index.ts`, `gherkin-scaffold.ts`, `gherkin.ts`)
- `GherkinScaffoldLanguage = 'ts' | 'py' | 'go' | 'rs' | 'cs' | 'java' | 'kt' | 'c' | 'cpp'`.
- Nuevas entradas en `GHERKIN_GENERATOR_SPECS` (todas con `emitsSourceStdout: false` para emisión determinista `RED`):
  - `java`: Cucumber-JVM `*Steps.java`, `io.cucumber:cucumber-java`, licencia `'MIT'`, clase `public class <FeaturePascalStem>Steps`.
  - `kt`: Cucumber-JVM/Kotlin `*Steps.kt`, `io.cucumber:cucumber-java`, licencia `'MIT'`, clase `class <FeaturePascalStem>Steps`; `renderKtFallback` DEBE escapar `$` como `\$` (además de `\` y `"`) en literales de cadena Kotlin para prevenir interpolación de cadenas (`CWE-94`).
  - `c`: `*_steps.c`, licencia `'MIT'`, funciones `void step_<feature_snake>_<idx>(void)` con fallo `RED` explícito (`fprintf(stderr, ...) + abort()` / `assert(0)`).
  - `cpp`: Catch2 BDD `*_steps.cpp`, licencia `'BSL-1.0'`, `SCENARIO(...)` / `FAIL("RED: Step not implemented: ...")`.
- `normalizeScaffoldLanguages` delega en `normalizeScaffoldLanguage` para soportar el alias `'kotlin'` → `'kt'`.
- `getPresentStepLanguages` en `gherkin.ts` itera sobre `GHERKIN_GENERATOR_SPECS`, cubriendo automáticamente `java`, `kt`, `c` y `cpp`.

### 2.3 Consumidores en `@aisdlc/core`
- `packages/core/src/verifiers/gherkin-language-resolver.ts`: reemplaza `EXT_TO_LANG` y `EXCLUDED_SCAN_DIRS` locales por `buildExtToLangMap()` y `POLYGLOT_EXCLUDED_DIR_SET` (más `'tests'` para escaneo de código fuente).
- `packages/core/src/verifiers/test-discovery.ts`: reutiliza `POLYGLOT_EXCLUDED_DIRS` y añade patrones de pruebas unitarias C/C++ (`**/*Test.c`, `**/*_test.c`, `**/*Test.cpp`, `**/*_test.cpp`) junto a los existentes de Java/Kotlin/C#/Go/Rust/Python/TS.
- `packages/core/src/init/coding-rules-templates.ts`: deriva/valida stacks desde `POLYGLOT_LANGUAGE_REGISTRY` manteniendo paridad con `VALID_CODING_RULE_STACKS`.

### 2.4 Detección de Stack en `@aisdlc/cli` (`packages/cli/src/commands/check.ts`)
- `normalizeScaffoldLanguage` y `SKIP_MANIFEST_DIRS` se importan/derivan desde `@aisdlc/core` (`normalizeScaffoldLanguage`, `POLYGLOT_EXCLUDED_DIR_SET`).
- `detectDefaultScaffoldLanguage(rootDir)` escanea `collectManifestDirs(rootDir, 3)` en dos pasadas:
  1. Primero busca **manifiestos primarios** (`primaryManifests`) preservando el orden de precedencia retrocompatible (`pyproject.toml` → `py` antes de `go.mod` → `go`, `Cargo.toml` → `rs`, `*.csproj`/`*.sln`/`*.slnx` → `cs`, `pom.xml`/`build.gradle` → `java`, `build.gradle.kts`, `CMakeLists.txt`, `tsconfig.json`/`package.json` → `ts`) en todo el árbol acotado (incluyendo `src/`), de modo que `check-helpers.spec.ts` sea 100% retrocompatible.
     - Desambiguación de `CMakeLists.txt`: resuelve `'cpp'` si existen archivos `.cpp`/`.cc`/`.cxx`/`.hpp` en el directorio o subárbol inmediato (en coherencia con `coding-rules-templates.ts`), o `'c'` si solo existen archivos `.c`/`.h`.
     - Desambiguación de `build.gradle.kts`: resuelve `'kt'` si existen archivos `.kt`/`.kts` (excluyendo `build.gradle.kts`) o por defecto `'kt'`, y `'java'` si solo existen archivos `.java`.
  2. Solo si no existe ningún manifiesto primario en todo el árbol acotado, recurre a **manifiestos auxiliares** (`auxiliaryManifests`, p. ej. `requirements.txt` o `setup.py` en raíz).
  - Resultado garantizado: un repositorio con `requirements.txt` en raíz y `src/App/App.csproj` resuelve `'cs'`, nunca `'py'`.

## 3. Protocolos de Manejo de Errores y Mitigación
- Identificadores desconocidos en `normalizeScaffoldLanguage` / `normalizeScaffoldLanguages` retornan `null` / `{ valid: false, langs: [] }`.
- Stems de `.feature` con guiones, puntuación o dígitos iniciales se sanean mediante `featurePascalStem` y `featureSnakeStem` antes de emitir clases Java/Kotlin o símbolos C/C++.
- En `renderKtFallback`, todo `$` en el texto del paso o en mensajes de error se escapa como `\$` para evitar interpolación de cadenas en Kotlin (`CWE-94`).

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
- `io.cucumber:cucumber-java`: `MIT` (permitida en `permissive_free`).
- `Catch2`: `BSL-1.0` (Boost Software License 1.0, licencia permisiva libre; no confundir con `BSL-1.1` de `commercial_acquisition_required`). Como parte de `TSK-072-01`, `BSL-1.0` se registra explícitamente en `permissive_free.spdx_identifiers` en `license-policy.yaml` y `DEFAULT_PERMITTED` en `packages/core/src/verifiers/licenses.ts`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-26 | agent-system-architect | Diseño técnico completo para `POLYGLOT_LANGUAGE_REGISTRY`, `POLYGLOT_EXCLUDED_DIRS`, soporte BDD `java`/`kt`/`c`/`cpp`, alias `kotlin` y precedencia de manifiestos | CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP |
