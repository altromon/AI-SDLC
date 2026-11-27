---
id: TSK-PLAN-CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
type: task-plan
change-id: CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
title: 'Desglose de Tareas Verificables: SCA Recursive Multi-Ecosystem & Doctor Native Toolchains'
version: 1.0.0
schema-version: '1.0'
status: draft
governance-summary:
  autonomous-tasks-count: 3
  human-review-plan-count: 0
  ambiguous-count: 0
  high-risk-manual-count: 0
tasks:
  - id: TSK-001
    title: Implementar descubrimiento recursivo acotado (maxDepth=3) y extractores nativos .NET, Gradle y Python (requirements.txt) en scanner.ts y license-resolve.ts
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm --filter @aisdlc/core test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
    satisfies-requirements: &ref_0
      - FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001
  - id: TSK-002
    title: Actualizar ToolchainHealthCheck con detectProjectStacks, pnpm condicional a pnpm-lock.yaml y allowlist segura en types/doctor.ts y process-runner.ts
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: automated-unit-test
      command-or-criteria: pnpm --filter @aisdlc/core test
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
    satisfies-requirements: *ref_0
  - id: TSK-003
    title: Añadir pruebas unitarias y BDD para SCA recursivo multi-ecosistema, Doctor consciente del stack y degradación elegante, y validar Quality Gates
    complexity: MEDIUM
    risk-level: LOW
    autonomy-mode: AUTONOMOUS
    verification:
      method: quality-gate
      command-or-criteria: pnpm test && pnpm run typecheck && pnpm run verify:all
    assigned-to: agent-developer
    status: PENDING
    implements-components:
      - CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
    satisfies-requirements: *ref_0
supersedes: null
superseded-by: null
---

# Desglose de Tareas Verificables: CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS

## 1. Matriz de Clasificación de Autonomía y Supervisión Humana

| Modo de Autonomía | Semáforo | Criterio de Activación | Comportamiento del Agente y del Humano |
| :--- | :---: | :--- | :--- |
| **`AUTONOMOUS`** | 🟢 | Riesgo bajo, tarea aislada y bien especificada con pruebas inmediatas. | **Plan + Ejecución Autónoma**. El agente genera el plan y escribe el código sin interrupción. |
| **`HUMAN_REVIEW_PLAN`** | 🟡 | Riesgo medio, cambios en arquitectura, contratos de API o reglas críticas. | **Revisión Obligatoria de Plan**. El agente diseña el plan detallado y espera aprobación humana. |
| **`AMBIGUOUS`** | 🟠 | Requisitos vagos, criterios incompletos o conflicto de lógica de negocio. | **Bloqueada para Implementación**. Requiere clarificación previa con el usuario. |
| **`HIGH_RISK_MANUAL`** | 🔴 | Riesgo crítico (migraciones destructivas de DB, claves criptográficas, infra). | **Prohibida la Ejecución Autónoma**. Ejecución directa humana. |

---

## 2. Plan Detallado de Tareas y Criterios de Verificación

