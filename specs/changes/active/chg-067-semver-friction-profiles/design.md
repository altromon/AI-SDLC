---
id: DSG-CHG-067-SEMVER-FRICTION-PROFILES
type: spec-design
change-id: CHG-067-SEMVER-FRICTION-PROFILES
title: "Diseño Técnico: SemVer Friction Profiles (patch, minor, major)"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-067-SEMVER-FRICTION-PROFILES"
architecture-component: "CMP-CORE"
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
citations:
  - id: UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
    digest: sha256:a90e64f7894d0950babec5f6db93e7c0ee61ec38ad00ff8ae45ed80aea1d5796
    comment: Citación de use-case (Selección interactiva de perfil de fricción, versionado SemVer por precedencia en aisdlc-increment y bloqueo determinista SDD en guard-branch.cjs)
  - id: FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001
    digest: sha256:5ed9934c532217af1f5840417ecd22e1265b106b57f3942b68b528aed15fe582
    comment: Requisito funcional derivado de UC-061-INCREMENT-PROFILE-AND-SEMVER-GUARD
  - id: CMP-CORE
    digest: sha256:8f8f9ac9a4fd1d1262d0bc32451926fdc5034206ef2a489ec09bb3e1261e9814
    comment: Componente arquitectónico central (@aisdlc/core)
---

# Diseño Técnico: CHG-067-SEMVER-FRICTION-PROFILES

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El cambio actualiza `CMP-CORE` en el enclave `SEC-ENC-DMZ` siguiendo **Hexagonal Architecture (Ports & Adapters)** y **Simplicity First (YAGNI)**:
- **Dominio y Tipos (`packages/core/src/types/index.ts`)**: `ChangeProfile = 'patch' | 'minor' | 'major'` y `VALID_CHANGE_PROFILES = ['patch', 'minor', 'major'] as const` (sin alias redundantes tipo `FrictionProfile` por YAGNI).
- **Esquema Canónico (`schemas/sdd/spec.schema.json`)**: `properties.profile.enum` pasa a `["patch", "minor", "major"]`.
- **Núcleo de Verificación (`packages/core/src/verifiers/progressive-friction.ts` y `manuals.ts`)**:
  - `detectProfileFromChange(changeDir)`: extrae cualquier valor `profile:` presente en el frontmatter de `spec.md` (sin ignorar valores desconocidos); si `profile` está presente y no pertenece a `['patch', 'minor', 'major']` (p. ej. `standard` o `critical`), falla de forma cerrada (**fail-closed**) reportando violación en `verifyProgressiveFriction()` / lanzando error explícito; reserva el valor por defecto `'minor'` exclusivamente cuando `profile` se omite.
  - `verifyProgressiveFriction()` y `collectPatchViolations()` exigen `'minor' or 'major'` para rutas Anti-Bypass.
  - `manuals.ts` resuelve perfil por defecto `'minor'` y aplica modo estricto (`isStrictEnforcement`) cuando `profile === 'major'` o rama `release/*`.
- **Adaptadores SDD (`packages/core/src/adapters/sdd/{openspec,speckit,scaffold}.ts`)**:
  - `parseChangeProfile` y `scaffoldSddChange` validan estrictamente `['patch', 'minor', 'major']` cuando `profile` es provisto (fallo cerrado / throw si recibe `standard` o `critical`), reservando `'minor'` como valor por defecto únicamente cuando `profile` se omite.
- **Plantillas de Skills e Inicialización (`packages/core/src/init/`)**:
  - `packages/core/src/init/agent-templates.ts` (`LIFECYCLE_SKILL_TEMPLATES`: `aisdlc-increment`, `aisdlc-release-compliance` y cualquier otra referencia a `standard`/`critical`).
  - `packages/core/src/init/starter-schemas.ts`, `packages/core/src/init/starter-templates.ts` y `packages/core/src/init/coding-rules-templates.ts` (`STARTER_GUARD_BRANCH_CJS`).
- **Adaptadores de Entrada (CLI y MCP)**:
  - `packages/cli/src/index.ts`, `packages/cli/src/commands/sdd.ts` y `packages/cli/src/commands/check.ts` (incluyendo mensajes de reclasificación a `'minor' or 'major'`): `--profile <profile>` con valores `patch | minor | major` (por defecto `'minor'`) y rechazo explícito de valores distintos (incluidos `standard` y `critical`).
  - `packages/mcp/src/tools/lifecycle.ts`: `profile: z.enum(['patch', 'minor', 'major']).optional()`.
- **Hook Guardián (`scripts/guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS`)**:
  - `detectChangeDirProfile(changeDir)` extrae cualquier token `profile:` presente mediante `/^\s*profile:\s*['"]?([A-Za-z0-9_-]+)['"]?\s*$/m` y **falla de forma cerrada (`{"decision":"deny"}`)** siempre que `profile` esté presente y no sea `'patch'`, `'minor'` o `'major'` (rechazando explícitamente `standard` y `critical`), reservando el valor por defecto `'minor'` estrictamente para cuando `profile` se omite.
  - Mensajes de bloqueo de `validateProtectedBypassOnly` y `validateSourceOrTestEdit` referencian `'minor' or 'major'` y `minor/major`.
- **Plantillas, Documentación, Specs Existentes y Pruebas**:
  - Actualiza `templates/sdd/spec.template.md`, `process/*.md`, todos los `specs/changes/active/*/spec.md` y `specs/changes/completed/*/spec.md` (~38 archivos) que declaran `profile: standard` o `profile: critical` (incluyendo `chg-067-semver-friction-profiles/spec.md` de `critical` a `major` en `TSK-067-02`), y las pruebas existentes en `packages/core/tests/`, `packages/cli/tests/`, `packages/mcp/tests/` y `tests/`.

## 2. Diagrama de Secuencia (Mermaid)

```mermaid
sequenceDiagram
    actor Caller as Agent / CLI / MCP
    participant Schema as spec.schema.json / Zod
    participant Core as progressive-friction & SDD Adapters
    participant Guard as guard-branch.cjs

    Caller->>Schema: Validate profile (patch | minor | major)
    alt Legacy profile (standard | critical)
        Schema-->>Caller: Reject strictly (no backward-compatible alias)
    else Canonical profile (patch | minor | major)
        Schema-->>Caller: Accepted
        Caller->>Core: verifyProgressiveFriction / scaffold
        Core->>Guard: detectChangeDirProfile -> patch | minor | major
        Guard-->>Caller: Allow or enforce Anti-Bypass (minor/major required)
    end
```

## 3. Contratos de Datos e Interfaces
- `ChangeProfile = 'patch' | 'minor' | 'major'`
- `VALID_CHANGE_PROFILES = ['patch', 'minor', 'major'] as const`
- `spec.schema.json`: `"enum": ["patch", "minor", "major"]`
- `MCP sdd_change_new`: `z.enum(['patch', 'minor', 'major']).optional()`

## 4. Protocolos de Manejo de Errores y Mitigación
- Rechazo fail-closed en esquema JSON, CLI, MCP, `progressive-friction` y `guard-branch.cjs` ante `standard` o `critical` sin fallback silencioso a valores legados.

## 5. Conformidad con la Política de Licencias (`license-policy.yaml`)
- Sin nuevas dependencias externas.
