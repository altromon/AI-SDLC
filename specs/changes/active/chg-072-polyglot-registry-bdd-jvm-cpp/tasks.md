---
id: TSK-PLAN-CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
type: task-plan
change-id: CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
title: 'Desglose de Tareas Verificables: Polyglot Registry and BDD Support for Java, Kotlin, C, and C++'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 4
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-072-01
    title: Crear POLYGLOT_LANGUAGE_REGISTRY y POLYGLOT_EXCLUDED_DIRS en polyglot-registry.ts y extender GherkinScaffoldLanguage
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
    satisfies-requirements: &ref_0
      - FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001
    implements-contracts:
      - POLYGLOT_LANGUAGE_REGISTRY
      - POLYGLOT_EXCLUDED_DIRS
      - PolyglotLanguageSpec
      - GherkinScaffoldLanguage
      - normalizeScaffoldLanguage
  - id: TSK-072-02
    title: Extender GHERKIN_GENERATOR_SPECS y plantillas RED para java, kt (alias kotlin), c y cpp
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
    satisfies-requirements: *ref_0
    implements-contracts:
      - GHERKIN_GENERATOR_SPECS
      - normalizeScaffoldLanguages
  - id: TSK-072-03
    title: Migrar consumidores en @aisdlc/core y detectDefaultScaffoldLanguage en check.ts al registro unificado
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test && pnpm run typecheck
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
    satisfies-requirements: *ref_0
    implements-contracts:
      - POLYGLOT_LANGUAGE_REGISTRY
      - POLYGLOT_EXCLUDED_DIRS
      - detectDefaultScaffoldLanguage
  - id: TSK-072-04
    title: Añadir pruebas unitarias y BDD para registro políglota, java/kt/c/cpp, alias kotlin y precedencia de manifiestos
    complexity: LOW
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm test && pnpm run verify:all
    assigned-to: agent-developer
    status: COMPLETED
    implements-components:
      - CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
    satisfies-requirements: *ref_0
    implements-contracts:
      - POLYGLOT_LANGUAGE_REGISTRY
      - GHERKIN_GENERATOR_SPECS
      - detectDefaultScaffoldLanguage
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Registro Políglota Centralizado (`TSK-072-01`)
- **ID**: `TSK-072-01`
- **Componente**: `CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP`
- **Requerimiento**: `FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001`
- **Descripción**:
  - Crear `packages/core/src/verifiers/polyglot-registry.ts` con `POLYGLOT_LANGUAGE_REGISTRY`, `POLYGLOT_EXCLUDED_DIRS`, `POLYGLOT_EXCLUDED_DIR_SET`, `normalizeScaffoldLanguage` y `buildExtToLangMap`, exportándolos desde `packages/core/src/index.ts`.
  - Extender `GherkinScaffoldLanguage` en `packages/core/src/types/index.ts` a `'ts' | 'py' | 'go' | 'rs' | 'cs' | 'java' | 'kt' | 'c' | 'cpp'`.
  - Añadir `BSL-1.0` a `permissive_free.spdx_identifiers` en `license-policy.yaml` y a `DEFAULT_PERMITTED` en `packages/core/src/verifiers/licenses.ts`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 2: Soporte BDD `java`, `kt`, `c` y `cpp` (`TSK-072-02`)
- **ID**: `TSK-072-02`
- **Componente**: `CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP`
- **Requerimiento**: `FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001`
- **Descripción**:
  - Extender `GHERKIN_GENERATOR_SPECS` y los renderers `RED` deterministas en `packages/core/src/verifiers/gherkin-scaffold.ts` para `java` (`*Steps.java`, `MIT`), `kt` (`*Steps.kt`, `MIT`), `c` (`*_steps.c`) y `cpp` (`*_steps.cpp`, Catch2 `BSL-1.0`).
  - Actualizar `normalizeScaffoldLanguages` para aceptar `'kotlin'` y normalizarlo a `'kt'`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test`

### Fase 3: Migración de Consumidores y Precedencia de Manifiestos (`TSK-072-03`)
- **ID**: `TSK-072-03`
- **Componente**: `CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP`
- **Requerimiento**: `FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001`
- **Descripción**:
  - Migrar `coding-rules-templates.ts`, `gherkin-language-resolver.ts`, `gherkin.ts` y `test-discovery.ts` para consumir `POLYGLOT_LANGUAGE_REGISTRY` y `POLYGLOT_EXCLUDED_DIRS`.
  - Actualizar `packages/cli/src/commands/check.ts` (`detectDefaultScaffoldLanguage`, `normalizeScaffoldLanguage`, `SKIP_MANIFEST_DIRS`) para usar el registro unificado, reconocer `pom.xml`, `build.gradle`, `build.gradle.kts` y `CMakeLists.txt`, y priorizar manifiestos primarios en `src/` sobre archivos auxiliares en raíz como `requirements.txt`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test && pnpm run typecheck`

### Fase 4: Cobertura Unitaria y BDD (`TSK-072-04`)
- **ID**: `TSK-072-04`
- **Componente**: `CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP`
- **Requerimiento**: `FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001`
- **Descripción**:
  - Actualizar `packages/core/tests/m4-gherkin.spec.ts` (línea 429, `Record<GherkinScaffoldLanguage, string>`) para incluir `java`, `kt`, `c` y `cpp` y mantener `pnpm run typecheck` en verde.
  - Añadir pruebas unitarias e integración para `POLYGLOT_LANGUAGE_REGISTRY`, `POLYGLOT_EXCLUDED_DIRS`, scaffolding BDD (`java`, `kt`, `c`, `cpp`, escape `\$` en Kotlin), alias `kotlin` → `kt`, desambiguación de `CMakeLists.txt` (`c` vs `cpp`) y `build.gradle.kts` (`kt` vs `java`), y precedencia de `src/App/App.csproj` sobre `requirements.txt` en raíz (preservando la precedencia de `pyproject.toml` en `check-helpers.spec.ts`).
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test && pnpm run verify:all`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-26 | agent-system-architect | Plan de tareas TSK-072-01..04 en modo AUTONOMOUS con cobertura 100% de FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001 y CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP | CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP |
