---
id: CHG-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
type: spec-change-proposal
title: Align Skills, Agent Templates, CLI Remediation, Prose Citation Digests, and CHG-070 Integration
status: applied
author: agent-system-architect
citations:
  - id: UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
    digest: sha256:d316c33ebfd70736dce71bf7e0e574aec86bd2385170b8c1a488549e342729fd
    comment: Citación de use-case (Align Skills, Agent Templates, CLI Remediation, Prose Citation Digests, and CHG-070 Integration)
  - id: FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001
    digest: sha256:01c6157970be0d925443177456aa3007eb22e4c1af07217121451f432598530d
    comment: Requerimiento derivado de UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
---


# Propuesta de Cambio: CHG-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS

## 1. Motivación y Alcance
Resolver el Issue #235 alineando la documentación operativa, plantillas de agentes, referencias de skills, reglas, mirrors IDE, mensajes de remediación CLI, detección/sincronización de digests en prosa del grafo PDaC y la integración canónica pendiente de `CHG-070`:

- **Alineación de `--lang` opcional y `--features-only`**: actualizar `packages/core/src/init/agent-templates.ts`, `packages/core/src/init/skill-references.ts`, `.agent/rules/ai-sdlc-testing.md`, skills y todos los mirrors IDE (`npx aisdlc sync`) para documentar `aisdlc gherkin scaffold <feature-file> [--lang <ts|py|go|rs|cs>] [--fallback]` y `aisdlc verify gherkin --features-only`.
- **Remediación CLI**: actualizar `buildGherkinViolations` y `printGherkinVerifyConsole` (`packages/cli/src/commands/verify.ts`) y `buildGherkinFailedGate` (`packages/cli/src/commands/check.ts`) para mostrar `[--lang <lang>]` opcional.
- **Citaciones en prosa PDaC (`packages/core/src/verifiers/pdac-graph.ts`)**: añadir `ProseCitationMatch`, `extractProseCitations` y `updateProseCitationLine` en `extractCitations` y `updateCitationsInContent` (cubriendo `specs/product/` y `specs/architecture/` en `collectCandidateFilesForSync` y `processPdacFile`), corrigiendo los digests en prosa en ceros/obsoletos de `FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001.md` y `FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001.md`.
- **Cierre e integración de `CHG-070`**: marcar `TSK-070-01` y `TSK-070-02` como `COMPLETED` en `specs/changes/active/chg-070-bdd-step-language-sync/tasks.md` e integrar `CHG-070` con `sdd integrate --auto` sin commitear `reports/*` globales.
- Opera bajo el perfil `minor` (`1 UC-* = 1 CHG-*`) sin modificar `schemas/`.

## 2. Impacto en Artefactos
| Capa | Elemento | Tipo de Cambio | Descripción |
| :--- | :--- | :--- | :--- |
| Product | `UC-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS` | `EXISTING` | Caso de uso origen del incremento. |
| Product | `FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001` | `EXISTING` | Requisito funcional normativo. |
| Architecture | `CMP-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS` | `NEW` | Subcomponente arquitectónico en `CMP-CORE` (`SEC-ENC-DMZ`). |
| Code | `packages/core/src/verifiers/pdac-graph.ts` | `MODIFIED` | Soporte de detección, verificación y sincronización de citaciones en prosa `> **Upstream Citation**:`. |
| Code | `packages/core/src/init/agent-templates.ts`, `skill-references.ts`, `.agent/rules/ai-sdlc-testing.md` | `MODIFIED` | Documentación de `[--lang <ts|py|go|rs|cs>]` opcional y `--features-only` + `npx aisdlc sync`. |
| Code | `packages/cli/src/commands/verify.ts`, `check.ts` | `MODIFIED` | Mensajes de remediación CLI con `[--lang <lang>]` opcional. |
| Specs | `specs/product/FR-069-*`, `FR-071-*`, `specs/changes/active/chg-070-bdd-step-language-sync/tasks.md` | `MODIFIED` | Sincronización de digests en prosa y cierre/integración de `CHG-070`. |

## 3. Dependencias Externas Evaluadas
- Ninguna dependencia externa nueva. Se reutilizan APIs estándar de Node.js (`fs`, `path`, `crypto`) y utilidades existentes de `@aisdlc/core` conforme a `license-policy.yaml`.
