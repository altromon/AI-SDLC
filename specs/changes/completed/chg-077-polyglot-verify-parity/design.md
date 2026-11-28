---
id: DSG-CHG-077-POLYGLOT-VERIFY-PARITY
type: spec-design
change-id: CHG-077-POLYGLOT-VERIFY-PARITY
title: "Diseño Técnico: Polyglot parity in verify traceability, verify quality, and test-discovery"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-077-POLYGLOT-VERIFY-PARITY"
architecture-component: "CMP-077-POLYGLOT-VERIFY-PARITY"
enclave: "SEC-ENC-DMZ"
status: draft
contracts:
  - isPolyglotUnitTestFile
  - isUiTestFile
  - scanCodeTestFiles
  - collectCodeAndTestCorpora
  - collectFilesToScan
  - DEFAULT_EXTENSIONS
  - STARTER_QUALITY_POLICY
  - DEFAULT_UI_TEST_PATTERNS
  - MODALITY_DRIVER_SIGNATURES
  - stripTestComments
citations:
  - id: UC-077-POLYGLOT-VERIFY-PARITY
    digest: sha256:100c4ff0b98a1c535a6d0f28e8f767ed79df0c022e98e9762451ab90e78690d3
    comment: Citación de use-case (Polyglot Parity for Traceability, Quality Gate, and Test Discovery Verifiers)
  - id: FR-077-POLYGLOT-VERIFY-PARITY-001
    digest: sha256:0ede9c8f3dd03ad248b9bbf35d02455e25fdb9b6afc023e88e1d3b0e7c0480b0
    comment: Requerimiento derivado de UC-077-POLYGLOT-VERIFY-PARITY
  - id: CMP-077-POLYGLOT-VERIFY-PARITY
    digest: sha256:095663f43255dfec87d96debd6dc46e0adbc05d0dd9b0a942980dbd03cb0c03e
    comment: Componente arquitectónico que materializa la paridad polyglot en traceability, quality-gate y test-discovery
---

# Diseño Técnico: CHG-077-POLYGLOT-VERIFY-PARITY

## 1. Mapeo Arquitectónico y Enclave Zero Trust
Materializa `CMP-077-POLYGLOT-VERIFY-PARITY` (enclave local `SEC-ENC-DMZ`) sobre `@aisdlc/core` sin dependencias externas nuevas ni modificaciones a `schemas/`. Todas las funciones nuevas o modificadas cumplen `Lines <= 40`, `Cyclomatic <= 10`, `Cognitive <= 15` y `Maintainability Index >= 50`.

## 2. Contratos de Datos e Interfaces

