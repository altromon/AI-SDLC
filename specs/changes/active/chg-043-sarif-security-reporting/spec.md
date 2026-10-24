---
id: SPEC-CHG-043-SARIF-SECURITY-REPORTING
type: delivery-spec
change-id: CHG-043-SARIF-SECURITY-REPORTING
profile: standard
acceptance-format: gherkin
cucumber-tags:
  - "@CHG-043-SARIF-SECURITY-REPORTING"
  - "@automated"
---

# Delivery Specification: CHG-043-SARIF-SECURITY-REPORTING

## 1. Functional Behavior Scenarios (BDD Gherkin)

```gherkin
@CHG-043-SARIF-SECURITY-REPORTING @functional @automated
Feature: Generación de Reportes SARIF 2.1.0 para SAST y Secrets
  As a security engineer or automated CI/CD pipeline
  I want security scan results to be emitted in OASIS SARIF 2.1.0 format
  So that findings are automatically ingested by GitHub Advanced Security and enterprise dashboards

  @nominal
  Scenario: Generación exitosa de SARIF consolidado para SAST y Secrets
    Given un resultado de análisis SAST con violaciones y un resultado de escaneo de secretos
    When se invoca el generador generateSecuritySarifReport
    Then el schema del documento es "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json"
    And la versión del documento es "2.1.0"
    And cada resultado contiene uri de artefacto y línea de inicio física
    And las reglas incluyen metadatos y severidades estandarizadas

  @boundary
  Scenario: Reporte SARIF cuando no existen hallazgos de seguridad
    Given un análisis sin violaciones SAST y sin secretos detectados
    When se genera el reporte SARIF
    Then el arreglo results está vacío
    And el veredicto del gate se mantiene conforme

  @invalid
  Scenario: Reporte de violación crítica como nivel error en SARIF
    Given una violación de severidad CRITICAL en SAST o Secretos
    When se mapea la violación a resultado SARIF
    Then el campo level del resultado es "error"
```

## 2. Risk Mitigation & Traceability
- **FR-043-SARIF-SECURITY-REPORTING-001**: Implementado de forma directa.
- **Validación OASIS**: El formato JSON resultante cumple la especificación SARIF 2.1.0.
