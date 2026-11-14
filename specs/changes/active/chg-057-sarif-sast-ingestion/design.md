---
id: DSG-CHG-057-SARIF-SAST-INGESTION
type: spec-design
change-id: CHG-057-SARIF-SAST-INGESTION
title: "Diseño Técnico: SARIF SAST Ingestion"
version: "1.2.0"
schema-version: "1.0"
handoff: "HOF-CHG-057-SARIF-SAST-INGESTION"
architecture-component: "CMP-057-SARIF-SAST-INGESTION"
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
citations:
  - id: UC-057-SARIF-SAST-INGESTION
    digest: sha256:12f598a6924d4be531ae28c0fbc1de3fbfe2827343339be2d6cd1160453e81e1
    comment: Citación de use-case (Ingesta de reportes OASIS SARIF v2.1.0 externos para evaluación SAST determinista)
  - id: FR-057-SARIF-SAST-INGESTION-001
    digest: sha256:56218b0fa04791bf019a097023c46f19698e31b622c068300cec8e9946cfeca1
    comment: Requerimiento derivado de UC-057-SARIF-SAST-INGESTION
  - id: SEC-REQ-057-SARIF-INGESTION-SAFETY-001
    digest: sha256:c5639359de2d804147e691746cb833eb2acc61c83bd07b0d97d5b1ac09eb0b0e
    comment: Control de seguridad de ingesta SARIF
  - id: SEC-REQ-057-SARIF-OUTPUT-SANITIZATION-001
    digest: sha256:e7fa0ddc9d46e908b12e4b0eda883e9e07477e80bb4dee27e60a9e6fd4cffcfa
    comment: Control de saneamiento de salida y normalización de URIs SARIF
  - id: CMP-057-SARIF-SAST-INGESTION
    digest: sha256:4a8e20ab8e45f807b3ebd52a651f82ef1deaf0d729c6dbd91023bd439b0fbea0
    comment: Componente arquitectónico de ingesta SARIF v2.1.0
---

# Diseño Técnico: CHG-057-SARIF-SAST-INGESTION

## 1. Mapeo Arquitectónico, Diseño Modular y Enclave Zero Trust
Materializa `CMP-057-SARIF-SAST-INGESTION` en el enclave perimetral `SEC-ENC-DMZ` mediante funciones exportadas simples sin interfaces ni puertos especulativos (YAGNI):
- **Ingesta Segura (`packages/core/src/verifiers/sarif-ingest.ts`)**: `ingestSarifFiles(rootDir: string, sarifPaths: string[]): SarifDocument[]` con verificación anti-TOCTOU (`lstat` + `open` + `fstat` comprobando `isFile()`, `dev`/`ino`), confinamiento `realpath` + `path.relative` (normalizando letra de unidad Windows), escáner iterativo de profundidad JSON (`<= 64`) previo a `JSON.parse()`, límites de recurso y rechazo de claves inseguras.
- **Normalización y Saneamiento (`packages/core/src/verifiers/sarif-sast.ts`)**: `parseSarifDocument(rootDir: string, doc: SarifDocument): SastViolation[]` y orquestación multi-archivo con deduplicación `(relPath, lineNumber, ruleId)`.
- **Adaptador CLI (`packages/cli/src/index.ts`, `packages/cli/src/commands/verify.ts`)**: opción explícita `--sarif <path...>` en `aisdlc verify sast`.

### Fronteras YAGNI
- **Sin ejecución CLI externa**: `CHG-057` no ejecuta herramientas externas (`bandit`, `gosec`, `semgrep`, etc.) ni comandos derivados del reporte SARIF.
- **Sin autodescubrimiento**: solo se ingieren rutas pasadas explícitamente en `--sarif` / `SastVerifierOptions.sarifPaths`.
- **100% Offline**: nunca resuelve ni descarga `$schema` remotos.

## 2. Contratos de Datos e Interfaces (Contract-First)

