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
│   ├── manuals/                              # Plantillas MAN-USER (Manual de Usuario), MAN-PROD (Manual de Producción)
│   └── ci/                                   # Plantillas de CI/CD (GitLab CI, Azure DevOps, Bitbucket, GitHub Actions)
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

# 5. Ejecutar la suite consolidada de CI/CD (9 Gates de calidad y gobernanza)
pnpm run verify:all
# o vía npx: npx aisdlc verify all

# 6. Integrar el cambio a la línea base canónica (promoción de requisitos y arquitectura)
npx aisdlc sdd integrate --auto
# o especificando el ID: npx aisdlc sdd integrate --change chg-002-notificaciones-de-alerta-en-tiempo-real
```

> [!TIP]
> **Integración Desatendida en CI/CD Multi-Plataforma**: En flujos con Pull Request o Merge Request, el paso 6 (`sdd integrate`) se ejecuta automáticamente al fusionar el PR/MR mediante los pipelines configurados para GitHub Actions ([`.github/workflows/sdd-integrate-on-merge.yml`](.github/workflows/sdd-integrate-on-merge.yml)), GitLab CI (`.gitlab-ci.yml`), Azure DevOps (`azure-pipelines.yml`) o Bitbucket Pipelines (`bitbucket-pipelines.yml`).

### 3. Resumen de Comandos Simplificados del CLI (`aisdlc`)

| Herramienta / Comando CLI | Comando pnpm equivalente | Fase del Ciclo de Vida | Salida / Acción Realizada |
|---|---|---|---|
| `npx aisdlc change new <nombre>` | `pnpm run change:new -- <nombre>` | **Andamiaje SDD** | Genera `proposal.md`, `spec.md`, `design.md`, `tasks.md` y sidecar `handoff.yaml` (`HOF-*`) con digests SHA-256 |
| `npx aisdlc git checkout <TSK-ID>` | `pnpm run git:checkout <TSK-ID>` | **Gestión Git 4-Tiers** | Resuelve versión y crea en cascada: `main` ➔ `release/vX.Y.Z` ➔ `feat/CHG-*` ➔ `task/CHG-*/TSK-*` |
| `npx aisdlc git plan` | `pnpm run git:plan` | **Planificación Git** | Renderiza el árbol visual de jerarquía de ramas antes de trabajar |
| `npx aisdlc git validate <rama>` | `pnpm run git:validate <rama>` | **Gobierno Git** | Valida la nomenclatura estricta de cualquier rama según su Tier (1 a 4) |
| `npx aisdlc git hook install` | `pnpm run git:hook:install` | **Telemetría Git** | Instala el hook `prepare-commit-msg` para inyección automática de trailers en commits |
| `npx aisdlc kpi pr [opciones]` | `pnpm run kpi:pr` | **Métricas Pull Request** | Calcula y genera la tabla Markdown agregada de KPIs (tiempo, tokens, autoría) para el PR |
| `npx aisdlc kpi release --release <branch>` | `pnpm run kpi:release` | **Consolidado de Release** | Computa DIR por modelo/humano, densidad de defectos y coste de re-trabajo (`RELEASE_KPIS_<release>.md`) |
| `npx aisdlc check [--fix]` | `pnpm run check` / `check:fix` | **Pre-vuelo Unificado** | Sincroniza bloques Gherkin a `.feature`, actualiza digests SHA-256 PDaC, audita seguridad y verifica Quality Gates |
| `npx aisdlc verify all` | `pnpm run verify:all` | **Suite CI/CD Consolidada** | Evalúa los 9 Quality Gates (Calidad AST, Trazabilidad 360°, Gobierno, Tests, Licencias/SCA, PDaC, Schemas, Duplicados, Seguridad) |
| `npx aisdlc verify security [opciones]` | `pnpm run verify:security` | **Seguridad Shift-Left (Gate 9)** | Verificación unificada de secretos (Gitleaks) y SAST determinista (OWASP Top 10) |
| `npx aisdlc verify secrets [opciones]` | `pnpm run verify:secrets` | **Escaneo de Secretos** | Detección determinista de credenciales, llaves API, tokens y alta entropía (Shannon) con soporte git diff y delegación Gitleaks |
| `npx aisdlc verify sast [opciones]` | `pnpm run verify:sast` | **Seguridad SAST** | Detección determinista de patrones vulnerables generados por IA (SQLi, command injection, eval, SSRF, path traversal) y Semgrep |
| `npx aisdlc verify quality` | `pnpm run verify:quality` | **Release Gate de Código** | Evalúa Complejidad Ciclomática ($\le 10$), Cognitiva ($\le 15$) y Mantenibilidad ($\ge 50$) |
| `npx aisdlc verify traceability` | `pnpm run verify:traceability` | **Matriz 360° RTM** | Valida triangulación obligatoria: Producto (`HOF-*`) ➔ Arquitectura (`CMP-*`) ➔ Tests (`.feature`) |
| `npx aisdlc verify governance` | `pnpm run verify:governance` | **Gobierno de Tareas** | Audita modos de autonomía (`AUTONOMOUS`, `HUMAN_REVIEW_PLAN`, `HIGH_RISK_MANUAL`, `AMBIGUOUS`) |
| `npx aisdlc verify testing` | `pnpm run verify:testing` | **Auditoría de Tests** | Comprueba que el 100% de requerimientos y tareas cuentan con pruebas verificables en disco |
| `npx aisdlc verify licenses [opciones]` | `pnpm run verify:licenses` | **Gobernanza IP / OSS y SCA** | Escaneo dinámico de dependencias y generación de SBOM CycloneDX 1.5 y avisos de terceros (`THIRD_PARTY_NOTICES.md`) frente a `license-policy.yaml` |
| `npx aisdlc verify pdac` | `pnpm run verify:pdac` | **Integridad Criptográfica**| Detecta derivas (*drift*) en el grafo PDaC comparando hashes SHA-256 |
| `npx aisdlc verify schemas` | `pnpm run verify:schemas` | **Conformidad Estructural** | Valida artefactos Markdown frente a esquemas JSON canónicos (Draft 2020-12) |
| `npx aisdlc sdd verify` | - | **Conformidad SDD** | Audita que los cambios activos cumplan la especificación y contengan sidecars válidos |
| `npx aisdlc sdd integrate [--auto]` | - | **Promoción a Baseline** | Promueve requerimientos a `active`, enlaza arquitectura, marca propuesta `applied` y archiva el cambio |
| `npx aisdlc report quality` | `pnpm run report:quality` | **Reporting Formal** | Genera informe detallado de métricas en `reports/QUALITY_REPORT.md` |
| `npx tsx scripts/export-active-requirements.ts` | `pnpm run report:requirements` | **Catálogo de Producto** | Genera catálogo consolidado de requerimientos en `reports/ACTIVE_REQUIREMENTS.md` |
| `npx tsx scripts/bundle-documentation.ts` | `pnpm run report:docs` | **Dossier Maestro** | Compila documentación y manuales con TOC interactiva en `reports/AI_SDLC_SPECIFICATION_FULL.md` |
| `npx aisdlc init [dir] [--ci <provider>]` | - | **Inicialización** | Inicializa un nuevo repo con carpetas, esquemas, políticas y pipeline CI/CD (`github`, `gitlab`, `azure`, `bitbucket`) |


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
   - 🟢 **Permisivas (Aprobadas)**: `MIT`, `Apache-2.0`, `BSD-3-Clause`, `ISC`, `MS-PL` (uso libre en cualquier capa).
   - 🟡 **Copyleft Débil (Condicionadas)**: `LGPL-3.0`, `MPL-2.0`, `MS-RL` (solo consumo como librería dinámica, sin modificaciones internas).
   - 🔴 **Virales (Prohibidas)**: `GPL-2.0`, `GPL-3.0`, `AGPL-3.0` (bloqueadas para proteger la propiedad intelectual del código propietario y SaaS).
   - ⚠️ **Comerciales / Duales (Pago Requerido)**: `BSL-1.1`, `SSPL-1.0` (requieren aprobación y formulario formal en `templates/compliance/commercial-acquisition-request.template.md`).

2. **Auditar Licencias y Composición de Software (SCA) con el Comando Simplificado**:
   ```bash
   pnpm run verify:licenses
   # o: npx aisdlc verify licenses
   
   # Opcional: Generar SBOM CycloneDX 1.5 y Notices de Atribución en un solo paso
   npx aisdlc verify licenses --sbom reports/sbom.cdx.json --notices THIRD_PARTY_NOTICES.md
   ```
   *Efecto*:
   - Ejecuta un escaneo dinámico determinista sobre los paquetes reales instalados en `node_modules` y `.pnpm` (o mediante `--tool trivy` / `--tool syft` si están instalados).
   - Bloquea la entrega si detecta licencias prohibidas o comerciales no homologadas.
   - Genera `reports/LICENSE_COMPLIANCE_REPORT.md` con el estado formal del Quality Gate.
   - Si se solicita `--sbom`, exporta el inventario estándar en formato CycloneDX 1.5 JSON.
   - Si se solicita `--notices`, consolida las atribuciones legales y textos de copyright en Markdown.

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

2. **Ejecución Consolidada de la Suite de CI/CD (9 Quality Gates)**:
   ```bash
   pnpm run verify:all
   # o: npx aisdlc verify all
   ```
   *Compuertas evaluadas*: 1) Quality Gate (Complejidad y Calidad AST), 2) Trazabilidad 360° (RTM), 3) Gobierno de Tareas y Autonomía, 4) Cobertura de Pruebas (Reqs & Tasks), 5) Licencias Open Source y SCA, 6) PDaC & Deriva Criptográfica SHA-256, 7) Esquemas JSON de Artefactos, 8) Verificación de Duplicados (Shift-Left Gate), 9) Seguridad Shift-Left (Detección de Secretos Gitleaks & SAST).


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

## 🔬 Tutorial 3: Análisis Estático con AST Real y Soporte Multilenguaje

AI-SDLC incluye un motor de análisis estático basado en **Árbol de Sintaxis Abstracta (AST) Real** para medir con precisión matemática la Complejidad Ciclomática (McCabe), Complejidad Cognitiva (SonarQube), Líneas de Código (LOC) e Índice de Mantenibilidad (MI), erradicando por completo los falsos positivos derivados de expresiones regulares heurísticas o conteo ingenuo de llaves.

### 1. Arquitectura Multilenguaje Híbrida

- **TypeScript, JavaScript, TSX y JSX**: Analizados mediante [`ts-morph`](https://github.com/dsherret/ts-morph) (licencia MIT) directamente sobre el AST en memoria.
  - Reconoce con precisión componentes React funcionales, callbacks, closures, getters/setters y constructores.
  - Inmune a plantillas con llaves anidadas `${{ a: 1 }}`, atributos JSX (`style={{ ... }}`) y comentarios.
  - Detecta el uso prohibido de `any` semántico (`SyntaxKind.AnyKeyword`) sin falsos positivos en variables como `company`.
- **Go, Rust, Java, C#, C, C++ y Python**: Analizados mediante un escáner léxico token-aware determinista.
  - Aísla comentarios de línea (`//`, `#`) y bloque (`/* ... */`, `""" ... """`).
  - Protege cadenas de texto, caracteres escapados y raw strings (ej. `r#"..."#` en Rust o backticks en Go).

