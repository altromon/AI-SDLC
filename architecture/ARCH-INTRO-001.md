---
id: ARCH-INTRO-001
type: architecture-introduction
title: "01. Introducción y Metas del Sistema: AI-SDLC Framework"
status: accepted
version: "1.0.0"
schema-version: "1.0"
arc42-section: 1
naf-perspective: "Enterprise & Capability"
cites-product-actors:
  - ACT-PRODUCT-OWNER
  - ACT-TECH-LEAD
  - ACT-HUMAN-ENGINEER
  - ACT-AI-AGENT
cites-quality-goals:
  - SEC-REQ-DETERMINISTIC-VERIFY
cites-journeys:
  - JRN-AI-ASSISTED-SDLC
supersedes: null
superseded-by: null
---

# 01. Introducción y Metas del Sistema (arc42 Sec. 1 / NAF v4 Enterprise & Capability)

## 1. Visión del Sistema y Resumen Ejecutivo
**AI-SDLC** es un marco normativo y motor determinista de ingeniería de software asistida por Inteligencia Artificial que gobierna todo el ciclo de vida de desarrollo (Product Definition as Code, Threat Modeling STRIDE/OWASP, Arquitectura arc42 + NAF v4, Spec-Driven Development y Quality Gates).

### 1.1 Declaración deIntención y Misión (Capability Vision)
> *El sistema AI-SDLC proporciona gobernanza determinista, trazabilidad 360° con sellado criptográfico SHA-256 y orquestación nativa de agentes especializados para equipos de ingeniería híbridos (Humanos + Agentes IA), eliminando la deriva entre intención de negocio, especificaciones y código de producción.*

---

## 2. Metas de Calidad Prioritarias (Citas Canónicas ProductShape / Security)

| Prioridad | Meta de Calidad | ID de Requisito | Justificación Arquitectónica |
| :---: | :--- | :--- | :--- |
| **1** | Verificación Criptográfica Determinista | `SEC-REQ-DETERMINISTIC-VERIFY` | Validación de esquemas JSON Draft 2020-12 y hashes SHA-256 normalizados (LF) para impedir bypass de especificaciones |

---

## 3. Matriz de Interesados y Actores Principales

| Rol / Interesado | ID de Actor | Expectativas Arquitectónicas y de Producto |
| :--- | :--- | :--- |
| **Product Owner** | `ACT-PRODUCT-OWNER` | Captura de intención del producto (`ARCH-INTRO-*`), gobierno de alcance MVP y aprobación de handoffs |
| **Tech Lead / Arquitecto** | `ACT-TECH-LEAD` | Coherencia estructural arc42 + NAF v4 (`CMP-*`, `ADR-*`), umbrales de mantenibilidad y complejidad |
| **Ingeniero Humano** | `ACT-HUMAN-ENGINEER` | Flujo Git de 4 niveles, ventana de acción humana clara y diagnósticos deterministas en CLI/IDE |
| **Agente de IA** | `ACT-AI-AGENT` | Contratos JSON estructurados (`@aisdlc/mcp`), reglas por rol y guardrails deterministas sin ambigüedad |

---

## 4. Historial de Revisiones y Control de Versiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-12 | Product Owner / `agent-product-analyst` | Definición fundacional de intención y visión de capacidades del framework AI-SDLC | `ARCH-INTRO-001` |
