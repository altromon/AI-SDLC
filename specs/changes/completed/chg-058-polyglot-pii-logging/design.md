---
id: DSG-CHG-058-POLYGLOT-PII-LOGGING
type: spec-design
change-id: CHG-058-POLYGLOT-PII-LOGGING
title: "Diseño Técnico: Polyglot PII Logging"
version: "1.1.0"
schema-version: "1.0"
handoff: "HOF-CHG-058-POLYGLOT-PII-LOGGING"
architecture-component: "CMP-058-POLYGLOT-PII-LOGGING"
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
citations:
  - id: UC-058-POLYGLOT-PII-LOGGING
    digest: sha256:799bb26276d50559326b60f66f2eeb7575a2a7a11efcfb37668855a319bc68a1
    comment: Citación de use-case (Inspección políglota de PII-SAST en logs cruzada con DATA-ASSET-* y privacy-policy.yaml)
  - id: FR-058-POLYGLOT-PII-LOGGING-001
    digest: sha256:d882c7a17d7ab9ee36953af1d3ad131f6ededd82c459b77d474a91aaf01a1212
    comment: Requerimiento derivado de UC-058-POLYGLOT-PII-LOGGING
  - id: PRIV-REQ-058-POLYGLOT-LOG-MASKING-001
    digest: sha256:7b4195c7755c0d013b6c7fbb7907a782bc562b2ce0608a9ccab2c753d63fb15a
    comment: Control de privacidad PDaC para enmascaramiento de logs políglotas y redacción de diagnósticos
  - id: CMP-058-POLYGLOT-PII-LOGGING
    digest: sha256:46f56ad1cf9f9b7c58d8819d0c27e10994f29d20c4d089fe32145847e9f54f07
    comment: Componente arquitectónico de inspección políglota de PII-SAST en logs
---

# Diseño Técnico: CHG-058-POLYGLOT-PII-LOGGING

## 1. Mapeo Arquitectónico, Diseño Modular y Enclave Zero Trust
Materializa `CMP-058-POLYGLOT-PII-LOGGING` dentro de `CMP-CORE` en el enclave `SEC-ENC-DMZ` mediante funciones exportadas simples en `packages/core/src/verifiers/privacy.ts` y tipos en `packages/core/src/types/index.ts`, sin interfaces ni puertos especulativos (YAGNI):

- **Modelado de campos `DATA-ASSET-*`** (`packages/core/src/types/index.ts`, `parseDataAsset` en `privacy.ts`): extracción segura de `fields[]` ignorando entradas malformadas y rechazando claves de prototipo (`__proto__`, `constructor`, `prototype`, `toString`, `valueOf`, `hasOwnProperty`).
- **Resolución de políticas `allow_in_logs`** (`resolveDisallowedLogFields`, `normalizeIdentifierToSnakeCase` en `privacy.ts`): cruce seguro (`Object.hasOwn(policy.classifications, key)`) entre clasificaciones normalizadas de `DATA-ASSET-*`, sensibilidad por campo y `privacy-policy.yaml`, devolviendo `Map<string, string>` indexado por `snake_case` canónico.
- **Stripper de enmascaramiento, detección políglota multilínea y escaneo ReDoS-safe** (`stripMaskingCalls`, `detectPolyglotLoggerCall`, `scanFileForPrivacyViolations` en `privacy.ts`): análisis en TS/JS, Python, .NET/C#, Java y Go con escáner acotado por profundidad de paréntesis entre líneas y parámetro opcional `disallowedLogFields` (4.º argumento retrocompatible).
- **Orquestación, deduplicación y ordenamiento canónico** (`verifyPrivacy` en `privacy.ts`): redacción/omisión de `snippet` en `PRIV-001`/`PRIV-004`, deduplicación por `(relPath, lineNumber, ruleId)` y orden determinista por `(relPath, lineNumber, ruleId)` sin fuga de PII ni `rootDir`.

