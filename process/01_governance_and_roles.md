# 01. Gobernanza, Roles y Matriz de Colaboración Persona-Agente

## 1. Modelo de Doble Ciudadanía (Human-Agent Dual-Citizen)

El framework AI-SDLC organiza a las personas y a los agentes de IA dentro de un modelo de gobernanza claro y equilibrado. Los agentes actúan como multiplicadores de fuerza técnica y cognitiva, mientras que los humanos actúan como garantes estratégicos, éticos, legales y de negocio.

---

## 2. Catálogo de Roles

### A. Roles Humanos
1. **Product Owner / Product Manager (PO)**:
   - Define la visión, los objetivos estratégicos y prioriza el backlog.
   - Tiene la autoridad exclusiva para **aprobar cambios en el modelo de producto** (`Product Changes`).
2. **Lead Architect / Arquitecto de Software**:
   - Define la estrategia de solución técnica, límites de contexto y patrones estructurales (arc42 + NAF v4).
   - Aprueba los Registros de Decisión Arquitectónica (`ADR-*`).
3. **Security Officer / CISO / SecOps**:
   - Valida el modelado de amenazas, aprueba requisitos de seguridad (`SEC-REQ-*`) y revisa excepciones de riesgo.
4. **Legal / IP & Compliance Officer**:
   - Valida el uso de licencias de terceros, aprueba la adquisición de licencias comerciales o excepciones de copyleft.
5. **Tech Lead / Senior Developer**:
   - Revisa el código generado por los agentes en los Pull Requests utilizando obligatoriamente la plantilla institucional (`.github/PULL_REQUEST_TEMPLATE.md`).
   - Evalúa la **Matriz de Ejecución del Plan y Estado de Pruebas (`X` vs `O`)**:
     - Exige la inclusión de **todos y cada uno** de los puntos identificados para implementar en la entrega.
     - Aplica el **criterio de bloqueo inmediato**: rechaza cualquier PR que contenga ítems planificados omitidos o ítems marcados con `[O]` (Problema / Bloqueo) que carezcan de justificación obligatoria (causa raíz, impacto, mitigación y referencia a issue de seguimiento o `ADR-TECH-DEBT-*`).
   - Audita exhaustivamente el **Mapa de Puntos Débiles (Weak Points Hotspots)**:
     - Inspecciona los "Hotspots de Complejidad" para garantizar el cumplimiento estricto de `quality-policy.yaml`.
     - Evalúa de forma crítica las "Asunciones de la IA" para erradicar alucinaciones, heurísticas arbitrarias o atajos técnicos antes de autorizar el merge final.

### B. Roles de Agentes de IA (Especializados por Persona)
1. **Agente Analista de Producto (`agent-product-analyst`)**:
   - Ejecuta habilidades de exploración (`ps:explore`), redacta borradores de artefactos de producto (`ACT-*`, `UC-*`, `BR-*`, `FR-*`), y detecta ambigüedades.
2. **Agente Modelador de Amenazas y Seguridad (`agent-threat-modeler`)**:
   - Aplica STRIDE y OWASP ASVS sobre los casos de uso (`UC-*`) y sobre artefactos técnicos de arquitectura (`CMP-*`, diagramas Mermaid, ADRs) en el bucle de retorno técnico procedente del arquitecto, proponiendo actores maliciosos (`ACT-THREAT-*`), casos de abuso (`ABUSE-*`) y requisitos de seguridad (`SEC-REQ-*`).
3. **Agente Arquitecto de Sistemas (`agent-system-architect`)**:
   - Genera diagramas de secuencia Mermaid, especificaciones OpenAPI, modelos de datos y propuestas de descomposición en bloques (`SRV-*`, `CMP-*`, `SYS-*`). Emite un bucle de retorno de seguridad técnica hacia `agent-threat-modeler` ante decisiones de infraestructura o persistencia con impacto en superficie de ataque.
4. **Agente Desarrollador / Coder (`agent-developer`)**:
   - Lee especificaciones de entrega SDD y genera código fuente limpio, modular y con tipado estricto, respetando los contratos de arquitectura.
