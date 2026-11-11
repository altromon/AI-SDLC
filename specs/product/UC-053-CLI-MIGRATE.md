---
id: UC-053-CLI-MIGRATE
type: use-case
title: Migración y sincronización automatizada y no destructiva de esquemas, plantillas y políticas (aisdlc migrate)
status: active
version: 1.0.0
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

# UC-053-CLI-MIGRATE: Migración y sincronización automatizada y no destructiva de esquemas, plantillas y políticas

## 1. Intención y Resultado
Proporcionar un mecanismo seguro, determinista y no destructivo mediante el comando CLI `aisdlc migrate` (y su integración correspondiente con el servidor MCP) para sincronizar y migrar los artefactos canónicos del framework AI-SDLC:
1. **Esquemas JSON (`schemas/`)**: Actualización de validadores Draft 2020-12 a las versiones más recientes publicadas por AI-SDLC.
2. **Plantillas canónicas (`templates/`)**: Incorporación de nuevas plantillas y campos obligatorios/recomendados sin destruir extensiones locales.
3. **Políticas de gobernanza (`quality-policy.yaml`, `license-policy.yaml`, `privacy-policy.yaml`, `dlp-policy.yaml`)**: Sincronización de umbrales y reglas maestras respetando personalizaciones del usuario.

El comando garantiza la soberanía del repositorio usuario mediante salvaguardas estrictas:
- **Detección inteligente de modificaciones y overrides locales**: Compara digests criptográficos SHA-256 o AST semántico para detectar si un archivo ha sido modificado localmente respecto a la versión base canónica previa.
- **Preservación sin sobreescritura ciega**: Nunca sobreescribe modificaciones de usuario a menos que se use la opción explícita `--force`.
- **Modo Previsualización (`--dry-run`)**: Simula el plan de migración completo, detallando altas, actualizaciones y conflictos potenciales sin tocar el sistema de archivos.
- **Respaldo automatizado (`--backup`)**: Crea un respaldo con marca de tiempo en `.backup/` antes de aplicar cualquier mutación en el disco.
- **Códigos de salida deterministas**:
  - `0`: Repositorio completamente actualizado o migración aplicada con éxito sin conflictos.
  - `1`: Conflictos detectados o modificaciones locales existentes que requieren revisión o confirmación humana.
  - `2`: Error crítico o fallo irrecuperable durante el proceso de migración (ej. permisos insuficientes, esquemas corruptos en origen).

