---
id: DSG-CHG-051-GHERKIN-POLYGLOT-SCAFFOLD
type: spec-design
change-id: CHG-051-GHERKIN-POLYGLOT-SCAFFOLD
title: "Diseño Técnico: gherkin-polyglot-scaffold"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-051-GHERKIN-POLYGLOT-SCAFFOLD"
architecture-component: "CMP-CORE"
enclave: "SEC-ENC-DMZ"
status: draft
contracts:
  - scaffoldGherkinSteps
citations:
  - id: FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001
    digest: sha256:a4701a3efdc59d67f2970945db8969727a3f6c1969d08663518d46bc962b38a5
    comment: Requerimiento funcional canónico asociado (Génesis CHG-051-GHERKIN-POLYGLOT-SCAFFOLD)
---

# Diseño Técnico: CHG-051-GHERKIN-POLYGLOT-SCAFFOLD

## 1. Mapeo Arquitectónico y Enclave Zero Trust

El diseño técnico materializa el requerimiento `FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001` siguiendo estrictamente el principio YAGNI mediante funciones puras y estructuras de datos planas distribuidas entre `@aisdlc/core` (`CMP-CORE`) y el manejador CLI en `packages/cli/src/commands/gherkin.ts` (`CMP-CLI`):

- **Motor Core (`packages/core/src/verifiers/gherkin.ts` y `packages/core/src/types/index.ts` — `CMP-CORE`)**:
  - Implementa `scaffoldGherkinSteps(options: GherkinScaffoldOptions): GherkinScaffoldResult` soportando tanto un lenguaje único (`lang: 'ts'`) como múltiples lenguajes en una sola llamada (`lang: 'ts,py'` o `lang: ['ts', 'py']`), junto con el catálogo inmutable de especificaciones por lenguaje (`GherkinGeneratorSpec`) para las 5 pilas soportadas (`ts`, `py`, `go`, `rs`, `cs`).
  - Reutiliza `parseFeatureDocument` de `packages/core/src/verifiers/bdd-runner.ts` para extraer pasos únicos (`Given`, `When`, `Then`) y generar plantillas deterministas en estado `RED` cuando se invoca el modo fallback.
- **Adaptador CLI (`packages/cli/src/commands/gherkin.ts` y `packages/cli/src/index.ts` — `CMP-CLI`)**:
  - Expone el subcomando `aisdlc gherkin scaffold <feature-file> --lang <langs...> [--output <path>] [--install] [--fallback] [--json]`, aceptando múltiples lenguajes ya sea separados por comas (`--lang ts,py`) o repitiendo/listando valores (`--lang ts --lang py` / `--lang ts py`).
  - En modo interactivo (sin `--json`), cuando `scaffoldGherkinSteps` devuelve `status: 'GENERATOR_MISSING'` para uno o más lenguajes solicitados, solicita permiso explícito al usuario mediante `node:readline` antes de instalar los paquetes nativos o delegar al fallback determinista. En modo `--json` (consumido por `agent-qa-engineer`), retorna directamente el payload estructurado con `status: 'GENERATOR_MISSING'`, `installCommand` y el arreglo `results` por lenguaje para que el agente pida autorización al usuario humano.
- **Enclave Zero Trust (`SEC-ENC-DMZ`)**:
  - Toda inspección de binarios e invocación de procesos hijos se ejecuta mediante `spawnSync(cmd, args, { shell: false })`, eliminando vectores de inyección de comandos de shell ante rutas de archivos `.feature` con metacaracteres.

---

## 2. Contratos de Datos e Interfaces (`@aisdlc/core`)

Se definen los siguientes contratos en `packages/core/src/types/index.ts`:

```typescript
export type GherkinScaffoldLanguage = 'ts' | 'py' | 'go' | 'rs' | 'cs';

export interface GherkinGeneratorSpec {
  lang: GherkinScaffoldLanguage;
  generatorBin: string;
  versionArgs: string[];
  scaffoldArgs: (featurePath: string) => string[];
  installCommand: string;
  installCmd: string;
  installArgs: string[];
  license: string;
  resolveOutputPath: (rootDir: string, featurePath: string) => string;
}

export interface GherkinScaffoldExecResult {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

export type GherkinScaffoldExecFn = (
  cmd: string,
  args: string[]
) => GherkinScaffoldExecResult;

export interface GherkinScaffoldOptions {
  rootDir?: string;
  featurePath: string;
  /** Admite un lenguaje ('ts'), lista separada por comas ('ts,py') o arreglo (['ts', 'py']) */
  lang: string | string[];
  outputPath?: string;
  installMissing?: boolean;
  allowFallback?: boolean;
  execFn?: GherkinScaffoldExecFn;
}

export type GherkinScaffoldStatus =
  | 'GENERATED_NATIVE'
  | 'GENERATOR_MISSING'
  | 'GENERATED_FALLBACK'
  | 'ERROR';

export interface GherkinScaffoldResult {
  success: boolean;
  status: GherkinScaffoldStatus;
  errorCode?: 'ERR_FEATURE_NOT_FOUND' | 'ERR_UNSUPPORTED_LANGUAGE' | 'ERR_INSTALL_FAILED';
  lang: string;
  langs?: GherkinScaffoldLanguage[];
  featureFile: string;
  outputFile?: string;
  outputFiles?: string[];
  generatorBin?: string;
  nativeCommand?: string;
  installCommand?: string;
  license?: string;
  fallbackReason?: string;
  content?: string;
  scenariosCount: number;
  stepsCount: number;
  /** Resultados individuales por cada lenguaje cuando se solicitan uno o varios lenguajes */
  results?: GherkinScaffoldResult[];
}
```

