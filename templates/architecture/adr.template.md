---
id: ADR-001-NOMBRE-DECISION
type: architecture-decision-record
title: Título Claro de la Decisión Técnica
status: proposed # proposed, accepted, rejected, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
deciders:
  - "Nombre del Arquitecto Lead"
  - "Nombre del Tech Lead"
decision-date: "2026-09-03"
affects-services:
  - SRV-NOMBRE-001
supersedes: null
superseded-by: null
---

# ADR-001: Título Claro de la Decisión Técnica

## 1. Contexto y Planteamiento del Problema
Describe el contexto tecnológico, los requerimientos (`FR-*`, `QR-*`, `SEC-REQ-*`) que motivan la decisión y las fuerzas en tensión (rendimiento, coste, complejidad, cumplimiento de licencias).

## 2. Opciones Tecnológicas Consideradas
1. **Opción A**: [Ventajas y desventajas, régimen de licencia OSS].
2. **Opción B**: [Ventajas y desventajas, régimen de licencia OSS].

## 3. Decisión Adoptada
Elegimos la **Opción [A/B]** porque [justificación técnica y de negocio sólida].

## 4. Consecuencias
- **Positivas**: Reducción de latencia, conformidad con `license-policy.yaml`.
- **Negativas / Compromisos (Trade-offs)**: Mayor consumo de memoria inicial o necesidad de instrumentación adicional.

---

## 5. Historial de Revisiones y Control de Versiones

| Versión | Fecha | Decisores | Estado de la Decisión | Referencia (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-03 | Lead Architect & Tech Lead | Propuesta formal de la decisión | CHG-ARCH-001 |
