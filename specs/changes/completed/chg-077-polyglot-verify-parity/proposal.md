---
id: CHG-077-POLYGLOT-VERIFY-PARITY
type: spec-change-proposal
title: Polyglot parity in verify traceability, verify quality, and test-discovery
status: applied
author: agent-system-architect
citations:
  - id: UC-077-POLYGLOT-VERIFY-PARITY
    digest: sha256:100c4ff0b98a1c535a6d0f28e8f767ed79df0c022e98e9762451ab90e78690d3
    comment: Citación de use-case (Polyglot Parity for Traceability, Quality Gate, and Test Discovery Verifiers)
  - id: FR-077-POLYGLOT-VERIFY-PARITY-001
    digest: sha256:8f5d56831ec6da1197594e324a007aae692063e882b19886ec50a3c104364098
    comment: Requerimiento derivado de UC-077-POLYGLOT-VERIFY-PARITY
---


# Propuesta de Cambio: CHG-077-POLYGLOT-VERIFY-PARITY

## 1. Motivación y Alcance
Abordar el Issue #233 bajo perfil `minor` (`1 UC-* = 1 CHG-*`) logrando paridad polyglot completa en `@aisdlc/core`:
1. **`verify traceability` (`packages/core/src/verifiers/traceability.ts`)**:
   - Reemplazar el helper hardcoded `isCodeTestFile(name)` por `isPolyglotUnitTestFile(relPath)` e `isUiTestFile(relPath)` de `./test-discovery.js` para clasificar correctamente `test_*.py`, `*Test.cs`/`*Tests.cs`, `*Test.java`/`*Tests.java`, `*Test.kt`/`*Tests.kt`, `*_test.rs`/`tests/**/*.rs` y pruebas UI en `codeTestMap` y `testCorpus` en lugar de `prodCorpus`.
   - Alinear `SOURCE_CODE_EXTS` con todas las extensiones soportadas (incluyendo `.kt`, `.mjs`, `.cjs`, `.cc`, `.cxx`, `.hpp`, `.fs`).
2. **`verify quality` (`packages/core/src/verifiers/quality-gate.ts` y `packages/core/src/init/index.ts`)**:
   - Añadir `.kt`, `.mjs`, `.cjs`, `.cc`, `.cxx`, `.hpp`, `.fs` a `DEFAULT_EXTENSIONS` y `STARTER_QUALITY_POLICY`.
   - Extender `collectFilesToScan` para descubrir layouts idiomáticos de Go (`cmd`, `internal`, `pkg`), Rust workspace (`crates`), Python (`app`, `backend`) y proyectos .NET con `.csproj` en subdirectorios de nivel 1.
3. **`test-discovery.ts` (`packages/core/src/verifiers/test-discovery.ts`)**:
   - Hacer `Expect(page|locator)` case-insensitive en `MODALITY_DRIVER_SIGNATURES.web` y añadir firmas de Playwright Java/Kotlin (`com.microsoft.playwright`, `Playwright.create`, `assertThat(page`).
   - Añadir drivers CLI de Go (`exec.Command`, `cobra`) y Rust (`assert_cmd`, `Command::cargo_bin`) a `MODALITY_DRIVER_SIGNATURES.console`.
   - Añadir `**/*_e2e_test.go`, `**/*_ui_test.go`, `**/*_e2e_test.rs`, `**/*_ui_test.rs` a `DEFAULT_UI_TEST_PATTERNS`.
   - Hacer `stripTestComments` consciente de literales de cadena (`"..."`, `'...'`, `` `...` ``) al eliminar comentarios `//` para preservar selectores XPath como `page.locator("//button[@type='submit']")`.

## 2. Dependencias Externas Evaluadas
- **Ninguna dependencia externa nueva**: toda la lógica se implementa con APIs estándar de Node.js y TypeScript cumpliendo `license-policy.yaml`.