### Fronteras YAGNI
- **Sin dependencias externas nuevas**: solo módulos estándar y utilidades existentes (`js-yaml`, `walkSourceFiles`).
- **100 % estático y offline**: nunca ejecuta código del repositorio analizado ni realiza peticiones de red.
- **Sin abstracciones especulativas**: funciones exportadas directas sin fábricas, estrategias ni adaptadores innecesarios.

## 2. Contratos de Datos e Interfaces (Contract-First)

### 2.1 Extensión de Tipos (`packages/core/src/types/index.ts`)
```ts
export interface DataAssetField {
  name: string;
  sensitivity?: string;
  maskingStrategy?: string;
}

export interface DataAssetSummary {
  id: string;
  title: string;
  classification: string;
  piiCategories: string[];
  dataSubjects: string[];
  retentionPeriod: string;
  erasureMethod: string;
  filePath: string;
  fields?: DataAssetField[];
}
```
El campo `fields` en `DataAssetSummary` es opcional para preservar compatibilidad total con consumidores existentes.

### 2.2 Extracción Segura de `DataAssetField` en `parseDataAsset`
En `parseDataAsset(fm: Record<string, unknown>, relPath: string)`:
- Si `Array.isArray(fm.fields)`, se procesa cada elemento validando que sea un objeto plano (`entry !== null && typeof entry === 'object' && !Array.isArray(entry)`).
- `name`: debe ser `typeof entry.name === 'string'` con `entry.name.trim().length > 0`, longitud `<= 128`, cumplir `/^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/` y no pertenecer al conjunto de claves de prototipo prohibidas (`__proto__`, `constructor`, `prototype`, `toString`, `valueOf`, `hasOwnProperty`). Toda entrada inválida se ignora silenciosamente sin lanzar excepciones.
- `sensitivity`: opcional; si es string no vacío se normaliza con `.trim().toLowerCase()`.
- `maskingStrategy`: opcional; lee `entry['masking-strategy']` o `entry.maskingStrategy` si es string no vacío.

### 2.3 Resolución de `allow_in_logs` (`DATA-ASSET-*` vs `privacy-policy.yaml`)
1. **Normalización de clasificación**: convertir `-` a `_` y pasar a minúsculas (`normalizeClassificationKey`), de modo que:
   - `confidential-pii` → `confidential_pii`
   - `special-category-sensitive` → `special_category_sensitive`
2. **Evaluación por campo (`Object.hasOwn` + `Map<string, string>`)**:
   - Toda consulta sobre `policy.classifications` DEBE usar `Object.hasOwn(policy.classifications, key)` (nunca acceso directo por corchetes sin guard, evitando resolución sobre `Object.prototype`).
   - Si `field.sensitivity` es `'internal'` o `'public'`: consultar `Object.hasOwn(policy.classifications, field.sensitivity) ? policy.classifications[field.sensitivity]?.allow_in_logs : true`. Dado que `public` e `internal` tienen `allow_in_logs: true`, estos campos **quedan permitidos** en logs y no se incluyen en el mapa bloqueante.
   - Si `field.sensitivity` es `'pii'`, `'sensitive'`, `'special'`, `'confidential_pii'`, `'special_category_sensitive'` o se omite: resolver la clasificación del activo padre usando `Object.hasOwn(policy.classifications, key)` para `normalizedClassification` y `asset.classification`. Si `allow_in_logs === false` (o si la clasificación pertenece a `SENSITIVE_CLASSIFICATIONS` sin regla explícita `allow_in_logs: true`), el campo se normaliza a `snake_case` canónico y se registra en `Map<string, string>` (`canonicalSnakeField -> assetId`).

