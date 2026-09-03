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

| Fase / Actividad | PO (Humano) | Arquitecto (Humano) | SecOps (Humano) | Legal (Humano) | Tech Lead (Humano) | Agente IA Especializado | Guardrail / Regla Determinista |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Exploración de Producto** | A | C | C | I | C | R (Analista) | IA nunca inventa decisiones no consensuadas |
| **Aprobación de Product Change** | **A** | C | C | I | I | - | **Prohibido para agentes (Solo humano)** |
| **Modelado de Amenazas** | C | C | A | I | C | R (Threat Modeler) | Mapeo obligatorio a taxonomía STRIDE/ASVS |
| **Diseño Arquitectónico (arc42/NAF)** | I | **A** | C | I | C | R (Arquitecto) | Bloques deben citar casos de uso `UC-*` válidos |
| **Aprobación de ADRs** | C | **A** | C | I | C | - | **Solo humanos aprueban decisiones técnicas** |
| **Evaluación de Licencias OSS** | I | C | I | **A** | C | R (Compliance) | Detección automática en `license-policy.yaml` |
| **Compra de Licencia Comercial** | I | I | I | **A** | C | - | **Agentes no firman contratos ni pagan licencias** |
| **Elaboración de Spec SDD** | I | C | C | I | A | R (Desarrollador) | Citación criptográfica obligatoria (`id + digest`) |
| **Generación de Código & Tests** | I | I | I | I | A | R (Coder / QA) | Linter y compilación estricta sin errores |
| **Auditoría de Vulnerabilidades** | I | I | A | I | C | R (Security Auditor) | SAST determinista + Agente adversarial |
| **Merge del Pull Request** | I | I | I | I | **A** | - | **Prohibido auto-merge por IA (Bloqueado por CI)** |

---

## 4. Protocolo de Traspaso (Hand-off) y Contratos de Trabajo

Para evitar pérdidas de contexto o asunciones no válidas:

1. **De Definición a Arquitectura**:
   - El arquitecto (humano o agente) solo puede consumir artefactos de producto que hayan sido aprobados y fusionados en la rama principal (`docs/product/model/`). No se modela arquitectura sobre borradores no aprobados.
2. **De Arquitectura a Especificación SDD**:
   - Cada entrega SDD debe referenciar un subconjunto acotado de requerimientos (`FR-*`, `SEC-REQ-*`) y bloques de arquitectura (`SRV-*`, `SYS-*`).
3. **De Agente a Agente (Subagent Delegation)**:
   - Los agentes delegan tareas mediante contratos estructurados: objetivo claro, enlaces a artefactos canónicos citados, restricciones de tiempo/formato y comandos deterministas para verificar el resultado.

---

## 5. Matriz de Clasificación de Tareas y Modos de Autonomía Humana

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