### Fase 1: Escaneo SCA Recursivo Multi-Ecosistema (`CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS`) — `TSK-001`
- **ID**: `TSK-001`
- **Componente**: `CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS` (`packages/core/src/verifiers/sca/scanner.ts`, `packages/core/src/verifiers/sca/license-resolve.ts`)
- **Requisito**: `FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001`
- **Descripción**:
  - Extraer helpers pequeños (`collectManifestDirs`, `walkManifestTree`, `SKIPPED_SCAN_DIRS`) respetando umbrales AST (`Cyclomatic <= 10`, `Cognitive <= 15`, `Lines <= 40`) para recorrer `rootDir` hasta `maxDepth = 3`, omitiendo symlinks (`isSymbolicLink()`) y directorios de artefactos (`node_modules`, `.git`, `dist`, `target`, `bin`, `obj`, `.venv`, `venv`).
  - Implementar extractores nativos en `scanner.ts` (emitiendo `ScannedDependency` crudos con `purl` y `path` del manifiesto/lockfile descubierto para que `scanDependencies` invoque `resolveLicense(dep, rootDir)`):
    - `.NET`: `*.csproj`, `Directory.Packages.props` (`PackageReference` / `PackageVersion`) y `packages.lock.json` -> `pkg:nuget/...`; rechazar `<!DOCTYPE`/`<!ENTITY`, eliminar `<!-- ... -->` y `<![CDATA[ ... ]]>`, correlacionar `<PackageVersion Include="..." Version="..." />` de `Directory.Packages.props` con `<PackageReference Include="..." />` en `*.csproj` (Central Package Management), e ignorar propiedades MSBuild sin expandir (`$(...)`).
    - `Gradle`: `build.gradle`, `build.gradle.kts` y `gradle.lockfile` -> `pkg:maven/...`; eliminar comentarios `//` y `/* ... */`, soportar Groovy (`implementation 'g:a:v'`) y Kotlin DSL (`implementation("g:a:v")`), y omitir versiones interpoladas (`$var` / `${...}`).
    - `Python`: `requirements.txt` -> `pkg:pypi/...`; unir continuaciones de línea (`\`), eliminar comentarios en línea (`# ...`), marcadores de entorno (`; ...`) y opciones `--hash=...` / `-r` / `--...` antes de extraer `name` y `version`.
  - Integrar la resolución de licencias con `resolveLicense` (`license-dotnet.ts`, `license-java.ts`, `license-python.ts` inspeccionando `path.dirname(dep.path)` si está dentro de `rootDir` además de `rootDir` para `.venv`/`venv` `site-packages`) y añadir los sufijos en `license-resolve.ts`.
  - Garantizar degradación elegante ante manifiestos vacíos o malformados.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm --filter @aisdlc/core test`

### Fase 2: `ToolchainHealthCheck` Consciente del Stack (`CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS`) — `TSK-002`
- **ID**: `TSK-002`
- **Componente**: `CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS` (`packages/core/src/doctor/toolchain-check.ts`, `packages/core/src/doctor/process-runner.ts`, `packages/core/src/types/doctor.ts`)
- **Requisito**: `FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001`
- **Descripción**:
  - Actualizar `ToolchainHealthCheck.inspect` para consultar `detectProjectStacks(rootDir)`, buscar `pom.xml`, `build.gradle`/`build.gradle.kts`, `CMakeLists.txt` y `.clang-tidy` en todo el árbol acotado (`maxDepth = 3`, consistente con `detectProjectStacks`) en lugar de solo `rootDir`, y sondear `node`, `git`, `pnpm` (solo si `pnpm-lock.yaml` existe en `rootDir`) y los binarios nativos de cada stack detectado (`dotnet`, `python`/`python3`, `go`, `cargo`, `java`/`mvn`/`gradle`, `cmake`/`clang-tidy`).
  - En `probeTool`, considerar saludable la sonda cuando `res.exitCode === 0 && Boolean(res.stdout.trim() || res.stderr.trim())` para que `java -version` (que imprime en `stderr`) tenga éxito sin falsas advertencias.
  - Para `python`, sondear `python --version` primero y hacer fallback secuencial a `python3 --version` solo si `python` falta o falla (emitiendo `ERR_TOOLCHAIN_PYTHON_MISSING` únicamente si ambos fallan).
  - Actualizar `SafeProbeExecutable` (`types/doctor.ts`) y `ALLOWED_TOOLS` (`process-runner.ts`) para autorizar de forma segura las sondas de estos binarios nativos con `shell: false`.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm --filter @aisdlc/core test`

### Fase 3: Pruebas Unitarias, BDD y Quality Gates (`CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS`) — `TSK-003`
- **ID**: `TSK-003`
- **Componente**: `CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS`
- **Requisito**: `FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001`
- **Descripción**:
  - Añadir pruebas unitarias y escenarios BDD que verifiquen: (a) descubrimiento recursivo hasta `maxDepth = 3` y exclusión de `depth 4`, directorios de artefactos y symlinks, (b) extracción y resolución de licencias para `.NET`, `Gradle` y `Python` (`requirements.txt`), (c) `ToolchainHealthCheck` con `detectProjectStacks` y `pnpm` condicional, (d) degradación elegante ante manifiestos malformados y binarios faltantes.
  - Ejecutar `pnpm test && pnpm run typecheck && pnpm run verify:all` sin regresiones.
- **Modo**: `AUTONOMOUS` 🟢
- **Verificación**: `pnpm test && pnpm run typecheck && pnpm run verify:all`

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-27 | agent-system-architect | Plan de tareas atómicas 100% AUTONOMOUS con cobertura total de handoff.yaml | CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS |
