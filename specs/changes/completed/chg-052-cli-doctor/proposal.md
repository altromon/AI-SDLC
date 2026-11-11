---
id: CHG-052-CLI-DOCTOR
type: spec-change-proposal
title: CLI Doctor Environment Health Diagnostics
status: applied
author: agent-developer / human-dev
citations:
  - id: UC-052-CLI-DOCTOR
    digest: sha256:107f844b17bafbe09dd9435cc433b50a4fed2f2347ca2a99387c682125b2b809
    comment: Artefacto citado en CHG-052-CLI-DOCTOR
  - id: FR-052-CLI-DOCTOR-001
    digest: sha256:9471921357e990c129b29d191c3d62cd24ff29e8fbce9420eba5210d4e19c289
    comment: Citación de requirement (cli-doctor-health-check)
  - id: SEC-REQ-052-TAMPER-RESISTANT-HOOK-VERIFICATION-001
    digest: sha256:e1360a2149f2f6165d8a741f3fcc734d562efecbd368fa1a2b7f772928b84a66
    comment: Citación de security-requirement (Verificación de Integridad y Detección de Suplantación en Git Hooks)
  - id: SEC-REQ-052-SAFE-TOOLCHAIN-PROBE-001
    digest: sha256:071d798369088029c5679fced4771619021add2f2df2e5a6622c25377d4015d5
    comment: Citación de security-requirement (Invocación Segura de Procesos de Sondeo de Toolchains sin Shell Intermedio)
  - id: SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001
    digest: sha256:78050fc8169f48ce48441309b9e63b65d40c3675afab28b67a84c6b516222b02
    comment: Citación de security-requirement (Prevención de Fuga de Secretos y Enmascaramiento de Tokens en Diagnósticos)
  - id: SEC-REQ-052-RESILIENT-DIAGNOSTIC-TIMEOUTS-001
    digest: sha256:decc6061ef3dbc1a7ca64fbaf0643dc7b0c4ccd55988935559fb6dd5c9588332
    comment: Citación de security-requirement (Delimitación Estricta de Timeouts en Sondas de Red y Resiliencia Anti-DoS)
---


# Propuesta de Cambio: CHG-052-CLI-DOCTOR

## 1. Motivación y Alcance
CLI Doctor Environment Health Diagnostics (`aisdlc doctor` y MCP `doctor`) para evaluación determinista y antimanipulación de la salud del entorno de trabajo, hooks de Git, seguridad de ramas, esquemas JSON y preparación para firma criptográfica.

## 2. Dependencias Externas Evaluadas
- Lista de dependencias nuevas a incorporar y verificación de licencia según `license-policy.yaml`:
  - No se requieren librerías externas adicionales. Se emplean APIs estándar de Node.js (`node:child_process`, `node:fs`, `node:path`, `node:crypto`) conformes con las políticas permisivas de `license-policy.yaml`.
