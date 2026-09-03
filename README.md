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

## ⚡ Tutorial 1: Inicio Rápido en 5 Minutos (Quickstart)

Si deseas poner a prueba el framework de inmediato utilizando el caso de estudio preconfigurado (**SentinelCore**), sigue este flujo rápido de 7 comandos:

### 1. Prerrequisitos
- **Node.js** (v18.0 o superior): `node -v`
- **Git** (v2.30 o superior): `git --version`

### 2. Flujo de Ejecución en 7 Pasos

Ejecuta secuencialmente en tu terminal:

```bash
# 1. Extraer los escenarios Gherkin BDD desde las especificaciones a archivos .feature
node scripts/extract-gherkin.js --all

# 2. Planificar la jerarquía de ramas Git de 4 tiers para una versión y feature
node scripts/git-workflow-helper.js plan --version v1.1.0 --feature CHG-001-telemetry-ingestion --tasks TSK-001,TSK-002

# 3. Auditar el gobierno de tareas y modos de autonomía humana (AUTONOMOUS, HUMAN_REVIEW_PLAN, etc.)
node scripts/verify-tasks-governance.js

# 4. Auditar que el 100% de requisitos y tareas cuentan con pruebas verificables en disco
node scripts/verify-all-testing.js

# 5. Ejecutar el Release Gate de Calidad (Complejidad Ciclomática <= 10, Mantenibilidad >= 50)
node scripts/verify-quality-gate.js

# 6. Generar el informe de métricas de calidad multilenguaje (TypeScript, Go, Python, etc.)
node scripts/generate-quality-report.js

# 7. Auditar la Matriz de Trazabilidad 360° (Producto -> Arquitectura -> Pruebas)
node scripts/verify-traceability.js
```

### 3. Resumen Rápido de Herramientas CLI (Cheat Sheet)

| Herramienta / Comando | Propósito | Salida Generada |
|---|---|---|
| `node scripts/extract-gherkin.js --all` | Sincroniza bloques Gherkin a `.feature` | `tests/features/*.feature` |
| `node scripts/git-workflow-helper.js plan` | Planifica ramas jerárquicas (4 tiers) | Árbol visual en terminal |
| `node scripts/git-workflow-helper.js validate <branch>` | Valida nomenclatura de rama | Veredicto Tier 1 a 4 |
| `node scripts/verify-tasks-governance.js` | Audita riesgos y modos de autonomía | `reports/TASKS_GOVERNANCE_REPORT.md` |
| `node scripts/verify-all-testing.js` | Audita cobertura de pruebas en specs y tasks | `reports/TEST_VERIFICATION_AUDIT.md` |
| `node scripts/verify-quality-gate.js` | Release Gate: Complejidad y Mantenibilidad | Veredicto `PASS`/`FAIL` por función |
| `node scripts/generate-quality-report.js` | Reporte formal de calidad de código | `reports/QUALITY_REPORT.md` |
| `node scripts/verify-traceability.js` | Valida Trazabilidad 360° | `reports/TRACEABILITY_MATRIX.md` |

---

## 📖 Tutorial 2: Flujo Detallado Paso a Paso (End-to-End Deep Dive)

Este tutorial exhaustivo describe cómo construir una nueva funcionalidad desde cero utilizando todas las fases, plantillas y controles deterministas de **AI-SDLC**.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          FLUJO OPERATIVO COMPLETO EN AI-SDLC                           │
└────────────────────────────────────────────────────────────────────────────────────────┘
  [1. Producto & BDD]    ➔ Modelar UC/FR/BR y sincronizar specs Gherkin (.feature)
  [2. Threat Modeling]   ➔ Modelar ABUSE, requisitos SEC-REQ y enclaves Zero Trust
  [3. Licencias OSS]     ➔ Validar dependencias frente a license-policy.yaml
  [4. SDD Change]        ➔ Crear proposal, spec, design y tasks con modos de autonomía
  [5. 4-Tier Branching]  ➔ Crear ramas git: main ➔ release ➔ feat ➔ task
  [6. Coder / Agent]     ➔ Implementar código con TDD e inyección quirúrgica de contexto
  [7. Quality Gate]      ➔ Validar Complejidad Ciclomática (<=10) y Mantenibilidad (>=50)
  [8. Release & Merge]   ➔ Auditoría de pruebas, trazabilidad 360° y aprobación humana
