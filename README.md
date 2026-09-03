# AI-SDLC: Framework de Desarrollo Híbrido para Personas y Agentes

> **Ciclo de Vida de Software de Nueva Generación basado en Git, "As-Code", ProductShape, NAF v4, arc42, Ciberseguridad Integral y Gobernanza de Licencias Open Source.**

---

## 🎯 Visión y Propósito

En la era de la ingeniería asistida por Inteligencia Artificial, la velocidad de escritura de código ha dejado de ser el cuello de botella. **El factor crítico se ha desplazado hacia la izquierda:**
- ¿Qué es exactamente el producto y para quién se construye?
- ¿Qué comportamientos y reglas de negocio lo gobiernan?
- ¿Qué arquitectura técnica garantiza su escalabilidad, seguridad e interoperabilidad?
- ¿Cómo prevenimos vulnerabilidades y modelamos las amenazas desde el día cero?
- ¿Qué licencias de terceros son de uso libre y cuáles exigen adquisición comercial o violan la propiedad intelectual?
- ¿Cómo entregamos contexto preciso, atómico y verificable a los agentes de IA para que no alucinen código?

**AI-SDLC** es una metodología y marco operativo diseñado para que **personas (ingenieros, arquitectos, product managers, oficiales de seguridad)** y **agentes de IA (analistas, arquitectos, programadores, auditores)** colaboren simétricamente con rigor industrial y sin fricción.

---

## 🏛️ Los 5 Pilares del Framework

```
┌────────────────────────────────────────────────────────────────────────┐
│                   AI-SDLC: ARQUITECTURA DEL PROCESO                    │
└────────────────────────────────────────────────────────────────────────┘

 [1. DEFINICIÓN DE PRODUCTO] (ProductShape - PDaC)
  ├── Actores (ACT-*) & Journeys (JRN-*)
  ├── Casos de Uso (UC-*) & Reglas de Negocio (BR-*)
  └── Bounded Contexts (BC-*) & Requisitos (FR-*, QR-*, CON-*)
                            │
                            ▼ (Cita canónica: id + SHA256 digest + anchor)
 [2. CIBERSEGURIDAD BY DESIGN] (STRIDE / ASVS / NAF Security)
  ├── Actores Maliciosos (ACT-THREAT-*) & Casos de Abuso (ABUSE-*)
  ├── Requisitos de Seguridad (SEC-REQ-*) & Políticas Zero Trust (SEC-POL-*)
  └── Enclaves de Seguridad y Zonas de Confianza (SEC-ENC-*)
                            │
                            ▼ (Cita canónica)
 [3. GOBERNANZA DE LICENCIAS OSS] (Legal & IP Compliance as Code)
  ├── Categorización: Permisivas (Libre) vs. Comerciales/Duales (Pago) vs. Virales (AGPL)
  ├── license-policy.yaml & Guardrails de Agentes
  └── Generación de SBOM (CycloneDX) y Verificación en CI/CD
                            │
                            ▼ (Cita canónica)
 [4. GESTIÓN DE CALIDAD Y RELEASE GATES] (Software Quality as Code)
  ├── Coding Rules (Clean Code, Tipado Estricto, Cero Dead Code, ESLint/Prettier)
  ├── Métricas Estándar: Complejidad Ciclomática (<=10), Cognitiva (<=15), Mantenibilidad (>=50)
  └── quality-policy.yaml & Verificador Determinista de Release Gate
                            │
                            ▼ (Cita canónica)
 [5. ARQUITECTURA DE SISTEMAS] (arc42 + NAF v4)
  ├── Contexto y Estrategia (arc42 Sec. 1-4 + NAF Operational)
  ├── Bloques y Servicios (arc42 Sec. 5 + NAF Services SRV-* & Systems SYS-*)
  ├── Runtime y Despliegue (arc42 Sec. 6-7 + NAF Behaviour & Resources)
  └── Conceptos Transversales y ADRs (arc42 Sec. 8-9 + NAF Governance)
                            │
                            ▼ (Cita canónica)
 [6. ENTREGA E IMPLEMENTACIÓN] (Spec-Driven Development - SDD)
  ├── Incrementos acotados (Changes: Proposal, Spec, Design, Tasks)
  ├── Criterios de Aceptación Gherkin & Pruebas BDD Cucumber
  ├── Programación por Agentes de IA + Pruebas Unitarias y de Mitigación
  └── CI/CD Gates Deterministas: Quality Gate, SAST, SCA, SBOM, Licencias y PR Humano
```

---

## 📂 Estructura del Repositorio

