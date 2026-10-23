---
id: UC-037-SDD-INTEGRATE-CONCURRENCY
type: use-case
title: Concurrency Control and Exponential Backoff Retries in SDD Merge Integration Workflow
status: active
version: "1.0.0"
schema-version: "1.0"
primary-actor: ACT-DEVOPS-AGENT
supporting-actors:
  - ACT-HUMAN-ENGINEER
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---

# UC-037-SDD-INTEGRATE-CONCURRENCY: Concurrency Control and Exponential Backoff Retries in SDD Merge Integration Workflow

## 1. Intención y Resultado
Garantizar la integración canónica determinista y sin fallos por condición de carrera (*non-fast-forward push rejection*) en el workflow de CI/CD de GitHub Actions (`sdd-integrate-on-merge.yml`) cuando múltiples Pull Requests son aprobados o fusionados simultáneamente.

## 2. Precondiciones
- El repositorio cuenta con el flujo de trabajo `.github/workflows/sdd-integrate-on-merge.yml`.
- Se fusionan uno o más Pull Requests en ramas principales de integración (`main` o `release/**`).

## 3. Flujo Principal
1. Se detecta el cierre o fusión de un Pull Request o dispatch manual.
2. El grupo de concurrencia evalúa la rama base (`main` o `release/**`) con `cancel-in-progress: false` para serializar ejecuciones por rama de destino en lugar del ref efímero del PR.
3. El comando de integración de SDD detecta cambios canónicos pendientes.
4. Antes de empujar cambios al repositorio remoto, se sincroniza el estado con `git pull --rebase origin <base-ref>`.
5. Si `git push` experimenta un rechazo por colisión concurrente, se ejecuta un bucle de reintento con retroceso exponencial de hasta 3 intentos antes de abortar.

## 4. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-037-SDD-INTEGRATE-CONCURRENCY @automated @ci-cd
Feature: Concurrency Control and Retry Handling in SDD Canonical Integration
  @nominal
  Scenario: Sincronización exitosa con reintento tras rechazo non-fast-forward
    Given un entorno de integración continua con colisión concurrente de commits
    When se ejecuta el script de sincronización canónica con reintentos y retroceso exponencial
    Then el comando realiza pull rebase y completa el push exitosamente dentro de los 3 intentos

  @boundary
  Scenario: Agrupamiento de concurrencia por rama base de destino
    Given múltiples eventos pull_request cerrados simultáneamente contra "main"
    When GitHub Actions evalúa el grupo de concurrencia del workflow
    Then todas las ejecuciones comparten la clave "sdd-integrate-main" serializándose con cancel-in-progress false

  @invalid
  Scenario: Aborto controlado tras exceder límite máximo de reintentos
    Given un conflicto insalvable en git push persistente por 3 intentos
    When se agota el número máximo de reintentos
    Then el workflow finaliza con código de salida 1 y mensaje de error descriptivo
```

## 5. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-23 | agent-product-analyst | Creación de caso de uso para corrección de condición de carrera (#68) | CHG-037-SDD-INTEGRATE-CONCURRENCY |
