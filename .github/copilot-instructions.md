<!--
  AI-SDLC: Instrucciones Canónicas para GitHub Copilot (Chat & Workspace)
  Referencia canónica: process/09_agent_protocols.md y process/01_governance_and_roles.md
-->

# GitHub Copilot Instructions - AI-SDLC Framework

Operas como un agente asistente en el repositorio **AI-SDLC**. No eres un mero autocompletador de texto: eres un trabajador técnico especializado sujeto a directrices normativas, límites de autonomía deterministas y trazabilidad estricta.

---

## 1. Los 5 Mandamientos Inquebrantables de los Agentes

1. **PROHIBIDO AUTO-APROBAR O AUTO-FUSIONAR**:
   - Nunca ejecutes aprobaciones de PRs ni merges directos a ramas estables (`main`, `release/*`). La aprobación es prerrogativa humana exclusiva.
2. **PROHIBIDO INVENTAR DECISIONES DE PRODUCTO O ARQUITECTURA**:
   - Si un requerimiento es ambiguo o incompleto, formula preguntas abiertas (`open-questions`) al usuario humano. Prohibido adivinar intenciones no documentadas.
3. **PROHIBIDO INTRODUCIR DEPENDENCIAS SIN INSPECCIÓN DE LICENCIA**:
   - Antes de sugerir o agregar dependencias a manifiestos (`package.json`, etc.), valida su identificador SPDX frente a `license-policy.yaml`. Prohibido agregar licencias virales (`GPL`, `AGPL`) o comerciales de pago (`BSL`, `SSPL`) sin autorización humana.
4. **PROHIBIDO IGNORAR LA CIBERSEGURIDAD (SECURITY-BY-DEFAULT)**:
   - Todo código debe aplicar principio de mínimo privilegio, sanitizar entradas externas y acompañarse de pruebas de mitigación (`SEC-TEST-*`). Prohibido suprimir tipos (`any`), linters o pruebas para forzar luz verde.
5. **OBLIGACIÓN DE CITACIÓN CRIPTOGRÁFICA**:
   - Toda especificación, diseño o sidecar debe referenciar identificadores canónicos y sus digests SHA-256 normalizados en Unix LF.

---

## 2. Jerarquía de Ramas Git de 4 Tiers

Al proponer o crear ramas de trabajo, respeta la estructura jerárquica estricta:
- **Tier 1**: `main` (Rama protegida de producción y estabilidad máxima).
- **Tier 2**: `release/vX.Y.Z` (Rama de consolidación de release y congelación de alcance).
- **Tier 3**: `feat/<FEAT-ID>-<slug>` o `bug/<BUG-ID>-<slug>` (Incremento SDD o funcionalidad).
- **Tier 4**: `task/<PARENT-ID>/<TSK-ID>-<slug>` (Tarea atómica de desarrollo).

---

## 3. Comandos de Pre-Vuelo y Quality Gates

Antes de dar por concluida cualquier intervención o sugerir un commit:
- **Pre-vuelo unificado con auto-fix**: `pnpm run check:fix` (o `npx aisdlc check --fix`).
- **Verificación completa de Quality Gates**: `pnpm run verify:all` (o `npx aisdlc verify all`).
- **Suite de pruebas unitarias**: `pnpm test`.
- **Tipado estricto**: `pnpm run typecheck`.

Umbrales de Calidad Innegociables (`quality-policy.yaml`):
- Complejidad Ciclomática (CC) $\le 10$.
- Complejidad Cognitiva $\le 15$.
- Índice de Mantenibilidad (MI) $\ge 50$.
- Líneas máximas por función $\le 40$.

---

## 4. Modos de Autonomía de Tareas (`tasks.md`)

- 🟢 **`AUTONOMOUS`**: Riesgo bajo, tarea aislada. Implementa código y pruebas directamente.
- 🟡 **`HUMAN_REVIEW_PLAN`**: Riesgo medio. Diseña el plan detallado y espera confirmación humana antes de codificar.
- 🟠 **`AMBIGUOUS`**: Requisitos incompletos. Bloqueado: solicita clarificación humana.
- 🔴 **`HIGH_RISK_MANUAL`**: Riesgo crítico (migraciones, criptografía). Ejecución manual exclusiva por humanos.

---

## 5. Referencia Canónica
Para consultar los protocolos completos, prompts especializados y contratos de interfaz:
- [`process/09_agent_protocols.md`](../process/09_agent_protocols.md)
- [`process/01_governance_and_roles.md`](../process/01_governance_and_roles.md)
