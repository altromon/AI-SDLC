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
  ├── Bloques y Componentes (arc42 Sec. 5 + NAF Services & Systems CMP-*)
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
├── packages/                                 # Monorepo Workspace (pnpm + Changesets)
│   ├── core/                                 # @ai-sdlc/core: Motor de dominio, verificadores puros y reporters
│   └── cli/                                  # @ai-sdlc/cli: CLI ejecutable binario (npx aisdlc)
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
│   ├── architecture/                         # Schemas: component, adr
│   ├── sdd/                                  # Schemas: tasks, handoff
│   └── manuals/                              # Schemas: user-manual, production-manual
│
├── templates/                                # Plantillas estándar Markdown con YAML frontmatter
│   ├── product/                              # Plantillas ACT, JRN, UC, BR, FR, QR, CON
│   ├── security/                             # Plantillas THREAT, ABUSE, SEC-REQ, SEC-POL
│   ├── compliance/                           # Plantillas CON-LIC, ADR-LIC, Solicitud de Compra
│   ├── architecture/                         # Plantillas arc42 (01-12) enriquecidas con NAF v4
│   ├── sdd/                                  # Plantillas SDD (Proposal, Spec, Design, Tasks, Handoff)
│   └── manuals/                              # Plantillas MAN-USER (Manual de Usuario), MAN-PROD (Manual de Producción)
│
├── reports/                                  # Informes formales autogenerados (RTM 360°, Calidad, Requerimientos Activos)
│
└── examples/                                 # Caso de Estudio Realista: "SentinelCore" (SaaS Telemétrico Crítico)
    ├── product/                              # Modelo canónico de producto
    ├── security/                             # Modelado de amenazas y mitigaciones
    ├── compliance/                           # Manifiesto de dependencias evaluadas
    ├── architecture/                         # Arquitectura arc42 + NAF v4 con enclaves
    ├── specs/                                # Especificación de entrega SDD con citaciones criptográficas
    ├── manuals/                              # Manual de Usuario y de Producción del caso de estudio
    ├── src/                                  # Implementación del caso de estudio (TS, Go, Python)
    └── tests/                                # Pruebas unitarias, BDD y benchmarks del caso de estudio
```

---

## ⚡ Tutorial 1: Creación Rápida de una Funcionalidad (Quickstart en 5 Minutos)

Este flujo acelerado describe cómo crear, implementar, verificar e integrar una nueva funcionalidad desde cero utilizando exclusivamente los **comandos simplificados** del CLI (`aisdlc` o scripts de `pnpm`).

### 1. Prerrequisitos
- **Node.js** (v18.0 o superior): `node -v`
- **pnpm** (v9 o v10+): `pnpm -v`
- **Git** (v2.30 o superior): `git --version`

### 2. Flujo Rápido en 6 Pasos con Comandos Simplificados

```bash
# 1. Crear el andamiaje del cambio SDD y su sidecar PDaC (handoff.yaml) automáticamente
pnpm run change:new "Notificaciones de Alerta en Tiempo Real" --from UC-STREAM-TELEMETRY
# o vía npx: npx aisdlc change new "Notificaciones de Alerta en Tiempo Real" --from UC-STREAM-TELEMETRY

# 2. Navegar y crear automáticamente la rama de tarea en la jerarquía de 4 tiers de Git
pnpm run git:checkout TSK-001
# o vía npx: npx aisdlc git checkout TSK-001

# 3. Implementar la funcionalidad y sus pruebas (TDD) en src/ y tests/
#    (El desarrollador o agente implementa código y tests unitarios / BDD)

# 4. Pre-vuelo determinista con auto-fix (sincroniza Gherkin a .feature y digests SHA-256)
pnpm run check:fix
# o vía npx: npx aisdlc check --fix

# 5. Ejecutar la suite consolidada de CI/CD (7 Gates de calidad y gobernanza)
pnpm run verify:all
# o vía npx: npx aisdlc verify all

