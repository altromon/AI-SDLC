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
- **Trazabilidad Invertida hacia Requisitos (Dependency Inversion):**
  - Ningún requisito (`FR-*`, `QR-*`, `SEC-REQ-*`) almacena punteros descendentes como servicios donde se implementa o rutas de archivos de prueba donde se verifica.
  - Esto evita acoplar el producto abstracto al código concreto, previene conflictos de merge en Git y elimina falsas invalidaciones de los digests criptográficos SHA-256 de PDaC.
  - Son los artefactos descendentes los que declaran la satisfacción hacia arriba:
    - Los servicios de arquitectura (`SRV-*`) declaran `satisfies-requirements: [FR-*, QR-*, SEC-REQ-*]`.
    - Las pruebas unitarias, de integración y escenarios BDD declaran etiquetas `@<REQ-ID>` o citaciones en sus cabeceras.
  - El motor de calidad (`aisdlc verify traceability`) compila la **Matriz de Trazabilidad 360°** de forma determinista mediante resolución inversa (*Reverse Lookup*).

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

---

## 6. Paquetes de Handoff Formal hacia SDD (`HOF-*` Sidecars)

Para transferir la definición de producto a la fase de implementación sin introducir ambigüedades ni rupturas de contexto, PDaC emite paquetes formales de entrega (**Product Handoffs**) con prefijo `HOF-*`:

1. **Subgrafo Inmutable de Entrega**:
   - Cada paquete de handoff empaqueta un subconjunto autocontenido del grafo de producto:
     - Casos de uso (`UC-*`) y actores involucrados.
     - Reglas de negocio gobernantes (`BR-*`).
     - Requerimientos funcionales (`FR-*`), de calidad (`QR-*`) y de seguridad (`SEC-REQ-*`).
     - Casos de abuso mitigados (`ABUSE-*`).
     - Citaciones canónicas con sus digests criptográficos **SHA-256**.

2. **Depósito como Archivos de Acompañamiento (*Sidecars*)**:
   - Mediante los adaptadores formales del AI-SDLC (`OpenSpecAdapter` y `SpecKitAdapter`), el handoff se deposita como un archivo `handoff.yaml` directamente en el espacio de trabajo del cambio (`specs/changes/active/<change-id>/` o `specs/<change-id>/`).
   - El esquema formal [`schemas/sdd/handoff.schema.json`](file:///c:/Users/reypo/Documents/Workspace/AI-SDLC/schemas/sdd/handoff.schema.json) garantiza que ningún agente pueda corromper el contrato de entrega emitido por PDaC.

---

## 7. Extracción y Catálogo Consolidado de Requerimientos Activos

Para auditar y consultar en cualquier momento la totalidad de los requisitos en vigor sin tener que navegar por decenas de archivos dispersos, el framework proporciona el generador determinista:

```bash
# Generar catálogo en reports/ACTIVE_REQUIREMENTS.md
pnpm run report:requirements

# O especificando un destino alternativo
npx tsx scripts/export-active-requirements.ts --out reports/CATALOGO_REQUERIMIENTOS.md
```

El motor escanea los metadatos YAML de la especificación canónica, filtrando aquellos en estado `active` (o `accepted` en arquitectura) y consolidando un documento clasificado en tres secciones:
1. **Requerimientos Funcionales (`FR-*`)**: Título, versión, trazabilidad a casos de uso (`derives-from`), método de verificación, etiquetas Cucumber BDD y enunciado normativo.
2. **Requerimientos de Ciberseguridad (`SEC-REQ-*`)**: Dominio de seguridad, mitigación de casos de abuso (`mitigates-abuse-case`), enclave asignado, marcos normativos (ej. NIST Zero Trust) y controles técnicos.
3. **Requerimientos y Componentes de Arquitectura (`QR-*`, `CON-*`, `CMP-*`, `ADR-*`)**: Atributos de calidad, restricciones técnicas, componentes arc42/NAF v4 y decisiones aceptadas.
