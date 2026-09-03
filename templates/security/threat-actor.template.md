---
id: ACT-THREAT-NOMBRE-001
type: threat-actor
title: Perfil del Adversario o Amenaza
status: draft
version: "1.0.0"
schema-version: "1.0"
threat-capability: advanced-persistent-threat # script-kiddie, advanced-persistent-threat, insider-threat, automated-botnet, supply-chain-attacker
motivation: financial-gain # financial-gain, espionage, sabotage, data-theft, reputational-damage
attack-surfaces:
  - "Endpoints públicos de API REST"
  - "Conexiones WebSocket sin mTLS"
supersedes: null
superseded-by: null
---

# ACT-THREAT-NOMBRE-001: Perfil del Adversario

## 1. Caracterización del Atacante
Describe el perfil, nivel técnico, recursos disponibles y modus operandi habitual del adversario.

## 2. Objetivos de Ataque
- Qué activos de información o servicios pretende comprometer.
- Impacto estimado en confidencialidad, integridad y disponibilidad.

---

## 3. Historial de Revisiones y Control de Versiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Security Officer / Threat Modeler | Caracterización inicial del perfil de amenaza | CHG-SEC-001 |
