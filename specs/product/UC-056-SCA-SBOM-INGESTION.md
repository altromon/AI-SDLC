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
1. El usuario indica explícitamente el SBOM con la opción CLI `--sbom <ruta>` (sin autodescubrimiento; ruta dentro de la raíz del proyecto).
2. El sistema valida formato y estructura, y extrae componentes (nombre, versión, PURL) y licencias (SPDX id/expression).
3. El SBOM solo rellena huecos: se fusiona con la resolución local (local primero) y sus licencias se etiquetan `sbom-declared`; el resultado se evalúa contra `license-policy.yaml`. El conjunto de componentes se verifica contra los lockfiles (faltantes/sobrantes como avisos).
4. Componentes sin licencia declarada se marcan `UNKNOWN` (≡ `UNRESOLVED`; nunca inferida; `NOASSERTION`/`NONE`/`LicenseRef-*` → `UNKNOWN`).

## 4. Flujos Alternativos y de Excepción
- **A (SBOM malformado o formato no soportado)**: fallo cerrado con error explícito; no se usan datos parciales.
- **B (Ruta fuera de la raíz del proyecto)**: rechazada (path traversal).
- **C (SBOM y resolución local discrepan)**: prevalece SIEMPRE la resolución local; el SBOM nunca la sobrescribe.
- **D (SBOM vacío)**: error `ERR_SBOM_EMPTY`.

## 5. Restricciones No Funcionales
- Offline, determinista, límite de tamaño de archivo (50 MiB), componentes (100 000) y profundidad JSON (64); sin ejecución de código del SBOM.

## open-questions
- Resuelta (decisión final del Product Owner, 2026-11-13): el SBOM solo rellena huecos (merge, local primero); nunca sustituye ni sobrescribe la resolución local.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-056-SCA-SBOM-INGESTION @automated @sca
Feature: Ingesta de SBOM CycloneDX/SPDX pre-generados
  As a DevSecOps engineer
  I want to ingest a pre-generated SBOM
  So that Gate 6 audits dependencies and licenses from the build output

  @nominal
  Scenario Outline: SBOM válido alimenta Gate 6
    Given a dependency "com.acme:lib" UNRESOLVED locally and a valid "<format>" SBOM declaring "pkg:maven/com.acme/lib@1.0" with license "Apache-2.0"
    When the SCA scan ingests the SBOM
    Then the dependency "com.acme:lib" is audited with license "Apache-2.0" and provenance "sbom-declared"

    Examples:
      | format    |
      | CycloneDX |
      | SPDX      |

  @boundary
  Scenario: Componente sin licencia declarada
    Given a valid CycloneDX SBOM with a component lacking licenses
    When the SCA scan ingests the SBOM
    Then the component license is "UNKNOWN"

  @nominal
  Scenario: La resolución local prevalece sobre el SBOM
    Given a dependency resolved locally as "MIT" and an SBOM declaring "GPL-3.0" for it
    When the SCA scan ingests the SBOM
    Then the license remains "MIT"

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
      | empty_components        | ERR_SBOM_EMPTY             |
```

## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **0.1.0** | 2026-11-12 | agent-product-analyst | Definición inicial (issue #161, cambio C) | CHG-056-SCA-SBOM-INGESTION |