### 2. Ejemplos Prácticos de Referencia en el Repositorio

El directorio [`examples/ast-analysis/`](examples/ast-analysis/) contiene casos de prueba y módulos representativos en cada lenguaje:
- [`examples/ast-analysis/component.tsx`](examples/ast-analysis/component.tsx): Componente TSX con hooks, closures y templates anidados.
- [`examples/ast-analysis/gateway.go`](examples/ast-analysis/gateway.go): Módulo Go con JSON embebido y comentarios con llaves.
- [`examples/ast-analysis/pipeline.rs`](examples/ast-analysis/pipeline.rs): Módulo Rust con raw strings JSON y pattern matching.
- [`examples/ast-analysis/analytics.py`](examples/ast-analysis/analytics.py): Módulo Python con docstrings multilínea conteniendo llaves.
- [`examples/ast-analysis/OrderService.cs`](examples/ast-analysis/OrderService.cs): Servicio C# con interpolación de strings.
- [`examples/ast-analysis/TelemetryHandler.java`](examples/ast-analysis/TelemetryHandler.java): Clase Java con métodos y try-with-resources.

### 3. Comandos de Verificación de Calidad

Para evaluar la calidad de todo el código del repositorio frente a `quality-policy.yaml`:

```bash
# Ejecutar verificación de calidad aislada
pnpm run verify:quality
# o mediante npx:
npx aisdlc verify quality

# Ejecutar el pre-vuelo consolidado que incluye la compuerta de calidad AST
pnpm run check
```

