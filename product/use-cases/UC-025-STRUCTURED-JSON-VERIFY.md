---
id: UC-025-STRUCTURED-JSON-VERIFY
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: Verificación Determinista con Salida Estructurada JSON
status: active
primary-actor: ACT-AI-AGENT
supporting-actors:
  - ACT-HUMAN-ENGINEER
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---

# UC-025-STRUCTURED-JSON-VERIFY: Verificación con Salida JSON

## 1. Intención y Resultado
Permitir que agentes de IA y herramientas automatizadas invoquen comandos de verificación (`aisdlc verify *`) y reciban resultados normalizados en formato JSON sin códigos ANSI, facilitando el parsing determinista del veredicto y las violaciones detectadas.

## 2. Precondiciones
- El CLI de AI-SDLC está instalado y disponible en el entorno de ejecución.
- El proyecto dispone de artefactos de gobernanza, esquemas o código a evaluar.

## 3. Flujo Principal
1. El agente o pipeline invoca el comando de verificación pasando el flag `--json` (o flag global `-o json`).
2. El motor de verificación evalúa las reglas deterministas correspondientes.
3. El comando emite por salida estándar exclusivamente una estructura JSON válida que contiene el veredicto, conteo de errores y detalles.
4. El proceso finaliza con código de salida adecuado (0 en éxito, 1 en fallo).