### 2.1 Códigos de Error (`ERR_SARIF_*`)
```ts
export type SarifErrorCode =
  | 'ERR_SARIF_NOT_FOUND'
  | 'ERR_SARIF_NOT_REGULAR_FILE'
  | 'ERR_SARIF_PATH_OUTSIDE_ROOT'
  | 'ERR_SARIF_TOO_LARGE'
  | 'ERR_SARIF_MALFORMED'
  | 'ERR_SARIF_UNSUPPORTED_VERSION'
  | 'ERR_SARIF_LIMIT_EXCEEDED'
  | 'ERR_SARIF_UNSAFE_KEY';

export class SarifIngestionError extends Error {
  readonly code: SarifErrorCode;
  constructor(code: SarifErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = 'SarifIngestionError';
    this.code = code;
  }
}
```
Los mensajes de error no deben exponer rutas absolutas del host.

### 2.2 Funciones Exportadas e Interfaces de Verificador
```ts
export function ingestSarifFiles(rootDir: string, sarifPaths: string[]): SarifDocument[];
export function parseSarifDocument(rootDir: string, doc: SarifDocument): SastViolation[];

export interface SastVerifierOptions {
  rootDir?: string;
  semgrep?: boolean;
  targetDirectories?: string[];
  minSeverity?: SastSeverity;
  sarifPaths?: string[];
}
```
Cuando `sarifPaths && sarifPaths.length > 0`, `verifySast()` entra en **modo ingesta SARIF**: omite `collectSastFiles`, reglas regex y `runSemgrepCli`, fija `totalFilesScanned = sarifPaths.length` y actualiza `formatSastViolationRow` para renderizar badges diferenciados para `CRITICAL`, `HIGH`, `MEDIUM` y `LOW`.

### 2.3 Reglas de Mapeo de Severidad y Normalización
1. **Precedencia de severidad**:
   `result.properties['security-severity']` -> `rule.properties['security-severity']` (localizada vía `ruleIndex` o `ruleId` en `run.tool.driver.rules`) -> `result.level` -> `rule.defaultConfiguration.level` -> `'MEDIUM'`.
2. **Parseo estricto de `security-severity`**:
   Solo se acepta un número finito en `[0, 10]` o un string recortado que cumpla `/^\d+(\.\d+)?$/` cuyo valor esté en `[0, 10]` (nunca convertir `""`, `null` o `false` a `0`):
   - `>= 9.0` → `CRITICAL`
   - `>= 7.0 && < 9.0` → `HIGH`
   - `>= 4.0 && < 7.0` → `MEDIUM`
   - `< 4.0` → `LOW`
3. **Fallback por `level`** (en ausencia de `security-severity` válido):
   - `'error'` → `HIGH`
   - `'warning'` → `MEDIUM`
   - `'note'` → `LOW`
   - `'none'` (sin `security-severity`) → excluido de `SastViolation[]` bloqueantes.
4. **Normalización de URIs y campos (`SastViolation`)**:
   - `relPath`: desde `locations[0].physicalLocation.artifactLocation` (`uri` y opcional `uriBaseId`). Decodifica con `decodeURIComponent` capturando `URIError` (`ERR_SARIF_MALFORMED`), resuelve `uriBaseId` contra `run.originalUriBaseIds` rechazando traversal, rechaza rutas UNC (`\\server\share`, `file://host/...`) y rutas fuera de `rootDir` (normalizando mayúsculas/minúsculas de letra de unidad en Windows) con `ERR_SARIF_PATH_OUTSIDE_ROOT`.
   - Si `result.locations` falta o está vacío, **no** se descarta el hallazgo silenciosamente: se emite `relPath: '<unknown>'`, `lineNumber: 1`.
   - `filePath`: `path.resolve(realRoot, relPath)` (o `'<unknown>'` cuando no hay ubicación).
   - `lineNumber`: `Math.max(1, Number(region?.startLine) || 1)`.
   - `ruleId`: `result.ruleId` saneado (fallback `'SARIF-RULE'`).
   - `type`: `'SEMGREP_FINDING'` (o tipo SAST compatible en `SastFindingType`).
   - `message`: `[<tool.driver.name>] <message.text>` saneado contra ANSI/C0/C1/Markdown/HTML.
   - `snippet`: cadena vacía `''` o extracto saneado si existe en `region.snippet.text`.
5. **Deduplicación multi-archivo y ordenamiento canónico**:
   - En invocaciones con múltiples `--sarif`, deduplicar entradas idénticas `(relPath, lineNumber, ruleId)` conservando la mayor severidad.
   - Ordenar canónicamente por `relPath` (lexicográfico ascendente), `lineNumber` (numérico ascendente) y `ruleId` (lexicográfico ascendente).

