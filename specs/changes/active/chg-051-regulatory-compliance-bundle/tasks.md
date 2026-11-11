---
id: TSK-PLAN-CHG-051-REGULATORY-COMPLIANCE-BUNDLE
type: task-plan
change-id: CHG-051-REGULATORY-COMPLIANCE-BUNDLE
title: 'Desglose de Tareas Verificables: Regulatory Compliance Evidence Bundle'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 2
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Definición de Contratos, Interfaces DTO y Mapeo Regulatorio
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-051-REGULATORY-COMPLIANCE-ENGINE
    satisfies-requirements: &ref_0
      - FR-051-REGULATORY-COMPLIANCE-BUNDLE-001
      - SEC-REQ-051-TAMPER-RESISTANT-ATTESTATION-001
      - SEC-REQ-051-SENSITIVE-DATA-FILTER-001
      - SEC-REQ-051-KEYLESS-IDENTITY-VERIFICATION-001
  - id: TSK-002
    title: Implementación de Builders OSCAL Assessment-Results e in-toto v1 Statement
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-051-REGULATORY-COMPLIANCE-ENGINE
    satisfies-requirements: *ref_0
  - id: TSK-003
    title: Implementación de Puertos de Salida DLP Sanitizer, Criptografía y Exporter
    complexity: MEDIUM
    risk-level: MEDIUM
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-051-REGULATORY-COMPLIANCE-ENGINE
    satisfies-requirements: *ref_0
  - id: TSK-004
    title: Implementación de Adaptadores de Entrada CLI (report compliance) y MCP Tool
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-051-REGULATORY-COMPLIANCE-ENGINE
      - CMP-CLI
      - CMP-MCP-SERVER
    satisfies-requirements: *ref_0
  - id: TSK-005
    title: Pruebas de Integración BDD Cucumber y Verificación de Mitigación de Ciberseguridad
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: cucumber-bdd
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-051-REGULATORY-COMPLIANCE-ENGINE
      - CMP-CLI
      - CMP-MCP-SERVER
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-051-REGULATORY-COMPLIANCE-BUNDLE

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, interfaces, adaptadores CLI/MCP y pruebas automatizadas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, builders de esquemas normativos OSCAL/in-toto y lógica criptográfica. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos o no formalizados. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico de infraestructura o claves criptográficas en producción. | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### TSK-001: Definición de Contratos, Interfaces DTO y Mapeo Regulatorio
- **ID**: `TSK-001`
- **Componentes**: `CMP-051-REGULATORY-COMPLIANCE-ENGINE`
- **Requisitos**: `FR-051-REGULATORY-COMPLIANCE-BUNDLE-001`, `SEC-REQ-051-TAMPER-RESISTANT-ATTESTATION-001`, `SEC-REQ-051-SENSITIVE-DATA-FILTER-001`, `SEC-REQ-051-KEYLESS-IDENTITY-VERIFICATION-001`
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`
- **Descripción**: Crear tipos TypeScript, enumeraciones para los 12 Quality Gates y matriz de correlación con EU AI Act Art 9-15, ISO 42001 y NIST SSDF SP 800-218.

### TSK-002: Implementación de Builders OSCAL Assessment-Results e in-toto v1 Statement
- **ID**: `TSK-002`
- **Componentes**: `CMP-051-REGULATORY-COMPLIANCE-ENGINE`
- **Requisitos**: `FR-051-REGULATORY-COMPLIANCE-BUNDLE-001`, `SEC-REQ-051-TAMPER-RESISTANT-ATTESTATION-001`
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Verificación**: `pnpm test`
- **Descripción**: Implementar `OscalAssessmentBuilder` para generar documentos `assessment-results` conformes a NIST OSCAL y `InTotoAttestationBuilder` para envolventes Statement v1. Incluye ordenamiento canónico determinista de arrays (por id, ruleId o path) y validación de presencia y frescura (`git rev-parse HEAD`) de las 12 Quality Gates en CI/strict.

### TSK-003: Implementación de Puertos de Salida DLP Sanitizer, Criptografía y Exporter
- **ID**: `TSK-003`
- **Componentes**: `CMP-051-REGULATORY-COMPLIANCE-ENGINE`
- **Requisitos**: `SEC-REQ-051-TAMPER-RESISTANT-ATTESTATION-001`, `SEC-REQ-051-SENSITIVE-DATA-FILTER-001`, `SEC-REQ-051-KEYLESS-IDENTITY-VERIFICATION-001`
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Verificación**: `pnpm test`
- **Descripción**: Integrar pipeline DLP extendido (URIs embebidas, Bearer tokens, claves PEM en diagnostics/rawOutput/error.message). Implementar serialización canónica RFC 8785 (JCS) en UTF-8/LF. En OIDC: lista blanca HTTPS estricta, timeout de red de 5s fail-closed (`ERR_OIDC_NETWORK_UNREACHABLE`), soporte de flag `--offline` y exportación atómica a `reports/audit-evidence-bundle.json`.

### TSK-004: Implementación de Adaptadores de Entrada CLI (report compliance) y MCP Tool
- **ID**: `TSK-004`
- **Componentes**: `CMP-051-REGULATORY-COMPLIANCE-ENGINE`, `CMP-CLI`, `CMP-MCP-SERVER`
- **Requisitos**: `FR-051-REGULATORY-COMPLIANCE-BUNDLE-001`
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`
- **Descripción**: Añadir el subcomando `aisdlc report compliance` en `packages/cli` y registrar la herramienta MCP `report_compliance` en `packages/mcp`.

### TSK-005: Pruebas de Integración BDD Cucumber y Verificación de Mitigación
- **ID**: `TSK-005`
- **Componentes**: `CMP-051-REGULATORY-COMPLIANCE-ENGINE`, `CMP-CLI`, `CMP-MCP-SERVER`
- **Requisitos**: Todos los requisitos de `handoff.yaml`
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`
- **Descripción**: Verificar la suite completa de pasos Cucumber BDD para casos nominales, mitigaciones adversarias (rechazo de 12 gates incompletas, detección de desajuste de commit git HEAD, determinismo RFC 8785, timeout fail-closed OIDC / air-gapped, flag --offline y sanitización profunda DLP de credenciales URI y claves PEM).

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-10 | agent-system-architect | Desglose atómico de tareas con mapeo del 100% de handoff.yaml y contratos hexagonales | CHG-051-REGULATORY-COMPLIANCE-BUNDLE |
| **1.1.0** | 2026-11-10 | agent-system-architect | Refuerzo de TSK-002, TSK-003 y TSK-005 con mitigaciones de vectores adversarios 1-4 | CHG-051-REGULATORY-COMPLIANCE-BUNDLE |