### Flujo de Ejecución en 3 Pasos

1. **Paso 1 — Normalización Multi-Lenguaje e Inspección del Binario Generador Nativo**:
   - Normaliza `options.lang` dividiendo cadenas separadas por comas y aplanando arreglos (ej. `'ts,py'` o `['ts', 'py']` $\rightarrow$ `['ts', 'py']` deduplicados).
   - Valida que todos los identificadores pertenezcan a `GherkinScaffoldLanguage` (`'ts' | 'py' | 'go' | 'rs' | 'cs'`); si alguno no es válido (ej. `'ts,ruby'`), retorna inmediatamente `status: 'ERROR'` con `errorCode: 'ERR_UNSUPPORTED_LANGUAGE'`.
   - Valida que `featurePath` exista en disco; si no existe retorna `status: 'ERROR'` con `errorCode: 'ERR_FEATURE_NOT_FOUND'`.
   - Para cada lenguaje objetivo, verifica la disponibilidad del binario nativo mediante `execFn(spec.generatorBin, spec.versionArgs)` (por defecto `spawnSync(bin, args, { shell: false, encoding: 'utf-8' })`).
2. **Paso 2 — Gestión de Binario Ausente y Consentimiento de Instalación**:
   - Si el binario de algún lenguaje solicitado no está disponible (`status !== 0` o error `ENOENT`):
     - Si `installMissing: true` (el usuario confirmó interactivamente o pasó `--install`), ejecuta el comando de instalación `execFn(spec.installCmd, spec.installArgs)` con `{ shell: false }` y reintenta la ejecución del generador nativo.
     - Si `installMissing` no está activo y `allowFallback` es `false` (comportamiento por defecto), retorna `status: 'GENERATOR_MISSING'`, `success: false`, `installCommand` (con el comando o comandos requeridos concatenados por `; ` cuando faltan varios) y `license` sin escribir archivos ni instalar paquetes.
3. **Paso 3 — Generación de Definiciones de Pasos en Estado `RED`**:
   - Para cada lenguaje objetivo, si el generador nativo está disponible ejecuta `execFn(spec.generatorBin, spec.scaffoldArgs(featurePath))` o, si `allowFallback: true` (cuando el usuario declina instalar o invoca `--fallback`), genera las definiciones de pasos en estado `RED` mediante la plantilla determinista del lenguaje (`BddStepRegistry` para `ts`, `pytest-bdd` para `py`, `godog` para `go`, `cucumber` para `rs`, `Reqnroll` para `cs`), escribe el archivo de salida correspondiente y consolida el resultado en `results` (además de poblar `outputFiles` y `langs`).

---

## 3. Protocolos de Manejo de Errores y Mitigación

- **`ERR_UNSUPPORTED_LANGUAGE`**: Emitido cuando `--lang` recibe un identificador fuera de `ts | py | go | rs | cs`.
- **`ERR_FEATURE_NOT_FOUND`**: Emitido cuando el archivo `.feature` indicado no existe en la ruta resuelta.
- **Mitigación de Inyección de Comandos (`@security`)**: Ningún argumento de ruta o bandera se concatena en una cadena de shell; `spawnSync` se invoca exclusivamente con arreglo de argumentos y `{ shell: false }`.

---

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)

- El paquete `@aisdlc/core` y `@aisdlc/cli` no añaden dependencias externas nuevas (usan `node:child_process`, `node:fs`, `node:path` y `node:readline`).
- Los generadores nativos opcionales sugeridos al usuario cuentan con licencias permisivas aprobadas en `license-policy.yaml`:
  - `@cucumber/cucumber` (`ts`): `MIT`
  - `pytest-bdd` (`py`): `MIT`
  - `godog` (`go`): `MIT`
  - `cucumber` (`rs`): `MIT OR Apache-2.0`
  - `Reqnroll` (`cs`): `BSD-3-Clause`

---

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-10 | agent-system-architect | Diseño técnico modular (`CMP-CORE` / `CMP-CLI`), contratos de datos y flujo de 3 pasos para `aisdlc gherkin scaffold` | CHG-051-GHERKIN-POLYGLOT-SCAFFOLD |
