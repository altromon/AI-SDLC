---
id: CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
type: spec-change-proposal
title: "Polyglot Registry and BDD Support for Java, Kotlin, C, and C++"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
    digest: sha256:62eb51c0d1be1e83dff467acc98e0a3f0f65f5992f68f1ca5c9e1419971d834b
    comment: Citación de use-case (Registro políglota unificado y soporte BDD para JVM (Java/Kotlin) y C/C++)
  - id: FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001
    digest: sha256:5c6f94849015be752f70b204dfed7e1fad7e634769e1f485b90973ab5b05c56b
    comment: Requerimiento derivado de UC-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
  - id: CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
    digest: sha256:567916992ce77aea52dcc8f0f9d5a439a8242ccfd1efe387bc7eccd73d8753a2
    comment: Componente arquitectónico que materializa el registro políglota unificado y el soporte BDD para Java, Kotlin, C y C++
---

# Propuesta de Cambio: CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP

## 1. Motivación y Alcance
Resolver la fragmentación de metadatos de lenguaje y la falta de soporte BDD para Java, Kotlin, C y C++ en AI-SDLC (Issue #229):
1. **Registro Políglota Único (`POLYGLOT_LANGUAGE_REGISTRY` y `POLYGLOT_EXCLUDED_DIRS`)**:
   - Centralizar en `packages/core/src/verifiers/polyglot-registry.ts` (exportado desde `@aisdlc/core`) la definición canónica de lenguajes, alias, extensiones, manifiestos y directorios excluidos (`node_modules`, `.git`, `bin`, `obj`, `dist`, `build`, `target`, `.venv`, `venv`, `__pycache__`, `.pytest_cache`, `reports`, `templates`, `examples`, `coverage`).
   - Eliminar definiciones duplicadas en `coding-rules-templates.ts`, `gherkin-language-resolver.ts`, `gherkin-scaffold.ts`, `gherkin.ts`, `test-discovery.ts` y `packages/cli/src/commands/check.ts`.
2. **Extensión de Soporte BDD a `java`, `kt`, `c` y `cpp`**:
   - Extender `GherkinScaffoldLanguage` a `'ts' | 'py' | 'go' | 'rs' | 'cs' | 'java' | 'kt' | 'c' | 'cpp'`.
   - Soportar `*Steps.java` (`java`), `*Steps.kt` (`kt`, aceptando `'kotlin'` como alias), `*_steps.c` (`c`) y `*_steps.cpp` (`cpp`) en `GHERKIN_GENERATOR_SPECS`, `EXT_TO_LANG` y `getPresentStepLanguages`.
3. **Detección Determinista de Stack (`detectDefaultScaffoldLanguage`)**:
   - Reconocer `pom.xml`, `build.gradle`, `build.gradle.kts` y `CMakeLists.txt`.
   - Priorizar manifiestos primarios de proyecto (incluidos los ubicados en `src/` como `src/App/App.csproj`) frente a archivos auxiliares en la raíz (como `requirements.txt`).

### Alcance Técnico
- `packages/core/src/verifiers/polyglot-registry.ts` y `packages/core/src/index.ts`
- `packages/core/src/types/index.ts`
- `packages/core/src/init/coding-rules-templates.ts`
- `packages/core/src/verifiers/gherkin-language-resolver.ts`
- `packages/core/src/verifiers/gherkin-scaffold.ts`
- `packages/core/src/verifiers/gherkin.ts`
- `packages/core/src/verifiers/test-discovery.ts`
- `packages/cli/src/commands/check.ts`

## 2. Dependencias Externas Evaluadas
- No se añaden dependencias de ejecución al paquete `@aisdlc/core` ni `@aisdlc/cli`.
- Herramientas BDD referenciadas en plantillas/especificaciones:
  - `io.cucumber:cucumber-java` (`MIT`) — permitida en `license-policy.yaml`.
  - `Catch2` (`BSL-1.0`, Boost Software License 1.0) — licencia permisiva libre, distinta de `BSL-1.1` (`commercial_acquisition_required` en `license-policy.yaml`).
