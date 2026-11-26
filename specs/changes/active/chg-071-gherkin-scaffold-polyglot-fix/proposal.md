---
id: CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX
type: spec-change-proposal
title: "Gherkin Scaffold Polyglot Compilation and Symbol Fix"
status: draft
author: "agent-system-architect"
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

# Propuesta de Cambio: CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX

## 1. Motivación y Alcance
Corregir cuatro defectos de compilación, colisión de símbolos y cumplimiento de reglas estrictas en el motor de scaffolding políglota `packages/core/src/verifiers/gherkin-scaffold.ts` (Issue #228):
1. **Evitar corrupción por `stdout` de compiladores/runners (`cs`, `rs`)**: `dotnet build` y `cargo test --test cucumber` emiten salida de consola y no código de step definitions; `generateLanguageStepContent` debe usar la plantilla determinista `RED` cuando `spec.emitsSourceStdout === false`.
2. **Unicidad de símbolos por `.feature` en C# (`renderCsFallback`) y Go (`renderGoFallback`)**: parametrizar `public class <FeaturePascalStem>Steps` y `func Initialize<FeaturePascalStem>Scenario(ctx *godog.ScenarioContext)` usando el stem en PascalCase del archivo `.feature` para evitar `CS0101` y errores de redeclaración en proyectos multi-feature.
3. **Regex y raw strings válidos en Go (`renderGoFallback`)**: reemplazar `escapeDoubleQuotes` por `escapeRegExp` y un formateador seguro de literales raw con backticks (`formatGoRawRegexLiteral`), evitando `\"` literales y roturas por metacaracteres regex o `` ` ``.
4. **Compatibilidad estricta de Rust (`renderRsFallback`) con CHG-069**: reemplazar `todo!("RED: Step not implemented: ...")` por `panic!("RED: Step not implemented: ...")` para cumplir con `-D clippy::todo` y `-D clippy::assertions_on_constants`.

### Alcance Técnico
- `packages/core/src/types/index.ts`: añadir `emitsSourceStdout?: boolean` a `GherkinGeneratorSpec`.
- `packages/core/src/verifiers/gherkin-scaffold.ts`: actualizar `GHERKIN_GENERATOR_SPECS`, `generateLanguageStepContent`, `renderCsFallback`, `renderGoFallback`, `renderRsFallback` y añadir `featurePascalStem`, `escapeRegExp` y `formatGoRawRegexLiteral`.
- `packages/core/tests/gherkin-scaffold.spec.ts` y `tests/steps/`: pruebas unitarias y de integración multi-feature para `cs`, `go` y `rs`.

## 2. Dependencias Externas Evaluadas
- Ninguna dependencia externa nueva. Se utilizan exclusivamente APIs estándar de TypeScript/Node.js, en total conformidad con `license-policy.yaml`.
