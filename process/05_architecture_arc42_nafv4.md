# 05. Arquitectura de Sistemas: Fusión de arc42 y NAF v4

## 1. Visión y Necesidad de la Arquitectura en la Era de los Agentes

ProductShape define *qué* es el producto y *para quién*. Sin embargo, los agentes de IA necesitan instrucciones arquitectónicas precisas sobre *cómo* se estructuran los servicios, qué protocolos de red se emplean, cómo se desacoplan los módulos y qué límites de seguridad rigen cada componente.

**AI-SDLC unifica dos estándares líderes:**
1. **arc42**: Proporciona el marco pragmático, comprensible y estructurado en 12 secciones que los desarrolladores y los LLMs comprenden de forma natural.
2. **NAF v4 (NATO Architecture Framework v4)**: Aporta el rigor formal de la matriz de arquitectura empresarial (perspectivas de Capacidades, Operacional, de Servicios y de Recursos/Sistemas), ideal para sistemas críticos, escalables e interoperables.

---

## 2. La Matriz de Fusión: arc42 Enriquecido con NAF v4

Cada sección de **arc42** se materializa en el repositorio como documentos Markdown modulares con YAML frontmatter, integrando los conceptos clave del grid de **NAF v4**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MAPEO CANÓNICO: arc42 + NAF v4                       │
└────────────────────────────────────────────────────────────────────────┘

 arc42 Sección                        Perspectiva NAF v4       Artefactos AI-SDLC
 ─────────────────────────────────── ──────────────────────── ──────────────────────────
 1. Introducción y Objetivos         Enterprise & Capability  Cita ProductShape ACT & UC
 2. Restricciones de Arquitectura    Architecture Constraints CON-*, ACON-*, LIC-POL-*
 3. Contexto y Alcance               Operational Perspective  CTX-*, OIE-* (Info Exchange)
 4. Estrategia de Solución           Service & Resource Strat STRAT-*
 5. Vista de Bloques (Building)      Services & Systems       CMP-* (Whitebox L1-L3)
 6. Vista de Ejecución (Runtime)     Behaviour & Sequences    SEQ-*, FLW-*
 7. Vista de Despliegue              Resource / Deployment    RES-*, DEP-* (Nodos, Infra)
 8. Conceptos Transversales          Information & Security   DATA-*, SEC-ENC-*, SEC-POL-*
 9. Decisiones de Arquitectura       Governance & Architecture ADR-* (Decisiones Inmutables)
 10. Requerimientos de Calidad       Quality Perspective      Cita ProductShape QR-*
 11. Riesgos y Deuda Técnica         Risk & Technical Debt    RSK-*
 12. Glosario                        Taxonomy & Terms         Cita ProductShape TERM-*, BC-*
