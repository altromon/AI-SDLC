---
id: CHG-063-UI-E2E-MODALITY-GATE
type: spec-change-proposal
title: "Deterministic Polyglot UI and E2E Modality Test Gate"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-063-UI-E2E-MODALITY-GATE
    digest: sha256:a42c27eb12d00d9219500ca5a5528568ac67f2bc9b48b64a7ece91b2ffd4028f
    comment: Caso de uso para verificación determinista de pruebas UI y E2E por modalidad (Web Playwright, Desktop FlaUI, Consola CLI/TUI y Mobile) en el Quality Gate
  - id: FR-063-UI-E2E-MODALITY-GATE-001
    digest: sha256:c1339af72bbfc9c3fb2c0ac0ea439706f77f0e384a0b62ebd3307344cc8d3f71
    comment: Requisito funcional del gate determinista políglota de pruebas UI y E2E en las 4 modalidades
---

# Propuesta de Cambio: CHG-063-UI-E2E-MODALITY-GATE

## 1. Motivación y Alcance
Endurecer el motor del Quality Gate (`packages/core/src/verifiers/quality-gate.ts` y `packages/core/src/verifiers/test-discovery.ts`) en `@aisdlc/core` para garantizar que ningún componente de interfaz de usuario ni comando interactivo pase la puerta de calidad sin pruebas E2E/UI auténticas de su modalidad correspondiente:

1. **Activación por defecto en memoria (`require_ui_component_tests: true`)**:
   - Inicializar `require_ui_component_tests: true` dentro de `createDefaultQualityPolicy()` para que el Quality Gate audite componentes UI/E2E por defecto incluso cuando `quality-policy.yaml` omita la sección `test_enforcement` (permitiendo desactivación explícita mediante `require_ui_component_tests: false` o `options.requireUiComponentTests: false`).
2. **Descubrimiento políglota en las 4 modalidades (`web`, `desktop`, `console`, `mobile`)**:
   - Ampliar `UI_COMPONENT_EXTENSIONS` (`.razor`, `.cshtml`, `.xaml`, `.axaml`, `.vue`, `.svelte`, `.kt`, `.swift`, `.dart` además de extensiones base), `DEFAULT_UI_COMPONENT_PATTERNS` y `DEFAULT_UI_TEST_PATTERNS` para cubrir componentes y suites de pruebas UI/E2E en **Web**, **Desktop**, **Consola CLI/TUI** y **Mobile**.
   - Normalizar sufijos compuestos (`.xaml.cs`, `.axaml.cs`, `.component.ts`, `.razor`, `.cshtml`, `.xaml`, `.axaml`, etc.) en `extractUiComponentName(relPath)`.
3. **Verificación determinista de firmas de drivers E2E por modalidad (`detectUiComponentModality` y `hasModalityDriverSignature`)**:
   - Verificar estáticamente que cada prueba UI/E2E candidata no solo mencione el nombre del componente fuera de comentarios, sino que contenga al menos una firma determinista del driver o arnés E2E real de la modalidad del componente (**Playwright/Cypress/DOM** en `web`, **FlaUI/WinAppDriver/Avalonia** en `desktop`, **spawn/execFile/Spectre.Console/CliRunner/pty** en `console`, **WidgetTester/XCUIApplication/Espresso/Compose/Appium/Maestro/Detox** en `mobile`), rechazando pruebas stub.

## 2. Dependencias Externas Evaluadas
- **Cero dependencias externas nuevas**: La implementación utiliza exclusivamente módulos nativos de Node.js (`fs`, `path`) y análisis estático determinista en `@aisdlc/core`, manteniendo cumplimiento al 100% con `license-policy.yaml`.
