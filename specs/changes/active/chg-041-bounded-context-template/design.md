---
id: DSN-CHG-041-BOUNDED-CONTEXT-TEMPLATE
type: design-delta
title: "bounded-context-template"
version: 1.0.0
schema-version: "1.0"
status: draft
change-id: CHG-041-BOUNDED-CONTEXT-TEMPLATE
citations:
  - id: FR-041-BOUNDED-CONTEXT-TEMPLATE-001
    digest: sha256:85a834c380bc19f42022c2f29d57c9f07a75a8e247fdf98398c385b7f90951d4
    comment: Citación de requirement
---

# Diseño de Implementación: CHG-041-BOUNDED-CONTEXT-TEMPLATE

## 1. Estructura de Artefactos de Producto
```mermaid
graph TD
    BC["Bounded Context (BC-*)"] --> Term["Términos Ubicuos (TERM-*)"]
    BC --> UC["Casos de Uso (UC-*)"]
    BC --> CMP["Componentes (CMP-*)"]
    BC --> BR["Reglas de Negocio (BR-*)"]
```

## 2. Alineación con el Ciclo de Scaffolding
- Durante `initProject`, la colección `STARTER_BASE_TEMPLATES` se itera y escribe deterministamente en el sistema de archivos del usuario.
- La incorporación de `bounded-context.template.md` completa la suite de modelado DDD (`product/`).