### 2.4 Stripper Unificado de Enmascaramiento (`O(n)`) y Detección Políglota Multilínea
1. **Stripper unificado con balanceo de paréntesis y conciencia de literales de cadena (`stripMaskingCalls(input: string): string`)**:
   - Escanea en una sola pasada lineal $O(n)$ eliminando expresiones de llamada `mask(...)`, `redact(...)`, `pseudonymize(...)`, `sha256(...)`, `tokenize(...)` **antes** de evaluar tanto las reglas estáticas `PRIV-001` (`PRIV-001-PII-IN-LOGS`) como los campos dinámicos `DATA-ASSET-*`.
   - Rastrea el estado de literales de cadena (`'...'`, `"..."`, `` `...` ``) respetando escapes `\` para que paréntesis dentro de cadenas no desequilibren el contador de profundidad ni rompan llamadas anidadas (p. ej. `mask(format(user.email, ")"))`).
2. **Escáner acotado por profundidad de paréntesis multilínea y captura de colas Go `zerolog`**:
   - Se define `detectPolyglotLoggerCall(line: string): string | null` (para línea única) y un escáner multilínea acotado por profundidad de paréntesis en `scanFileForPrivacyViolations(filePath: string, rootDir: string, policy?: PrivacyPolicy, disallowedLogFields?: Map<string, string>): PrivacyViolation[]` que mantiene compatibilidad total con llamadores existentes de 3 argumentos (4.º parámetro opcional).
   - Cuando una llamada a logger abre `(` sin cerrarla en la misma línea, el escáner continúa acumulando líneas dentro de un límite acotado de profundidad/líneas y registra el **`lineNumber` exacto de la línea del argumento infractor** (no solo la línea de apertura).
   - Patrones de logger soportados:
     - **JS / TS**: `console.(log|info|warn|error|debug|trace)(...)`, `(_?logger|log|Logger).(info|warn|error|debug|trace|log)(...)`
     - **Python**: `logging.(info|warn|warning|error|critical|exception|debug)(...)`, `(_?logger|log|Logger).(info|warn|warning|error|critical|exception|debug)(...)`, `structlog.*(...)`, `print(...)`
     - **.NET / C#**: `(_?logger|log|Logger).Log(Information|Warning|Error|Critical|Debug|Trace)?(...)`, `ILogger.Log*(...)`, `Console.WriteLine(...)`, `Serilog.Log.(Information|Warning|Error|Fatal|Debug|Verbose)(...)`
     - **Java (SLF4J / Log4j)**: `(LOGGER|LOG|_?logger|log|Logger).(info|warn|error|debug|trace|fatal)(...)`, `System.(out|err).println(...)`
     - **Go**: `slog.(Info|Warn|Error|Debug|Log|InfoContext|WarnContext|ErrorContext|DebugContext|LogContext)(...)` (`slog.*Context`), `zap.*(...)`, `logrus.(Info|Warn|Error|Fatal|Debug|Panic|Print*)(...)`, `zerolog.*(...)` capturando colas encadenadas `.Str(...)` / `.Interface(...)` hasta `.Msg(...)`/`.Msgf(...)`/`.Send()`, `log.(Print|Printf|Println|Fatal|Fatalf|Fatalln|Panic|Panicf|Panicln)(...)`

### 2.5 Normalización Canónica `snake_case` ($O(n)$) y Emparejamiento Seguro contra ReDoS
- **Validación estricta de identificador y rechazo de prototipos**: solo se registran nombres de campo que cumplan `/^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/` y no estén en `PROTOTYPE_KEYS` (`__proto__`, `constructor`, `prototype`, `toString`, `valueOf`, `hasOwnProperty`). Prohibido construir `new RegExp(rawField)`.
- **Normalización canónica `snake_case` en tiempo lineal $O(n)$ (`normalizeIdentifierToSnakeCase`)**:
  - Se aplica tanto a los nombres de campo de `DATA-ASSET-*` como a cada token identificador extraído de los argumentos del logger (`/[a-zA-Z_][a-zA-Z0-9_]*/g`).
  - Convierte PascalCase/camelCase a `snake_case` y elimina prefijos getter comunes (`getNationalId` → `national_id`, `Email` → `email`, `PhoneNumber` → `phone_number`, `phoneNumber` → `phone_number`) en una pasada lineal sin backtracking.
- **Búsqueda $O(1)$ en `Map<string, string>`**: se verifica `disallowedLogFields.get(normalizedToken)` en tiempo $O(1)$ por token, eliminando cualquier riesgo de ReDoS y manteniendo compatibilidad con `PII_SAST_RULES` (`PRIV-001-PII-IN-LOGS`).

### 2.6 Formato de Diagnóstico, Exenciones, Gate y Ordenamiento Canónico
- **Diagnóstico sin fugas y redacción de `snippet`**:
  - `ruleId`: `'PRIV-001-PII-IN-LOGS'`
  - `type`: `'PII_IN_LOGS'`
  - `severity`: `'HIGH'`
  - `relPath`: ruta relativa con separadores `/` (nunca `rootDir` absoluto del host en `message` ni en reportes).
  - `lineNumber`: número de línea 1-based exacto de la línea del argumento infractor.
  - `snippet`: DEBE omitirse o redactarse (`undefined` / `'[REDACTED]'`) para toda violación `PRIV-001` (`PRIV-001-PII-IN-LOGS`) y `PRIV-004` (`PRIV-004-HARDCODED-REAL-PII`) para garantizar que nunca se filtren valores PII literales o en tiempo de ejecución en diagnósticos ni reportes.
  - `message`: indica únicamente regla, identificador del campo y/o `assetId` (p. ej. `Unmasked PII field 'email' (DATA-ASSET-USER-PROFILE-001) detected in logger call (GDPR Art. 25 / Art. 32)`), sin volcar valores literales de PII ni rutas absolutas del host.
- **Exenciones y política**:
  - Respeta `isLineExemptFromPrivacyScan(line)` (`ai-sdlc:allow-pii`, `ai-sdlc:allow-sast`, `nosec`).
  - Respeta `policy.ci_gates.fail_on_pii_in_logs`: si es `false`, omite tanto `PRIV-001-PII-IN-LOGS` estático como el escaneo dinámico de campos `DATA-ASSET-*`.
- **Deduplicación y ordenamiento canónico**:
  - Deduplicar violaciones por la clave compuesta `(relPath, lineNumber, ruleId)` antes de ordenar y reportar.
  - `verifyPrivacy` ordena `violations` deterministamente antes de generar reportes:
    1. `relPath` lexicográfico ascendente (`a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0`)
    2. `lineNumber ?? 0` numérico ascendente
    3. `ruleId` lexicográfico ascendente

## 3. Protocolos de Manejo de Errores y Mitigación
- **Entradas `DATA-ASSET-*` malformadas**: `parseDataAsset` ignora elementos no válidos sin lanzar errores ni detener el descubrimiento de otros artefactos.
- **Prevención de ReDoS**: prohibición absoluta de `new RegExp(rawField)` no validado; validación de identificador + lookup en `Set`/`Map` en tiempo lineal.
- **No filtración en reportes**: `PRIVACY_SCAN_REPORT.md` y salidas CLI usan `relPath`, `lineNumber`, `ruleId` y `message` redactado; nunca exponen `rootDir` ni literales PII en claro.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Sin nuevas dependencias externas. Cumple `CC <= 10` y funciones `<= 40` líneas según `quality-policy.yaml`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-14 | agent-developer / human-dev | Diseño técnico formal inicial | CHG-058-POLYGLOT-PII-LOGGING |
| **1.1.0** | 2026-11-14 | agent-system-architect | Diseño modular CMP-058: DataAssetField, normalización allow_in_logs, detección políglota, matching ReDoS-safe, diagnóstico redactado y orden canónico | CHG-058-POLYGLOT-PII-LOGGING |
| **1.2.0** | 2026-11-14 | agent-system-architect | Remediación Checkpoint 1 (Ronda 1): stripper O(n) pre-PRIV-001, escáner multilínea/zerolog/slog.*Context/LOG.*, normalización snake_case, rechazo claves prototipo/Object.hasOwn, redacción snippet PRIV-001/PRIV-004, deduplicación y 4.º parámetro opcional | CHG-058-POLYGLOT-PII-LOGGING |
