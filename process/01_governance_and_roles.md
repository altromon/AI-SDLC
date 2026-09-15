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
   - Revisa el código generado por los agentes en los Pull Requests, evalúa la estrategia de pruebas y realiza el `merge` final.

### B. Roles de Agentes de IA (Especializados por Persona)
1. **Agente Analista de Producto (`agent-product-analyst`)**:
   - Ejecuta habilidades de exploración (`ps:explore`), redacta borradores de artefactos de producto (`ACT-*`, `UC-*`, `BR-*`, `FR-*`), y detecta ambigüedades.
2. **Agente Modelador de Amenazas y Seguridad (`agent-threat-modeler`)**:
   - Aplica STRIDE y OWASP ASVS sobre los casos de uso, proponiendo actores maliciosos (`ACT-THREAT-*`), casos de abuso (`ABUSE-*`) y requisitos de seguridad (`SEC-REQ-*`).
3. **Agente Arquitecto de Sistemas (`agent-system-architect`)**:
   - Genera diagramas de secuencia Mermaid, especificaciones OpenAPI, modelos de datos y propuestas de descomposición en bloques (`SRV-*`, `SYS-*`).
4. **Agente Desarrollador / Coder (`agent-developer`)**:
   - Lee especificaciones de entrega SDD y genera código fuente limpio, modular y con tipado estricto, respetando los contratos de arquitectura.
5. **Agente de Pruebas / QA (`agent-test-engineer`)**:
   - Genera pruebas unitarias, de integración, pruebas de contrato y tests de mitigación de seguridad (`SEC-TEST-*`).
6. **Agente Auditor de Código y Seguridad (`agent-security-auditor`)**:
   - Realiza revisiones adversariales del código en el PR buscando vulnerabilidades lógicas, inyecciones y fallos de autorización.
7. **Agente de Cumplimiento de Licencias (`agent-compliance-checker`)**:
   - Inspecciona manifiestos de dependencias contra `license-policy.yaml`, alerta sobre licencias comerciales y genera borradores de atribución.

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
| **Modelado de Amenazas (Scribe)** | C | C | A | I | C | R (Threat Modeler Scribe) | Inferencia STRIDE/ASVS; validación de esquemas |
| **Diseño Arquitectónico (arc42/NAF)** | I | **A** | C | I | C | R (Arquitecto) | Bloques deben citar casos de uso `UC-*` válidos |
| **Aprobación de ADRs** | C | **A** | C | I | C | - | **Solo humanos aprueban decisiones técnicas** |
| **Evaluación de Licencias OSS** | I | C | I | **A** | C | R (Compliance) | Detección automática en `license-policy.yaml` |
| **Compra de Licencia Comercial** | I | I | I | **A** | C | - | **Agentes no firman contratos ni pagan licencias** |
| **Elaboración de Spec SDD** | I | C | C | I | A | R (Desarrollador) | Citación criptográfica obligatoria (`id + digest`) y sidecar `handoff.yaml` |
| **Generación de Código & Tests** | I | I | I | I | A | R (Coder / QA) | Linter y compilación estricta sin errores |
| **Tareas de Alto Riesgo (`HIGH_RISK_MANUAL`)** | I | A | A | I | **R (Ejecutor Humano Exclusivo)** | - | **Bloqueada para IA. Solo implementación humana** |
| **Tareas Interactivas (`HUMAN_REVIEW_PLAN`)** | I | C | C | I | **A (Aprobador Paso a Paso)** | R (Planificador / Co-implementador) | El agente se detiene en cada paso; el humano aprueba |
| **Auditoría de Vulnerabilidades** | I | I | A | I | C | R (Security Auditor) | SAST determinista + Agente adversarial |
| **Integración Canónica SDD** | C | C | I | I | **A** | R (Desarrollador / CLI) | Todas las tareas en `tasks.md` deben estar `COMPLETED` |
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
   - Los adaptadores formales de ecosistemas SDD (OpenSpec y GitHub Spec Kit) depositan este subgrafo como un archivo de acompañamiento `handoff.yaml` dentro del espacio del cambio (`specs/changes/active/<id>/` o `specs/<id>/`).
3. **De Arquitectura a Especificación SDD**:
   - Cada entrega SDD debe referenciar un subconjunto acotado de requerimientos (`FR-*`, `SEC-REQ-*`), bloques de arquitectura (`SRV-*`, `SYS-*`) y suites BDD (`.feature`).
4. **Integración Canónica Post-Implementación**:
   - Al concluir la implementación y superar la verificación determinista, el cambio se integra en la especificación canónica mediante `aisdlc sdd integrate`, actualizando el estado de los requerimientos y los mapas arquitectónicos de dependencias.
5. **De Agente a Agente (Subagent Delegation)**:
   - Los agentes delegan tareas mediante contratos estructurados: objetivo claro, enlaces a artefactos canónicos citados, restricciones de tiempo/formato y comandos deterministas para verificar el resultado.

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
