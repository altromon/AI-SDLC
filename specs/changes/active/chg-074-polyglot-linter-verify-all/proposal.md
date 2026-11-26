---
id: CHG-074-POLYGLOT-LINTER-VERIFY-ALL
type: spec-change-proposal
title: "Execute Polyglot Linters and Compilers in Verify All"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-074-POLYGLOT-LINTER-VERIFY-ALL
    digest: sha256:017cb92741768ff7dc91c0df5f5660d036c132db7bbf130f27c5680f962b9f94
    comment: Citación de use-case (Polyglot Native Linter and Compiler Execution in aisdlc verify all)
  - id: FR-074-POLYGLOT-LINTER-VERIFY-ALL-001
    digest: sha256:a9de1c1763035b78efcaae191a1afb49d5fdff16b3fc9de6e87ab4606748a8bf
    comment: Requerimiento derivado de UC-074-POLYGLOT-LINTER-VERIFY-ALL
---

# Propuesta de Cambio: CHG-074-POLYGLOT-LINTER-VERIFY-ALL

## 1. Motivación y Alcance
Actualmente `aisdlc verify all` evalúa los 12 gates de calidad, trazabilidad, gobernanza, seguridad y privacidad de AI-SDLC, pero no invoca los linters y compiladores nativos estrictos de cada stack tecnológico presente en el repositorio (`typescript`, `javascript`, `angular`, `python`, `dotnet`, `java`, `kotlin`, `rust`, `go`, `c`, `cpp`).

Este cambio (`CHG-074`, perfil `minor`) introduce:
1. Extensión de `InstallableTool` y `TOOL_INSTALL_ALLOWLIST` en `packages/core/src/verifiers/tool-installer.ts` para cubrir `tsc`, `mypy`, `golangci-lint`, `clippy`, `pmd`, `detekt`, `mvn`, `gradle` y `clang-tidy` (reutilizando `eslint`, `ruff` y `dotnet`).
2. Nuevo motor `packages/core/src/verifiers/polyglot-linter-runner.ts` (`runPolyglotLinters(options)`) que detecta los stacks del proyecto, verifica disponibilidad vía `ensureToolAvailable` (prompt interactivo en local; omisión con warning en CI/non-TTY) y ejecuta las herramientas instaladas con `shell: false` y diagnósticos redactados.
3. Integración de `runVerifyPolyglotLintersAsync` en `collectAllGatesAsync` / `runVerifyAllAsync` y `VERIFY_ALL_GATES_LIST` dentro de `packages/cli/src/commands/verify.ts`, evitando recursión infinita durante pruebas unitarias.

## 2. Dependencias Externas Evaluadas
- No se incorporan nuevas dependencias de runtime ni de desarrollo en `package.json`. Todos los linters y compiladores nativos se invocan opcionalmente como binarios del sistema resueltos de forma segura por `tool-installer.ts`.
