---
id: CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
type: spec-change-proposal
title: "Increment Profile Triage, SemVer Precedence, and SDD Branch Guard"
status: draft
author: "agent-system-architect"
handoff: HOF-CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
citations:
  - id: UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
    digest: sha256:f98d6031597730c33d3f5b2d59095058b34072dcddcf1c7fbca78f1483a91fa7
    comment: Caso de uso de selección interactiva de perfil de fricción, versionado SemVer por precedencia y bloqueo SDD en guard-branch.cjs
  - id: FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001
    digest: sha256:91199a3304f752350e6018c0d51efed73a6c48c721a74858349c3e43568e8a17
    comment: Requisito funcional para triaje interactivo de perfil, SemVer por precedencia y guardián SDD en guard-branch.cjs
---

# Propuesta de Cambio: CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD

## 1. Motivación y Alcance

Evitar que los agentes de IA omitan accidentalmente el flujo Spec-Driven Development (`aisdlc-increment`) al editar código fuente o pruebas, y garantizar una evolución determinista de versiones SemVer alineada con la criticidad real de cada incremento mediante tres mecanismos complementarios:

1. **Paso 0 Interactivo en `aisdlc-increment` (Triaje de Perfil de Fricción `patch | standard | critical`)**:
   - Cuando el usuario no especifica explícitamente el perfil en su prompt inicial, el agente debe consultar interactivamente al usuario qué perfil aplicar (`patch`, `standard` o `critical`), recomendando en primer lugar con `(Recommended)` el perfil deducido según el alcance del cambio y las rutas protegidas Anti-Bypass (`specs/security/`, `specs/privacy/`, `schemas/`, `packages/security/`, auth/crypto/RBAC, migraciones).
   - Define explícitamente el enrutamiento proporcional: vía rápida para `patch` (`spec.md` con bloque `verification` únicamente y 1 checkpoint de auditoría) frente al ciclo SDD completo para `standard` y `critical` (`proposal.md`, `spec.md`, `design.md`, `tasks.md`, `handoff.yaml` y 2 checkpoints de auditoría/adversario).
2. **Versionado SemVer Determinista por Precedencia en el Paso 6 de `aisdlc-increment`**:
   - Vincula el incremento de versión SemVer del software bajo desarrollo en el Paso 6 al perfil del cambio: `patch` $\rightarrow$ Patch (`x.y.Z`), `standard` $\rightarrow$ Minor (`x.Y.0`), `critical` $\rightarrow$ Major (`X.0.0`).
   - Establece la regla de consolidación por máxima precedencia: cuando existan múltiples incrementos pendientes de cierre/integración en `specs/changes/active/` o en un lote de release, se aplica **un único incremento de versión** gobernado exclusivamente por el perfil de mayor rango (`critical` / Major $>$ `standard` / Minor $>$ `patch` / Patch), sin acumular subidas sucesivas.
3. **Guardián Determinista de Incremento SDD Activo en `scripts/guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS`**:
   - Extiende el hook `PreToolUse` para que, cuando un agente intente crear o editar archivos en `src/`, `lib/`, `packages/` o `tests/` dentro de un repositorio con estructura SDD (`specs/changes/`), verifique síncronamente que exista al menos un cambio activo válido en `specs/changes/active/` (`spec.md` para `patch` salvo rutas protegidas Anti-Bypass; `spec.md`, `design.md`, `tasks.md` y `handoff.yaml` para `standard`/`critical`). De lo contrario, rechaza la edición con `decision: 'deny'` indicando ejecutar primero `aisdlc-increment` (Paso 0 $\rightarrow$ `sdd_change_new`).

## 2. Dependencias Externas Evaluadas

- **Ninguna dependencia externa nueva**: La implementación emplea exclusivamente módulos nativos de Node.js (`fs`, `path`, `child_process`) y plantillas TypeScript existentes en `@aisdlc/core`, cumpliendo al 100% con `license-policy.yaml`.