# 6. Integrar el cambio a la línea base canónica (promoción de requisitos y arquitectura)
npx aisdlc sdd integrate --auto
# o especificando el ID: npx aisdlc sdd integrate --change chg-002-notificaciones-de-alerta-en-tiempo-real
```

> [!TIP]
> **Integración Desatendida en CI/CD**: En flujos con Pull Request, el paso 6 (`sdd integrate`) se ejecuta automáticamente al fusionar el PR mediante el workflow de GitHub Actions [`.github/workflows/sdd-integrate-on-merge.yml`](.github/workflows/sdd-integrate-on-merge.yml).

### 3. Resumen de Comandos Simplificados del CLI (`aisdlc`)

| Herramienta / Comando CLI | Comando pnpm equivalente | Fase del Ciclo de Vida | Salida / Acción Realizada |
|---|---|---|---|
| `npx aisdlc change new <nombre>` | `pnpm run change:new -- <nombre>` | **Andamiaje SDD** | Genera `proposal.md`, `spec.md`, `design.md`, `tasks.md` y sidecar `handoff.yaml` (`HOF-*`) con digests SHA-256 |
| `npx aisdlc git checkout <TSK-ID>` | `pnpm run git:checkout <TSK-ID>` | **Gestión Git 4-Tiers** | Resuelve versión y crea en cascada: `main` ➔ `release/vX.Y.Z` ➔ `feat/CHG-*` ➔ `task/CHG-*/TSK-*` |
| `npx aisdlc git plan` | `pnpm run git:plan` | **Planificación Git** | Renderiza el árbol visual de jerarquía de ramas antes de trabajar |
| `npx aisdlc git validate <rama>` | `pnpm run git:validate <rama>` | **Gobierno Git** | Valida la nomenclatura estricta de cualquier rama según su Tier (1 a 4) |
| `npx aisdlc check [--fix]` | `pnpm run check` / `check:fix` | **Pre-vuelo Unificado** | Sincroniza bloques Gherkin a `.feature`, actualiza digests SHA-256 PDaC y verifica Quality Gates |
| `npx aisdlc verify all` | `pnpm run verify:all` | **Suite CI/CD Consolidada** | Evalúa los 7 Quality Gates (Calidad, Trazabilidad 360°, Tareas, Tests, Licencias, PDaC, Schemas) |
| `npx aisdlc verify quality` | `pnpm run verify:quality` | **Release Gate de Código** | Evalúa Complejidad Ciclomática ($\le 10$), Cognitiva ($\le 15$) y Mantenibilidad ($\ge 50$) |
| `npx aisdlc verify traceability` | `pnpm run verify:traceability` | **Matriz 360° RTM** | Valida triangulación obligatoria: Producto (`HOF-*`) ➔ Arquitectura (`CMP-*`) ➔ Tests (`.feature`) |
| `npx aisdlc verify governance` | `pnpm run verify:governance` | **Gobierno de Tareas** | Audita modos de autonomía (`AUTONOMOUS`, `HUMAN_REVIEW_PLAN`, `HIGH_RISK_MANUAL`, `AMBIGUOUS`) |
| `npx aisdlc verify testing` | `pnpm run verify:testing` | **Auditoría de Tests** | Comprueba que el 100% de requerimientos y tareas cuentan con pruebas verificables en disco |
| `npx aisdlc verify licenses` | `pnpm run verify:licenses` | **Gobernanza IP / OSS** | Audita dependencias frente a `license-policy.yaml` (bloquea virales y condiciona comerciales) |
| `npx aisdlc verify pdac` | `pnpm run verify:pdac` | **Integridad Criptográfica**| Detecta derivas (*drift*) en el grafo PDaC comparando hashes SHA-256 |
| `npx aisdlc verify schemas` | `pnpm run verify:schemas` | **Conformidad Estructural** | Valida artefactos Markdown frente a esquemas JSON canónicos (Draft 2020-12) |
| `npx aisdlc sdd verify` | - | **Conformidad SDD** | Audita que los cambios activos cumplan la especificación y contengan sidecars válidos |
| `npx aisdlc sdd integrate [--auto]` | - | **Promoción a Baseline** | Promueve requerimientos a `active`, enlaza arquitectura, marca propuesta `applied` y archiva el cambio |
| `npx aisdlc report quality` | `pnpm run report:quality` | **Reporting Formal** | Genera informe detallado de métricas en `reports/QUALITY_REPORT.md` |
| `npx tsx scripts/export-active-requirements.ts` | `pnpm run report:requirements` | **Catálogo de Producto** | Genera catálogo consolidado de requerimientos en `reports/ACTIVE_REQUIREMENTS.md` |
| `npx tsx scripts/bundle-documentation.ts` | `pnpm run report:docs` | **Dossier Maestro** | Compila documentación y manuales con TOC interactiva en `reports/AI_SDLC_SPECIFICATION_FULL.md` |
| `npx aisdlc init [dir]` | - | **Inicialización** | Inicializa un nuevo repo con la arquitectura de carpetas, esquemas y políticas AI-SDLC |


---

## 📖 Tutorial 2: Flujo Detallado Paso a Paso (End-to-End Deep Dive)

Este tutorial exhaustivo describe cómo construir una nueva funcionalidad desde cero utilizando todas las fases, plantillas y controles deterministas de **AI-SDLC**, aprovechando los **comandos simplificados** del CLI para agilizar cada etapa con cero derivas y máxima trazabilidad.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               FLUJO DETALLADO DE CREACIÓN DE UNA NUEVA FUNCIONALIDAD                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
  [1. Producto & BDD]    ➔ Modelar UC/FR/BR y sincronizar Gherkin (.feature) vía `check:fix`
  [2. Threat Modeling]   ➔ Modelar ABUSE, requisitos SEC-REQ y enclaves Zero Trust
  [3. Licencias OSS]     ➔ Validar dependencias con `verify:licenses` y license-policy.yaml
  [4. Andamiaje SDD]     ➔ Scaffolding automatizado con `change:new` y sidecar HOF-*
  [5. 4-Tier Branching]  ➔ Crear ramas en cascada: main ➔ release ➔ feat ➔ task con `git checkout`
  [6. Coder / Agent]     ➔ Implementación TDD e inyección quirúrgica de contexto
  [7. Pre-vuelo & Calidad]➔ `check:fix` para sincronizar digests y `verify:quality` para métricas
  [8. Trazabilidad 360°] ➔ Matriz RTM (`verify:traceability`), suite completa (`verify:all`) y PR
  [9. Integración SDD]   ➔ `sdd integrate --auto` para promover a baseline y archivar el cambio
```