5. **Agente de Pruebas / QA (`agent-test-engineer` / `agent-qa-engineer`)**:
   - Genera pruebas unitarias, de integración, pruebas de contrato y suites BDD/Gherkin exhaustivas en ROJO antes de la implementación.
6. **Agente Auditor de Código y Seguridad (`agent-security-auditor`)**:
   - Realiza revisiones adversariales del código en el PR buscando vulnerabilidades lógicas, inyecciones y fallos de autorización.
7. **Agente de Cumplimiento de Licencias (`agent-compliance-checker`)**:
   - Inspecciona manifiestos de dependencias contra `license-policy.yaml`, alerta sobre licencias comerciales y genera borradores de atribución.
8. **Agente Usuario Experto y Evaluador de Dominio (`agent-expert-user`)**:
   - Opera de forma bimodal: en fase de diseño define el corte MVP estricto y banco de sugerencias de roadmap (`templates/product/user-design-feedback.template.md`); en fase post-desarrollo realiza la validación funcional de extremo a extremo contrastando la interfaz y el comportamiento CLI frente a `UC-*` y `FR-*` antes de la auditoría de seguridad pre-merge.
9. **Agente Revisor Técnico y Arquitectónico (`agent-code-reviewer`)**:
   - Audita Pull Requests evaluando legibilidad, cumplimiento de principios SOLID/DRY, ausencia de code smells y límites de complejidad ciclomática y cognitiva, conformando la Tríada de Auditoría Pre-Merge.
10. **Agente Ingeniero de DevOps e Infraestructura (`agent-devops`)**:
    - Mantiene y evoluciona la infraestructura automatizada: flujos de CI/CD, Dockerfiles, manifiestos IaC y scripts de soporte, bajo el guardrail estricto de no invasión sobre el código fuente de la aplicación (`src/`).

---

## 3. Matriz RACI: Ciclo Completo de Desarrollo

> **Leyenda RACI:**
> - **R (Responsible)**: Quien ejecuta la tarea.
> - **A (Accountable)**: Quien tiene la autoridad final de aprobación (único).
> - **C (Consulted)**: Quien aporta información y contexto.
> - **I (Informed)**: Quien recibe la notificación del resultado.

