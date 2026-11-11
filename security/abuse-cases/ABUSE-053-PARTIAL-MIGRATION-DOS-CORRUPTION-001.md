---
id: ABUSE-053-PARTIAL-MIGRATION-DOS-CORRUPTION-001
type: abuse-case
title: Corrupción Parcial del Repositorio y Bloqueo Permanente de Quality Gates por Fallo No Atómico
status: active
version: 1.0.0
schema-version: '1.0'
primary-threat-actor: ACT-THREAT-ROGUE-AGENT
targets-use-case: UC-053-CLI-MIGRATE
stride-category: denial-of-service
mitigated-by:
  - SEC-REQ-053-ATOMIC-ROLLBACK-001
asvs-controls:
  - V14.2 Build and Deployment Security
  - V1.1 Secure Software Development Lifecycle Requirements
supersedes: null
superseded-by: null
---

# ABUSE-053-PARTIAL-MIGRATION-DOS-CORRUPTION-001: Corrupción Parcial y Bloqueo de Quality Gates por Migración No Atómica

## 1. Vector de Ataque y Mecánica de Explotación
Un fallo imprevisto de I/O, desconexión de proceso (SIGINT/SIGTERM) o interrupción por permisos a mitad de la operación de migración deja un subconjunto de esquemas JSON actualizados mientras que las políticas de gobernanza o las plantillas quedan en la versión anterior o incompletas (escritura truncada a 0 bytes). Como resultado de este estado corrupto intermedio, los validadores de esquemas y las Quality Gates fallan permanentemente de manera cerrada (fail-closed), impidiendo que los desarrolladores y agentes autónomos puedan construir, probar o verificar cambios (`pnpm run verify:all` bloqueado permanentemente por `SyntaxError` o violación de esquema).

## 2. Precondiciones del Ataque
- Modificación directa in-place de archivos sobre el árbol de trabajo sin aislamiento de staging temporal ni transaccionalidad de rollback.
- Ocurrencia de un error transitorio o inducido de I/O a mitad del bucle de escritura de archivos.

## 3. Impacto Potencial
- Denegación de servicio (DoS) del flujo de desarrollo y de los pipelines de CI/CD.
- Bloqueo de lanzamientos urgentes y parches de seguridad hotfix debido a la imposibilidad de validar especificaciones y compuertas de calidad.
- Pérdida de tiempo de ingeniería en la reconstrucción manual de esquemas y políticas dañadas.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Modelado de DoS por corrupción e inconsistencia transaccional durante migración | CHG-053-CLI-MIGRATE |
