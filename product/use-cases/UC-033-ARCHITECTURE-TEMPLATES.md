---
id: UC-033-ARCHITECTURE-TEMPLATES
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: Estandarización de Plantillas de Arquitectura arc42 y NAF v4
status: active
primary-actor: ACT-TECH-LEAD
supporting-actors:
  - ACT-AI-AGENT
  - ACT-HUMAN-ENGINEER
supersedes: null
superseded-by: null
---

# UC-033-ARCHITECTURE-TEMPLATES: Plantillas de Arquitectura arc42 y NAF v4

## 1. Intención y Resultado
Proporcionar a arquitectos de software, desarrolladores y agentes de IA un catálogo exhaustivo y modular de plantillas Markdown con YAML frontmatter estructurado para cada una de las 12 secciones del estándar combinado arc42 + NAF v4, garantizando rigor metodológico, trazabilidad determinista y consistencia arquitectónica en todos los proyectos gestionados bajo AI-SDLC.

## 2. Precondiciones
- El repositorio está gobernado bajo las especificaciones de AI-SDLC definidas en `process/05_architecture_arc42_nafv4.md`.

## 3. Flujo Principal
1. El arquitecto o agente de IA inicializa o documenta la arquitectura del sistema.
2. Selecciona la plantilla correspondiente a la sección requerida dentro de `templates/architecture/`.
3. Instancia el documento conservando el encabezado YAML frontmatter con metadatos estructurados (`id`, `type`, `version`, citas cruzadas `QR-*`, `CON-*`, `OIE-*`, `CMP-*`, etc.).
4. El motor de validación de esquemas y trazabilidad 360° verifica que los artefactos instanciados mantengan consistencia bidireccional entre producto, arquitectura y pruebas.
