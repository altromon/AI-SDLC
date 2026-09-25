---
id: ABUSE-UNVERIFIED-SPEC-BYPASS
type: abuse-case
version: "1.0.0"
schema-version: "1.0"
title: Evasión de Verificación Determinista e Inyección de Código no Especificado
status: active
primary-threat-actor: ACT-THREAT-ROGUE-AGENT
targets-use-case: UC-028-NATIVE-MCP-SERVER
stride-category: tampering
mitigated-by:
  - SEC-REQ-DETERMINISTIC-VERIFY
asvs-controls:
  - V1.1 Secure Software Development Lifecycle
  - V5.1 Input Validation
supersedes: null
superseded-by: null
---

# ABUSE-UNVERIFIED-SPEC-BYPASS: Evasión de Verificación Formal

## 1. Escenario de Abuso
Un agente malicioso o comprometido intenta escribir código directamente en producción sin generar o validar la especificación correspondiente, eludiendo la herramienta `verify` o falsificando los resultados del Quality Gate.
