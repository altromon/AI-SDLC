---
id: TSK-PLAN-CHG-049-NODE-LTS-RUNTIME-AND-CI
type: task-plan
change-id: CHG-049-NODE-LTS-RUNTIME-AND-CI
title: 'Desglose de Tareas Verificables: Node LTS Runtime and CI Alignment'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 1
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Actualización de engines en package.json (>=20.0.0)
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: node -e "const pkg = require('./package.json'); if (pkg.engines.node !== '>=20.0.0') process.exit(1);"
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: &ref_0
      - FR-030-INIT-AGENT-SCAFFOLDING-001
  - id: TSK-002
    title: Actualización de matriz en .github/workflows/ci.yml a [20.x, 22.x]
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: node -e "const fs = require('fs'); const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf-8'); if (!ci.includes('[ 20.x, 22.x ]') || ci.includes('18.x')) process.exit(1);"
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: *ref_0
  - id: TSK-003
    title: Sincronización de plantillas starter de CI y documentación de soporte
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: node -e "const fs = require('fs'); const tpl = fs.readFileSync('templates/ci/github-workflows/ci.yml', 'utf-8'); if (!tpl.includes('[ 20.x, 22.x ]')) process.exit(1);"
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: *ref_0
  - id: TSK-004
    title: Verificación integral de tests y quality gates en runtime LTS
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: HUMAN_REVIEW_PLAN
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-qa
    status: COMPLETED
    implements-components:
      - CMP-CORE
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-049-NODE-LTS-RUNTIME-AND-CI

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Manifiestos de Paquete (TSK-001)
- **ID**: `TSK-001`
- **Título**: Actualización de engines en `package.json` (`>=20.0.0`)
- **Descripción**: Modificar la clave `engines.node` en `package.json` para reflejar `>=20.0.0`.
- **Modo**: `AUTONOMOUS` 🟢
- **Estado**: `COMPLETED` ✅
- **Verificación**: `node -e "const pkg = require('./package.json'); if (pkg.engines.node !== '>=20.0.0') process.exit(1);"`

### Fase 2: Matriz de Integración Continua (TSK-002)
- **ID**: `TSK-002`
- **Título**: Actualización de matriz en `.github/workflows/ci.yml` a `[ 20.x, 22.x ]`
- **Descripción**: Ajustar la matriz de Node.js en `.github/workflows/ci.yml` eliminando `18.x`.
- **Modo**: `AUTONOMOUS` 🟢
- **Estado**: `COMPLETED` ✅
- **Verificación**: `node -e "const fs = require('fs'); const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf-8'); if (!ci.includes('[ 20.x, 22.x ]') || ci.includes('18.x')) process.exit(1);"`

### Fase 3: Plantillas y Documentación (TSK-003)
- **ID**: `TSK-003`
- **Título**: Sincronización de plantillas starter de CI y documentación de soporte
- **Descripción**: Actualizar `templates/ci/github-workflows/ci.yml` y referencias en `README.md` y manuales.
- **Modo**: `AUTONOMOUS` 🟢
- **Estado**: `COMPLETED` ✅
- **Verificación**: `node -e "const fs = require('fs'); const tpl = fs.readFileSync('templates/ci/github-workflows/ci.yml', 'utf-8'); if (!tpl.includes('[ 20.x, 22.x ]')) process.exit(1);"`

### Fase 4: Validación y Quality Gates (TSK-004)
- **ID**: `TSK-004`
- **Título**: Verificación integral de tests y quality gates en runtime LTS
- **Descripción**: Ejecución de las suites de pruebas unitarias y verificación de conformidad.
- **Modo**: `HUMAN_REVIEW_PLAN` 🟡
- **Estado**: `COMPLETED` ✅
- **Verificación**: `pnpm test`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-01 | Alfonso Troyano / agent-developer | Tareas implementadas y verificadas bajo Node LTS | CHG-049-NODE-LTS-RUNTIME-AND-CI |
