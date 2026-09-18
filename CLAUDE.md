# Claude Code Instructions - AI-SDLC Monorepo

Referencia canónica: [`process/09_agent_protocols.md`](process/09_agent_protocols.md) y [`process/01_governance_and_roles.md`](process/01_governance_and_roles.md).

Este repositorio implementa el framework **AI-SDLC** (Spec-Driven Development, gobernanza determinista de calidad y licencias OSS para colaboración persona-agente).

---

## 1. Los 5 Mandamientos Inquebrantables de los Agentes

1. **PROHIBIDO AUTO-APROBAR O AUTO-FUSIONAR**: Nunca apruebes PRs ni fusiones directamente a `main` o ramas protegidas. La aprobación es exclusivamente humana.
2. **PROHIBIDO INVENTAR DECISIONES DE PRODUCTO O ARQUITECTURA**: Ante requerimientos ambiguos, formula preguntas abiertas (`open-questions`). No asumas comportamientos no documentados.
3. **PROHIBIDO INTRODUCIR DEPENDENCIAS SIN INSPECCIÓN DE LICENCIA**: Valida siempre el identificador SPDX contra `license-policy.yaml`. Prohibidas librerías virales (`GPL`/`AGPL`) o comerciales de pago (`BSL`/`SSPL`) sin aprobación formal.
4. **PROHIBIDO IGNORAR LA CIBERSEGURIDAD (SECURITY-BY-DEFAULT)**: Valida entradas, sanitiza datos y añade pruebas de mitigación (`SEC-TEST-*`). Prohibido desactivar linters o suprimir errores de tipado (`any`, `@ts-ignore`).
5. **OBLIGACIÓN DE CITACIÓN CRIPTOGRÁFICA**: Toda spec o sidecar debe incluir identificadores inmutables y digests SHA-256 normalizados en Unix LF.

---

## 2. Comandos Esenciales de Ejecución y Pre-Vuelo

```bash
# 1. Pre-vuelo con auto-fix determinista (Gherkin & digests SHA-256)
pnpm run check:fix

# 2. Verificación completa de todos los Quality Gates (Quality, RTM, Governance, Testing, Licenses, PDaC, Schemas, Duplicates, Security)
pnpm run verify:all

# 3. Suite completa de tests automatizados (Vitest)
pnpm test

# 4. Comprobación estricta de tipado TypeScript
pnpm run typecheck

# 5. Creación de andamiaje para nuevo cambio SDD
pnpm run change:new <nombre> --id <chg-id>

# 6. Integración canónica de un cambio SDD completado
npx tsx packages/cli/src/index.ts sdd integrate --change <chg-id>
```

---

## 3. Flujo Git y Reglas de Commit con Trailers

### Jerarquía de 4 Tiers
1. **Tier 1 (`main`)**: Producción y estabilidad absoluta.
2. **Tier 2 (`release/vX.Y.Z`)**: Estabilización de release.
3. **Tier 3 (`feat/<FEAT-ID>-<slug>` o `bug/<BUG-ID>-<slug>`)**: Incremento de entrega SDD.
4. **Tier 4 (`task/<PARENT-ID>/<TSK-ID>-<slug>`)**: Tarea atómica de implementación.

### Formato de Commits (Conventional Commits + Git Trailers)
```text
feat(scope): descripción concisa en imperativo (#issue)

Cuerpo explicando la motivación y justificación técnica del cambio.

Author-Type: agent
AI-Model: claude-3-7-sonnet
Task-ID: TSK-001
Change-ID: CHG-026-AGENT-NATIVE-CONFIGS
```

---

## 4. Umbrales de Calidad Innegociables (`quality-policy.yaml`)
- **Complejidad Ciclomática (CC)**: $\le 10$
- **Complejidad Cognitiva**: $\le 15$
- **Índice de Mantenibilidad (MI)**: $\ge 50$
- **Líneas por Función**: $\le 40$
- Salida determinista CLI: todo comando `verify` admite `--json` sin códigos de escape ANSI.