### 2.4 Supresiones y Evaluación contra `quality-policy.yaml`
- **Confinamiento de lectura para supresiones**: para cada `SastViolation` con `relPath !== '<unknown>'`, las lecturas fuente para `ai-sdlc:allow-sast` se confinan a `rootDir` mediante `realpath` + `open`/`fstat` verificando archivo regular dentro de `rootDir` y protegiendo `lineNumber > lines.length`.
- **Coincidencia de supresión**: se exige `supp.kind === 'sast'` (`ai-sdlc:allow-sast`, nunca `allow-prompt-injection`) y coincidencia explícita `supp.rule === ruleId` (o `supp.rule === '*'`).
  - Supresiones `active` eximen el hallazgo; supresiones `expired` o `invalid` se registran en `SastVerifierResult.suppressions` y fuerzan `success = false`.
- **Alineación con `quality-policy.yaml`**:
  - Se carga `quality-policy.yaml` desde `rootDir` (con valores por defecto seguros si el archivo está ausente).
  - `sast_analysis.fail_on_severity` es opcional (fallback `options.minSeverity ?? 'HIGH'`).
  - Las violaciones activas se filtran por `severity >= effectiveMinSeverity` antes de comparar su conteo contra `sast_analysis.max_vulnerabilities` (por defecto `0`), respetando también `release_thresholds.technical_debt.zero_tolerance_severities`.
  - Con `enforcement_mode: 'PERMISSIVE'`, los hallazgos que excedan el umbral emiten advertencias sin fallar `success` (excepto ante supresiones inválidas/caducadas o errores fail-closed `ERR_SARIF_*`).

### 2.5 Cableado CLI (`--sarif <path...>`)
- En `packages/cli/src/index.ts`: `.option('--sarif <paths...>', 'Ingest external OASIS SARIF v2.1.0 report(s) for deterministic SAST evaluation')`.
- En `packages/cli/src/commands/verify.ts`: `SastVerifyCliOptions.sarif?: string[]` propagado a `verifySast({ sarifPaths: options.sarif })`. Ante `SarifIngestionError`, falla cerrado con código de salida `1` sin emitir violaciones parciales.

## 3. Protocolos de Manejo de Errores y Mitigación
- **Límites y Anti-DoS**: archivo `<= 50 MiB` (`52,428,800` bytes), escáner iterativo de profundidad JSON (`<= 64`) **previo a `JSON.parse()`** (retornando `ERR_SARIF_LIMIT_EXCEEDED` antes de provocar desbordamiento de pila en V8), y resultados acumulados entre todos los archivos `--sarif` `<= 100,000`.
- **Anti-TOCTOU Symlinks**: en `sarif-ingest.ts`, verificar que `fstat(fd)` coincide con `lstat` (`isFile()`, `dev` y `ino`).
- **Prototype Pollution**: escaneo iterativo de claves propias (`Object.getOwnPropertyNames`) rechazando `__proto__`, `constructor`, `prototype` (`ERR_SARIF_UNSAFE_KEY`).
- **Fail-Closed**: cualquier error en el archivo *N* aborta toda la invocación y descarta resultados de archivos `1..N-1`.
- **Saneamiento de Salida**: eliminación de secuencias ANSI/VT, caracteres `\x00-\x1F`/`\x7F-\x9F`, y escape de caracteres Markdown/HTML en campos no confiables.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Sin nuevas dependencias externas (solo `fs`, `path`, `url` estándar de Node.js). Cumple `CC <= 10` y funciones `<= 40` líneas.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-14 | agent-developer / human-dev | Diseño técnico formal inicial | CHG-057-SARIF-SAST-INGESTION |
| **1.1.0** | 2026-11-14 | agent-system-architect | Arquitectura hexagonal CMP-057, contratos TypeScript, códigos ERR_SARIF_* y límites YAGNI | CHG-057-SARIF-SAST-INGESTION |
| **1.2.0** | 2026-11-14 | agent-system-architect | Remediación Checkpoint 1: YAGNI (sin SarifParserPort), modo SARIF en verifySast, alineación quality-policy, precedencia severidad, profundidad pre-parse y cierres URI/TOCTOU/supresiones | CHG-057-SARIF-SAST-INGESTION |
