---
id: CHG-060-DOCTOR-SECURITY-TOOLS
type: spec-change-proposal
title: 'Doctor Diagnostics for Optional Security CLIs (Semgrep, Trivy, Gitleaks)'
status: draft
author: 'agent-system-architect'
citations:
  - id: UC-060-DOCTOR-SECURITY-TOOLS
    digest: sha256:6242acc3d3b92f5535c1fcd72e5915a0e8319090092daaaf90b4454c45ae9a7c
    comment: Caso de uso para diagnóstico de herramientas opcionales de seguridad en aisdlc doctor
  - id: FR-060-DOCTOR-SECURITY-TOOLS-001
    digest: sha256:fd55217e0ca647a0aca53709a3b78d4ee78c8b2d873e0ba3c37722999e62988b
    comment: Requerimiento funcional de diagnóstico no bloqueante para semgrep, trivy y gitleaks
---

# Propuesta de Cambio: CHG-060-DOCTOR-SECURITY-TOOLS

## 1. Motivación y Alcance
Extender `aisdlc doctor` (y la herramienta MCP `doctor`) con la categoría diagnóstica `'security_tools'` para inspeccionar de forma determinista, offline y segura (`shell: false`, resolución confiable en `PATH`) la disponibilidad de `semgrep`, `trivy` y `gitleaks`, reportando advertencias no bloqueantes (`warn`) con comandos canónicos de instalación reutilizados desde `TOOL_INSTALL_ALLOWLIST` cuando falten.

## 2. Dependencias Externas Evaluadas
- Ninguna dependencia npm nueva. Solo módulos nativos de Node.js y helpers existentes en `@aisdlc/core`.