```

---

### Fase 1: Definición Canónica de Producto y Criterios Gherkin (BDD)

1. **Crear el Requerimiento Funcional**:
   Copia una plantilla desde `templates/product/` a tu directorio de producto (o consulta el ejemplo canónico en `examples/product/`):
   ```bash
   cp templates/product/requirement.template.md examples/product/FR-TELEMETRY-STREAM-001.md
   ```

2. **Completar Frontmatter y Escenarios de Aceptación**:
   Todo requerimiento debe declarar a qué caso de uso (`UC-*`) pertenece y qué archivos de prueba ejecutables (`.feature`) tiene vinculados:
   ```markdown
   ---
   id: "FR-TELEMETRY-STREAM-001"
   title: "Ingesta Continua de Telemetría de Vuelo"
   status: "approved"
   part-of:
     - "UC-STREAM-TELEMETRY"
   tests:
     method: "cucumber-bdd"
     linked-test-files:
       - "tests/features/fr-telemetry-stream-001.feature"
   ---

   ### Criterios de Aceptación (Gherkin BDD)
   ```gherkin
   @FR-TELEMETRY-STREAM-001 @automated
   Feature: Ingesta Continua de Telemetría
     Scenario: Ingesta exitosa de paquete de telemetría válido
       Given un dron autenticado con sesión mTLS activa
       When envía una trama de telemetría con coordenadas y velocidad válidas
       Then el sistema valida la cinemática del paquete
       And confirma la persistencia con código HTTP 200
   ```
   ```

3. **Sincronizar automáticamente con Cucumber**:
   Ejecuta el script extractor determinista:
   ```bash
   node scripts/extract-gherkin.js --all
   ```
   *Efecto*: Extrae los bloques ````gherkin```` del Markdown y genera o actualiza los archivos `.feature` en `tests/features/`.

---

### Fase 2: Ciberseguridad Shift-Left y Modelado de Amenazas

1. **Modelar Amenazas con STRIDE / ASVS**:
   Copia las plantillas desde `templates/security/`:
   - `templates/security/threat-actor.template.md` (ej. `ACT-THREAT-SPOOFER.md`)
   - `templates/security/abuse-case.template.md` (ej. `ABUSE-TELEMETRY-SPOOFING.md`)
   - `templates/security/security-req.template.md` (ej. `SEC-REQ-MTLS-STREAM.md`)

2. **Vincular Mitigaciones a Enclaves Zero Trust**:
   Enlaza la mitigación del caso de abuso y asigna el enclave de seguridad correspondiente:
   ```markdown
   ---
   id: "SEC-REQ-MTLS-STREAM"
   title: "Autenticación Mutua TLS Obligatoria para Ingesta"
   mitigates:
     - "ABUSE-TELEMETRY-SPOOFING"
   enclaves:
     - "SEC-ENC-DMZ-INGEST"
   tests:
     method: "cucumber-bdd"
     linked-test-files:
       - "tests/features/security/sec-req-mtls-stream.feature"
   ---
   ```

---

### Fase 3: Gobernanza de Licencias Open Source (IP & Legal as Code)

Antes de incorporar cualquier librería de terceros (Node, Python, Go, etc.):
1. **Consultar `license-policy.yaml`**:
   - 🟢 **Permisivas (Aprobadas)**: `MIT`, `Apache-2.0`, `BSD-3-Clause`, `ISC` (uso libre comercial).
   - 🟡 **Copyleft Débil (Condicionadas)**: `LGPL-3.0`, `MPL-2.0` (solo consumo dinámico sin modificación).
   - 🔴 **Virales (Prohibidas)**: `GPL-2.0`, `GPL-3.0`, `AGPL-3.0` (prohibidas en software propietario o SaaS).
   - ⚠️ **Comerciales / Duales (Pago Obligatorio)**: `BSL-1.1`, `SSPL-1.0` (requieren aprobación formal de compra con `templates/compliance/commercial-acquisition-request.template.md`).
2. **Guardrails para Agentes de IA**: Si un agente propone una librería incompatible o de pago comercial, debe detenerse de inmediato y sugerir una alternativa permisiva.

---

### Fase 4: Especificación de Entrega SDD y Modos de Autonomía

Para cada incremento o entrega se crea un paquete aislado bajo `specs/changes/active/<change-id>/`:
```text
specs/changes/active/chg-001-telemetry-ingestion/
├── proposal.md   # Justificación, impacto y citación canónica (UC-*, FR-*, SEC-REQ-*)
├── spec.md       # Escenarios funcionales y de mitigación de ciberseguridad
├── design.md     # Interfaces, DTOs, endpoints y arquitectura arc42 / NAF v4
└── tasks.md      # Plan secuencial de tareas atómicas gobernadas
```

1. **Configurar Tareas con Modos de Autonomía**:
   En `tasks.md`, clasifica cada tarea según su nivel de riesgo y modo de autonomía humana:
   - `AUTONOMOUS`: Plan y ejecución autónoma por el agente (tareas de bajo riesgo).
   - `HUMAN_REVIEW_PLAN`: El agente formula el plan y se detiene; requiere aprobación humana antes de codificar.
   - `AMBIGUOUS`: Tarea bloqueada por ambigüedad; requiere refinamiento previo con el usuario.
   - `HIGH_RISK_MANUAL`: Tarea crítica (credenciales, migraciones destructivas); reservada exclusivamente a humanos.

   *Ejemplo en `tasks.md`:*
   ```yaml
   - id: "TSK-001"
     title: "Definición de DTOs e Interfaces de Telemetría"
     complexity: "LOW"
     risk-level: "LOW"
     autonomy-mode: "AUTONOMOUS"
     assigned-to: "agent-developer"
     verification:
       method: "quality-gate"
       command-or-criteria: "npx tsc --noEmit && node scripts/verify-quality-gate.js"

   - id: "TSK-002"
     title: "Implementación del Gateway WSS con Validación mTLS"
     complexity: "MEDIUM"
     risk-level: "MEDIUM"
     autonomy-mode: "HUMAN_REVIEW_PLAN"
     assigned-to: "agent-developer"
     verification:
       method: "automated-unit-test"
       command-or-criteria: "npm test -- tests/unit/telemetry_gateway.spec.ts"
   ```

2. **Auditar el Gobierno de Tareas**:
   ```bash
   node scripts/verify-tasks-governance.js
   ```
   *Salida*: Genera `reports/TASKS_GOVERNANCE_REPORT.md` validando que no existan tareas sin verificación o con asignaciones de autonomía no conformes.

---

### Fase 5: Gestión de Ramas Git (Modelo Jerárquico de 4 Tiers)

1. **Planificar el árbol de ramas con el asistente CLI**:
   ```bash
   node scripts/git-workflow-helper.js plan --version v1.1.0 --feature CHG-001-telemetry-ingestion --tasks TSK-001,TSK-002
   ```

2. **Crear las ramas en Git respetando la jerarquía**:
   ```bash
   # Tier 1 -> Tier 2: Rama de versión desde main
   git checkout main
   git checkout -b release/v1.1.0

   # Tier 2 -> Tier 3: Rama de feature desde release
   git checkout -b feat/CHG-001-telemetry-ingestion release/v1.1.0

   # Tier 3 -> Tier 4: Rama de tarea atómica desde feature
   git checkout -b task/CHG-001/TSK-001-dto-interfaces feat/CHG-001-telemetry-ingestion
   ```

3. **Validar la rama de trabajo**:
   ```bash
   node scripts/git-workflow-helper.js validate task/CHG-001/TSK-001-dto-interfaces
   ```

---

### Fase 6: Implementación con Agentes de IA y Auditoría de Pruebas

1. **Inyección Quirúrgica de Contexto**:
   El agente programador (`agent-developer`) solo recibe `spec.md`, `design.md` y `license-policy.yaml`. Cero alucinaciones por contaminación de contexto.
2. **Test-Driven Development (TDD)**:
   Se desarrollan las pruebas unitarias y de mitigación (`SEC-TEST-*`) en `tests/` antes o junto con la implementación en `src/`.
3. **Auditar la Cobertura Total de Pruebas**:
   ```bash
   node scripts/verify-all-testing.js
   ```
   *Salida*: Genera `reports/TEST_VERIFICATION_AUDIT.md`. Bloquea la entrega si algún requisito o tarea carece de pruebas reales.

---

### Fase 7: Release Gate de Calidad Multilenguaje (Polyglot Quality Gate)

Verifica que el código cumpla con los umbrales de `quality-policy.yaml`:
- **Complejidad Ciclomática (McCabe)**: $\le 10$ por función.
- **Complejidad Cognitiva**: $\le 15$ por función.
- **Índice de Mantenibilidad (SEI MI)**: $\ge 50.0$ (Objetivo: $>65.0$).
- **Longitud Máxima de Función**: $\le 40$ líneas.

1. **Evaluar el Quality Gate**:
   ```bash
   node scripts/verify-quality-gate.js
   ```
2. **Generar Informe Formal de Calidad**:
   ```bash
   node scripts/generate-quality-report.js
   ```
   *Salida*: Genera `reports/QUALITY_REPORT.md` analizando TypeScript, JavaScript, Python, Go, Java, C#, Rust, C/C++.

---

### Fase 8: Matriz de Trazabilidad 360° y Pull Request

1. **Auditar Trazabilidad Completa**:
   ```bash
   node scripts/verify-traceability.js
   ```
   *Salida*: Genera `reports/TRACEABILITY_MATRIX.md` verificando que el 100% de los requisitos estén conectados a Producto, Arquitectura y Pruebas.

2. **Pull Request y Aprobación Humana**:
   - Se abre el Pull Request de la tarea hacia la rama feature, y luego hacia la rama release.
   - **Intervención Humana Innegociable**: El Tech Lead humano inspecciona el diff y los informes generados en `reports/` antes de autorizar el merge final a producción.

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
