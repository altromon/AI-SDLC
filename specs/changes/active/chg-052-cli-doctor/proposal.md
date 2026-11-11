---
id: CHG-052-CLI-DOCTOR
type: spec-change-proposal
title: "CLI Doctor Environment Health Diagnostics"
status: draft
author: "agent-developer / human-dev"
citations:
  - id: UC-052-CLI-DOCTOR
    digest: sha256:b7673d90ef5217471881909df5cf2a8eba8e69dabd8cf95730d9e75965760745
    comment: Artefacto citado en CHG-052-CLI-DOCTOR
  - id: FR-052-CLI-DOCTOR-001
    digest: sha256:aff8982403233924ad3d0dae5e514a742073f30dcafb9a1fc3cf889face4625f
    comment: Citación de requirement (cli-doctor-health-check)
  - id: SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001
    digest: sha256:c99a0ab10faa2d1e84c91e5f27629ab074d8d1ebfbe9698410e7cb3ff5827699
    comment: Citación de security-requirement (Verificación de Integridad y Detección de Suplantación en Git Hooks)
  - id: SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001
    digest: sha256:053560870e6056f81df310e66617576cbd1d92dc1195f7d90c35a7a23cd9128f
    comment: Citación de security-requirement (Invocación Segura de Procesos de Sondeo de Toolchains sin Shell Intermedio)
  - id: SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001
    digest: sha256:829c2c5f5bd9ca39f99ac9efa6d3b31b089e474754de9c885e42e9d918c56f7c
    comment: Citación de security-requirement (Prevención de Fuga de Secretos y Enmascaramiento de Tokens en Diagnósticos)
  - id: SEC-REQ-052-RESILIENT-DIAGNOSTIC-TIMEOUTS-001
    digest: sha256:976ff556ef256ed0b962b7c4894aac2feaf91e648630c63d9df76818422a6af5
    comment: Citación de security-requirement (Delimitación Estricta de Timeouts en Sondas de Red y Resiliencia Anti-DoS)
---

# Propuesta de Cambio: CHG-052-CLI-DOCTOR

## 1. Motivación y Alcance
CLI Doctor Environment Health Diagnostics (`aisdlc doctor` y MCP `doctor`) para evaluación determinista y antimanipulación de la salud del entorno de trabajo, hooks de Git, seguridad de ramas, esquemas JSON y preparación para firma criptográfica.

## 2. Dependencias Externas Evaluadas
- Lista de dependencias nuevas a incorporar y verificación de licencia según `license-policy.yaml`:
  - No se requieren librerías externas adicionales. Se emplean APIs estándar de Node.js (`node:child_process`, `node:fs`, `node:path`, `node:crypto`) conformes con las políticas permisivas de `license-policy.yaml`.
