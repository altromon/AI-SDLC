---
id: FR-036-QUALITY-BASELINE-RATCHET-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: "Mecanismo de Baseline (quality-baseline.json) y Modo Ratchet en Quality Gate"
status: active
category: functional
derives-from:
  - UC-036-QUALITY-BASELINE-RATCHET
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@FR-036-QUALITY-BASELINE-RATCHET-001"
  - "@automated"
supersedes: null
superseded-by: null
---

# FR-036-QUALITY-BASELINE-RATCHET-001: Mecanismo de Baseline y Modo Ratchet en Quality Gate

## 1. Enunciado Normativo
El sistema DEBE proveer un mecanismo determinista de instantánea de línea base (*baseline*) y modo trinquete (*ratchet*) para la verificación de calidad estática:
1. **Comando de Actualización de Baseline (`--update-baseline`)**: Generación o actualización del archivo `quality-baseline.json` conteniendo la firma SHA-256 de cada violación (ruta relativa del archivo, nombre de función y métrica infractora), el valor medido y el umbral excedido.
2. **Modo Trinquete (`ratchet_mode: true` o `--ratchet`)**: Al ejecutar `aisdlc verify quality`, el motor debe tolerar las violaciones históricas presentes en el baseline emitiéndolas como advertencias (`toleratedViolations`), permitiendo el paso del gate en repositorios legacy.
3. **Bloqueo Inmediato de Nuevas Violaciones**: Cualquier función nueva o modificada que no figure en el baseline e infrinja los umbrales de complejidad ciclomática, cognitiva, mantenibilidad o longitud debe bloquear inmediatamente el gate (`exit code 1`).
4. **Detección de Empeoramiento de Métricas**: Si una función existente en el baseline empeora su complejidad respecto a la instantánea registrada, debe considerarse una violación activa no tolerada y bloquear el gate.
5. **Reducción de Deuda (Ratchet Down)**: Al ejecutar la actualización del baseline, las violaciones resueltas son purgadas de `quality-baseline.json`, impidiendo futuros retrocesos.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-036-QUALITY-BASELINE-RATCHET-001 @automated @regression
Feature: Mecanismo de Baseline y Modo Ratchet en Quality Gate
  @nominal
  Scenario: Repositorio con deuda técnica heredada pasa el gate con baseline activo
    Given un repositorio con violaciones de complejidad preexistentes registradas en "quality-baseline.json"
    When se ejecuta "aisdlc verify quality" en modo ratchet
    Then las violaciones registradas en el baseline son toleradas como advertencias
    And el veredicto del Quality Gate es satisfactorio con código de salida 0

  @boundary
  Scenario: Introducción de una nueva función compleja bloquea el gate de inmediato
    Given un repositorio con baseline activo y modo ratchet habilitado
    When se añade una nueva función que excede la complejidad ciclomática máxima de 10
    Then el motor detecta la nueva violación no registrada en el baseline
    And el Quality Gate falla inmediatamente con código de salida 1

  @invalid
  Scenario: Empeoramiento de métrica en función registrada en baseline bloquea el gate
    Given una función registrada en baseline con complejidad ciclomática 12
    When se modifica la función incrementando su complejidad a 15
    Then el motor detecta el empeoramiento métrico respecto al baseline
    And el Quality Gate rechaza el cambio con código de salida 1
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-23 | agent-system-architect | Especificación formal del baseline y modo ratchet | CHG-036-QUALITY-BASELINE-RATCHET |
