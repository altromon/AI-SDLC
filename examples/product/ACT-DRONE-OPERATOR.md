---
id: ACT-DRONE-OPERATOR
type: actor
title: Operador de Vuelo de Drones (UAV Flight Operator)
status: active
version: "1.0.0"
schema-version: "1.0"
role-type: human-user
description: Ingeniero de operaciones de vuelo responsable de supervisar misiones de drones autónomos en tiempo real.
supersedes: null
superseded-by: null
---

# ACT-DRONE-OPERATOR: Operador de Vuelo de Drones

## 1. Perfil y Responsabilidad
El Operador de Vuelo supervisa flotas de vehículos aéreos no tripulados (UAVs). Requiere visibilidad continua de altitud, posición GPS, estado de batería y vectores de velocidad para intervenir en caso de conflicto de tráfico o anomalía técnica.

## 2. Puntos de Contacto con el Sistema
- Consola Web de Control de Misiones (Dashboard en tiempo real).
- Suscripción a eventos críticos y alertas de colisión vía WebSocket seguro.

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Carlos Mendoza (Lead) | Creación inicial de la línea base del actor | CHG-INIT-001 |
