---
id: BC-AI-SDLC-GOVERNANCE
type: bounded-context
title: "AI-SDLC Governance Bounded Context"
status: active
version: "1.0.0"
schema-version: "1.0"
domain-type: core
strategic-classification:
  evolutionary-stage: custom-built
  business-model-role: differentiator
responsibilities:
  - "Motor central de verificación determinista de calidad de software y complejidad AST"
  - "Gobernanza de trazabilidad 360° entre Producto (PDaC), Arquitectura y Pruebas BDD"
  - "Auditoría de cumplimiento de licencias OSS, secretos estáticos y análisis SAST shift-left"
  - "Evaluación de modos de autonomía de tareas y gestión de handoffs canónicos SDD"
ubiquitous-language-terms: []
context-mapping:
  upstream-dependencies: []
  downstream-dependents:
    - BC-OPERATOR-INTERFACE
    - BC-AGENT-INTERFACE
  integration-patterns:
    - pattern: Open Host Service / Published Language
      related-context: BC-OPERATOR-INTERFACE
    - pattern: Open Host Service / Published Language
      related-context: BC-AGENT-INTERFACE
components-involved:
  - CMP-CORE
  - CMP-OBSERVABILITY
supersedes: null
superseded-by: null
---

# BC-AI-SDLC-GOVERNANCE: AI-SDLC Governance Bounded Context

## 1. Context Purpose and Scope
Este Bounded Context constituye el núcleo del producto (*Core Domain*) de AI-SDLC. Encapsula toda la lógica de negocio normativa, reglas de gobernanza algorítmica, validación criptográfica de esquemas (Draft 2020-12), auditorías deterministas de AST (complejidad ciclomática, cognitiva, índice de mantenibilidad) y verificación de seguridad shift-left.

### 1.1 Strategic Domain Classification
- **Domain Type**: `core`
- **Evolutionary Stage**: `custom-built`
- **Business Role**: Diferenciador competitivo principal del framework, asegurando que el código generado o asistido por IA cumpla estándares estrictos de ingeniería de software.

---

## 2. Ubiquitous Language & Domain Invariants
- **Invariantes de Dominio**:
  - `BR-SPEC-TRACEABILITY-INVARIANT`: Invariante estricto de trazabilidad 360° entre requisitos, diseño técnico y pruebas automatizadas.
- **Conceptos Encapsulados**:
  - Puertas de calidad (*Quality Gates*), Ratchet baseline, Handoffs canónicos, PDaC digests SHA-256.

---

## 3. Context Mapping & Integration Relationships
- **Downstream Contexts**:
  - `BC-OPERATOR-INTERFACE` (`@aisdlc/cli`): Consume la API in-process del motor central para exponer comandos de terminal a ingenieros humanos y CI/CD.
  - `BC-AGENT-INTERFACE` (`@aisdlc/mcp`): Consume la API in-process para exponer herramientas y recursos a través del protocolo Model Context Protocol (MCP).

---

## 4. Architecture Mapping
- **Componentes Implementadores**:
  - `CMP-CORE`: Motor central (`@ai-sdlc/core`).
  - `CMP-OBSERVABILITY`: Motor de métricas y observabilidad (`@ai-sdlc/observability`).

---

## 5. Revision History

| Version | Date | Author / Agent | Change Description | Change Reference (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-24 | Architect / Tech Lead | Creación del Bounded Context canónico de gobernanza | CHG-042 |