---

### Fase 1: Definición Canónica de Producto y Criterios Gherkin (BDD)

Toda nueva funcionalidad parte de una necesidad de negocio canónica:

1. **Definir o Derivar el Requerimiento Funcional**:
   Puedes crear el archivo en `specs/product/` utilizando la plantilla de `templates/product/requirement.template.md` (o dejar que el comando de andamiaje `aisdlc change new` de la Fase 4 lo genere automáticamente como borrador si se trata de un desarrollo *greenfield*):
   ```markdown
   ---
   id: "FR-002-ALERT-NOTIFICATIONS-001"
   type: "requirement"
   title: "Notificaciones de Alerta en Tiempo Real"
   status: "draft"
   version: "1.0.0"
   schema-version: "1.0"
   category: "functional"
   derives-from:
     - "UC-STREAM-TELEMETRY"
   verifiable-by: "cucumber-bdd"
   acceptance-format: "gherkin"
   cucumber-tags:
     - "@FR-002-ALERT-NOTIFICATIONS-001"
     - "@automated"
   ---

   # FR-002-ALERT-NOTIFICATIONS-001: Notificaciones de Alerta en Tiempo Real

   ## 1. Enunciado Normativo
   El sistema DEBE emitir alertas en tiempo real con latencia inferior a 500ms ante anomalías telemétricas detectadas.

   ---

   ## 2. Criterios de Aceptación (Gherkin BDD)

   ```gherkin
   @FR-002-ALERT-NOTIFICATIONS-001 @automated
   Feature: Notificaciones de Alerta en Tiempo Real
     Scenario: Disparo de alerta ante desviación crítica de altitud
       Given un dron transmitiendo telemetría con altitud fuera del límite seguro
       When el motor de telemetría procesa la trama de datos
       Then se genera una notificación de severidad CRITICAL
       And la alerta se entrega a los suscriptores en menos de 500 ms
   ```
   ```

