---
id: DSG-CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK
type: spec-design
change-id: CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK
title: "Diseño Técnico: Language-Agnostic Test Stack Alignment"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK"
architecture-component: "CMP-068-LANGUAGE-AGNOSTIC-TEST-STACK"
enclave: "SEC-ENC-DMZ"
status: draft
contracts:
  - "detectDefaultScaffoldLanguage(rootDir: string): GherkinScaffoldLanguage | null"
  - "MODALITY_DRIVER_SIGNATURES.web: RegExp"
citations:
  - id: UC-068-LANGUAGE-AGNOSTIC-TEST-STACK
    digest: sha256:4dc7ca58a5ca06c4d0eb8b6dd786a6671d3f0beb95baf5f5f20c31566e3ac098
    comment: Citación de use-case (Language-Agnostic Test Stack Detection, Polyglot Web E2E Driver Signatures, and Single-Runtime QA Discipline)
  - id: FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001
    digest: sha256:446c822244de26183cc62dbf53d9ad7c4ed9067c4490b5f116f3b04f4f90d28d
    comment: Requerimiento derivado de UC-068-LANGUAGE-AGNOSTIC-TEST-STACK
---

# Diseño Técnico: CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK

## 1. Mapeo Arquitectónico y Enclave Zero Trust
Materializa el componente [`CMP-068-LANGUAGE-AGNOSTIC-TEST-STACK`](../../../architecture/CMP-068-LANGUAGE-AGNOSTIC-TEST-STACK.md) dentro del enclave local de CLI/Core (`SEC-ENC-DMZ`, ejecución offline sin red).

## 2. Diseño Detallado por Módulo

### A. Detección Recursiva Acotada y Fase 0 (`packages/cli/src/commands/check.ts`)
1. **Lectura explícita de configuración (Fase 0)**:
   - Helper `readConfiguredScaffoldLanguage(rootDir): GherkinScaffoldLanguage | null`:
     - Inspecciona `.aisdlc.json` (`testing?.language` o `stack?.language`) y `quality-policy.yaml` (`testing?.language` o `stack?.language`).
     - Valida que el valor normalizado pertenezca a `{'ts', 'py', 'go', 'rs', 'cs'}`.
2. **Recorrido acotado de manifiestos**:
   - `SKIP_MANIFEST_DIRS = new Set(['node_modules', '.git', 'bin', 'obj', 'dist', 'build', 'target', '.venv', 'venv', '__pycache__', '.pytest_cache'])`.
   - `collectManifestDirs(rootDir, maxDepth = 3)` verifica `fs.existsSync(rootDir)` de forma segura (retornando `[]` si no existe) y recopila `rootDir` (profundidad 0) y subdirectorios hasta profundidad 3 usando `fs.readdirSync(..., { withFileTypes: true })`, omitiendo enlaces simbólicos y `SKIP_MANIFEST_DIRS`.
   - `detectLanguageInDir(dir): GherkinScaffoldLanguage | null` evalúa en orden determinista:
     - `'py'`: `pyproject.toml`, `requirements.txt`, `setup.py`
     - `'go'`: `go.mod`
     - `'rs'`: `Cargo.toml`
     - `'cs'`: `hasDotnetProjectFiles(dir)` (`*.csproj`, `*.sln`, `*.slnx`)
     - `'ts'`: `package.json`, `tsconfig.json`
   - `detectDefaultScaffoldLanguage(rootDir): GherkinScaffoldLanguage | null`:
     1. Retorna `readConfiguredScaffoldLanguage(rootDir)` si no es `null`.
     2. Recorre `collectManifestDirs(rootDir, 3)` (BFS por nivel: raíz primero, luego subdirectorios) y retorna el primer lenguaje detectado.
     3. Si no se detecta ningún manifiesto ni configuración, retorna `null` (sin fallback silencioso a `'ts'`).
3. **Manejo limpio en `autoScaffoldMissingSteps(rootDir)` y `packages/cli/tests/check-helpers.spec.ts`**:
   - Cuando `detectDefaultScaffoldLanguage(rootDir)` retorna `null`, `autoScaffoldMissingSteps(rootDir)` retorna `0` sin generar archivos `.ts` espurios.
   - `packages/cli/tests/check-helpers.spec.ts` actualiza la aserción de directorio inexistente/vacío a `toBeNull()` y añade cobertura para manifiestos `package.json`/`tsconfig.json`, manifiestos anidados hasta profundidad 3, omisión de `node_modules`/`bin`/`obj`/`.venv`, y configuración explícita en `.aisdlc.json` y `quality-policy.yaml`.

### B. Firmas Políglotas de Drivers Web E2E (`packages/core/src/verifiers/test-discovery.ts`)
Ampliar `MODALITY_DRIVER_SIGNATURES.web` manteniendo un patrón plano no backtracking (libre de ReDoS) con las firmas oficiales:
- **C# / .NET (`Microsoft.Playwright`)**: `\bMicrosoft\.Playwright\b`, `\bPageTest\b`, `\bIPage\b`, `\b(?:Goto|Click|Fill|WaitForSelector)Async\b`, `\bGetBy(?:Role|Text|TestId|Label)\b`, `\bExpect\(\s*(?:Page|Locator)\b`
- **Python (`playwright.sync_api` / `playwright.async_api`)**: `\bplaywright\.(?:sync|async)_api\b`, `\b(?:sync|async)_playwright\b`, `\bpage\.(?:get_by_role|get_by_text|get_by_test_id|get_by_label|wait_for_selector)\b`
- **Go (`playwright-go`)**: `playwright-go`, `\bpw\.Chromium\b`, `\bpage\.(?:Goto|Locator|GetByRole|GetByText|GetByTestId|GetByLabel)\b`
- **Rust (`playwright` crate)**: `playwright::Playwright`, `\bgoto_builder\b`, `\bwait_for_selector\b`
- **Existentes JS/TS/Angular/Blazor**: `@playwright/test`, `\bplaywright\b`, `page.(goto|locator|getByRole|...)`, `expect(page|locator)`, `cypress`, `cy.(visit|get|contains|intercept)`, `render(`, `screen.(getBy|findBy|queryBy)`, `fireEvent`, `userEvent`, `TestBed`, `bUnit`, `RenderComponent`.

### C. Disciplina QA de Runtime Único (`.agent/agents/agent-qa-engineer.md`, `.agent/rules/ai-sdlc-testing.md`, `packages/core/src/init/agent-templates.ts`)
- Actualizar las definiciones canónicas en `packages/core/src/init/agent-templates.ts` y los archivos `.agent/agents/agent-qa-engineer.md` y `.agent/rules/ai-sdlc-testing.md` (y ejecutar `npx aisdlc sync` para alinear todos los espejos IDE) con la regla estrictamente agnóstica al lenguaje:
  - Prohibir explícitamente la introducción de un runtime o lenguaje de pruebas secundario (como crear `package.json`, `playwright.config.ts` o `@cucumber/cucumber` en un proyecto cuya arquitectura usa otro stack) salvo que un `ADR-*` explícito apruebe una arquitectura políglota.

## 3. Protocolos de Manejo de Errores y Mitigación
- Errores de lectura o YAML/JSON malformado en `.aisdlc.json` / `quality-policy.yaml` se capturan de forma segura devolviendo `null` sin abortar el recorrido de manifiestos.
- Todas las funciones nuevas cumplen `CC <= 10`, `Cognitive <= 15`, `LOC <= 40` y `MI >= 50`.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Cero dependencias nuevas; cumplimiento total con `license-policy.yaml`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-26 | agent-system-architect | Diseño técnico completo agnóstico al lenguaje | CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK |
