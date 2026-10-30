---
id: CHG-038-SECURITY-SUPPRESSION-AUDIT
type: spec-change-proposal
title: "security-suppression-audit"
status: draft
author: "agent-developer / human-dev"
citations:
  - id: UC-038-SECURITY-SUPPRESSION-AUDIT
    digest: sha256:4bfdc0357beb279b2c3bc2c5002c8b2ccb585cb0a7ca4c61bb874abf6f6a5fd8
    comment: Citación de use-case (Supresiones Auditadas con Caducidad e Inventario de Excepciones de Seguridad)
  - id: FR-038-SECURITY-SUPPRESSION-AUDIT-001
    digest: sha256:8f206bf10f28b7e1d0343e47efd957d0ef30bf1e528befbfe18f64f81876c907
    comment: Citación de requirement (Validación de Supresiones Auditadas con Expiración y Generación de SUPPRESSIONS_AUDIT.md)
---

# Propuesta de Cambio: CHG-038-SECURITY-SUPPRESSION-AUDIT

## 1. Motivación y Alcance
Eliminar vías no reguladas de omisión en escaneos SAST y detección de credenciales. Se estandariza el formato obligatorio de comentarios de supresión inline (`ai-sdlc:allow-sast` y `ai-sdlc:allow-secret`), exigiendo justificación (`reason`), expiración (`expires="YYYY-MM-DD"`) y aprobador (`approved-by`). Se rechazan formatos informales (`nosec`) o incompletos, se bloquea el Quality Gate si la supresión está caducada, y se consolida el inventario completo en `reports/SUPPRESSIONS_AUDIT.md`.

## 2. Dependencias Externas Evaluadas
- Ninguna dependencia adicional requerida. Se emplean capacidades estándar de TypeScript / Node.js.