| **Fase / Actividad** | PO (Humano) | Arquitecto (Humano) | SecOps (Humano) | Legal (Humano) | Tech Lead / Dev (Humano) | Agente IA Especializado | Guardrail / Regla Determinista |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Exploración y Redacción PDaC (Scribe)** | A | C | C | I | C | R (Analista Scribe) | IA redacta borrador conforme; no aprueba |
| **Aprobación de Product Change** | **A** | C | C | I | I | - | **Prohibido para agentes (Solo humano)** |
| **Evaluación de Diseño de Usuario (MVP vs Roadmap)** | **A** | C | C | I | C | R (Usuario Experto) | Aplica plantilla canónica; PO humano decide alcance |
| **Modelado de Amenazas (Scribe y Retorno Técnico)** | C | C | A | I | C | R (Threat Modeler Scribe) | Inferencia STRIDE/ASVS sobre UC-* y retorno técnico desde CMP-* |
| **Diseño Arquitectónico (arc42/NAF)** | I | **A** | C | I | C | R (Arquitecto) | Bloques deben citar casos de uso `UC-*` válidos |
| **Aprobación de ADRs** | C | **A** | C | I | C | - | **Solo humanos aprueban decisiones técnicas** |
| **Evaluación de Licencias OSS** | I | C | I | **A** | C | R (Compliance) | Detección automática en `license-policy.yaml` |
| **Compra de Licencia Comercial** | I | I | I | **A** | C | - | **Agentes no firman contratos ni pagan licencias** |
| **Elaboración de Spec SDD** | I | C | C | I | A | R (Desarrollador) | Citación criptográfica obligatoria (`id + digest`) y sidecar `handoff.yaml` |
| **Generación de Código & Tests** | I | I | I | I | A | R (Coder / QA) | Linter y compilación estricta sin errores |
| **Validación Funcional Post-Desarrollo** | **A** | C | I | I | C | R (Usuario Experto) | Contraste de UI/CLI contra UC-* y FR-* previo a auditoría de seguridad |
| **Tareas de Alto Riesgo (`HIGH_RISK_MANUAL`)** | I | A | A | I | **R (Ejecutor Humano Exclusivo)** | - | **Bloqueada para IA. Solo implementación humana** |
| **Tareas Interactivas (`HUMAN_REVIEW_PLAN`)** | I | C | C | I | **A (Aprobador Paso a Paso)** | R (Planificador / Co-implementador) | El agente se detiene en cada paso; el humano aprueba |
| **Revisión de Código Pre-Merge (SOLID / Clean Code)** | I | C | I | I | **A (Garante)** | R (Code Reviewer) | Inspección de CC <= 10, MI >= 50, code smells y principios SOLID |
| **Auditoría de Vulnerabilidades y SAST** | I | I | A | I | C | R (Security Auditor) | SAST determinista + Agente adversarial |
| **Infraestructura como Código y CI/CD** | I | C | C | I | **A** | R (DevOps) | Modificación exclusiva de .github/, Dockerfiles y scripts (prohibido src/) |
| **Integración Canónica SDD** | C | C | I | I | **A** | R (Desarrollador / CLI) | Todas las tareas en `tasks.md` deben estar `COMPLETED` |
| **Revisión de PR y Balance del Plan (`X`/`O`)** | I | C | C | I | **A (Garante y Aprobador)** | R (Declara matriz, puntos débiles y asunciones) | Obligatoria inclusión de todos y cada uno de los puntos; justificación de todo `[O]` |
| **Merge del Pull Request** | I | I | I | I | **A** | - | **Prohibido auto-merge por IA (Bloqueado por CI)** |

---

## 4. Modelo Operativo "AI as Scribe, Humano como Revisor, Aprobador e Implementador Crítico"

### A. Inversión de Carga Operativa Mecánica (The Scribe Paradigm)
Tradicionalmente, la redacción de especificaciones de producto y modelos de seguridad impone una severa fricción burocrática sobre los equipos de ingeniería: copiar plantillas Markdown (`templates/product/`, `templates/security/`), recordar taxonomías de IDs (`ACT-*`, `UC-*`, `FR-*`, `SEC-REQ-*`), estructurar frontmatters YAML con tipado estricto y redactar a mano escenarios ejecutables BDD/Gherkin con matrices `Examples`.

El modelo **AI as Scribe** invierte esta carga operativa:
1. **Intención en Lenguaje Natural**: El Product Owner, Tech Lead o SecOps describe la necesidad funcional o técnica en un prompt simple o descripción breve.
2. **Redacción Técnica Automatizada (AI as Scribe)**:
   - Los agentes especializados (`agent-product-analyst` y `agent-threat-modeler`) actúan como amanuenses técnicos:
     * Asignan automáticamente IDs correlativos inmutables libres de colisiones.
     * Completan el frontmatter YAML exacto conforme con el esquema JSON canónico (Draft 2020-12), marcándolo inicialmente con `status: draft`.
     * Redactan el enunciado normativo y los criterios de aceptación en Gherkin ejecutable (`Feature`, `Background`, `Scenario`, `Scenario Outline` con tabla de datos `Examples`).
     * Calculan los digests criptográficos SHA-256 para las citaciones de artefactos ascendentes (Upstream).
3. **Auto-Validación Determinista Inmediata**:
   - Antes de presentar el borrador al humano, el agente ejecuta internamente `aisdlc verify schemas`. Si detecta cualquier violación de esquema o tipo, autocorrige la sintaxis de forma inmediata, garantizando **0 fallos sintácticos** al llegar a la revisión humana.
