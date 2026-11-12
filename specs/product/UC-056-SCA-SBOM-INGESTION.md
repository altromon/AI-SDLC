---
id: UC-056-SCA-SBOM-INGESTION
type: use-case
title: Ingesta de SBOM CycloneDX/SPDX pre-generados como fuente de dependencias y licencias
status: draft
version: 0.1.0
schema-version: '1.0'
primary-actor: ACT-DEVSECOPS-ENGINEER
supporting-actors:
  - ACT-AI-AGENT
governed-by:
  - BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
supersedes: null
superseded-by: null
---

# UC-056-SCA-SBOM-INGESTION: Ingesta de SBOM CycloneDX/SPDX pre-generados

## 1. Intención y Resultado
As a ACT-DEVSECOPS-ENGINEER
I want que Gate 6 consuma un SBOM CycloneDX o SPDX generado por el build del proyecto
To auditar dependencias y licencias de cualquier ecosistema sin reimplementar su resolución.

Contexto: issue #161, cambio (C). Fuera de alcance: OSV offline (#194).

## 2. Precondiciones
- Existe un archivo SBOM JSON (CycloneDX 1.x o SPDX 2.x JSON) accesible dentro del repositorio.

## 3. Flujo Principal (Nominal)
1. El usuario indica o el sistema descubre el SBOM (ruta dentro de la raíz del proyecto).
2. El sistema valida formato y estructura, y extrae componentes (nombre, versión, PURL) y licencias (SPDX id/expression).
3. Las dependencias resultantes alimentan Gate 6 como fuente de dependencias/licencias, evaluadas contra `license-policy.yaml`.
4. Componentes sin licencia declarada se marcan `UNKNOWN`/`UNRESOLVED` (nunca inferida).

## 4. Flujos Alternativos y de Excepción
- **A (SBOM malformado o formato no soportado)**: fallo cerrado con error explícito; no se usan datos parciales.
- **B (Ruta fuera de la raíz del proyecto)**: rechazada (path traversal).
- **C (SBOM y resolución local discrepan)**: prevalece la declaración del SBOM y se emite aviso. Pregunta abierta: ver `open-questions`.

## 5. Restricciones No Funcionales
- Offline, determinista, límite de tamaño de archivo; sin ejecución de código del SBOM.

## open-questions
- Resuelta (decisión del Product Owner): el SBOM sustituye siempre a la resolución local; no se fusionan.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-056-SCA-SBOM-INGESTION @automated @sca
Feature: Ingesta de SBOM CycloneDX/SPDX pre-generados
  As a DevSecOps engineer
  I want to ingest a pre-generated SBOM
  So that Gate 6 audits dependencies and licenses from the build output

  @nominal
  Scenario Outline: SBOM válido alimenta Gate 6
    Given a valid "<format>" SBOM inside the project declaring "pkg:maven/com.acme/lib@1.0" with license "Apache-2.0"
    When the SCA scan ingests the SBOM
    Then the dependency "com.acme:lib" is audited with license "Apache-2.0"

    Examples:
      | format    |
      | CycloneDX |
      | SPDX      |

  @boundary
  Scenario: Componente sin licencia declarada
    Given a valid CycloneDX SBOM with a component lacking licenses
    When the SCA scan ingests the SBOM
    Then the component license is "UNKNOWN"

  @invalid
  Scenario Outline: SBOM inválido falla cerrado
    Given an SBOM input with defect "<defect>"
    When the SCA scan ingests the SBOM
    Then the scan fails with error "<error>"
    And no partial dependencies are reported

    Examples:
      | defect                  | error                      |
      | malformed_json          | ERR_SBOM_MALFORMED         |
      | unsupported_format      | ERR_SBOM_UNSUPPORTED       |
      | path_outside_project    | ERR_SBOM_PATH_OUTSIDE_ROOT |
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-12 | agent-product-analyst | Definición inicial (issue #161, cambio C) | CHG-056-SCA-SBOM-INGESTION |