2. **Sincronización Automática con Cucumber (.feature)**:
   En lugar de copiar o extraer manualmente los escenarios, ejecuta el comando simplificado de pre-vuelo:
   ```bash
   pnpm run check:fix
   # o específicamente: pnpm run extract:gherkin:all (npx aisdlc gherkin extract --all)
   ```
   *Efecto*: Escanea los documentos de producto, extrae los bloques ````gherkin```` y genera o actualiza de forma determinista los archivos `.feature` en `tests/features/`.

3. **Validación Estructural de Esquemas**:
   ```bash
   pnpm run verify:schemas
   # o: npx aisdlc verify schemas --path specs/product
   ```
   *Efecto*: Valida que el frontmatter YAML y el contenido cumplan con el esquema JSON canónico de producto (Draft 2020-12).

---

### Fase 2: Ciberseguridad Shift-Left y Modelado de Amenazas

1. **Modelar Amenazas con STRIDE / ASVS**:
   Identifica los vectores de ataque y casos de abuso utilizando las plantillas de `templates/security/`:
   - Actor malicioso: `templates/security/threat-actor.template.md` (ej. `specs/security/ACT-THREAT-INJECTOR.md`)
   - Caso de abuso: `templates/security/abuse-case.template.md` (ej. `specs/security/ABUSE-ALERT-INJECTION.md`)
   - Requisito de seguridad: `templates/security/security-req.template.md` (ej. `specs/security/SEC-REQ-ALERT-HMAC.md`)

2. **Vincular Mitigaciones a Enclaves Zero Trust**:
   ```markdown
   ---
   id: "SEC-REQ-ALERT-HMAC"
   title: "Firma HMAC Obligatoria para Mensajes de Alerta"
   status: "approved"
   category: "integrity"
   mitigates:
     - "ABUSE-ALERT-INJECTION"
   enclaves:
     - "SEC-ENC-DMZ-INGEST"
   verifiable-by: "unit-test"
   ---
   ```

3. **Validar Conformidad de Artefactos de Seguridad**:
   ```bash
   npx aisdlc verify schemas --path specs/security
   ```

---

### Fase 3: Gobernanza de Licencias Open Source (IP & Legal as Code)

Antes de incorporar cualquier dependencia o paquete de terceros:
1. **Consultar `license-policy.yaml`**:
   - 🟢 **Permisivas (Aprobadas)**: `MIT`, `Apache-2.0`, `BSD-3-Clause`, `ISC` (uso libre en cualquier capa).
   - 🟡 **Copyleft Débil (Condicionadas)**: `LGPL-3.0`, `MPL-2.0` (solo consumo como librería dinámica, sin modificaciones internas).
   - 🔴 **Virales (Prohibidas)**: `GPL-2.0`, `GPL-3.0`, `AGPL-3.0` (bloqueadas para proteger la propiedad intelectual del código propietario y SaaS).
   - ⚠️ **Comerciales / Duales (Pago Requerido)**: `BSL-1.1`, `SSPL-1.0` (requieren aprobación y formulario formal en `templates/compliance/commercial-acquisition-request.template.md`).

2. **Auditar Licencias con el Comando Simplificado**:
   ```bash
   pnpm run verify:licenses
   # o: npx aisdlc verify licenses
   ```
   *Efecto*: Bloquea la entrega si detecta librerías no autorizadas y genera `reports/LICENSE_COMPLIANCE_REPORT.md`.

---

### Fase 4: Andamiaje de Entrega SDD y Gobernanza de Autonomía

Para implementar la funcionalidad, genera el paquete del cambio SDD de forma automatizada en un único comando:

