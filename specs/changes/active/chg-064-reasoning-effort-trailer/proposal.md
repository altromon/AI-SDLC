---
id: CHG-064-REASONING-EFFORT-TRAILER
type: spec-change-proposal
title: "AI Reasoning Effort Trailer and Dashboard Breakdown"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-064-REASONING-EFFORT-TRAILER
    digest: sha256:312057f2e4585bab504bb4fba3eb978f9b52ea1bc974323f714e33d1820acfa6
    comment: Caso de uso para el registro del nivel de esfuerzo de razonamiento (AI-Reasoning-Effort) en trailers Git y su desglose en el Dashboard
  - id: FR-064-REASONING-EFFORT-TRAILER-001
    digest: sha256:3ee1e3789dc244ed63c0acafa10b736806a2e9027c3f967823bdc3adb3d75506
    comment: Requisito funcional para parsing/formateo de AI-Reasoning-Effort, detección en hooks y desglose en dashboard.html
---

# Propuesta de Cambio: CHG-064-REASONING-EFFORT-TRAILER

## 1. Motivación y Alcance
Extender el motor de telemetría Git, detección de autoría, hooks y reporteros de `@aisdlc/core` (y la salida de `git detect-author` en `@aisdlc/cli`) para capturar de forma agnóstica al IDE el nivel de esfuerzo de razonamiento (`AI-Reasoning-Effort`: `low`, `medium`, `high`, `max`) en los commits de agentes IA y visualizar su desglose en `reports/dashboard.html`:

1. **Trailer canónico `AI-Reasoning-Effort` (`packages/core/src/git/trailers.ts`)**:
   - Definir `ReasoningEffort = 'low' | 'medium' | 'high' | 'max'` y extender `CommitTrailers` con `reasoningEffort?: ReasoningEffort`.
   - Soportar parsing insensible a mayúsculas/minúsculas con normalización a minúsculas en `parseCommitTrailers()`, descartando valores fuera del conjunto permitido como `undefined`.
   - Emitir `AI-Reasoning-Effort: <reasoningEffort>` en `formatCommitTrailers()` únicamente cuando `reasoningEffort` es válido.
2. **Detección e inyección en `prepare-commit-msg` (`packages/core/src/git/agent-detector.ts`, `hook-installer.ts`, `packages/cli/src/commands/git.ts`)**:
   - Extender `AuthorIdentity` con `reasoningEffort?: ReasoningEffort`, resolviéndolo en `detectAuthorIdentity()` desde `AI_REASONING_EFFORT`, `ai.reasoningEffort` (Git config) o `.ai-sdlc/session-telemetry.json`.
   - Actualizar `PREPARE_COMMIT_MSG_SCRIPT` en `hook-installer.ts` y `runGitDetectAuthor()` en `git.ts` para propagar e inyectar `AI-Reasoning-Effort: <level>` cuando `AUTHOR_TYPE` es `agent`, el nivel es válido y no existe ya un trailer `^AI-Reasoning-Effort:`.
3. **Agregación KPI y Dashboard HTML (`packages/core/src/reporters/pr-kpis.ts`, `dashboard-html.ts`, `dashboard-template.ts`)**:
   - Agregar métricas por modelo y nivel de esfuerzo (usando `unspecified` para commits sin trailer válido).
   - Renderizar el desglose por modelo y nivel de esfuerzo en `Telemetry Breakdown by Author and Model` y en los detalles KPI/commit de `reports/dashboard.html`, incluyendo actualización dinámica al filtrar por rama en el cliente.

## 2. Dependencias Externas Evaluadas
- **Cero dependencias externas nuevas**: La implementación utiliza exclusivamente TypeScript/Node.js estándar y Bash POSIX, manteniendo cumplimiento al 100% con `license-policy.yaml` y sin modificar `schemas/`.
