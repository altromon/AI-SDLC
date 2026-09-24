---
id: ARCH-GLOSS-001
type: architecture-glossary
title: "12. Glosario de Arquitectura y Taxonomía de Términos"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 12
naf-perspective: "Taxonomy & Terms"
cites-domain-terms:
  - TERM-TELEMETRY-001
  - TERM-ENCLAVE-001
cites-bounded-contexts:
  - BC-CORE-GOVERNANCE
supersedes: null
superseded-by: null
---

# 12. Glosario de Arquitectura (arc42 Sec. 12 / NAF Taxonomy)

## 1. Términos Canónicos del Dominio (`TERM-*`)
Enlaces y definiciones oficiales de los términos de negocio y dominio del producto:

| Término / ID | Definición Canónica | Bounded Context de Referencia |
| :--- | :--- | :--- |
| `TERM-ENCLAVE-001` | Zona de red aislada lógica o físicamente con políticas de acceso y cifrado estrictas | Arquitectura / Ciberseguridad |
| `TERM-HANDOFF-001` | Contrato canónico inmutable de traspaso de contexto entre agentes de desarrollo e ingeniería | Gobernanza AI-SDLC |
| `TERM-PDAC-001`    | Product-Definition-as-Code: modelado de producto y trazabilidad 360° en repositorios Git | Motor Central |

---

## 2. Abreviaturas y Acrónimos Técnicos
Glosario de conceptos arquitectónicos empleados a lo largo de la documentación del sistema:

| Acrónimo | Significado Completo | Definición en el Contexto del Sistema |
| :--- | :--- | :--- |
| **arc42** | Architecture Communication Template | Estándar modular para documentar y comunicar arquitecturas de software |
| **NAF v4** | NATO Architecture Framework v4 | Marco de arquitectura empresarial para sistemas interoperables y críticos |
| **ADR** | Architecture Decision Record | Registro inmutable de una decisión arquitectónica significativa |
| **mTLS** | Mutual Transport Layer Security | Autenticación bidireccional mediante certificados criptográficos |
| **RTM** | Requirements Traceability Matrix | Matriz de trazabilidad 360° entre requisitos, código y pruebas |

---

## 3. Historial de Revisiones y Control de Versiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Definición inicial del glosario de arquitectura | CHG-ARCH-001 |
