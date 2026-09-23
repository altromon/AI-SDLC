---
id: ACT-THREAT-SPOOFER
type: threat-actor
title: Atacante Geospacial / Emisor de Telemetría Falsa (RF Spoofer)
status: active
version: "1.0.0"
schema-version: "1.0"
threat-capability: advanced-persistent-threat
motivation: sabotage
attack-surfaces:
  - "Canal de radioenlace celular/satelital"
  - "Puertos de ingesta telemétrica pública"
supersedes: null
superseded-by: null
---

# ACT-THREAT-SPOOFER: Atacante Geospacial / Suplantador

## 1. Perfil del Adversario
Atacante con capacidad para interceptar tráfico de radiofrecuencia o enviar paquetes forjados al servicio de ingesta, buscando proyectar "aeronaves fantasma" en la consola del operador para provocar falsas alertas de colisión o saturar el sistema.

---

## 2. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Laura Ibáñez (SecOps) | Caracterización de la amenaza de suplantación RF | CHG-SEC-001 |
