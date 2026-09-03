---
id: ADR-001-WEBSOCKET-STACK
type: architecture-decision-record
title: Selección de la Pila WebSocket y Motor de Concurrencia para Ingesta
status: accepted
version: "1.0.0"
schema-version: "1.0"
deciders:
  - "Carlos Mendoza (Lead Architect)"
  - "Laura Ibáñez (SecOps Lead)"
decision-date: "2026-09-03"
affects-services:
  - SRV-TELEMETRY-INGEST
supersedes: null
superseded-by: null
---

# ADR-001: Selección de la Pila WebSocket para Ingesta Telemétrica

## 1. Contexto y Problema
El servicio `SRV-TELEMETRY-INGEST` debe procesar 10.000 drones simultáneos transmitiendo a 10 Hz (100.000 mensajes/segundo) con latencia <50ms (`QR-LATENCY-REALTIME`). La solución debe admitir terminación mTLS y cumplir rigurosamente con la política de licencias `license-policy.yaml`.

## 2. Opciones Evaluadas
1. **Opción 1: Node.js + `ws`**: Motor maduro, licencia MIT (libre uso), soporte nativo mTLS.
2. **Opción 2: ZeroMQ bindings C**: Rendimiento ultra alto pero dependiente de librerías con licencia LGPL que complican la distribución estática de contenedores mínimos.
3. **Opción 3: Servidor Propietario / Broker Comercial de Streaming**: Requiere pago por conexión concurrente ($35.000/año) bajo licencia BSL/Comercial.

## 3. Decisión
Se adopta la **Opción 1 (`ws` + Node.js LTS)**. 
- La librería `ws` cuenta con licencia **MIT (Permisiva - Allowlist)**.
- Los benchmarks demuestran capacidad de ingesta de 120.000 msg/seg por nodo con consumo moderado de CPU y memoria.
- Evita costes comerciales y riesgos de copyleft viral.

## 4. Consecuencias
- **Positivas**: Cero coste de licencias, código auditable, soporte nativo de certificados cliente x509.
- **Negativas**: Requiere optimizar el garbage collector de Node.js mediante buffers reusables para evitar pausas GC bajo picos de carga.

---

## 5. Historial de Revisiones

| Versión | Fecha | Decisores | Estado de la Decisión | Referencia (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Carlos Mendoza & Laura Ibáñez | Aceptación formal de la tecnología WebSocket | CHG-ARCH-001 |
