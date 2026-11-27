---
id: CHG-073-EXECUTABLE-STRICT-CODING-RULES
type: spec-change-proposal
title: "Executable Strict Coding Rules Per Stack"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-073-EXECUTABLE-STRICT-CODING-RULES
    digest: sha256:82750758420ddcc9c260626666d11c1c696d92a14774da4ecec6ef2bdb8121f4
    comment: Citación de use-case (Reglas estrictas de codificación ejecutables y desacopladas por stack)
  - id: FR-073-EXECUTABLE-STRICT-CODING-RULES-001
    digest: sha256:53e519f7e2ca3193c25cba54a72714f6e74c410f140982f9d755641c8812b575
    comment: Requerimiento derivado de UC-073-EXECUTABLE-STRICT-CODING-RULES
---

# Propuesta de Cambio: CHG-073-EXECUTABLE-STRICT-CODING-RULES

## 1. Motivación y Alcance
Resolver la Issue #230 haciendo que las plantillas de reglas estrictas de codificación, la detección de stacks y la verificación anti-bypass en `@aisdlc/core` (`coding-rules-templates.ts` y `coding-rules-bypass.ts`) sean directamente ejecutables por las herramientas nativas de cada stack y libres de falsos acoplamientos:
1. Añadir el stack `python` (alias `py`) con `ruff.toml` y `mypy.ini` autónomos y estrictos.
2. Separar `javascript` (flat config nativo sin `typescript-eslint` ni `tsconfig.strict.json`), `typescript` (`tsconfig.strict.json` sin `angularCompilerOptions`) y `angular` (`tsconfig.strict.json` con `angularCompilerOptions`), y conectar `tsconfig.base.json`/`tsconfig.json` y `typescript-eslint` en el monorepo `AI-SDLC`.
3. Diferenciar JVM Maven (`pom.xml` -> `config/pmd/aisdlc-ruleset.xml` + validación estricta de compilador/PMD en `pom.xml` sin exigir `gradle/init.d/aisdlc-strict.init.gradle.kts`) frente a Gradle, y actualizar `GO_GOLANGCI_YML` a `golangci-lint` v2 (`version: "2"`).
4. Refinar la detección `c` vs `cpp` a nivel de árbol completo y exigir `cmake/AisdlcStrictCompiler.cmake` únicamente cuando exista `CMakeLists.txt`.

## 2. Dependencias Externas Evaluadas
- `typescript-eslint` (devDependency en raíz `package.json` del monorepo `AI-SDLC`): licencia **MIT**, compatible con `license-policy.yaml` (no copyleft, no comercial restringida).
- `@eslint/js` (opcional/nativo en plantilla JavaScript o reglas core de ESLint 9): licencia **MIT**, compatible con `license-policy.yaml`.
