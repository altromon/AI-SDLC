---
id: UC-027-ENV-OUTPUT-JSON
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: Control de Formato JSON por Variables de Entorno
status: active
primary-actor: ACT-AI-AGENT
supporting-actors:
  - ACT-HUMAN-ENGINEER
supersedes: null
superseded-by: null
---

# UC-027-ENV-OUTPUT-JSON: Formato JSON por Variables de Entorno

## 1. Intención y Resultado
Permitir a entornos automatizados y subagentes forzar la salida JSON globalmente en todos los subcomandos de la CLI mediante las variables de entorno `AISDLC_OUTPUT=json` o `AISDLC_FORMAT=json`, sin requerir especificar flags manuales en cada invocación.

## 2. Precondiciones
- La CLI se ejecuta dentro de un subproceso o terminal donde una variable de entorno de formato está declarada.

## 3. Flujo Principal
1. El entorno del agente o pipeline define `AISDLC_OUTPUT=json` o `AISDLC_FORMAT=json`.
2. Se ejecuta cualquier comando de la CLI (`aisdlc verify ...`, `aisdlc report ...`).
3. La CLI detecta la variable y formatea la salida en JSON puro, salvo anulación explícita por flags.
