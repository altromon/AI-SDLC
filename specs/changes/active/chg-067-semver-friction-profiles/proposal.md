---
id: CHG-067-SEMVER-FRICTION-PROFILES
type: spec-change-proposal
title: "SemVer Friction Profiles (patch, minor, major)"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
    digest: sha256:a90e64f7894d0950babec5f6db93e7c0ee61ec38ad00ff8ae45ed80aea1d5796
    comment: Citación de use-case (Selección interactiva de perfil de fricción, versionado SemVer por precedencia en aisdlc-increment y bloqueo determinista SDD en guard-branch.cjs)
  - id: FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001
    digest: sha256:5ed9934c532217af1f5840417ecd22e1265b106b57f3942b68b528aed15fe582
    comment: Requisito funcional derivado de UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
  - id: CMP-CORE
    digest: sha256:694456d7048a95af19287c58451b108fc97d2c99dbac1b029ad4ce7ef1ae14a6
    comment: Componente arquitectónico central (@aisdlc/core)
---

# Propuesta de Cambio: CHG-067-SEMVER-FRICTION-PROFILES

## 1. Motivación y Alcance
Renombrar de forma estricta (cambio incompatible / perfil `major`) los perfiles de fricción progresiva de `patch | standard | critical` a `patch | minor | major` (en prosa: `Patch`, `Minor`, `Major`), alineando la taxonomía de perfiles SDD directamente con Semantic Versioning (SemVer) conforme a `UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD` y `FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001`.

### Alcance del Cambio (Hard Rename sin Alias Retrocompatibles)
- **Esquemas JSON**: `schemas/sdd/spec.schema.json` (`profile.enum` pasa a `["patch", "minor", "major"]`).
- **Core (`@aisdlc/core`)**: `ChangeProfile` / `VALID_CHANGE_PROFILES` en `packages/core/src/types/index.ts`, `progressive-friction.ts`, `manuals.ts`, adaptadores SDD (`openspec.ts`, `speckit.ts`, `scaffold.ts`), y plantillas de inicialización (`starter-schemas.ts`, `starter-templates.ts`, `coding-rules-templates.ts`).
- **CLI (`@aisdlc/cli`) y MCP (`@aisdlc/mcp`)**: Opciones `--profile <patch|minor|major>` con valor por defecto `minor` y rechazo estricto de `standard` / `critical` en `packages/cli/src/` y `packages/mcp/src/tools/lifecycle.ts`.
- **Hooks y Plantillas**: `scripts/guard-branch.cjs`, `templates/sdd/spec.template.md`, documentación `process/`, `specs/changes/` (`profile:` en specs existentes y el propio `chg-067/spec.md` de `critical` -> `major`), y suite de pruebas unitarias y BDD.

## 2. Dependencias Externas Evaluadas
- Ninguna dependencia externa nueva incorporada. Se cumplen íntegramente las restricciones de `license-policy.yaml`.
