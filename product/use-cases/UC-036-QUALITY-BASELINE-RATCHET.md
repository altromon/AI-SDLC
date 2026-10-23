---
id: UC-036-QUALITY-BASELINE-RATCHET
type: use-case
version: "1.0.0"
schema-version: "1.0"
title: Mecanismo de Baseline y Modo Trinquete en Quality Gate para Código Heredado
status: active
primary-actor: ACT-TECH-LEAD
supporting-actors:
  - ACT-AI-AGENT
  - ACT-HUMAN-ENGINEER
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---

# UC-036-QUALITY-BASELINE-RATCHET: Mecanismo de Baseline y Modo Trinquete en Quality Gate

## 1. Intención y Resultado
Permitir la adopción progresiva del Quality Gate en proyectos con deuda técnica preexistente (código legacy o brownfield) sin bloquear la entrega de valor, congelando las violaciones históricas en una instantánea criptográfica (`quality-baseline.json`) y aplicando un modo trinquete (*ratchet*) que tolera la deuda heredada como advertencias pero bloquea de inmediato cualquier nueva violación introducida o empeoramiento métrico.

## 2. Precondiciones
- El repositorio cuenta con una política declarativa `quality-policy.yaml`.
- El CLI de AI-SDLC está disponible para ejecutar verificaciones (`aisdlc verify quality`).

## 3. Flujo Principal
1. El equipo o agente ejecuta `aisdlc verify quality --update-baseline` para capturar la instantánea de violaciones preexistentes con sus firmas criptográficas SHA-256 en `quality-baseline.json`.
2. Durante el ciclo de integración continua (CI/CD) o auditoría local, se ejecuta la verificación de calidad en modo trinquete (`--ratchet` o `ratchet_mode: true`).
3. El motor compara las violaciones detectadas contra el baseline:
   - Las violaciones registradas en el baseline se toleran como advertencias.
   - Cualquier violación nueva o empeoramiento métrico provoca el fallo del Quality Gate con código de salida 1.
4. A medida que se refactoriza código legacy, las violaciones resueltas se consolidan a la baja en el baseline (*ratchet down*), blindando el avance y evitando regresiones.