---

## 🛡️ Tutorial 4: Escaneo Dinámico de Licencias y Generación de SBOM (SCA)

AI-SDLC incluye un motor de análisis de composición de software (SCA) y gobernanza de licencias dinámico con capacidad de introspección directa sobre el árbol instalado de dependencias (`node_modules` / `.pnpm`), generación de SBOM estándar **CycloneDX 1.5** y consolidación automática de atribuciones legales (`THIRD_PARTY_NOTICES.md`).

### 1. Modos de Escaneo: Nativo Zero-Install y Conectores de Terceros

- **Escaneo Dinámico Nativo (Por Defecto)**:
  - Inspecciona deterministamente las dependencias reales instaladas en disco (`node_modules` y carpetas de monorepos pnpm), resolviendo paquetes físicos y enlaces simbólicos.
  - Extrae metadatos precisos de `package.json`, resuelve expresiones compuestas (`AND` / `OR`) y detecta ficheros de licencia físicos (`LICENSE`, `COPYING`, `NOTICE`) para incorporar los textos completos de atribución.
  - No requiere la instalación de binarios externos ni herramientas adicionales.
- **Conectores Opcionales Bring-Your-Own-Tool (`--tool`)**:
  - Si el entorno dispone de herramientas corporativas como **Trivy** (`--tool trivy`) o **Syft** (`--tool syft`), AI-SDLC se conecta a sus salidas JSON/CycloneDX nativas.
  - Implementa *graceful fallback*: si el binario especificado no se encuentra en el sistema, retrocede automáticamente al escáner nativo sin romper el pipeline.