4. **Revisión y Aprobación Exclusiva Humana**:
   - El humano no pierde tiempo maquetando YAML ni depurando sintaxis; inspecciona el borrador evaluando exclusivamente el valor de negocio, la viabilidad técnica y la suficiencia de las mitigaciones.
   - Una vez conforme, el humano cambia el estado a `status: approved` / `status: active` o aprueba el Pull Request correspondiente.

### B. Preservación Innegociable del Humano como Implementador
La automatización de borradores mecánicos **no desplaza ni sustituye al ser humano como implementador**. En AI-SDLC, el rol del humano como implementador activo es innegociable a través de tres pilares de gobernanza:

1. **Tareas de Alto Riesgo (`HIGH_RISK_MANUAL`) - Implementación Exclusivamente Humana**:
   - En tareas críticas donde un error puede comprometer la seguridad, integridad o continuidad del negocio (migraciones de datos en producción, manipulación de secretos o claves maestras criptográficas, aprovisionamiento de infraestructura productiva, código de seguridad del núcleo), **está estrictamente prohibida la ejecución autónoma por IA**.
   - Estas tareas son **ejecutadas única y directamente por ingenieros humanos**. La IA puede actuar como asistente de consulta o verificador de soporte, pero las modificaciones las realiza el humano.
2. **Pair-Programming Guiado Paso a Paso (`HUMAN_REVIEW_PLAN`)**:
   - En tareas de riesgo medio o con impacto arquitectónico, el agente de IA **debe detenerse** tras formular el plan de acción detallado.
   - El humano aprueba cada paso de manera interactiva o co-implementa junto con el agente, pudiendo asumir el control del teclado en cualquier momento para modificar el código o los artefactos.
3. **Soberanía y Autoría Directa de la Ingeniería**:
   - Cualquier ingeniero humano tiene siempre el derecho y la libertad de crear, editar o refactorizar directamente cualquier archivo de producto, arquitectura o código fuente sin intermediación de agentes. El framework AI-SDLC valida deterministamente el resultado mediante `aisdlc verify all`, garantizando la misma calidad y trazabilidad con independencia del autor.

---

## 5. Protocolo de Traspaso (Hand-off) y Contratos de Trabajo

Para evitar pérdidas de contexto o asunciones no válidas:

1. **De Definición a Arquitectura**:
   - El arquitecto (humano o agente) solo puede consumir artefactos de producto que hayan sido aprobados y fusionados en la rama principal (`docs/product/model/`). No se modela arquitectura sobre borradores no aprobados.
2. **De Definición de Producto a Ecosistemas SDD (Handoff PDaC Formal y Sidecars)**:
   - El producto emite formalmente un subgrafo de entrega inmutable con identificador `HOF-*` (casos de uso, requerimientos, reglas de negocio y citaciones SHA-256).
   - Los adaptadores formales de ecosistemas SDD (OpenSpec y GitHub Spec Kit) o el generador de cambios (`aisdlc change new`) depositan este subgrafo como un archivo de acompañamiento `handoff.yaml` dentro del espacio del cambio (`specs/changes/active/<id>/` o `specs/<id>/`).
3. **De Arquitectura a Especificación SDD**:
   - Cada entrega SDD debe referenciar un subconjunto acotado de requerimientos (`FR-*`, `SEC-REQ-*`), bloques de arquitectura (`SRV-*`, `SYS-*`) y suites BDD (`.feature`).
4. **Integración Canónica Post-Implementación**:
   - Al concluir la implementación y superar la verificación determinista, el cambio se integra en la especificación canónica mediante `aisdlc sdd integrate`, actualizando el estado de los requerimientos y los mapas arquitectónicos de dependencias.
5. **De Agente a Agente (Subagent Delegation)**:
   - Los agentes delegan tareas mediante contratos estructurados: objetivo claro, enlaces a artefactos canónicos citados, restricciones de tiempo/formato y comandos deterministas para verificar el resultado.
