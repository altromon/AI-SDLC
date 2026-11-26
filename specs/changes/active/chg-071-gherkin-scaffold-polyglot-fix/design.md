---
id: DSG-CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
type: spec-design
change-id: CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
title: "Diseño Técnico: Gherkin Scaffold Polyglot Compilation and Symbol Fix"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX"
architecture-component: "CMP-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX"
enclave: "SEC-ENC-DMZ"
status: draft
contracts:
  - GherkinGeneratorSpec
  - featurePascalStem
  - escapeRegExp
  - formatGoRawRegexLiteral
  - generateLanguageStepContent
  - renderCsFallback
  - renderGoFallback
  - renderRsFallback
citations:
  - id: UC-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
    digest: sha256:3ee3b8320082cb6ef6ed8f7ef6388efd72275231cbf17c16ddfc0d37c7336fa4
    comment: Citación de use-case (Corrección de generación determinista, unicidad de símbolos, expresiones regulares Go y compatibilidad Rust en scaffolding BDD políglota)
  - id: FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001
    digest: sha256:cd612931f60ee3e35877a1e9b3ff90eac0b75a5e0a3517cfe458e47ad19cebb4
    comment: Requerimiento derivado de UC-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
  - id: CMP-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
    digest: sha256:1dd7ef7d70d1036da01991329263df96c47310b830ce276fcce4b77383ffce14
    comment: Componente arquitectónico que materializa las correcciones de scaffolding políglota en C#, Go y Rust
---

# Diseño Técnico: CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El cambio materializa `CMP-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX` dentro de `@aisdlc/core` (`packages/core/src/types/index.ts` y `packages/core/src/verifiers/gherkin-scaffold.ts`), operando en el enclave local `SEC-ENC-DMZ` sin dependencias externas ni modificaciones a `schemas/`. Todas las funciones nuevas o modificadas mantienen `Lines <= 40`, `Cyclomatic <= 10` y `Cognitive <= 15`.

## 2. Contratos de Datos e Interfaces

### 2.1 `GherkinGeneratorSpec` (`packages/core/src/types/index.ts`)
- Añadir `emitsSourceStdout?: boolean;` a `GherkinGeneratorSpec`.
- En `GHERKIN_GENERATOR_SPECS` (`packages/core/src/verifiers/gherkin-scaffold.ts`):
  - Establecer `emitsSourceStdout: false` en `rs` (`cargo test --test cucumber`) y `cs` (`dotnet build`), indicando que son comandos de compilación/ejecución de pruebas y su `stdout` nunca debe escribirse en archivos de step definitions.
  - Los lenguajes con generador de snippets (`ts`, `py`, `go`) mantienen el comportamiento por defecto (`emitsSourceStdout !== false`).

### 2.2 `generateLanguageStepContent` (`packages/core/src/verifiers/gherkin-scaffold.ts`)
```ts
export function generateLanguageStepContent(
  binaryReady: boolean,
  spec: GherkinGeneratorSpec,
  ctx: SingleLangContext,
  fallbackContent: string
): { status: 'GENERATED_NATIVE' | 'GENERATED_FALLBACK'; content: string } {
  if (!binaryReady || spec.emitsSourceStdout === false) {
    return { status: 'GENERATED_FALLBACK', content: fallbackContent };
  }
  const genRes = ctx.execFn(spec.generatorBin, spec.scaffoldArgs(ctx.fullFeaturePath));
  const content = genRes.status === 0 && genRes.stdout.trim() ? genRes.stdout : fallbackContent;
  return { status: 'GENERATED_NATIVE', content };
}
```
- Garantiza que, incluso cuando `dotnet` o `cargo` estén instalados y retornen `status === 0` con salida de consola en `stdout`, `generateLanguageStepContent` devuelva la plantilla determinista tipada `RED` sin corromper `tests/steps/<feature>Steps.cs` ni `*_steps.rs`.