### 2.1 `test-discovery.ts` (`packages/core/src/verifiers/test-discovery.ts`)
- **`DEFAULT_UI_TEST_PATTERNS`**: añade `**/*_e2e_test.go`, `**/*_ui_test.go`, `**/*_e2e_test.rs`, `**/*_ui_test.rs`.
- **`MODALITY_DRIVER_SIGNATURES.web`**:
  - Actualiza la detección de `Expect(page|locator)` para que sea case-insensitive (soportando C# `Expect(page)` / `Expect(locator)` además de `Expect(Page)` / `Expect(Locator)`).
  - Añade firmas oficiales de Playwright Java/Kotlin: `com\.microsoft\.playwright`, `Playwright\.create`, `assertThat\(\s*page\b`.
- **`MODALITY_DRIVER_SIGNATURES.console`**:
  - Añade drivers CLI de Go (`exec\.Command`, `\bcobra\b`) y Rust (`\bassert_cmd\b`, `Command::cargo_bin`).
- **`stripTestComments(content: string): string`**:
  - Utiliza un escáner de contenido completo (`full-content`) consciente de literales de cadena (`"..."`, `'...'`, y `` `...` `` multilínea con secuencias de escape `\\`) al eliminar comentarios `// ...` y `# ...`, además de bloques `/* ... */` y `<!-- ... -->` fuera de cadenas, garantizando que selectores XPath como `page.locator("//button[@type='submit']")` y template literals multilínea no se trunquen.

### 2.2 `traceability.ts` (`packages/core/src/verifiers/traceability.ts`)
- **`SOURCE_CODE_EXTS`**: `['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.java', '.kt', '.cs', '.fs', '.rs', '.c', '.cpp', '.cc', '.cxx', '.hpp']`.
- **`SKIPPED_DIR_NAMES`**: incorpora `.venv`, `venv`, `__pycache__` y `.pytest_cache` junto a los directorios omitidos existentes.
- **`scanCodeTestFiles` & `collectCodeAndTestCorpora`**:
  - Reemplazan el helper local `isCodeTestFile(name)` por `isPolyglotUnitTestFile(relPath) || (SOURCE_CODE_EXTS.includes(path.extname(relPath).toLowerCase()) && isUiTestFile(relPath))` importados desde `./test-discovery.js`, calculando `relPath` relativo a `rootDir` con separadores `/`.
  - Gating de `isUiTestFile(relPath)` sobre `SOURCE_CODE_EXTS` evita que archivos binarios o fixtures (como `.png` o `.json`) bajo `tests/e2e/**` contaminen `testCorpus` o `codeTestMap`.
  - `isProductionSourceFile(relPath)` excluye `isPolyglotUnitTestFile(relPath)`, `isUiTestFile(relPath)` y `.d.ts`, y valida extensión contra `SOURCE_CODE_EXTS`.

### 2.3 `quality-gate.ts` & `init/index.ts`
- **`DEFAULT_EXTENSIONS`** (`packages/core/src/verifiers/quality-gate.ts`) y **`STARTER_QUALITY_POLICY`** (`packages/core/src/init/index.ts`):
  - Añaden `.kt`, `.mjs`, `.cjs`, `.cc`, `.cxx`, `.hpp` junto a las extensiones existentes (difiriendo `.fs` de `quality-gate.ts` / `init/index.ts`, mientras `traceability.ts` conserva `.fs` en `SOURCE_CODE_EXTS` para coincidencia textual).
- **`collectFilesToScan(rootDir: string, policy: QualityPolicy): string[]`** (`packages/core/src/verifiers/quality-gate.ts`):
  - Mantiene el escaneo de `policy.target_directories` y `monorepoContainers` (`packages`, `apps`, `libs`, `modules`, `services`).
  - Añade descubrimiento idiomático multi-lenguaje:
    - Directorios directos de Go (`cmd`, `internal`, `pkg`) y Python (`app`, `backend`) mediante `scanDirectTarget`.
    - Contenedor workspace de Rust (`crates`) escaneando sus subdirectorios (`src` o raíz del crate) respetando `policy.exclude_patterns`.
    - Subdirectorios .NET de nivel 1 bajo `rootDir` que contengan al menos un archivo `.csproj` (excluyendo `policy.exclude_patterns`).
  - `walkDir` y los escáneres de nivel 1 (`crates` y `.csproj`) aplican contención de enlaces simbólicos omitiendo symlinks (`fs.lstatSync(...).isSymbolicLink()`) y validando `fs.realpathSync` dentro de `fs.realpathSync(rootDir)`.
  - Mantiene el filtro final excluyendo tanto unit tests como UI tests: `!isPolyglotUnitTestFile(rel, policy.test_patterns) && !isUiTestFile(rel, policy.ui_test_patterns)`.

## 3. Protocolos de Manejo de Errores y Mitigación
- **Contención de enlaces simbólicos**: `walkDir` y los escáneres de nivel 1 (`crates`, `.csproj`) en `quality-gate.ts` omiten enlaces simbólicos mediante `fs.lstatSync` y verifican mediante `fs.realpathSync` que cualquier directorio o archivo resuelto permanezca contenido dentro de `fs.realpathSync(rootDir)`, previniendo escapes fuera del repositorio y bucles infinitos.
- Errores de lectura o inspección (`fs.readdirSync` / `fs.lstatSync` / `fs.realpathSync` / `fs.statSync`) en escaneos idiomáticos se manejan de forma segura sin abortar el análisis del resto del repositorio.
- Los patrones regex de `MODALITY_DRIVER_SIGNATURES` evitan cuantificadores anidados para prevenir ReDoS.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
- Cero dependencias nuevas; 100% TypeScript sobre Node.js estándar.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-27 | agent-system-architect | Diseño técnico formal para CHG-077-POLYGLOT-VERIFY-PARITY (Issue #233) | CHG-077-POLYGLOT-VERIFY-PARITY |