6. **Handoff entre Agentes del Workflow y Ventana de Acción Humana**:
   - Para garantizar que al usuario le quede nítido quién o quiénes son los siguientes en actuar dentro del flujo, los agentes adoptan el protocolo canónico de **Workflow Handoff** basado en la plantilla institucional [`templates/workflow/agent-handoff.template.md`](../templates/workflow/agent-handoff.template.md).
   - **Regla de Activación Condicional por Nivel de Autonomía**:
     * 🟢 **Modo `AUTONOMOUS`** (o tareas donde el humano supervisa únicamente la ejecución final en el PR o pipeline de CI): **NO se solicita ni emite este handoff interactivo**, permitiendo al agente ejecutar de manera desatendida y continua sin fricciones innecesarias.
     * 🟡 **Nivel de Autonomía $\ge$ `HUMAN_REVIEW_PLAN`** (`HUMAN_REVIEW_PLAN`, `AMBIGUOUS`, `HIGH_RISK_MANUAL`): **es OBLIGATORIO emitir el bloque de Workflow Handoff y DETENERSE**, exponiendo los entregables completados, sugiriendo el siguiente rol en el flujo y **dejando siempre la ventana abierta para que el usuario tome acción** (revisar, editar a mano, pausar, desviar o delegar al siguiente agente).
   - **Cadena de Transición Canónica del Ciclo de Vida**:
     $$\text{PO Humano} \rightarrow \text{agent-product-analyst} \rightarrow \text{agent-expert-user} \rightarrow \text{agent-threat-modeler} \rightarrow \text{agent-system-architect} \rightarrow \text{agent-developer} \rightarrow \text{agent-test-engineer} \rightarrow \text{agent-security-auditor} \rightarrow \text{agent-compliance-checker} \rightarrow \text{Tech Lead Humano}$$

---

## 6. Matriz de Clasificación de Tareas y Modos de Autonomía Humana

Toda feature o cambio de software se descompone en un plan de tareas atómicas (`tasks.md`) donde **cada tarea debe ser verificable y poseer una clasificación explícita de riesgo y autonomía**:

```
┌────────────────────────────────────────────────────────────────────────┐
│             MATRIZ DE GOBIERNO DE AUTONOMÍA HUMANA (AI-SDLC)           │
└────────────────────────────────────────────────────────────────────────┘

 🟢 MODO 1: AUTONOMOUS (Plan + Ejecución Autónoma)
    ├── Criterio: Riesgo BAJO, complejidad baja/moderada, especificación clara.
    ├── Comportamiento: El agente de IA planifica y ejecuta sin interrupción.
    └── Supervisión: El humano revisa únicamente el Pull Request y los reportes de CI.

 🟡 MODO 2: HUMAN_REVIEW_PLAN (Revisión Previa de Plan Obligatoria)
    ├── Criterio: Riesgo MEDIO, cambio de interfaces/contratos, impacto arquitectónico.
    ├── Comportamiento: El agente genera el plan de implementación, pero SE DETIENE.
    └── Supervisión: El humano DEBE revisar y aprobar el plan ANTES de escribir código.

 🟠 MODO 3: AMBIGUOUS (Tarea Ambigua / Bloqueada para Implementación)
    ├── Criterio: Requisitos incompletos, criterios difusos, conflicto de reglas.
    ├── Comportamiento: PROHIBIDO CODIFICAR O ASUMIR REQUISITOS.
    └── Supervisión: El agente formula preguntas para refinamiento humano previo.

 🔴 MODO 4: HIGH_RISK_MANUAL (Alto Riesgo / Ejecución Exclusiva Humana)
    ├── Criterio: Riesgo CRÍTICO (migraciones DB, claves criptográficas, infra prod).
    ├── Comportamiento: PROHIBIDA LA EJECUCIÓN AUTÓNOMA POR IA.
    └── Supervisión: Ejecución directa por ingenieros humanos o pair-programming estricto.
```

