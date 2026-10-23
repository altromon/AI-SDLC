---
id: CHG-037-SDD-INTEGRATE-CONCURRENCY
type: spec-change-proposal
title: "sdd-integrate-concurrency"
status: draft
author: "agent-system-architect / human-dev"
citations:
  - id: UC-037-SDD-INTEGRATE-CONCURRENCY
    comment: Caso de uso origen para control de concurrencia y reintentos en sdd-integrate
  - id: FR-037-SDD-INTEGRATE-CONCURRENCY-001
    comment: Requerimiento funcional canónico asociado
---

# Propuesta de Cambio: CHG-037-SDD-INTEGRATE-CONCURRENCY

## 1. Motivación y Alcance
Resolver la condición de carrera en el flujo de trabajo de GitHub Actions `sdd-integrate-on-merge.yml`. Cuando se fusionan múltiples Pull Requests simultáneamente, el comando `git push` del segundo job falla sistemáticamente por rechazo *non-fast-forward* al no contar con los commits del primero.
Para corregirlo, se introduce un grupo de concurrencia acotado a la rama base (`sdd-integrate-${{ github.event.pull_request.base.ref || github.ref_name }}`), y en el paso de sincronización canónica se incorpora una estrategia `git pull --rebase origin <target-branch>` junto con un bucle de reintento con retroceso exponencial (hasta 3 intentos con pausas de 2 a 8 segundos).

## 2. Dependencias Externas Evaluadas
- Ninguna dependencia nueva requerida. Se utilizan capacidades nativas de GitHub Actions y Git CLI.
