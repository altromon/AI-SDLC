---
id: TERM-NOMBRE-001
type: term
title: Nombre del Término Canónico
status: draft
version: "1.0.0"
schema-version: "1.0"
definition: "Definición canónica, formal y no ambigua del concepto dentro del lenguaje ubicuo del dominio."
bounded-context: "FlightControl"
synonyms:
  - "Término Alternativo"
  - "Alias Técnico"
anti-terms:
  - "Término Confuso o Desaconsejado"
  - "Concepto Coloquial Inexacto"
related-terms:
  - TERM-RELACIONADO-001
supersedes: null
superseded-by: null
---

# TERM-NOMBRE-001: Nombre del Término Canónico

## 1. Definición Formal (Lenguaje Ubicuo)
> **Definición**: Definición canónica, formal y no ambigua del concepto dentro del lenguaje ubicuo del dominio.

Este concepto establece una verdad semántica compartida entre expertos de dominio, desarrolladores e ingenieros de seguridad, eliminando interpretaciones ambiguas en especificaciones y código.

---

## 2. Bounded Context y Delimitación Semántica
- **Bounded Context**: `FlightControl`
- **Ámbito de Aplicación**: Válido en modelos de dominio, entidades de base de datos, APIs públicas y eventos de telemetría de este contexto.

---

## 3. Guía Terminológica (Uso Correcto vs. Incorrecto)

| Categoría | Término | Guía de Aplicación |
| :--- | :--- | :--- |
| **Canónico** | `Nombre del Término Canónico` | Usar de forma obligatoria en DTOs, interfaces y documentación formal. |
| **Sinónimo Admitido** | `Término Alternativo` | Admitido exclusivamente en manuales de usuario o lenguaje informal. |
| **Anti-Término (Prohibido)** | `Término Confuso o Desaconsejado` | **Prohibido**: Conduce a confusión de dominio o colisión semántica. |

---

## 4. Términos Relacionados

- `TERM-RELACIONADO-001`: Concepto complementario dentro del mismo bounded context.

---

## 5. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-23 | Domain Architect / PO | Incorporación inicial al glosario de dominio | CHG-INIT-001 |