### Tabla de Decisión de Autonomía
| Nivel de Riesgo | Complejidad | Ambigüedad | Modo de Autonomía Resultante | Acción Requerida |
| :---: | :---: | :---: | :---: | :--- |
| **LOW** | LOW / MED | Cero (Especificada) | **`AUTONOMOUS`** 🟢 | Agente planifica y codifica de extremo a extremo. |
| **MEDIUM** | CUALQUIERA | Cero (Especificada) | **`HUMAN_REVIEW_PLAN`** 🟡 | Agente genera `implementation_plan.md` y espera aprobación. |
| **HIGH** | HIGH | Cero (Especificada) | **`HUMAN_REVIEW_PLAN`** 🟡 | Requiere aprobación formal del Tech Lead o Arquitecto. |
| **CUALQUIERA** | CUALQUIERA | Alta / Dudas | **`AMBIGUOUS`** 🟠 | **Bloqueada**. Requiere sesión de refinamiento con el usuario. |
| **CRITICAL** | CUALQUIERA | CUALQUIERA | **`HIGH_RISK_MANUAL`** 🔴 | **Bloqueada para IA**. Solo intervención manual de ingenieros. |

---

## 7. Modelo de Fricción Progresiva (Progressive Friction Governance)

Para optimizar la agilidad del desarrollo y erradicar la fatiga de proceso en correcciones menores sin degradar los controles en componentes críticos, el framework AI-SDLC formaliza el **Modelo de Fricción Progresiva**.

### A. Matriz de Perfiles de Cambio (Change Profiles)

El nivel de ceremonia documental, modelado formal de seguridad y ramificación Git se adapta dinámicamente según el perfil de cambio:

| Perfil | Nivel de Riesgo Típico | Artefactos Mínimos Exigidos | Modelado STRIDE / Seguridad | Jerarquía Git Permitida | Aprobación Humana Requerida |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`patch`** (Baja Fricción) | `LOW` | Únicamente `spec.md` condensado con bloque `verification` | **Exento** si no altera enclaves `SEC-ENC-*` ni interfaces externas | Rama directa `fix/<slug>` o `patch/<slug>` (Sin Tier 4 `task/*`) | Tech Lead único (revisión de PR y test verde) |
| **`standard`** (Fricción Nominal) | `MEDIUM` / `HIGH` | Andamiaje SDD completo (`proposal.md`, `spec.md`, `design.md`, `tasks.md`, `handoff.yaml`) | Exigido para endpoints o lógica de negocio nueva | Modelo estándar de 4 tiers (`main` $\rightarrow$ `release` $\rightarrow$ `feat/bug` $\rightarrow$ `task`) | Tech Lead formal |
| **`critical`** (Alta Fricción) | `CRITICAL` | Andamiaje SDD completo + `ADR-*` de arquitectura + Checklist Zero Trust | **Obligatorio e ineludible** (Amenazas, vectores de abuso y mitigación) | Modelo estricto de 4 tiers con protección máxima | **Doble aprobación humana**: Tech Lead + Lead Architect / SecOps |

### B. Fuente de Verdad Canónica en Frontmatter

La clasificación del nivel de fricción reside **de forma obligatoria en el frontmatter YAML de `spec.md`**:
```yaml
---
id: SPEC-PATCH-002-LINTER-FIX
type: delivery-spec
change-id: PATCH-002-LINTER-FIX
title: "Corrección de advertencias de linter"
profile: patch # <-- Fuente de verdad canónica: 'patch' | 'standard' | 'critical'
status: approved
verification:
  method: automated-unit-test
  command: pnpm test
---
```

> **Flexibilidad en Nomenclatura de Carpetas e IDs:**  
> A nivel de sistema de archivos e identificadores de cambio se admiten tanto prefijos tradicionales (`chg-XXX-<slug>` / `CHG-XXX`) como prefijos explícitos de parche (`patch-XXX-<slug>` / `PATCH-XXX`). El tooling y los verificadores deterministas consultan prioritariamente el atributo `profile` del frontmatter para validar los requisitos mínimos aplicables.

### C. Guardrail Determinista Anti-Bypass (Prevención de Evasión de Gobernanza)