```text
AI-SDLC/
├── README.md                                 # Esta guía
├── license-policy.yaml                       # Política declarativa de licencias permitidas/bloqueadas
│
├── process/                                  # Especificación Normativa del Proceso
│   ├── 00_principles_and_manifesto.md        # Manifiesto y principios fundamentales
│   ├── 01_governance_and_roles.md            # Matriz RACI Persona-Agente y autorizaciones
│   ├── 02_product_definition.md              # Guía ProductShape (Actores, Casos de Uso, Requisitos)
│   ├── 03_security_by_design.md              # Modelado de amenazas, Abuse Cases y Requisitos de Seguridad
│   ├── 04_open_source_license_compliance.md  # Clasificación de licencias, uso libre y adquisición comercial
│   ├── 05_architecture_arc42_nafv4.md        # Estructura arc42 potenciada por el grid NAF v4
│   ├── 06_spec_driven_development.md         # Ciclo de entrega SDD citando Producto y Arquitectura
│   ├── 07_security_and_license_validation.md # Gates de CI/CD: SAST, Secret Scan, SBOM y Licencias
│   ├── 08_citation_contract_and_drift.md     # Protocolo criptográfico anti-deriva
│   ├── 09_agent_protocols.md                 # Prompts, contratos de skills y guardrails para LLMs
│   ├── 10_quality_management_and_release_gates.md # Reglas de código, Complejidad Ciclomática y Release Gates
│   └── 11_git_branching_and_lifecycle.md     # Modelo de ramas Git de 4 tiers (main, release, feat/bug, task)
│
├── schemas/                                  # Esquemas JSON (Validación Determinista)
│   ├── product/                              # Schemas: actor, use-case, requirement, business-rule
│   ├── security/                             # Schemas: threat-actor, abuse-case, security-req
│   ├── compliance/                           # Schemas: license-policy, dependency-manifest
│   └── architecture/                         # Schemas: service, system-component, adr
│
├── templates/                                # Plantillas estándar Markdown con YAML frontmatter
│   ├── product/                              # Plantillas ACT, JRN, UC, BR, FR, QR, CON
│   ├── security/                             # Plantillas THREAT, ABUSE, SEC-REQ, SEC-POL
│   ├── compliance/                           # Plantillas CON-LIC, ADR-LIC, Solicitud de Compra
│   ├── architecture/                         # Plantillas arc42 (01-12) enriquecidas con NAF v4
│   └── delivery/                             # Plantillas SDD (Proposal, Spec, Tasks)
│
└── examples/                                 # Caso de Estudio Realista: "SentinelCore" (SaaS Telemétrico Crítico)
    ├── product/                              # Modelo canónico de producto
    ├── security/                             # Modelado de amenazas y mitigaciones
    ├── compliance/                           # Manifiesto de dependencias evaluadas
    ├── architecture/                         # Arquitectura arc42 + NAF v4 con enclaves
    └── specs/                                # Especificación de entrega SDD con citaciones criptográficas
```

---

## 🚀 Guía Rápida para Equipos Humanos

1. **Definir la Intención del Producto**:
   - Usa plantillas en `templates/product/` para modelar Actores (`ACT-*`), Casos de Uso (`UC-*`) y Reglas de Negocio (`BR-*`).
   - Apóyate en agentes analistas (`ps:explore`) para identificar lagunas y requerimientos derivados (`FR-*`, `QR-*`).
2. **Incorporar Ciberseguridad Shift-Left**:
   - Modela actores maliciosos (`ACT-THREAT-*`) y casos de abuso (`ABUSE-*`).
   - Define requisitos de seguridad (`SEC-REQ-*`) y restricciones Zero Trust antes de diseñar la solución técnica.
3. **Modelar la Arquitectura arc42 / NAF v4**:
   - Modela los límites de contexto, servicios (`SRV-*`), componentes (`SYS-*`) y enclaves de red (`SEC-ENC-*`).
   - Cada servicio debe citar los casos de uso que implementa.
4. **Verificar Cumplimiento de Licencias**:
   - Consulta `license-policy.yaml`. Si se necesita una librería comercial o dual, tramita la solicitud formal (`ADR-LIC-*`).
5. **Revisión y Aprobación Humana**:
   - Toda propuesta de cambio se valida con linters/schemas en CI. La aprobación y merge es prerrogativa humana exclusiva.

---

## 🤖 Guía Operativa para Agentes de IA

1. **Lectura de Contexto mediante Citaciones**:
   - Nunca asumas comportamientos ni inventes reglas. Lee los artefactos canónicos citados en la especificación (`SPEC-*`).
2. **Respeto a los Guardrails de Seguridad**:
   - Todo código generado debe cumplir con los principios OWASP Secure Coding.
   - Si la tarea implementa un `SEC-REQ-*`, debes generar obligatoriamente la prueba automatizada correspondiente (`SEC-TEST-*`).
3. **Inspección Previa de Licencias de Dependencias**:
   - Antes de modificar manifiestos de paquetes (`package.json`, etc.), consulta la licencia del paquete.
   - Si la licencia es GPL/AGPL (viral) o BSL/SSPL (comercial de pago), DETÉN la adición y notifica al usuario en el PR proponiendo una alternativa permisiva (MIT/Apache 2.0).
4. **Validación Determinista**:
   - Al finalizar, ejecuta los linters y verificadores de esquemas. Nunca intentes auto-aprobar o forzar el merge de un PR.

---

## 📜 Licencia

Este framework está publicado bajo licencia [MIT](https://opensource.org/licenses/MIT).