```

---

## 3. Detalle de Secciones Clave en el Paradigma As-Code

### Sección 3: Contexto y Alcance (NAF Operational)
- Modela el límite del sistema respecto a actores externos y sistemas vecinos.
- **Intercambios de Información Operativa (`OIE-*`)**: Define los mensajes, eventos o cargas útiles que cruzan la frontera del sistema.

### Sección 5: Vista de Bloques de Construcción (NAF Services & Systems / arc42 Sec. 5)
Modela la estructura interna del sistema mediante un **esquema único universal de componente (`CMP-*`)**, permitiendo una descomposición recursiva multinivel que se adapta a sistemas distribuidos, monolitos modulares y arquitecturas basadas en plugins o DLLs:

#### Niveles de Arquitectura Recomendados:
1. **Nivel 1: Sistema Raíz / Bounded Context (DDD)**:
   - Delimita una frontera conceptual, lingüística y de dominio explícita (`bounded-context: "Nombre"`).
   - Metadatos: `level: 1`, `parent-component: null`.
   - Implementación: `implementation-type: composite` (para agrupar lógicamente subsistemas/contenedores sin código ejecutable propio) o `service` / `function` si el sistema es un ejecutable autónomo.
2. **Nivel 2: Subsistemas / Módulos de Despliegue / Contenedores**:
   - Define las unidades de despliegue o contenedores de ejecución del Bounded Context.
   - Metadatos: `level: 2`, `parent-component: CMP-CONTEXT-ROOT`.
   - Implementación:
     - `service`: Microservicios, daemons en red o workers asíncronos con interfaces de red (`REST/HTTP`, `gRPC`, `WebSocket`, `Kafka`, `MQTT`, `IPC`).
     - `dll`: Bibliotecas dinámicas principales o subsistemas compartidos.
     - `function`: Módulos de aplicación de proceso único o monolitos.
3. **Nivel 3: Unidades de Ejecución / Componentes Internos**:
   - Descomposición de grano fino dentro de un contenedor o subsistema.
   - Metadatos: `level: 3`, `parent-component: CMP-SUBSYSTEM-ROOT`.
   - Implementación:
     - `dll`: Plugins nativos o librerías de enlace dinámico (.dll, .so, .dylib) con contratos binarios (`C-ABI`, `Native-ABI`, `FFI`).
     - `function`: Módulos de cálculo matemático, parsers o lógica de dominio pura con contratos in-process (`Function-Call`, `In-Process API`, `CLI`).
4. **Nivel 4 (Opcional): Clases / Algoritmos Atómicos Críticos**:
   - Reservado para componentes hipercríticos (criptografía, algoritmos cinemáticos de seguridad) donde funciones individuales requieren auditoría y trazabilidad RTM unitaria.

#### Regla de Trazabilidad Multinivel:
- Todo componente `CMP-*` declara qué casos de uso implementa (`implements-use-cases: [UC-*]`) y qué requerimientos funcionales, de calidad o de seguridad satisface (`satisfies-requirements: [FR-*, QR-*, SEC-REQ-*]`).
- Si un requerimiento se satisface en un componente especializado de Nivel 3 (p. ej., una DLL o función), el motor de trazabilidad 360° resuelve la cobertura tanto a nivel del componente ejecutor como de su contexto padre (`parent-component`).
- El campo `hosted-in-enclave: SEC-ENC-*` solo es obligatorio cuando el componente se despliega en un enclave de red físico o lógico segmentado. Para DLLs o funciones in-process, es opcional.

### Sección 6: Vista de Ejecución / Runtime (NAF Sequences & Behaviour)
- Diagramas de secuencia y flujos de estados (modelados mediante sintaxis nativa de **Mermaid**).
- Describe la orquestación entre servicios ante peticiones de negocio o eventos asíncronos.

### Sección 7: Vista de Despliegue (NAF Resource Deployment)
- Mapeo de los bloques de software a infraestructura física o en la nube (Kubernetes Pods, Serverless functions, bases de datos gestionadas, enclaves perimetrales).

### Sección 8: Conceptos Transversales
- **Modelos de Datos (`DATA-*`)**: Esquemas de datos lógicos y físicos (DDL, contratos OpenAPI/AsyncAPI, Protobuf).
- **Concepto de Seguridad (`SEC-CONCEPT-*`)**: Identidad, autenticación mTLS, gestión de secretos, rotación de claves y cifrado.
- **Concepto de Observabilidad**: Trazabilidad distribuida (OpenTelemetry), métricas y logs estructurados.

### Sección 9: Decisiones de Arquitectura (ADRs)
- Cada decisión técnica relevante (elección de base de datos, patrón de mensajería, selección de frameworks de terceros) se registra mediante un **ADR inmutable**:
  - Estado: `proposed`, `accepted`, `superseded`.
  - Contexto, decisión adoptada y consecuencias (positivas y negativas).
  - Aprobación exclusivamente humana.

---

## 4. Estructura de Carpetas de Arquitectura

```text
docs/architecture/
├── 01_introduction_and_goals.md        # Instanciado desde introduction-and-goals.template.md
├── 02_architecture_constraints.md       # Instanciado desde architecture-constraints.template.md
├── 03_context_and_scope/                # Instanciado desde context-and-scope.template.md
│   ├── business_context.md
│   └── technical_context.md
├── 04_solution_strategy.md              # Instanciado desde solution-strategy.template.md
├── 05_building_blocks/
│   ├── level_1_whitebox.md              # Instanciado desde level-1-whitebox.template.md
│   └── components/                      # CMP-*.md instanciados desde component.template.md
├── 06_runtime_view/                     # SEQ-*.md instanciados desde runtime-view.template.md
├── 07_deployment_view/                  # DEP-*.md instanciados desde deployment-view.template.md
├── 08_cross_cutting/
│   ├── data_models/                     # DATA-*.md y schemas
│   └── security_concept.md              # Instanciado desde cross-cutting-concepts.template.md
├── 09_decisions/                        # ADR-*.md instanciados desde adr.template.md
├── 10_quality_requirements.md           # Instanciado desde quality-requirements.template.md
├── 11_risks_and_technical_debt.md       # Instanciado desde risks-and-technical-debt.template.md
└── 12_glossary.md                       # Instanciado desde glossary.template.md
```

---

## 5. Catálogo Canónico de Plantillas de Arquitectura (`templates/architecture/`)

AI-SDLC provee un conjunto completo y estandarizado de plantillas Markdown con **YAML frontmatter** estructurado bajo `templates/architecture/`, cubriendo exhaustivamente las 12 secciones de arc42 y sus correspondencias en NAF v4:

### 5.1 Matriz de Plantillas y Artefactos

| Sección arc42 | Perspectiva NAF v4 | Archivo de Plantilla | Artefactos / IDs | Propósito y Contenido Clave |
| :---: | :--- | :--- | :--- | :--- |
| **01** | Enterprise & Capability | [`introduction-and-goals.template.md`](../templates/architecture/introduction-and-goals.template.md) | `ARCH-INTRO-*` | Visión ejecutiva, objetivos de calidad (`QR-*`) y stakeholders (`ACT-*`). |
| **02** | Architecture Constraints | [`architecture-constraints.template.md`](../templates/architecture/architecture-constraints.template.md) | `CON-*`, `ACON-*` | Restricciones técnicas, organizativas y políticas de licencia OSS (`license-policy.yaml`). |
| **03** | Operational Perspective | [`context-and-scope.template.md`](../templates/architecture/context-and-scope.template.md) | `CTX-*`, `OIE-*` | Delimitación de fronteras, contexto de negocio/técnico e intercambios de información. |
| **04** | Service & Resource Strat | [`solution-strategy.template.md`](../templates/architecture/solution-strategy.template.md) | `STRAT-*` | Decisiones tecnológicas base, patrones fundamentales (DDD, Event-Driven) y tradeoffs. |
| **05** | Services & Systems (L1) | [`level-1-whitebox.template.md`](../templates/architecture/level-1-whitebox.template.md) | `ARCH-L1-*` | Caja blanca macro Nivel 1, Bounded Contexts y descomposición en subsistemas. |
| **05** | Services & Systems (L1-L3) | [`component.template.md`](../templates/architecture/component.template.md) | `CMP-*` | Especificación recursiva de componentes (servicios, DLLs, funciones, contratos). |
| **06** | Behaviour & Sequences | [`runtime-view.template.md`](../templates/architecture/runtime-view.template.md) | `SEQ-*`, `FLW-*` | Escenarios nominales, excepciones y seguridad con diagramas Mermaid nativos. |
| **07** | Resource / Deployment | [`deployment-view.template.md`](../templates/architecture/deployment-view.template.md) | `RES-*`, `DEP-*` | Topología de nodos físicos/cloud, clusters y enclaves segmentados (`SEC-ENC-*`). |
| **08** | Information & Security | [`cross-cutting-concepts.template.md`](../templates/architecture/cross-cutting-concepts.template.md) | `DATA-*`, `SEC-*` | Concepto de seguridad Zero Trust, modelos de datos (`DATA-*`) y observabilidad. |
| **09** | Governance & Architecture | [`adr.template.md`](../templates/architecture/adr.template.md) | `ADR-*` | Registros inmutables de decisiones arquitectónicas con consecuencias y aprobación. |
| **10** | Quality Perspective | [`quality-requirements.template.md`](../templates/architecture/quality-requirements.template.md) | `ARCH-QUAL-*` | Árbol de calidad jerárquico (ISO/IEC 25010) y escenarios evaluables citando `QR-*`. |
| **11** | Risk & Technical Debt | [`risks-and-technical-debt.template.md`](../templates/architecture/risks-and-technical-debt.template.md) | `RSK-*` | Matriz de riesgos técnicos, severidad, impacto, mitigación y registro de deuda técnica. |
| **12** | Taxonomy & Terms | [`glossary.template.md`](../templates/architecture/glossary.template.md) | `TERM-*`, `BC-*` | Glosario unificado citando términos de dominio (`TERM-*`) y Bounded Contexts (`BC-*`). |

---

### 5.2 Guía de Uso e Instanciación en Proyectos

1. **Instanciación Inicial de la Arquitectura del Sistema**:
   Al arrancar un proyecto o módulo mayor, copie las plantillas estructurales hacia `docs/architecture/`:
   ```bash
   # Crear estructura base de documentación de arquitectura
   mkdir -p docs/architecture/03_context_and_scope
   mkdir -p docs/architecture/05_building_blocks/components
   mkdir -p docs/architecture/06_runtime_view
   mkdir -p docs/architecture/07_deployment_view
   mkdir -p docs/architecture/08_cross_cutting/data_models
   mkdir -p docs/architecture/09_decisions

   # Instanciar las plantillas base
   cp templates/architecture/introduction-and-goals.template.md docs/architecture/01_introduction_and_goals.md
   cp templates/architecture/architecture-constraints.template.md docs/architecture/02_architecture_constraints.md
   cp templates/architecture/solution-strategy.template.md docs/architecture/04_solution_strategy.md
   cp templates/architecture/level-1-whitebox.template.md docs/architecture/05_building_blocks/level_1_whitebox.md
   cp templates/architecture/quality-requirements.template.md docs/architecture/10_quality_requirements.md
   cp templates/architecture/risks-and-technical-debt.template.md docs/architecture/11_risks_and_technical_debt.md
   cp templates/architecture/glossary.template.md docs/architecture/12_glossary.md
   ```

2. **Creación de Componentes (`CMP-*`) y Decisiones (`ADR-*`)**:
   Para cada nuevo microservicio, DLL o librería modular:
   ```bash
   cp templates/architecture/component.template.md docs/architecture/05_building_blocks/components/CMP-MI-SERVICIO.md
   ```
   Rellene en el frontmatter YAML los campos `level`, `implementation-type`, `implements-use-cases` y `satisfies-requirements`.

   Para registrar decisiones técnicas vinculantes:
   ```bash
   cp templates/architecture/adr.template.md docs/architecture/09_decisions/ADR-001-STACK-SELECCIONADO.md
   ```

3. **Verificación Determinista y Trazabilidad**:
   Una vez instanciados o modificados los artefactos de arquitectura, audite la conformidad de esquemas y la resolución 360°:
   ```bash
   # Validar esquemas JSON de los componentes y ADRs
   npx aisdlc verify schemas --path docs/architecture

   # Validar trazabilidad 360° RTM (Upstream -> Midstream -> Downstream)
   npx aisdlc verify traceability
   ```

---

### 5.3 Modos de Granularidad de Arquitectura e Inicialización Automatizada (`aisdlc init`)

Para evitar tener que copiar o borrar plantillas manualmente según la complejidad del proyecto, el comando de inicialización `aisdlc init` incorpora selección de granularidad arquitectónica (interactiva o mediante la opción `--arch, --architecture`):

```bash
# Inicialización interactiva (solicita seleccionar la granularidad por consola):
npx aisdlc init