### Incremento (chg-053-cli-migrate)
CLI Migrate Lifecycle Command (`aisdlc migrate`) para la actualización no destructiva, gobernada y determinista de esquemas JSON, plantillas y políticas AI-SDLC preservando la personalización del usuario (#168 part 3).

## 2. Precondiciones
- El repositorio está inicializado con Git (`.git` presente).
- La rama de trabajo activa no es una rama protegida (`main`, `master`, `release/*`) cuando se ejecutan modificaciones en disco.
- La CLI `aisdlc` o el servidor MCP de AI-SDLC están disponibles para su ejecución.

## 3. Flujo Principal (Nominal)
1. El usuario o agente autónomo invoca el comando `aisdlc migrate`.
2. El sistema analiza el inventario de archivos locales (`schemas/`, `templates/`, `*policy*.yaml`) frente a los artefactos canónicos distribuidos por el paquete AI-SDLC instalado.
3. El sistema comprueba que no existan desviaciones conflictivas ni modificaciones incompatibles no reconciliables en los archivos destino.
4. El sistema crea automáticamente un respaldo de seguridad con marca de tiempo en `.backup/migration-<timestamp>/` (o el especificado mediante `--backup`).
5. El sistema copia o fusiona de forma segura los esquemas, plantillas y políticas canónicas actualizadas hacia las rutas del repositorio.
6. El sistema reporta un resumen detallado de los artefactos sincronizados (archivos creados, archivos actualizados de forma limpia).
7. El proceso finaliza con código de salida `0`.

## 4. Flujos Alternativos y de Excepción
- **Flujo Alternativo A (Modo Simulación `--dry-run`)**:
  - El usuario invoca `aisdlc migrate --dry-run`.
  - El sistema genera y presenta en la salida estándar el plan de migración (diferencias detectadas, archivos que serían añadidos, actualizados o que presentarían conflicto) sin realizar ninguna escritura o alteración en el sistema de archivos.
  - El comando finaliza con código de salida `0` si el plan es viable sin conflictos, o `1` si existirían conflictos no forzados.
- **Flujo Alternativo B (Detección de Overrides Locales / Conflictos - Código 1)**:
  - El sistema detecta que uno o más archivos de políticas o plantillas han sido modificados localmente por el equipo (desviación respecto al digest canónico upstream previo).
  - Sin el flag `--force`, el sistema omite la sobreescritura de los archivos alterados, preserva intactas las reglas locales del usuario, advierte en terminal de los archivos retenidos y finaliza con código de salida `1` indicando la necesidad de revisión humana o uso de `--force`.
- **Flujo Alternativo C (Sobreescritura Explícita `--force`)**:
  - El usuario invoca `aisdlc migrate --force` (con o sin `--backup`).
  - El sistema crea el respaldo preventivo (si `--backup` está activo) y procede a sincronizar todos los artefactos canónicos sobreescribiendo los overrides locales detectados.
  - El comando finaliza con código de salida `0`.
- **Flujo de Excepción D (Fallo Crítico / Entorno No Válido - Código 2)**:
  - Si ocurre un fallo de I/O, permisos de escritura denegados, o corrupción en el paquete fuente canónico, el sistema detiene la operación inmediatamente, asegura la integridad del estado previo mediante el respaldo si fue iniciado, emite el diagnóstico detallado del error y finaliza con código de salida `2`.
- **Flujo de Excepción E (Ejecución en Rama Protegida)**:
  - Si se intenta ejecutar una migración que modifica el disco directamente sobre una rama protegida (`main`, `master`, `release/*`), el comando aborta la operación de escritura e indica al usuario que debe cambiar a una rama de trabajo dedicada (`feat/*` o `task/*`), finalizando con código de salida `2`.

## 5. Restricciones No Funcionales
- **Determinismo y Preservación de Datos**: Ningún dato de configuración personalizado por el usuario debe ser destruido silenciosamente sin consentimiento explícito (`--force`).
- **Atomicidad y Respaldo**: Toda operación que altere archivos en disco debe registrar un respaldo trazable en `.backup/` si se solicita o por defecto ante modificaciones.
- **Compatibilidad Multiplataforma**: La resolución de rutas y comparaciones hash debe funcionar consistentemente en Linux, macOS y Windows (normalización Unix LF).

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-053-CLI-MIGRATE @automated @migrate
Feature: Migración y sincronización automatizada y no destructiva de esquemas, plantillas y políticas
  As a developer, DevSecOps engineer, or AI agent
  I want to run the aisdlc migrate command
  So that repository schemas, templates, and governance policies are kept synchronized without clobbering user customizations

  @nominal
  Scenario: Sincronización limpia sin modificaciones locales
    Given un repositorio AI-SDLC con esquemas y políticas canónicas previas sin alteraciones
    When se ejecuta el comando "aisdlc migrate"
    Then los esquemas, plantillas y políticas se sincronizan con las versiones canónicas actualizadas
    And se genera un respaldo preventivo en el directorio ".backup"
    And el proceso finaliza con código de salida 0

  @nominal
  Scenario: Previsualización de cambios en modo dry-run sin tocar el sistema de archivos
    Given un repositorio AI-SDLC con actualizaciones canónicas pendientes
    When se ejecuta el comando "aisdlc migrate --dry-run"
    Then el plan de migración y diferencias se visualizan en la terminal
    And ningún archivo en el disco es modificado ni se crean respaldos
    And el proceso finaliza con código de salida 0

  @boundary
  Scenario: Preservación de overrides locales con aviso y salida de atención
    Given un repositorio donde "quality-policy.yaml" contiene reglas personalizadas por el usuario
    When se ejecuta el comando "aisdlc migrate" sin la opción "--force"
    Then el archivo "quality-policy.yaml" permanece intacto conservando las modificaciones del usuario
    And se informa en el reporte de la retención por override detectado
    And el proceso finaliza con código de salida 1

  @boundary
  Scenario: Sobreescritura consentida de personalizaciones locales con force
    Given un repositorio donde "quality-policy.yaml" contiene reglas modificadas
    When se ejecuta el comando "aisdlc migrate --force --backup"
    Then se crea un respaldo con marca de tiempo en ".backup" antes de la mutación
    And "quality-policy.yaml" se actualiza a la versión canónica más reciente
    And el proceso finaliza con código de salida 0

  @invalid
  Scenario Outline: Manejo determinista de fallos críticos y condiciones inválidas
    Given un entorno de repositorio con condición de fallo "<failure_condition>"
    When se ejecuta el comando "aisdlc migrate"
    Then la ejecución se detiene con diagnóstico de error "<error_diagnostic>"
    And el proceso finaliza con código de salida 2

    Examples:
      | failure_condition              | error_diagnostic                   |
      | active_branch_is_protected     | ERR_PROTECTED_BRANCH_MIGRATION     |
      | filesystem_permission_denied   | ERR_MIGRATION_IO_PERMISSION_DENIED |
```

---

## 7. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-product-analyst | Definición de caso de uso para aisdlc migrate (#168 part 3) | CHG-053-CLI-MIGRATE |