1. **Crear el Cambio con el Comando Simplificado**:
   ```bash
   pnpm run change:new "Notificaciones de Alerta en Tiempo Real" --from UC-STREAM-TELEMETRY
   # o: npx aisdlc change new "Notificaciones de Alerta en Tiempo Real" --from UC-STREAM-TELEMETRY --profile standard
   ```
   *Efecto Determinista*:
   - Crea el directorio del cambio en `specs/changes/active/chg-002-notificaciones-de-alerta-en-tiempo-real/`.
   - Genera el cuarteto SDD preconfigurado:
     - `proposal.md`: Justificación, impacto y citaciones inmutables con hashes SHA-256.
     - `spec.md`: Escenarios funcionales y de mitigación de seguridad.
     - `design.md`: DTOs, interfaces, endpoints y arquitectura arc42 / NAF v4.
     - `tasks.md`: Plan de tareas atómicas gobernadas y verificables.
   - Genera y deposita automáticamente el sidecar PDaC formal `handoff.yaml` (`HOF-002-NOTIFICACIONES-DE-ALERTA-EN-TIEMPO-REAL`) con los hashes SHA-256 de los artefactos citados.
   - *(Si no se proporciona `--from`, el comando crea automáticamente un requerimiento borrador `FR-*-001.md` en `specs/product/`)*.

2. **Configurar Tareas y Modos de Autonomía en `tasks.md`**:
   Cada tarea define su nivel de riesgo y modo de supervisión humana:
   - `AUTONOMOUS`: Tarea de bajo riesgo; el agente planifica e implementa de forma autónoma.
   - `HUMAN_REVIEW_PLAN`: Tarea de riesgo medio; el agente propone el diseño y espera confirmación antes de codificar.
   - `HIGH_RISK_MANUAL`: Tarea crítica (credenciales, migraciones destructivas); reservada a humanos.
   - `AMBIGUOUS`: Tarea bloqueada por ambigüedad de requisitos; requiere refinamiento previo.

   *Ejemplo en `tasks.md`:*
   ```yaml
   - id: "TSK-001"
     title: "Definición de DTOs e Interfaces de Alerta"
     complexity: "LOW"
     risk-level: "LOW"
     autonomy-mode: "AUTONOMOUS"
     assigned-to: "agent-developer"
     verification:
       method: "quality-gate"
       command-or-criteria: "pnpm run verify:quality"

   - id: "TSK-002"
     title: "Implementación del Motor de Alerta y Firma HMAC"
     complexity: "MEDIUM"
     risk-level: "MEDIUM"
     autonomy-mode: "HUMAN_REVIEW_PLAN"
     assigned-to: "agent-developer"
     verification:
       method: "automated-unit-test"
       command-or-criteria: "pnpm test -- tests/unit/alert_engine.spec.ts"
   ```

3. **Auditar el Gobierno de Tareas y Conformidad SDD**:
   ```bash
   pnpm run verify:governance                    # o: npx aisdlc verify governance
   npx aisdlc sdd verify                         # Audita sidecars HOF-*, espacios SDD y colisiones pre-vuelo
   ```
   *Salida*: Genera `reports/TASKS_GOVERNANCE_REPORT.md` validando que no existan tareas sin verificación o asignaciones indebidas.

4. **Compuerta Pre-Implementación de Duplicados (Shift-Left Pre-Flight Gate)**:
   ```bash
   pnpm run verify:duplicates                    # o: npx aisdlc verify duplicates
   ```
   *Efecto*: Audita que los nuevos requisitos no colisionen en ID, textos normativos idénticos, títulos redundantes ($\ge 85\%$) ni pruebas BDD con la línea base activa. Respeta el Principio de Responsabilidad Única (SRP) permitiendo múltiples requisitos atómicos por Caso de Uso (`UC-*`) y admite evolución *in-place*. Bloquea el proceso antes de gastar recursos de computación y tokens en código.

---

### Fase 5: Gestión Automatizada de Ramas Git (Modelo de 4 Tiers)

1. **Navegación y Creación en Cascada por Tarea (Comando Simplificado Recomendado)**:
   ```bash
   pnpm run git:checkout TSK-001
   # o: npx aisdlc git checkout TSK-001
   ```
   *Qué hace el CLI bajo el capó*:
   - Localiza `TSK-001` dentro de `specs/changes/active/*/tasks.md`.
   - Resuelve la versión de release asociada y construye la jerarquía estricta de 4 tiers:
     `Tier 1: main` ➔ `Tier 2: release/vX.Y.Z` ➔ `Tier 3: feat/CHG-XXX` ➔ `Tier 4: task/CHG-XXX/TSK-001-...`
   - Crea en cascada las ramas intermedias que no existan y sitúa la sesión de trabajo directamente en la rama de la tarea.

