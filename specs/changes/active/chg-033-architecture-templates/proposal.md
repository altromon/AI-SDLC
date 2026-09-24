---
id: CHG-033-ARCHITECTURE-TEMPLATES
type: spec-change-proposal
title: "Plantillas Canónicas de Arquitectura arc42 y NAF v4"
status: proposed
author: "agent-architect / agent-developer"
citations:
  - id: FR-033-ARCHITECTURE-TEMPLATES-001
    digest: sha256:6c3bd29d58191c964c84f10f2af7723e901acad6d2720877e52fc552a6c40f80
    comment: Requerimiento funcional canónico asociado (Génesis CHG-033-ARCHITECTURE-TEMPLATES)
---

# Propuesta de Cambio: CHG-033-ARCHITECTURE-TEMPLATES

## 1. Motivación y Alcance
Esta propuesta resuelve el issue [#92](https://github.com/altromon/AI-SDLC/issues/92) ("Faltan templates de arquitectura"). Conforme a los principios de arquitectura descritos en `process/05_architecture_arc42_nafv4.md`, AI-SDLC adopta la fusión de las 12 secciones de arc42 con las perspectivas empresariales de NAF v4. Hasta la fecha, el repositorio únicamente contenía `adr.template.md` (Sec. 9) y `component.template.md` (Sec. 5).

Esta propuesta genera el catálogo completo de plantillas modulares con frontmatter YAML estructurado para las 10 secciones restantes, garantizando que desarrolladores y agentes dispongan de los andamios oficiales para documentar la arquitectura de cualquier proyecto.

## 2. Dependencias Externas Evaluadas
- Cero dependencias externas adicionales requeridas. Se apoya en el tooling nativo de TypeScript y Node.js.
