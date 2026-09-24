---
id: CHG-033-ARCHITECTURE-TEMPLATES-DESIGN
type: spec-change-design
title: "Diseño Estructural de Plantillas de Arquitectura arc42 y NAF v4"
status: draft
citations:
  - id: FR-033-ARCHITECTURE-TEMPLATES-001
    digest: sha256:6c3bd29d58191c964c84f10f2af7723e901acad6d2720877e52fc552a6c40f80
    comment: Requerimiento funcional canónico asociado (Génesis CHG-033-ARCHITECTURE-TEMPLATES)
---

# Diseño de Arquitectura: CHG-033-ARCHITECTURE-TEMPLATES

## 1. Alineación Metodológica: arc42 + NAF v4
Conforme a `process/05_architecture_arc42_nafv4.md`, la estructura de documentación de arquitectura del framework sigue la descomposición canónica en 12 secciones:

```text
docs/architecture/
├── 01_introduction_and_goals.md        <- introduction-and-goals.template.md
├── 02_architecture_constraints.md       <- architecture-constraints.template.md
├── 03_context_and_scope/
│   ├── business_context.md              <- context-and-scope.template.md
│   └── technical_context.md
├── 04_solution_strategy.md              <- solution-strategy.template.md
├── 05_building_blocks/
│   ├── level_1_whitebox.md              <- level-1-whitebox.template.md
│   └── components/                      <- component.template.md (CMP-*)
├── 06_runtime_view/                     <- runtime-view.template.md (SEQ-*, FLW-*)
├── 07_deployment_view/                  <- deployment-view.template.md (DEP-*, RES-*)
├── 08_cross_cutting/
│   ├── data_models/                     <- cross-cutting-concepts.template.md (DATA-*, SEC-*)
│   └── security_concept.md
├── 09_decisions/                        <- adr.template.md (ADR-*)
├── 10_quality_requirements.md           <- quality-requirements.template.md (QR-*)
├── 11_risks_and_technical_debt.md       <- risks-and-technical-debt.template.md (RSK-*)
└── 12_glossary.md                       <- glossary.template.md (TERM-*, BC-*)
```

## 2. Formato de Archivos y Metadatos YAML Frontmatter
Todas las plantillas siguen el estándar as-code:
1. **Encabezado YAML Frontmatter**:
   - `id`: Identificador canónico del artefacto (ej. `ARCH-INTRO-001`, `CON-001`, `STRAT-001`, etc.).
   - `type`: Tipo formal del documento (ej. `architecture-introduction`, `architecture-constraint`, `context-and-scope`, `solution-strategy`, `architecture-runtime-view`, etc.).
   - `title`: Título claro y conciso del artefacto.
   - `status`: Estado del ciclo de vida (`draft`, `proposed`, `accepted`, `deprecated`, `superseded`).
   - `version`: Versionado semántico (`1.0.0`).
   - `schema-version`: Versión del esquema (`1.0`).
   - Campos relacionales de trazabilidad (`cites`, `affects-components`, `enclaves-involved`, etc.).
2. **Cuerpo Markdown Estructurado**:
   - Secciones numeradas según arc42.
   - Bloques Mermaid nativos para diagramas de secuencia, flujos de estados, topología y cajas blancas.
   - Tablas de control de revisiones y enlaces de trazabilidad a requerimientos (`FR-*`, `QR-*`, `SEC-REQ-*`) y decisiones (`ADR-*`).