2. **Herramientas de Planificación y Validación de Ramas**:
   ```bash
   # Visualizar la jerarquía de ramas antes de iniciar
   pnpm run git:plan                             # o: npx aisdlc git plan --release v1.2.0 --feature CHG-002-alerting --tasks TSK-001,TSK-002

   # Validar la nomenclatura de cualquier rama activa
   pnpm run git:validate task/CHG-002/TSK-001-alert-dto # o: npx aisdlc git validate <rama>
   ```

---

### Fase 6: Implementación con TDD y Auditoría de Pruebas

1. **Inyección Quirúrgica de Contexto**:
   El desarrollador o agente de IA (`agent-developer`) solo debe recibir como contexto `spec.md`, `design.md` y `license-policy.yaml`. Esto evita distracciones y alucinaciones.
2. **Test-Driven Development (TDD)**:
   Se desarrollan las pruebas unitarias y de mitigación (`SEC-TEST-*`) en `tests/` antes o junto con la implementación en `src/`.
3. **Auditar la Cobertura Total de Pruebas**:
   ```bash
   pnpm run verify:testing
   # o: npx aisdlc verify testing
   ```
   *Salida*: Genera `reports/TEST_VERIFICATION_AUDIT.md`. Bloquea la entrega si algún requisito o tarea carece de pruebas verificables en disco.

---

### Fase 7: Release Gate de Calidad Multilenguaje y Pre-Vuelo

Verifica que el código cumpla con los umbrales de calidad definidos en `quality-policy.yaml`:
- **Complejidad Ciclomática (McCabe)**: $\le 10$ por función.
- **Complejidad Cognitiva**: $\le 15$ por función.
- **Índice de Mantenibilidad (SEI MI)**: $\ge 50.0$ (Objetivo: $>65.0$).
- **Longitud Máxima de Función**: $\le 40$ líneas.

1. **Ejecutar Pre-Vuelo con Auto-Fix**:
   ```bash
   pnpm run check:fix
   # o: npx aisdlc check --fix
   ```
   *Efecto*: Sincroniza escenarios Gherkin, recalcula digests PDaC SHA-256 de las citaciones y verifica los gates de calidad.

2. **Evaluar el Release Gate de Calidad**:
   ```bash
   pnpm run verify:quality
   # o: npx aisdlc verify quality
   ```

3. **Generar Informe Formal de Calidad**:
   ```bash
   pnpm run report:quality
   # o: npx aisdlc report quality
   ```
   *Salida*: Genera `reports/QUALITY_REPORT.md` analizando TypeScript, JavaScript, Python, Go, Java, C#, Rust, C/C++.

---

### Fase 8: Matriz de Trazabilidad 360° Automatizada y Pull Request

1. **Auditar Trazabilidad 360° sin Fragilidad Textual**:
   ```bash
   pnpm run verify:traceability
   # o: npx aisdlc verify traceability
   ```
   *Salida*: Genera `reports/TRACEABILITY_MATRIX.md` verificando deterministamente la triangulación obligatoria:
   - **Producto (Upstream)**: Handoff PDaC (`HOF-*`) con subgrafo de casos de uso (`UC-*`), reglas (`BR-*`) y casos de abuso (`ABUSE-*`).
   - **Arquitectura (Midstream)**: Vistas arc42 / NAF v4 (`CMP-*`, `ADR-*`, `SEC-ENC-*`).
   - **Pruebas (Downstream)**: Suites BDD/Gherkin (`.feature`) y pruebas unitarias correspondientes.

