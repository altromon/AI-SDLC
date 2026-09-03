---
id: TSK-PLAN-CHG-001
type: task-plan
change-id: CHG-001-TELEMETRY-INGESTION
title: Desglose de Tareas Verificables y Gobierno de Autonomía
version: "1.0.0"
schema-version: "1.0"
status: in-progress
governance-summary:
  autonomous-tasks-count: 1
  human-review-plan-count: 1
  ambiguous-count: 1
  high-risk-manual-count: 1
tasks:
  - id: "TSK-001"
    title: "Definición de Tipos Cinemáticos e Interfaces de Telemetría"
    complexity: "LOW"
    risk-level: "LOW"
    autonomy-mode: "AUTONOMOUS"
    verification:
      method: "quality-gate"
      command-or-criteria: "npx tsc --noEmit && node scripts/verify-quality-gate.js"
    assigned-to: "agent-developer"
    status: "COMPLETED"

  - id: "TSK-002"
    title: "Implementación del Gateway WSS con Validación mTLS (SRV-TELEMETRY-INGEST)"
    complexity: "MEDIUM"
    risk-level: "MEDIUM"
    autonomy-mode: "HUMAN_REVIEW_PLAN"
    verification:
      method: "automated-unit-test"
      command-or-criteria: "npm test -- tests/unit/telemetry_gateway.spec.ts"
    assigned-to: "agent-developer"
    status: "COMPLETED"

  - id: "TSK-003"
    title: "Inyección de Claves de la CA de Producción y Certificados del HSM"
    complexity: "HIGH"
    risk-level: "CRITICAL"
    autonomy-mode: "HIGH_RISK_MANUAL"
    verification:
      method: "manual-inspection"
      command-or-criteria: "Verificación de checksums de claves en enclave y auditoría de accesos HSM"
    assigned-to: "human-engineer"
    status: "PENDING"

  - id: "TSK-004"
    title: "Algoritmo de Fusión Multisensorial y Corrección Barométrica"
    complexity: "HIGH"
    risk-level: "MEDIUM"
    autonomy-mode: "AMBIGUOUS"
    verification:
      method: "manual-inspection"
      command-or-criteria: "Sesión de refinamiento con el equipo de aerodinámica"
    assigned-to: "human-architect"
    status: "BLOCKED"
    blocking-reason: "Falta especificar la tolerancia barométrica en altitudes superiores a 500m."

supersedes: null
superseded-by: null
---

# Desglose de Tareas: CHG-001-TELEMETRY-INGESTION

## 1. Matriz de Autonomía Humana y Clasificación de Riesgos

| Tarea | Título | Riesgo | Modo de Autonomía | Justificación de Gobierno |
| :--- | :--- | :---: | :---: | :--- |
| **`TSK-001`** | Definición de Tipos Cinemáticos | 🟢 LOW | **`AUTONOMOUS`** | Tipos TypeScript puros sin efectos colaterales. Plan y ejecución 100% autónomos por `agent-developer`. |
| **`TSK-002`** | Gateway WSS y mTLS | 🟡 MEDIUM | **`HUMAN_REVIEW_PLAN`** | Modifica el perimeter gateway `SEC-ENC-DMZ-INGEST`. El plan arquitectónico requirió aprobación previa del Tech Lead. |
| **`TSK-003`** | Despliegue de Certificados HSM | 🔴 CRITICAL | **`HIGH_RISK_MANUAL`** | Manejo de material criptográfico maestro. Prohibida la intervención autónoma de la IA. Ejecución manual exclusiva. |
| **`TSK-004`** | Fusión Multisensorial | 🟠 MEDIUM | **`AMBIGUOUS`** | Requisitos incompletos. La tarea está bloqueada para impedir alucinaciones o asunciones incorrectas. |

---

## 2. Detalle de Tareas y Evidencias de Verificación

### TSK-001: Definición de Tipos Cinemáticos
- **Asignado a**: `agent-developer`
- **Estado**: `COMPLETED` ✅
- **Comando de Verificación**: `npx tsc --noEmit && node scripts/verify-quality-gate.js`
- **Evidencia**: Cero errores de tipado, complejidad ciclomática $\le 4$.

### TSK-002: Implementación del Gateway WSS con mTLS
- **Asignado a**: `agent-developer` (bajo plan revisado por Carlos Mendoza)
- **Estado**: `COMPLETED` ✅
- **Comando de Verificación**: `npm test -- tests/unit/telemetry_gateway.spec.ts`
- **Evidencia**: 100% de los tests unitarios y de handshake mTLS superados.

### TSK-003: Inyección de Claves de CA de Producción
- **Asignado a**: `human-engineer` (Laura Ibáñez - SecOps)
- **Estado**: `PENDING` ⏳
- **Comando de Verificación**: Inspección de firma en enclave perimetral.

### TSK-004: Corrección Barométrica
- **Asignado a**: `human-architect`
- **Estado**: `BLOCKED` 🛑
- **Causa de Bloqueo**: Espera de especificación formal de sensores inerciales.

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Carlos Mendoza | Desglose inicial con matriz de 4 niveles de autonomía | CHG-001 |
