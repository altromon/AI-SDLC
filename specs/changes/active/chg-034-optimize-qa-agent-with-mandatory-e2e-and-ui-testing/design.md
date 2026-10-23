---
id: DSG-CHG-034-OPTIMIZE-QA-AGENT-WITH-MANDATORY-E2E-AND-UI-TESTING
type: spec-design
change-id: CHG-034-OPTIMIZE-QA-AGENT-WITH-MANDATORY-E2E-AND-UI-TESTING
title: "Diseño Técnico: Optimize QA Agent with Mandatory E2E and UI Testing"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-034-OPTIMIZE-QA-AGENT-WITH-MANDATORY-E2E-AND-UI-TESTING"
architecture-component: "CMP-CORE"
enclave: "SEC-ENC-DMZ"
status: approved
contracts: []
citations:
  - id: UC-026-AGENT-NATIVE-CONFIGS
    digest: sha256:36b9a61c13c5fc0ca219251871049de03a2c4ebfcd32405e134c51a21265fe37
    comment: Citación de use-case (Configuración Nativa y Prevención de Deriva para Agentes)
  - id: FR-026-AGENT-NATIVE-CONFIGS-001
    digest: sha256:10515f23a2276a362b1023693c433922994ccb1ac663ce8a421542dc3bb900dd
    comment: Requerimiento derivado de UC-026-AGENT-NATIVE-CONFIGS
---

# Diseño Técnico: CHG-034-OPTIMIZE-QA-AGENT-WITH-MANDATORY-E2E-AND-UI-TESTING

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El componente se despliega en `CMP-CORE` (generadores de plantillas de agentes y verificadores de deriva de configuración) dentro del enclave perimetral `SEC-ENC-DMZ`.

## 2. Directivas del Agente de QA (SDET) y Anti-Deriva
Se optimiza la especificación canónica de `agent-qa-engineer` en `process/09_agent_protocols.md` y la plantilla base en `packages/core/src/init/agent-templates.ts`:
- **Tecnología acordada del proyecto**: Utilizar siempre los frameworks de pruebas y ejecutores E2E/UI definidos en el proyecto (`ADR-*`, `design.md`, `package.json`, etc.) sin requerir recordatorio en el prompt.
- **Pruebas End-to-End (E2E) y de Interfaz de Usuario (UI) obligatorias**: Incluir suites completas E2E y de UI siempre que existan flujos de cara al usuario.
- **Cobertura exhaustiva por elemento interactivo**: Diseñar pruebas para cada elemento interactivo (botones, formularios, modales, etc.) evaluando Happy Path, Sad Path y Boundary Values empleando herramientas externas como Playwright o FlatUI.

## 3. Protocolos de Manejo de Errores y Mitigación
Verificación automática mediante la suite de prevención de deriva (`packages/core/tests/agent-native-configs-drift.spec.ts`) para garantizar que todas las herramientas/IDEs soportadas (Claude, Cursor, Copilot, Antigravity) mantienen la paridad canónica sin divergencias.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
No se introducen dependencias externas de terceros adicionales; las herramientas de testing citadas son directivas de tooling del proyecto.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-23 | agent-developer / human-dev | Diseño técnico formal inicial para optimización de agent-qa-engineer (#130) | CHG-034-OPTIMIZE-QA-AGENT-WITH-MANDATORY-E2E-AND-UI-TESTING |