2. **Ejecución Consolidada de la Suite de CI/CD (8 Quality Gates)**:
   ```bash
   pnpm run verify:all
   # o: npx aisdlc verify all
   ```
   *Compuertas evaluadas*: 1) Quality Gate de Complejidad, 2) Trazabilidad 360° (RTM), 3) Gobierno de Tareas, 4) Cobertura de Pruebas, 5) Licencias Open Source, 6) PDaC & Deriva Criptográfica SHA-256, 7) Esquemas JSON, 8) Verificación de Duplicados (Shift-Left Gate).


3. **Pull Request y Aprobación Humana**:
   - Se abre el Pull Request de la tarea hacia la rama feature, y luego hacia la rama release.
   - **Intervención Humana Innegociable**: El Tech Lead humano inspecciona el diff y los informes autogenerados en `reports/` antes de autorizar el merge final a producción.

> [!TIP]
> **Modelo de Trazabilidad Invertida (Inverted Traceability)**:
> Los requerimientos (`FR-*`, `QR-*`, `SEC-REQ-*`) no acoplan rutas de implementación ni de tests descendentes. Son los componentes (`satisfies-requirements`) y las pruebas (`@<REQ-ID>` o citaciones en tests) los que referencian hacia arriba a los requerimientos. La herramienta compila la matriz 360° deterministamente mediante resolución inversa (*Reverse Lookup*), protegiendo la inmutabilidad y los hashes SHA-256 de las especificaciones canónicas de producto.

---

### Fase 9: Integración Canónica Post-Implementación a la Línea Base

Una vez concluida la implementación del cambio y verificado que todas las tareas en `tasks.md` están en estado `COMPLETED`:

1. **Automatización Desatendida en CI/CD (Recomendado)**:
   - Al fusionar (*merge*) el Pull Request hacia `main` o ramas `release/*`, el workflow de GitHub Actions [`.github/workflows/sdd-integrate-on-merge.yml`](.github/workflows/sdd-integrate-on-merge.yml) se ejecuta automáticamente.
   - Detecta deterministamente el cambio activo asociado a la rama o commit del PR, ejecuta la integración canónica de forma segura y realiza commit y push automatizado con mensaje `chore(sdd): integrate <change-id> into canonical baseline [skip ci]`.
   - **Para el desarrollador**: solo es necesario ejecutar `git pull` en su rama local para ver los cambios reflejados.

2. **Ejecución Local / Manual (Comando Simplificado)**:
   ```bash
   # Detección y resolución automática del cambio activo completado:
   npx aisdlc sdd integrate --auto

   # O indicando explícitamente el ID del cambio:
   npx aisdlc sdd integrate --change chg-002-notificaciones-de-alerta-en-tiempo-real
   ```

   *Efectos y Transformaciones Deterministas*:
   - **Requerimientos de Producto**: Se promueven automáticamente a estado `active` en `specs/product/` y se añade una entrada en su historial de revisiones referenciando el `changeId`.
   - **Arquitectura**: Se actualizan los bloques de componente en `specs/architecture/` enlazando los requerimientos recién satisfechos en `satisfies-requirements`.
   - **Archivado Atómico**: El directorio del cambio se mueve de `specs/changes/active/<id>/` a `specs/changes/completed/<id>/`.
   - **Propuesta**: Se actualiza `proposal.md` fijando `status: applied`.

---

## 🚀 Guía Rápida para Equipos Humanos

1. **Definir la Intención del Producto**:
   - Usa plantillas en `templates/product/` para modelar Actores (`ACT-*`), Casos de Uso (`UC-*`) y Reglas de Negocio (`BR-*`).
   - Apóyate en agentes analistas (`ps:explore`) para identificar lagunas y requerimientos derivados (`FR-*`, `QR-*`).
2. **Incorporar Ciberseguridad Shift-Left**:
   - Modela actores maliciosos (`ACT-THREAT-*`) y casos de abuso (`ABUSE-*`).
   - Define requisitos de seguridad (`SEC-REQ-*`) y restricciones Zero Trust antes de diseñar la solución técnica.
3. **Modelar la Arquitectura arc42 / NAF v4**:
   - Modela los límites de contexto, componentes (`CMP-*`) y enclaves de red (`SEC-ENC-*`).
   - Cada componente debe citar los casos de uso que implementa.
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
