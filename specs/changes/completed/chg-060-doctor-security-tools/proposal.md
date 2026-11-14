---
id: CHG-060-DOCTOR-SECURITY-TOOLS
type: spec-change-proposal
title: Doctor Diagnostics for Optional Security CLIs (Semgrep, Trivy, Gitleaks)
status: applied
author: agent-system-architect
citations:
  - id: UC-060-DOCTOR-SECURITY-TOOLS
    digest: sha256:220cb398fe11050f672ae05a16b9a7a8d8fd804b337983a1918b2304e0f92b83
    comment: Caso de uso para diagnóstico de herramientas opcionales de seguridad en aisdlc doctor
  - id: FR-060-DOCTOR-SECURITY-TOOLS-001
    digest: sha256:139b76c9d23414b6a301368225bf1093c5de32933a22a9052140f835e5b16fb7
    comment: Requerimiento funcional de diagnóstico no bloqueante para semgrep, trivy y gitleaks
---


# Propuesta de Cambio: CHG-060-DOCTOR-SECURITY-TOOLS

## 1. Motivación y Alcance
Extender `aisdlc doctor` (y la herramienta MCP `doctor`) con la categoría diagnóstica `'security_tools'` para inspeccionar de forma determinista, offline y segura (`shell: false`, resolución confiable en `PATH`) la disponibilidad de `semgrep`, `trivy` y `gitleaks`, reportando advertencias no bloqueantes (`warn`) con comandos canónicos de instalación reutilizados desde `TOOL_INSTALL_ALLOWLIST` cuando falten.

## 2. Dependencias Externas Evaluadas
- Ninguna dependencia npm nueva. Solo módulos nativos de Node.js y helpers existentes en `@aisdlc/core`.
