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
    digest: sha256:7a29bf6021956f2e6338e9e24c8714518154df461e48aec22c1bf925ec7559a2
    comment: Citación de use-case (Polyglot Parity for Traceability, Quality Gate, and Test Discovery Verifiers)
  - id: FR-077-POLYGLOT-VERIFY-PARITY-001
    digest: sha256:ad83e5210bf1d8e9134ff861a9f3542f510c82d0ded2ee7887769bb392fba2ea
    comment: Requerimiento derivado de UC-077-POLYGLOT-VERIFY-PARITY
  - id: CMP-077-POLYGLOT-VERIFY-PARITY
    digest: sha256:2b664c0271ad4a984f1837898093a4d9439a3167e139b223c4db1e7b4340a565
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
  - Escanea línea a línea (o carácter a carácter mediante helper conciso) respetando literales de cadena (`"..."`, `'...'`, `` `...` `` con secuencias de escape `\\`) al eliminar comentarios `// ...` y `# ...`, además de bloques `/* ... */` y `<!-- ... -->` fuera de cadenas, garantizando que selectores XPath como `page.locator("//button[@type='submit']")` no se trunquen.

### 2.2 `traceability.ts` (`packages/core/src/verifiers/traceability.ts`)
- **`SOURCE_CODE_EXTS`**: `['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.java', '.kt', '.cs', '.fs', '.rs', '.c', '.cpp', '.cc', '.cxx', '.hpp']`.
- **`scanCodeTestFiles` & `collectCodeAndTestCorpora`**:
  - Reemplazan el helper local `isCodeTestFile(name)` por `isPolyglotUnitTestFile(relPath) || isUiTestFile(relPath)` importados desde `./test-discovery.js`, calculando `relPath` relativo a `rootDir` con separadores `/`.
  - `isProductionSourceFile(relPath)` excluye `isPolyglotUnitTestFile(relPath)`, `isUiTestFile(relPath)` y `.d.ts`, y valida extensión contra `SOURCE_CODE_EXTS`.

### 2.3 `quality-gate.ts` & `init/index.ts`
- **`DEFAULT_EXTENSIONS`** (`packages/core/src/verifiers/quality-gate.ts`) y **`STARTER_QUALITY_POLICY`** (`packages/core/src/init/index.ts`):
  - Añaden `.kt`, `.mjs`, `.cjs`, `.cc`, `.cxx`, `.hpp`, `.fs` junto a las extensiones existentes.
- **`collectFilesToScan(rootDir: string, policy: QualityPolicy): string[]`** (`packages/core/src/verifiers/quality-gate.ts`):
  - Mantiene el escaneo de `policy.target_directories` y `monorepoContainers` (`packages`, `apps`, `libs`, `modules`, `services`).
  - Añade descubrimiento idiomático multi-lenguaje:
    - Directorios directos de Go (`cmd`, `internal`, `pkg`) y Python (`app`, `backend`) mediante `scanDirectTarget`.
    - Contenedor workspace de Rust (`crates`) escaneando sus subdirectorios (`src` o raíz del crate) respetando `policy.exclude_patterns`.
    - Subdirectorios .NET de nivel 1 bajo `rootDir` que contengan al menos un archivo `.csproj` (excluyendo `policy.exclude_patterns`).
  - Mantiene el filtro final `!isPolyglotUnitTestFile(rel, policy.test_patterns)`.

## 3. Protocolos de Manejo de Errores y Mitigación
- Errores de lectura de directorios (`fs.readdirSync` / `fs.statSync`) en escaneos idiomáticos se manejan de forma segura sin abortar el análisis del resto del repositorio.
- Los patrones regex de `MODALITY_DRIVER_SIGNATURES` evitan cuantificadores anidados para prevenir ReDoS.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
- Cero dependencias nuevas; 100% TypeScript sobre Node.js estándar.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-27 | agent-system-architect | Diseño técnico formal para CHG-077-POLYGLOT-VERIFY-PARITY (Issue #233) | CHG-077-POLYGLOT-VERIFY-PARITY |
