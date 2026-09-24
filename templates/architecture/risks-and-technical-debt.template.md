---
id: ARCH-RISK-001
type: risks-and-technical-debt
title: "11. Riesgos de Arquitectura y Deuda Técnica"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 11
naf-perspective: "Risk & Technical Debt"
risks:
  - RSK-SCALE-001
  - RSK-DEP-002
supersedes: null
superseded-by: null
---

# 11. Riesgos y Deuda Técnica (arc42 Sec. 11 / NAF Risk & Debt)

## 1. Matriz de Riesgos Arquitectónicos (`RSK-*`)
Evaluación y seguimiento de los riesgos técnicos identificados en el sistema:

| ID Riesgo | Descripción del Riesgo | Probabilidad | Impacto | Estrategia de Mitigación |
| :--- | :--- | :---: | :---: | :--- |
| `RSK-SCALE-001` | Cuello de botella en la base de datos central ante picos de telemetría | Media | Alto | Implementación de particionamiento horizontal y caché de segundo nivel |
| `RSK-DEP-002`   | Desactualización de librerías criptográficas en runtime | Baja | Crítico | Auditoría SCA automatizada en CI con escaneo diario de vulnerabilidades |
| `RSK-MEM-003`   | Degradación por acumulación de buffers en ingesta | Media | Medio | Monitorización continua de métricas de heap y reinicio determinista |

---

## 2. Registro de Deuda Técnica y Compromisos Asumidos
Documentación de atajos temporales, decisiones provisionales o refactorizaciones pendientes:

| Elemento de Deuda | Componente Afectado | Justificación del Compromiso | Plan de Cancelación / Refactor |
| :--- | :--- | :--- | :--- |
| Serialización JSON en lugar de binario | `CMP-INGEST-001` | Rápido lanzamiento inicial de MVP | Migración planificada a Protobuf en release v2.0 |
| Mock manual en tests de integración | `packages/core` | Evitar dependencia de broker externo en CI | Adopción de contenedores herméticos testcontainers |

---

## 3. Historial de Revisiones y Control de Versiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Definición inicial de riesgos y deuda técnica | CHG-ARCH-001 |