### 2. Comandos y Generación de Entregables de Compliance

```bash
# Verificación estándar de licencias dinámicas frente a license-policy.yaml
pnpm run verify:licenses
# o mediante npx:
npx aisdlc verify licenses

# Generar SBOM en formato CycloneDX 1.5 JSON para auditorías o inventario
npx aisdlc verify licenses --sbom reports/sbom.cdx.json

# Generar el dossier legal consolidado de atribución THIRD_PARTY_NOTICES.md
npx aisdlc verify licenses --notices THIRD_PARTY_NOTICES.md

# Generar simultáneamente SBOM y Notices limitando el escaneo a dependencias directas
npx aisdlc verify licenses --sbom reports/sbom.cdx.json --notices THIRD_PARTY_NOTICES.md --depth direct

# Integrar con Trivy o Syft en runners corporativos de CI/CD
npx aisdlc verify licenses --tool trivy --sbom reports/trivy-sbom.cdx.json
```

### 3. Salidas y Artefactos Producidos

- **`reports/LICENSE_COMPLIANCE_REPORT.md`**: Informe formal con desglose por categoría (Permisivas, Copyleft, Comerciales, Prohibidas), dependencias analizadas y estado del Quality Gate.
- **`reports/sbom.cdx.json`**: Software Bill of Materials (CycloneDX 1.5) con metadatos completos de componentes, hashes y licencias SPDX.
- **`THIRD_PARTY_NOTICES.md`**: Archivo de atribución legal que agrupa paquetes por licencia y reproduce los textos íntegros de copyright requeridos por licencias MIT, Apache-2.0, BSD, etc.

---

## 🔐 Tutorial 5: Detección Determinista de Secretos y Seguridad Shift-Left (Gitleaks & SAST)

AI-SDLC implementa una defensa en profundidad determinista para erradicar la exposición involuntaria de credenciales y la introducción de patrones de vulnerabilidad comunes en código sintetizado por modelos de lenguaje (LLMs).

### 1. Gate 9: Detección Determinista de Secretos (`verify secrets`)

El escaneo de secretos inspecciona el repositorio en busca de credenciales, llaves API, tokens de autenticación o certificados embebidos antes de que alcancen el repositorio remoto o el entorno de producción.

#### Características Principales:
- **Motor Híbrido Zero-Dependencies**:
  - Reglas deterministas para Claves Privadas (RSA, EC, DSA, OpenSSH), tokens de GitHub (`ghp_`, `gho_`, etc.), AWS Access Keys (`AKIA...`), Google API Keys (`AIza...`), Slack API tokens (`xox[baprs]-...`), Stripe API keys (`sk_live_...`, `rk_live_...`), OpenAI API keys (`sk-...`), JSON Web Tokens (`eyJ...`) y asignaciones genéricas de tokens.
  - Análisis de **Entropía de Shannon** para identificar cadenas aleatorias de alta entropía ($\ge 4.5$ por defecto) comúnmente empleadas en claves y contraseñas.
- **Escaneo Incremental Git Diff**:
  - Mediante el flag `--diff`, analiza únicamente las modificaciones en el área de trabajo o *staging* de Git, reduciendo el tiempo de escaneo a milisegundos en tareas y commits diarios.
  - El flag opcional `--base <rama>` permite comparar contra la rama de destino (ej. `origin/main` o `release/v1.0.0`) en pipelines de Pull Request.
- **Delegación en Gitleaks (`--gitleaks`)**:
  - Si el binario oficial de `gitleaks` está instalado localmente o en el runner de CI/CD, el CLI puede delegar el escaneo en Gitleaks para máxima cobertura.
  - Implementa *graceful fallback*: si `gitleaks` no está presente, retrocede transparentemente al motor determinista interno.
- **Enmascaramiento Estricto de Seguridad**:
  - Los secretos nunca se vuelcan en texto claro en la consola ni en los artefactos generados. Todas las salidas se anonimizan (`AKIA****************`).
