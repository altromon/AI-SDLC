---
id: ACT-AUTONOMOUS-UAV
type: actor
title: Vehículo Aéreo Autónomo No Tripulado (UAV Drone)
status: active
version: "1.0.0"
schema-version: "1.0"
role-type: sensor-iot
description: Dispositivo autónomo embarcado que transmite ráfagas de telemetría geospacial cada 100 milisegundos.
supersedes: null
superseded-by: null
---

# ACT-AUTONOMOUS-UAV: Vehículo Aéreo Autónomo

## 1. Perfil y Responsabilidad
Dispositivo de hardware con piloto automático que navega rutas predefinidas y transmite estados de vuelo continuos hacia la nube para control de separación aérea.

## 2. Puntos de Contacto con el Sistema
- Conexión celular 5G / Enlace satelital.
- Canal bidireccional WebSocket cifrado con mTLS contra el Gateway de Ingesta.

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Carlos Mendoza (Lead) | Creación inicial de la línea base del actor sensor | CHG-INIT-001 |
