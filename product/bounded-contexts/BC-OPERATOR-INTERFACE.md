---
id: BC-OPERATOR-INTERFACE
type: bounded-context
title: "AI-SDLC Operator Interface Bounded Context"
status: active
version: "1.0.0"
schema-version: "1.0"
domain-type: supporting
strategic-classification:
  evolutionary-stage: custom-built
  business-model-role: enabler
responsibilities:
  - "Interfaz de línea de comandos (CLI) determinista para operadores humanos y pipelines de CI/CD"
  - "Orquestación de pre-flight checks unificados (aisdlc check) y autofix determinista"
  - "Formateo y serialización de salidas estructuradas en texto humano y JSON canónico"
ubiquitous-language-terms: []
context-mapping:
  upstream-dependencies:
    - BC-AI-SDLC-GOVERNANCE
  downstream-dependents: []
  integration-patterns:
    - pattern: Conformist / In-Process API
      related-context: BC-AI-SDLC-GOVERNANCE
components-involved:
  - CMP-CLI
supersedes: null
superseded-by: null
---

# BC-OPERATOR-INTERFACE: AI-SDLC Operator Interface Bounded Context

## 1. Context Purpose and Scope
Subdominio de soporte (*Supporting Subdomain*) que actúa como la superficie de interacción primaria para ingenieros de software, Tech Leads y sistemas de integración continua (GitHub Actions, GitLab CI, Azure Pipelines).

### 1.1 Strategic Domain Classification
- **Domain Type**: `supporting`
- **Evolutionary Stage**: `custom-built`
- **Business Role**: Habilitador operativo de la experiencia de desarrollador (DX) y de la integración no invasiva en pipelines.

---

## 2. Ubiquitous Language & Domain Invariants
- **Conceptos Encapsulados**: Comandos CLI (`init`, `check`, `verify`, `change`, `report`, `kpi`), códigos de salida estandarizados (Exit Code 0 a 5), formateo JSON sin caracteres de escape ANSI.

---

## 3. Context Mapping & Integration Relationships
- **Upstream Contexts**:
  - `BC-AI-SDLC-GOVERNANCE`: Consume los motores de verificación, adaptadores y reportes de `@aisdlc/core` a través de interfaces TypeScript fuertemente tipadas.

---

## 4. Architecture Mapping
- **Componentes Implementadores**:
  - `CMP-CLI`: CLI AI-SDLC (`@aisdlc/cli`).

---

## 5. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-24 | Operator DX Engineer | Creación del Bounded Context canónico de interfaz de operador | CHG-042 |