- **Supresiones Controladas**:
  - Cuando un valor similar a un secreto es un identificador legítimo o un mock seguro de test, se puede suprimir el hallazgo añadiendo el comentario en línea:
    ```typescript
    const testPlaceholder = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // ai-sdlc:allow-secret
    ```
- **Código de Salida 4**:
  - Cualquier violación detectada finaliza con **exit code 4**, bloqueando de inmediato el pipeline de integración continua.

### 2. Análisis Estático de Vulnerabilidades SAST y Prompt Injection (`verify sast`)

Los asistentes de IA generativa pueden sintetizar soluciones sintácticamente elegantes pero intrínsecamente vulnerables. El motor SAST shift-left evalúa el código frente a los patrones de riesgo más críticos de OWASP y OWASP Top 10 for LLMs:
1. **SQL Injection (CWE-89)**: Concatenación directa o interpolación en sentencias SQL (`SELECT ... + userInput`).
2. **Command Injection (CWE-78)**: Llamadas al sistema operativo (`exec`, `execSync`, `spawn`) con interpolación de cadenas sin parametrización.
3. **Dynamic Code Evaluation (CWE-95)**: Uso de `eval(...)` o `new Function(...)` con variables no confiables.
4. **Server-Side Request Forgery - SSRF (CWE-918)**: Solicitudes HTTP salientes (`fetch`, `axios`, `http.get`) donde la URL o dominio se construye con entradas del usuario.
5. **Path Traversal (CWE-22)**: Acceso a archivos (`fs.readFile`, `fs.open`) con interpolación directa sin resolución o *jail* de ruta.
6. **Prompt Injection Inseguro (OWASP LLM01 / CWE-1427)**:
   - *Concatenación Directa (`SAST-006`)*: Construcción de prompts o mensajes hacia LLMs interpolando entradas del usuario sin delimitadores defensivos (`prompt = $"Summarize: {userInput}"`, `prompt = "Translate: " + req.query.text`).
   - *Jailbreaks y Firmas Adversariales (`SAST-007`)*: Directivas que intentan anular o forzar modos desprotegidos (*"ignore previous instructions"*, *"system prompt override"*, *"DAN mode"*, rupturas `</system>`).
   - *Runtime Guard*: Función exportada `detectPromptInjection(text)` en `@ai-sdlc/core` para validación programática en memoria.

#### Cobertura Multilingüe Universal:
El motor SAST escanea código fuente en lenguajes generalistas y plantillas de IA: **TypeScript/JavaScript** (`.ts`, `.js`), **Python** (`.py`), **C#** (`.cs`), **Java/Kotlin/Scala** (`.java`, `.kt`, `.scala`), **C/C++** (`.c`, `.cpp`, `.cc`), **Go** (`.go`), **Rust** (`.rs`), **PHP** (`.php`), **Ruby** (`.rb`), **Swift** (`.swift`) y plantillas de prompts (`.prompt`).

Opcionalmente, `--semgrep` permite delegar la ejecución en el motor corporativo de Semgrep si está presente en el entorno.


### 3. Comandos Prácticos de Seguridad

```bash
# 1. Escaneo completo de secretos en el árbol de trabajo
pnpm run verify:secrets
# o vía npx:
npx aisdlc verify secrets

# 2. Escaneo ultra-rápido sobre el diff local de Git (ideal para pre-commit hooks)
npx aisdlc verify secrets --diff

# 3. Escaneo de diff frente a una rama base en CI (Pull Request)
npx aisdlc verify secrets --diff --base origin/main

# 4. Ajuste de sensibilidad de entropía de Shannon (ej. 5.0 para menor sensibilidad)
npx aisdlc verify secrets --entropy 5.0

# 5. Escaneo de secretos delegando en el binario oficial de Gitleaks
npx aisdlc verify secrets --gitleaks

# 6. Escaneo estático SAST shift-left de vulnerabilidades generadas por IA
pnpm run verify:sast
# o vía npx:
npx aisdlc verify sast

# 7. Escaneo SAST con delegación opcional en Semgrep
npx aisdlc verify sast --semgrep

# 8. Pre-vuelo consolidado (incluye Gate 9 de secretos)
pnpm run check
```

### 4. Salidas y Reportes Generados

- **`reports/SECRET_SCAN_REPORT.md`**: Informe formal de auditoría de secretos con regla infringida, severidad, fichero, línea y token enmascarado.
- **`reports/SAST_REPORT.md`**: Informe formal de vulnerabilidades SAST con tipo de fallo, severidad, fichero, línea y fragmento de código de muestra.

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
