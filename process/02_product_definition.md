# 02. Definición del Producto: Metodología ProductShape (PDaC)

## 1. Fundamentos de Product Definition as Code

ProductShape establece que **la definición canónica del producto vive en el repositorio Git como texto plano estructurado en Markdown con frontmatter YAML**, situada *antes* del backlog y *antes* del código de implementación.

Un backlog es una cola de trabajo temporal: dice qué hacer a continuación, pero no qué *es* el producto. Las historias completadas acumulan deuda arqueológica. ProductShape sustituye esa dispersión por un **Grafo de Producto Canónico** compuesto por familias de artefactos atómicos con identificadores inmutables.

---

## 2. Familias de Artefactos de Producto

Cada artefacto representa un nodo en el grafo y declara sus relaciones mediante metadatos tipados en su frontmatter:

```
                  ┌──────────────────────┐
                  │     ACTOR (ACT)      │
                  └──────────┬───────────┘
                             │ persigue
                             ▼
                  ┌──────────────────────┐
                  │    JOURNEY (JRN)     │
                  └──────────┬───────────┘
                             │ se descompone en
                             ▼
                  ┌──────────────────────┐
                  │    USE CASE (UC)     │
                  └──────┬────────┬──────┘
                         │        │
           gobernado por │        │ deriva en
                         ▼        ▼
       ┌────────────────────┐   ┌───────────────────────────────┐
       │ BUSINESS RULE (BR) │   │ REQUIREMENTS (FR, QR, CON)   │
       └─────────┬──────────┘   └───────────────────────────────┘
                 │ usa
                 ▼
       ┌────────────────────┐
       │ DOMAIN TERM (TERM) │ ─── definido en ──► BOUNDED CONTEXT (BC)
       └────────────────────┘
```

### Detalle de Familias:
1. **Actores (`ACT-*`)**:
   - Quien o qué interactúa con el producto para obtener un resultado (usuarios, sistemas externos, sensores).
2. **Journeys (`JRN-*`)**:
   - Resultados de extremo a extremo que un actor persigue a lo largo del tiempo, abarcando múltiples casos de uso.
3. **Casos de Uso (`UC-*`)**:
   - Interacciones concretas y delimitadas a través de las cuales un actor alcanza un objetivo de negocio.
4. **Reglas de Negocio (`BR-*`)**:
   - Invariantes, políticas y restricciones de dominio que gobiernan el comportamiento del sistema.
5. **Términos de Dominio (`TERM-*`) & Bounded Contexts (`BC-*`)**:
   - Glosario formal de lenguaje ubicuo. Cada término declara exactamente en qué contexto delimitado (`defined-in: BC-*`) tiene validez su significado.
6. **Requerimientos (`REQ-*`)**:
   - **Requerimientos Funcionales (`FR-*`)**: Capacidades concretas del sistema derivadas de los casos de uso.
   - **Requerimientos de Calidad (`QR-*`)**: Criterios no funcionales medibles (rendimiento, disponibilidad, latencia).
   - **Restricciones de Producto (`CON-*`)**: Límites tecnológicos, regulatorios o de negocio impuestos a la solución.

---

## 3. El Grafo de Producto y Regla de Dirección Canónica

Para evitar inconsistencias y enlaces recíprocos rotos:
- **Toda relación se escribe en exactamente UNA dirección canónica:**
  - Un `use-case` declara `primary-actor`, `governed-by` y `uses-terms`.
  - Un `domain-term` declara `defined-in`.
  - Un `functional-requirement` declara `derives-from`.
- **Las vistas inversas siempre son derivadas y compiladas automáticamente:**
  - Ningún archivo de contexto escribe `owns-terms`; la herramienta compila qué términos pertenecen al contexto evaluando los `defined-in`.
  - Ningún actor escribe `participates-in-use-cases`; se compila a partir de los casos de uso.

---

## 4. Ciclo de Operaciones de Producto

```text
 Idea / Necesidad
        │
        ▼
   ps:explore ────────────► Agente IA razona sobre el grafo existente,
        │                   detecta lagunas y afina la propuesta
        ▼
  Product Change ─────────► changes/active/<chg-id>/: delta semántico con
        │                   los artefactos propuestos en su estado futuro
        ▼
  change validate ────────► Valida el overlay sobre la línea base sin tocar
        │                   archivos canónicos (100% determinista)
        ▼
     Aprobación ──────────► Un humano (Product Owner) revisa y aprueba.
        │                   Ninguna IA puede realizar esta acción.
        ▼
   change apply ──────────► Aplica los cambios en la rama de trabajo y archiva
        │                   la propuesta. Materializado, no aceptado.
        ▼
   Pull Request ──────────► CI valida el grafo completo; revisión humana y merge.
                            El merge es la aceptación formal de la línea base.
```

---

## 5. Estructura de Carpetas de Producto en el Repositorio

```text
docs/product/
├── model/                               # Línea base canónica aceptada
│   ├── actors/                          # ACT-*.md
│   ├── journeys/                        # JRN-*.md
│   ├── use-cases/                       # UC-*.md
│   ├── business-rules/                  # BR-*.md
│   ├── contexts/                        # BC-*.md
│   ├── terms/                           # TERM-*.md
│   └── requirements/                    # FR-*, QR-*, CON-*.md
└── changes/                             # Deltas de evolución
    ├── active/                          # Cambios en elaboración o revisión
    └── completed/                       # Historial inmutable de cambios aplicados
```
