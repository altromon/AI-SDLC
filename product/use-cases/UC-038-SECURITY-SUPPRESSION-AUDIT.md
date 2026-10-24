---
id: UC-038-SECURITY-SUPPRESSION-AUDIT
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: Supresiones Auditadas con Caducidad e Inventario de Excepciones de Seguridad
status: active
primary-actor: ACT-TECH-LEAD
supporting-actors:
  - ACT-AI-AGENT
  - ACT-HUMAN-ENGINEER
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---

# UC-038-SECURITY-SUPPRESSION-AUDIT: Supresiones Auditadas con Caducidad e Inventario

## 1. Intención y Resultado
Eliminar vías no reguladas de bypass de seguridad en el análisis estático (SAST) y detección de secretos (Gitleaks/Entropy), estandarizando un formato declarativo obligatorio para supresiones en código fuente (`ai-sdlc:allow-sast`, `ai-sdlc:allow-secret`) que exige regla o tipo, justificación técnica, fecha límite de expiración y aprobador responsable, bloqueando supresiones vencidas o informales y generando un inventario consolidado en `reports/SUPPRESSIONS_AUDIT.md`.

## 2. Precondiciones
- El repositorio dispone de motores SAST y de escaneo de secretos integrados en AI-SDLC.
- El desarrollador humano o agente IA requiere silenciar temporalmente un falso positivo justificado.

## 3. Flujo Principal
1. El ingeniero o agente inserta un comentario de supresión con los metadatos obligatorios (`rule`, `reason`, `expires="YYYY-MM-DD"`, `approved-by`).
2. Al ejecutarse la verificación de seguridad (`aisdlc verify security` o `aisdlc verify all`), el motor valida cada supresión:
   - Si la fecha de caducidad es futura y los campos obligatorios están presentes, la supresión es aceptada como activa y el hallazgo se silencia.
   - Si la supresión carece de campos obligatorios o utiliza formatos obsoletos/no estructurados (`nosec`), la supresión es rechazada y el hallazgo permanece activo.
   - Si la fecha de expiración ha vencido (`expires < fecha_actual`), la supresión expira, provocando el rechazo y fallo bloqueante del Quality Gate.
3. Se genera o actualiza el informe `reports/SUPPRESSIONS_AUDIT.md` con el censo completo de supresiones activas, vencidas e inválidas.
