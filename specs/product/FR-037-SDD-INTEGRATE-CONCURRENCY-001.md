---
id: FR-037-SDD-INTEGRATE-CONCURRENCY-001
type: requirement
title: "sdd-integrate-concurrency-and-retry"
status: draft
version: "1.0.0"
schema-version: "1.0"
category: functional
derives-from:
  - UC-037-SDD-INTEGRATE-CONCURRENCY
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@FR-037-SDD-INTEGRATE-CONCURRENCY-001"
  - "@automated"
supersedes: null
superseded-by: null
---

# FR-037-SDD-INTEGRATE-CONCURRENCY-001: sdd-integrate-concurrency-and-retry

## 1. Enunciado Normativo
El workflow de CI/CD para integración canónica en fusiones (`sdd-integrate-on-merge.yml`) DEBE definir su clave de grupo de concurrencia basándose en la rama base de integración (`github.event.pull_request.base.ref || github.ref_name`) con `cancel-in-progress: false`, y el paso de push DEBE ejecutar un bucle de reintento con retroceso exponencial (máximo 3 intentos con 2s iniciales duplicando tiempo de espera) incorporando `git pull --rebase origin <target-branch>` previo a cada intento de push.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-037-SDD-INTEGRATE-CONCURRENCY-001 @automated
Feature: sdd-integrate-concurrency-and-retry
  As a DevOps engineer or automated agent
  I want SDD canonical integration to serialize pushes per target branch and retry on race conditions
  So that concurrent PR merges complete without non-fast-forward failures

  Scenario: Concurrency key resolution isolates by target branch
    Given a pull request merged into "main"
    When the concurrency group is computed
    Then the group key is "sdd-integrate-main"

  Scenario: Successful git push retry after initial concurrent rejection
    Given a push rejection due to remote changes
    When the retry loop executes git pull --rebase and pushes again
    Then the push succeeds on the second attempt
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-23 | agent | Requerimiento funcional para corrección de condición de carrera y reintentos (#68) | CHG-037-SDD-INTEGRATE-CONCURRENCY |