# Inicialización con granularidad explícita (desatendida o CI/CD):
npx aisdlc init --arch minimal    # [Recomendado] Solo componentes (CMP-*) y decisiones (ADR-*)
npx aisdlc init --arch full       # Catálogo exhaustivo de 12 secciones arc42 + NAF v4 (13 plantillas)
npx aisdlc init --arch none       # Sin plantillas de arquitectura (scripts, utilidades o libs simples)
```

| Nivel de Granularidad | Plantillas Desplegadas en `templates/architecture/` | Casos de Uso Recomendados | Cumplimiento RTM |
|---|---|---|---|
| **`minimal`** *(Por defecto)* | `component.template.md`, `adr.template.md` | Microservicios, APIs, librerías, SaaS estándar y desarrollo ágil. | **100% de Trazabilidad RTM**. Permite mapear `CMP-*` a `UC-*` y `FR-*`, y documentar `ADR-*` sin sobrecarga documental. |
| **`full` / `complete`** | 13 plantillas completas (Secciones 1 a 12 arc42 + NAF v4) | Sistemas críticos (defensa, aeronáutica, banca/fintech, telecomunicaciones, plataformas multicontenedor). | Rigor formal exhaustivo en todas las perspectivas (Capacidades, Operacional, Despliegue, Riesgos). |
| **`none`** | Ninguna plantilla desplegada en `templates/architecture/` | Herramientas internas de línea de comandos, scripts de soporte o utilidades sin arquitectura formal. | Proyectos exentos de modelado formal de componentes. |

---

## 6. Trazabilidad 360° e Integración Canónica Post-Implementación

Para garantizar que los modelos arquitectónicos no diverjan del software ejecutado ni del producto:

1. **Trazabilidad 360° Determinista e Invertida (Midstream)**:
   - Bajo el modelo de trazabilidad invertida, los requerimientos (`FR-*`, `QR-*`, `SEC-REQ-*`) no contienen punteros descendentes. En su lugar, son los componentes de arquitectura (`CMP-*`) los que declaran explícitamente en `satisfies-requirements` qué requerimientos satisfacen.
   - El verificador `aisdlc verify traceability` valida mediante resolución inversa que todo componente (`CMP-*`), decisión (`ADR-*`) y vista de ejecución (`06_runtime_view.md`) esté vinculado a los identificadores `HOF-*` de entrega y a sus pruebas asociadas, sin introducir acoplamiento descendente en el producto.
   - Si un requerimiento se satisface en un componente hijo de Nivel 3 (DLL o función), el motor resuelve la cobertura ascendente hacia el Bounded Context de Nivel 1 mediante `parent-component`.
   - Elimina la necesidad de inspección manual de documentos o diagramas desactualizados.

2. **Integración Canónica Post-Implementación**:
   - Una vez que la entrega concluye con éxito y supera todos los tests, el comando `aisdlc sdd integrate --change <id>` actualiza automáticamente los bloques de arquitectura en `specs/architecture/`:
     - Inserta los nuevos requerimientos implementados en la lista `satisfies-requirements` de cada componente responsable.
     - Garantiza que la arquitectura refleje el estado real y verificado del sistema en producción.


