---
id: CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS
type: spec-change-proposal
title: "Polyglot Coding Rules Anti-Bypass and Protected Friction Paths"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-075-POLYGLOT-CODING-RULES-ANTIBYPASS
    digest: sha256:4a6cd0f32aa6a0a6efd0422b1bbad8863ca8171eb98d04878e9340e9db2b109b
    comment: Citación de use-case (Polyglot Coding Rules Anti-Bypass Detection and Protected Path Alignment in Verify Friction)
  - id: FR-075-POLYGLOT-CODING-RULES-ANTIBYPASS-001
    digest: sha256:a795ccea8a45db8e2a40b6e23a9f405e149b93e2fe08c31e58f4478de2294dff
    comment: Requerimiento derivado de UC-075-POLYGLOT-CODING-RULES-ANTIBYPASS
---

# Propuesta de Cambio: CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS

## 1. Motivación y Alcance
Actualmente, `collectCodingRulesBypassViolations` (`packages/core/src/verifiers/coding-rules-bypass.ts`) solo inspecciona `.NET`, `TypeScript` (parcial), `Python` (parcial) y `Java/Maven`, dejando sin cobertura anti-bypass al resto de stacks de `VALID_CODING_RULE_STACKS` (`javascript`, `angular`, `kotlin`, `rust`, `go`, `c`, `cpp`) y manteniendo un conjunto local `IGNORED_DIRS` sin protección explícita frente a enlaces simbólicos en `walkFiles`. Además, `PROTECTED_BYPASS_PATTERNS` en `packages/core/src/verifiers/progressive-friction.ts` no incluye `specs/privacy/`, `packages/security/`, `privacy-policy.ya?ml` ni `PROTECTED_CODING_RULES_FILES`, creando una brecha respecto a `scripts/guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS`.

Este incremento (`CMP-075-POLYGLOT-CODING-RULES-ANTIBYPASS`) cubre tres pilares:
1. **Detección Anti-Bypass Políglota (`[CODING-RULES-BYPASS]`)**: Registro uniforme de inspectores por stack cubriendo los 11 stacks de `VALID_CODING_RULE_STACKS`.
2. **Seguridad de Recorrido (`walkFiles`)**: Omisión explícita de `entry.isSymbolicLink()` y unificación de directorios excluidos con `POLYGLOT_EXCLUDED_DIR_SET`.
3. **Alineación de Rutas Protegidas (`[ANTI-PATCH-BYPASS]`)**: Sincronización de `PROTECTED_BYPASS_PATTERNS` y `PROTECTED_CODING_RULES_FILES` entre `progressive-friction.ts`, `scripts/guard-branch.cjs` y `STARTER_GUARD_BRANCH_CJS`.

## 2. Dependencias Externas Evaluadas
- No se incorporan dependencias externas nuevas en `package.json`. Conformidad al 100% con `license-policy.yaml`.
