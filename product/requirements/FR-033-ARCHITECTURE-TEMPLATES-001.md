---
id: FR-033-ARCHITECTURE-TEMPLATES-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: Plantillas Canónicas de Arquitectura arc42 y NAF v4
status: active
category: functional
derives-from:
  - UC-033-ARCHITECTURE-TEMPLATES
verifiable-by: automated-unit-test
acceptance-format: declarative-prose
supersedes: null
superseded-by: null
---

# FR-033-ARCHITECTURE-TEMPLATES-001: Plantillas Canónicas de Arquitectura

## 1. Enunciado Normativo
El sistema DEBE suministrar en `templates/architecture/` un conjunto integral y determinista de plantillas Markdown para las 12 secciones de la fusión arc42 + NAF v4, incorporando YAML frontmatter con metadatos estructurados para facilitar la trazabilidad bidireccional, el análisis automatizado y la interoperabilidad con agentes de IA y herramientas de gobernanza.

## 2. Criterios de Aceptación
- **Criterio 1 (Cobertura Completa de Secciones)**: `templates/architecture/` debe albergar plantillas canónicas para las secciones 1 a 12 de arc42/NAF v4:
  1. Introducción y Objetivos (`introduction-and-goals.template.md`)
  2. Restricciones de Arquitectura (`architecture-constraints.template.md`)
  3. Contexto y Alcance (`context-and-scope.template.md`)
  4. Estrategia de Solución (`solution-strategy.template.md`)
  5. Vista de Bloques L1 Whitebox (`level-1-whitebox.template.md`) y Componentes L1-L3 (`component.template.md`)
  6. Vista de Ejecución (`runtime-view.template.md`)
  7. Vista de Despliegue (`deployment-view.template.md`)
  8. Conceptos Transversales (`cross-cutting-concepts.template.md`)
  9. Decisiones de Arquitectura (`adr.template.md`)
  10. Requerimientos de Calidad (`quality-requirements.template.md`)
  11. Riesgos y Deuda Técnica (`risks-and-technical-debt.template.md`)
  12. Glosario de Arquitectura (`glossary.template.md`)
- **Criterio 2 (Estructura y Frontmatter Canónico)**: Cada plantilla debe contener encabezado YAML con `id`, `type`, `version`, `status` y campos de relación acordes con la especificación normativa `process/05_architecture_arc42_nafv4.md`.
- **Criterio 3 (Verificabilidad Automatizada)**: La existencia, sintaxis y frontmatters de todas las plantillas deben ser validadas mediante pruebas unitarias automatizadas en la suite del monorepo.