Queda terminantemente prohibido utilizar el perfil `patch` como atajo para evadir controles arquitectónicos o de seguridad. Si un cambio declara `profile: patch` pero modifica:
1. Esquemas JSON canónicos (`schemas/`).
2. Enclaves o actores de ciberseguridad (`examples/security/`, `SEC-ENC-*`, certificados/secretos).
3. Políticas maestras organizacionales (`quality-policy.yaml`, `license-policy.yaml`).
4. Scripts o infraestructura crítica de despliegue.

El comando de verificación determinista (`aisdlc verify`) **bloqueará inmediatamente el pipeline (EXIT 1)** exigiendo reclasificar el cambio como `standard` o `critical`.

---

## 8. Protocolo de Revisión y Gobernanza de Pull Requests (Balance `X`/`O` y Puntos Débiles)

El Pull Request representa la última frontera de control y garantía antes de integrar código en ramas estables. Con el objetivo de erradicar la deuda técnica oculta y las alucinaciones silenciosas en el código generado por IA, se formaliza la gobernanza basada en `.github/PULL_REQUEST_TEMPLATE.md`:

### A. Obligaciones del Proponente (Agente de IA o Ingeniero)
1. **Exhaustividad Total Innegociable en la Matriz de Ejecución**:
   - Se deben transcribir e incluir en la tabla **todos y cada uno de los puntos identificados para implementar** en el plan de entrega (procedentes de `tasks.md`, de la especificación SDD o de los criterios de aceptación del issue).
   - Queda terminantemente prohibido agrupar tareas en descripciones genéricas o presentar listados parciales/selectivos.
2. **Convención Determinista de Marcado (`[X]` vs `[O]`)**:
   - **`[X]` (Completado y Probado)**: Solo aplicable si el ítem está 100% implementado y respaldado por pruebas automatizadas verificables en disco (`tests/` o `.feature`) con resultado verde sin fallos.
   - **`[O]` (Problema / Bloqueo)**: Si existió cualquier dificultad, limitación técnica, test diferido o bloqueo, se debe marcar con `[O]` y es **obligatoria su justificación completa**:
     - Causa raíz técnica o limitación encontrada.
     - Impacto real sobre el incremento o la arquitectura.
     - Mitigación inmediata o justificación de por qué se pospone.
     - Referencia formal al issue de seguimiento (GitHub Issue o `ADR-TECH-DEBT-*`).
3. **Mapeo Explícito de Puntos Débiles**:
   - Identificar funciones que rozan los límites de complejidad de `quality-policy.yaml` (Hotspots de Complejidad).
   - Listar casos límite no cubiertos por pruebas unitarias automatizadas (Casos Límite y Puntos Ciegos).
   - Explicitar todas las asunciones no triviales asumidas por la IA durante la implementación (Asunciones de la IA).

### B. Criterios de Bloqueo y Aprobación para el Tech Lead (Human Gatekeeper)
El Tech Lead actúa como árbitro decisorio y garante humano de la integridad de la solución:
1. **Criterios de Bloqueo Mandatorio Inmediato**:
   - **Omisión de ítems planificados**: Si la tabla no lista todos y cada uno de los puntos del plan original.
   - **Ítems `[O]` no justificados**: Si existe cualquier ítem `[O]` sin su justificación técnica cuádruple (causa, impacto, mitigación y enlace de seguimiento).
   - **Hotspots de Complejidad no mitigados**: Si alguna función viola los umbrales de `quality-policy.yaml` (CC $\le 10$, Cognitiva $\le 15$, LOC $\le 40$, MI $\ge 50$).
   - **Asunciones de la IA no convalidadas**: Si se detectan heurísticas o fallbacks asumidos por el agente que no corresponden con la visión de arquitectura o producto.
2. **Criterios de Aprobación**:
   - La totalidad de puntos planificados están presentes en la matriz con estado `[X]` (o `[O]` justificados y aceptados formalmente mediante `ADR-TECH-DEBT-*`).
   - El checklist determinista de pre-vuelo pasa al 100% (`pnpm run verify:all` y `pnpm run typecheck`).
   - El plan de contingencia, observabilidad y procedimiento de rollback están adecuadamente definidos.