### 2.3 `featurePascalStem(featurePath: string): string`
```ts
export function featurePascalStem(featurePath: string): string {
  const parts = featureStem(featurePath)
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  const pascal = parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  if (!pascal) return 'Generated';
  return /^[0-9]/.test(pascal) ? `_${pascal}` : pascal;
}
```
- Ejemplos deterministas:
  - `alpha-flow.feature` -> `AlphaFlow`
  - `order_create.feature` -> `OrderCreate`
  - `01-login.feature` -> `_01Login`

### 2.4 `renderCsFallback(relFeature: string, steps: ParsedStepItem[]): string`
- Reemplaza `public class GeneratedSteps` por:
  ```ts
  const className = `${featurePascalStem(relFeature)}Steps`;
  ```
  emitiendo `public class ${className}`.
- Garantiza unicidad de símbolos por `.feature` en C# (evitando `CS0101` cuando existen múltiples `.feature`).

### 2.5 `escapeRegExp(text: string): string` y `formatGoRawRegexLiteral(pattern: string): string`
- `escapeRegExp`:
  ```ts
  export function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  ```
- `formatGoRawRegexLiteral`:
  En Go, los literales raw `` `...` `` no pueden contener el carácter backtick (`` ` ``). Si `pattern` no contiene backticks, se emite `` `^${pattern}$` ``. Si contiene uno o más backticks, se divide el patrón completo `^${pattern}$` por `` ` `` y se concatenan los fragmentos raw con `` "`" ``:
  ```ts
  export function formatGoRawRegexLiteral(pattern: string): string {
    const anchored = `^${pattern}$`;
    if (!anchored.includes('`')) {
      return `\`${anchored}\``;
    }
    return anchored
      .split('`')
      .map((part) => `\`${part}\``)
      .join(' + "`" + ');
  }
  ```
  - Ejemplo sin backticks (`item (A) costs $12.50 + [fee]?`):
    `` `^item \(A\) costs \$12\.50 \+ \[fee\]\?$` ``
  - Ejemplo con backticks (``command runs `aisdlc verify` cleanly``):
    `` `^command runs ` + "`" + `aisdlc verify` + "`" + ` cleanly$` ``
  - Resultado: 100% válido en sintaxis Go y sin `\"` literales espurios.

### 2.6 `renderGoFallback(relFeature: string, steps: ParsedStepItem[]): string`
- Reemplaza `func InitializeScenario(ctx *godog.ScenarioContext)` por:
  ```ts
  const fnName = `Initialize${featurePascalStem(relFeature)}Scenario`;
  ```
  emitiendo `func ${fnName}(ctx *godog.ScenarioContext) {`.
- Para cada paso `st`, calcula `const expr = formatGoRawRegexLiteral(escapeRegExp(st.text));` y emite:
  `	ctx.Step(${expr}, func() error { return godog.ErrPending })`.

### 2.7 `renderRsFallback(relFeature: string, steps: ParsedStepItem[]): string`
- Reemplaza `todo!("RED: Step not implemented: ${escaped}");` por:
  `panic!("RED: Step not implemented: ${escaped}");`
- Cumple estrictamente con `-D clippy::todo` y `-D clippy::assertions_on_constants` de `RUST_CARGO_CONFIG_TOML` (CHG-069), manteniendo el fallo `RED` en tiempo de ejecución.

## 3. Protocolos de Manejo de Errores y Mitigación
- Identificadores vacíos o con dígitos iniciales en `featurePascalStem` se sanean deterministamente (`Generated` / `_<stem>`).
- Cero cambios a `schemas/` y cero dependencias nuevas (`license-policy.yaml` conforme).

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Todas las capacidades se implementan con TypeScript y Node.js estándar, cumpliendo al 100% con `license-policy.yaml`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-26 | agent-system-architect | Diseño técnico completo para `emitsSourceStdout`, `featurePascalStem`, `escapeRegExp`, `formatGoRawRegexLiteral`, `renderCsFallback`, `renderGoFallback` y `renderRsFallback` | CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX |
