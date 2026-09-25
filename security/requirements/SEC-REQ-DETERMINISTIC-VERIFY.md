---
id: SEC-REQ-DETERMINISTIC-VERIFY
type: security-requirement
version: "1.0.0"
schema-version: "1.0"
title: Verificación Criptográfica y Validación de Esquemas Obligatoria
status: active
security-domain: input-validation
mitigates-abuse-case:
  - ABUSE-UNVERIFIED-SPEC-BYPASS
acceptance-format: declarative-prose
supersedes: null
superseded-by: null
---

# SEC-REQ-DETERMINISTIC-VERIFY: Verificación Criptográfica Obligatoria

## 1. Declaración de Control
El sistema debe validar todas las especificaciones y esquemas mediante hashes SHA-256 inmutables y ejecución determinista del comando `verify` antes de permitir la integración o release de cualquier código generado por agentes de IA.
