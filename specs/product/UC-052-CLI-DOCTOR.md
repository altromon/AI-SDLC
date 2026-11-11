---
id: UC-052-CLI-DOCTOR
type: use-case
title: Diagnóstico determinista de entorno, herramientas y estado del repositorio (aisdlc doctor)
status: active
version: 1.1.0
schema-version: '1.0'
primary-actor: ACT-DEVSECOPS-ENGINEER
supporting-actors:
  - ACT-AI-AGENT
  - ACT-SYSTEM-ARCHITECT
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---


# UC-052-CLI-DOCTOR: Diagnóstico determinista de entorno, herramientas y estado del repositorio

## 1. Intención y Resultado
Proporcionar un mecanismo de diagnóstico previo ("health check" determinista) mediante el comando CLI `aisdlc doctor` y la herramienta MCP correspondiente, permitiendo a desarrolladores humanos y agentes autónomos inspeccionar la integridad del entorno local y del repositorio antes de iniciar tareas de desarrollo o ejecución de pipelines. El diagnóstico verifica de forma integral:
1. **Instalación de Git hooks**: Presencia, permisos de ejecución y estado activo/no evadido de `.git/hooks/pre-commit` y `.git/hooks/prepare-commit-msg`.
2. **Salvaguarda de ramas protegidas**: Detección temprana si el espacio de trabajo se encuentra operando directamente sobre ramas protegidas (`main`, `master`, `release/*`).
3. **Sincronización de esquemas JSON y PDaC**: Detección de desviaciones o corrupción entre los esquemas canónicos y los artefactos de políticas / especificaciones.
4. **Disponibilidad de herramientas y runtimes**: Presencia y compatibilidad de Node.js LTS, pnpm, Git CLI y dependencias esenciales del toolchain.
5. **Preparación de firmas y claves criptográficas**: Detección de claves de firma Ed25519/GPG o configuración OIDC keyless para atestaciones in-toto y bundles de auditoría.

El comando reporta los hallazgos con códigos de salida deterministas:
- `0`: Entorno y repositorio completamente saludables.
- `1`: Advertencias no bloqueantes detectadas (ej. clave de firma opcional ausente en entorno local).
- `2`: Defectos críticos bloqueantes detectados (ej. hooks ausentes, rama protegida activa, esquemas corruptos).

### Incremento (chg-052-cli-doctor)
CLI Doctor Environment Health Diagnostics (`aisdlc doctor` y MCP `doctor`) para evaluación determinista y antimanipulación de la salud del entorno de trabajo, hooks de Git, seguridad de ramas, esquemas JSON y preparación para firma criptográfica.

## 2. Precondiciones
- El repositorio está inicializado con Git (`.git` presente).
- La CLI `aisdlc` o el servidor MCP de AI-SDLC están disponibles para su ejecución.

## 3. Flujo Principal (Nominal)
1. El usuario o agente autónomo invoca el comando `aisdlc doctor` (o la herramienta MCP correspondiente).
2. El sistema evalúa secuencialmente las 5 categorías de diagnóstico:
   - Valida que `.git/hooks/pre-commit` y `.git/hooks/prepare-commit-msg` existan y tengan permisos de ejecución.
   - Consulta la rama activa actual (`HEAD`) y verifica que no coincida con `main`, `master` o `release/*`.
   - Verifica la validez y consistencia de los esquemas JSON (`schemas/`) y su alineamiento con PDaC.
   - Comprueba las versiones y disponibilidad de Node.js, pnpm y Git en el PATH del sistema.
   - Comprueba la disponibilidad de configuración para firma criptográfica o keyless OIDC.
3. Al no detectarse advertencias ni fallos críticos, el sistema genera una salida estructurada y amigable en terminal indicando que todos los chequeos han superado la validación.
4. El proceso termina con código de salida `0`.

## 4. Flujos Alternativos y de Excepción
- **Flujo Alternativo A (Advertencias no bloqueantes - Código 1)**:
  - Si una comprobación no bloqueante no se cumple (por ejemplo, ausencia de clave privada local Ed25519 cuando se permite keyless OIDC en modo diferido o utilidades complementarias no críticas ausentes), el sistema marca el chequeo con advertencia `[WARN]`, lista las recomendaciones de remediación y finaliza con código de salida `1`.
- **Flujo de Excepción B (Defectos críticos detectados - Código 2)**:
  - Si se detecta un fallo crítico que compromete la gobernanza o integridad (ej. hooks de Git ausentes o manipulados, sesión activa sobre rama `main`/`master`/`release/*`, esquemas JSON corruptos o runtime incompatible), el sistema marca el chequeo con error `[FAIL]`, presenta los pasos exactos de reparación recomendados (ej. `pnpm run git:hook:install` o `git checkout -b feat/...`) y finaliza con código de salida `2`.
- **Flujo de Excepción C (Flags o argumentos no reconocidos)**:
  - Si se pasan opciones desconocidas, la CLI detiene la ejecución con código de salida `1` o `2` e informa del error sintáctico.

## 5. Restricciones No Funcionales
- **Determinismo y Rendimiento**: La ejecución completa del diagnóstico debe tardar menos de 2 segundos en un entorno local típico.
- **Salida Estandarizada y Machine-Readable**: Soporte opcional para formato JSON (`--json`) para integración transparente en agentes y herramientas de observabilidad.
- **Transparencia y No Invasión**: El comando `aisdlc doctor` es estrictamente de lectura / diagnóstico (`read-only`), sin alterar archivos ni estado de Git de forma implícita.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-052-CLI-DOCTOR @automated @doctor
Feature: Diagnóstico determinista de entorno, herramientas y estado del repositorio
  As a developer, DevSecOps engineer, or AI agent
  I want to run a deterministic health check command
  So that repository hooks, branch safety, schemas, toolchain, and signing readiness are verified before starting work

  @nominal
  Scenario: Diagnóstico saludable sin defectos ni advertencias
    Given un repositorio configurado correctamente con hooks instalados
    And una rama de trabajo no protegida activa
    And esquemas JSON válidos y herramientas del toolchain presentes
    And configuración de firma disponible
    When se ejecuta el comando "aisdlc doctor"
    Then el reporte muestra todas las categorías en estado satisfactorio
    And el proceso finaliza con código de salida 0

  @boundary
  Scenario: Diagnóstico con advertencias no bloqueantes
    Given un repositorio con herramientas y hooks válidos
    But sin claves de firma locales opcionales configuradas
    When se ejecuta el comando "aisdlc doctor"
    Then el reporte muestra advertencias no críticas
    And el proceso finaliza con código de salida 1

  @invalid
  Scenario Outline: Detección de defectos críticos bloqueantes
    Given un repositorio con defecto crítico "<critical_defect>"
    When se ejecuta el comando "aisdlc doctor"
    Then el reporte identifica la categoría fallida con diagnóstico "<failure_diagnostic>"
    And el proceso finaliza con código de salida 2

    Examples:
      | critical_defect               | failure_diagnostic               |
      | missing_git_hooks             | ERR_HOOKS_NOT_INSTALLED          |
      | active_protected_branch_main  | ERR_PROTECTED_BRANCH_ACTIVE      |
      | corrupted_json_schemas        | ERR_SCHEMAS_DESYNCHRONIZED       |
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-product-analyst | Definición inicial de caso de uso para comando aisdlc doctor (#168 part 2) | CHG-052-CLI-DOCTOR |
