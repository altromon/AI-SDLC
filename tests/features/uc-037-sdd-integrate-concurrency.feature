# ==============================================================================
# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)
# Origen: specs/product/UC-037-SDD-INTEGRATE-CONCURRENCY.md
# ID Requerimiento: UC-037-SDD-INTEGRATE-CONCURRENCY
# Versión: 1.0.0
# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.
# ==============================================================================

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
