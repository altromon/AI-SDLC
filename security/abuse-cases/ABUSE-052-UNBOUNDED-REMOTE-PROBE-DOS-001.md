---
id: ABUSE-052-UNBOUNDED-REMOTE-PROBE-DOS-001
type: abuse-case
title: Bloqueo por Denegación de Servicio en Comprobaciones de Red No Delimitadas
status: active
version: 1.0.0
schema-version: '1.0'
primary-threat-actor: ACT-THREAT-ROGUE-AGENT
targets-use-case: UC-052-CLI-DOCTOR
stride-category: denial-of-service
mitigated-by:
  - SEC-REQ-052-RESILIENT-DIAGNOSTIC-TIMEOUTS-001
asvs-controls:
  - V14.4 Build and Deployment Availability
  - V11.2 Business Logic Service Availability
supersedes: null
superseded-by: null
---

# ABUSE-052-UNBOUNDED-REMOTE-PROBE-DOS-001: Bloqueo por Denegación de Servicio en Comprobaciones de Red No Delimitadas

## 1. Vector de Ataque y Mecánica de Explotación
Un atacante que controla un proxy de red local, servidor de claves o registro remoto de paquetes simula latencias extremas o desconexiones silenciosas (blackhole HTTP/TCP) cuando el diagnóstico de `aisdlc doctor` intenta verificar endpoints de firma OIDC (ej. Rekor, Sigstore) o registros de paquetes de dependencias. Si las rutinas de comprobación de red o invocación de procesos no cuentan con un tiempo límite de espera estricto (`timeout` <= 2000 ms), el proceso queda colgado indefinidamente, bloqueando la inicialización del IDE, la ejecución de agentes autónomos y pipelines críticos de CI/CD.

## 2. Precondiciones del Ataque
- Entorno de red degradado, proxy corporativo interceptor caído o endpoints externos inaccesibles.
- Ausencia de configuración obligatoria de timeout determinista y política de degradación graciosa (fail-safe fallback) en las llamadas de sondeo de red.

## 3. Impacto Potencial
- Denegación de servicio en pipelines de desarrollo local y CI/CD.
- Bloqueo sistemático de turnos de agentes autónomos que dependen de diagnósticos de pre-flight.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Modelado inicial de abuso por DoS en comprobaciones de red remotas | CHG-052-CLI-DOCTOR |
