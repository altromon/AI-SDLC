---
id: CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK
type: spec-change-proposal
title: "Language-Agnostic Test Stack Alignment"
status: proposed
author: "agent-system-architect"
citations:
  - id: UC-068-LANGUAGE-AGNOSTIC-TEST-STACK
    digest: sha256:26e325c4a7d3b8f67eccbe624eabf5f08d36a8d9e0416cff9f533b016e1c0d39
    comment: Citación de use-case (Language-Agnostic Test Stack Detection, Polyglot Web E2E Driver Signatures, and Single-Runtime QA Discipline)
  - id: FR-068-LANGUAGE-AGNOSTIC-TEST-STACK-001
    digest: sha256:1517258b555d12dc46c77c9bb0443ba94cf0c2a527dafe9d88bc6b4e3003282b
    comment: Requerimiento derivado de UC-068-LANGUAGE-AGNOSTIC-TEST-STACK
---

# Propuesta de Cambio: CHG-068-LANGUAGE-AGNOSTIC-TEST-STACK

## 1. Motivación y Alcance
Eliminar el sesgo implícito hacia Node.js/TypeScript en la detección de stack de pruebas, la verificación de drivers Web E2E y las directivas de agentes QA:
1. **Detección recursiva acotada y consciente de configuración en Fase 0** en `packages/cli/src/commands/check.ts` (`detectDefaultScaffoldLanguage`), eliminando el fallback silencioso a `'ts'` cuando no existe manifiesto Node/TS ni configuración explícita.
2. **Firmas políglotas de drivers Web E2E** en `packages/core/src/verifiers/test-discovery.ts` (`MODALITY_DRIVER_SIGNATURES.web`) cubriendo Playwright en C#, Python, Go, Rust y JS/TS de manera uniforme.
3. **Disciplina QA de runtime único** en `.agent/agents/agent-qa-engineer.md`, `.agent/rules/ai-sdlc-testing.md` y sus plantillas generadoras en `packages/core/src/init/agent-templates.ts` (sincronizadas vía `aisdlc sync`), prohibiendo introducir runtimes secundarios salvo aprobación explícita mediante ADR.

## 2. Dependencias Externas Evaluadas
- Ninguna dependencia externa nueva requerida. Todo se implementa con módulos nativos de Node.js y utilidades existentes en `@aisdlc/core` y `@aisdlc/cli`, 100% conforme con `license-policy.yaml`.
