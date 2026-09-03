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
 5. Vista de Bloques (Building)      Services & Systems       SRV-*, SYS-* (Whitebox L1-L3)
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

### Sección 5: Vista de Bloques de Construcción (NAF Services & Systems)
- Descomposición jerárquica en cajas blancas (Whitebox):
  - **Nivel 1 (Sistema General)**: Servicios principales del dominio (`SRV-*`).
  - **Nivel 2 (Subcomponentes)**: Módulos internos de software y librerías (`SYS-*`).
- **Regla de Trazabilidad**: Todo servicio `SRV-*` debe declarar en su frontmatter qué casos de uso de ProductShape implementa (`implements-use-cases: [UC-*]`) y qué enclaves de seguridad habita (`hosted-in-enclave: SEC-ENC-*`).

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
├── 01_introduction_and_goals.md
├── 02_architecture_constraints.md
├── 03_context_and_scope/
│   ├── business_context.md
│   └── technical_context.md
├── 04_solution_strategy.md
├── 05_building_blocks/
│   ├── level_1_whitebox.md              # Resumen del sistema
│   └── services/                        # SRV-*.md y SYS-*.md
├── 06_runtime_view/                     # SEQ-*.md con diagramas Mermaid
├── 07_deployment_view/                  # DEP-*.md y RES-*.md
├── 08_cross_cutting/
│   ├── data_models/                     # DATA-*.md y schemas
│   └── security_concept.md
├── 09_decisions/                        # ADR-*.md
├── 10_quality_requirements.md           # Árbol de calidad citando QR-*
├── 11_risks_and_technical_debt.md       # RSK-*.md
└── 12_glossary.md                       # Enlace canónico a TERM-* y BC-*
```
