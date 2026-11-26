---
id: CHG-069-LANGUAGE-AGNOSTIC-CODING-RULES
type: spec-change-proposal
title: "Language-Agnostic Coding Rules Detection and Verification"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-069-LANGUAGE-AGNOSTIC-CODING-RULES
    digest: sha256:d192abfbb205fbaa3b87fcd9ca1bf237b07ffabab2f96ababe7ee1a7230f19c4
    comment: Citación de use-case (Detección recursiva y cumplimiento agnóstico al lenguaje de reglas estrictas de codificación)
  - id: FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001
    digest: sha256:926644c991c08f15cdd1dd56675b551551b34ab1f44f44e8c1553e9c3622e670
    comment: Requerimiento derivado de UC-069-LANGUAGE-AGNOSTIC-CODING-RULES
---

# Propuesta de Cambio: CHG-069-LANGUAGE-AGNOSTIC-CODING-RULES

## 1. Motivación y Alcance
Actualmente:
1. `detectProjectStacks(targetDir)` en `packages/core/src/init/coding-rules-templates.ts` solo inspecciona el directorio raíz (`fs.readdirSync(targetDir)`), por lo que manifiestos en subdirectorios anidados (`src/App/App.csproj`, `services/api/go.mod`, `crates/core/Cargo.toml`, `backend/pom.xml`, `frontend/tsconfig.json`) no son detectados durante `aisdlc init` ni en verificación.
2. `MigrationService.discoverGovernedFiles(root)` en `packages/core/src/migrate/service.ts` no evalúa ni despliega archivos de reglas estrictas faltantes para stacks detectados tras una inicialización en Fase 0.
3. `collectCodingRulesBypassViolations(rootDir)` en `packages/core/src/verifiers/coding-rules-bypass.ts` retorna `[]` silenciosamente si no existen `Directory.Build.props` ni `tsconfig.strict.json`, omitiendo por completo los otros 8 stacks de `CodingRuleStack` y permitiendo que proyectos sin sus reglas estrictas superen `aisdlc verify friction`, `aisdlc verify all` y `aisdlc check`.

Este incremento (`profile: minor`) extiende `detectProjectStacks` con recorrido recursivo acotado (`maxDepth = 3`), añade el helper `getRequiredCodingRulesFiles(stack)`, integra el despliegue de reglas faltantes en `aisdlc migrate`, y habilita la verificación obligatoria y agnóstica al lenguaje `[CODING-RULES-MISSING]` en `collectCodingRulesBypassViolations(rootDir)` (además de dogfooding de `tsconfig.strict.json` y `eslint.config.mjs` en la raíz de `AI-SDLC`).

## 2. Dependencias Externas Evaluadas
- No se introducen nuevas dependencias externas (`node:fs` y `node:path` estándar). Cumplimiento verificado con `license-policy.yaml`.
