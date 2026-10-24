---
id: FR-038-SECURITY-SUPPRESSION-AUDIT-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: "Validación de Supresiones Auditadas con Expiración y Generación de SUPPRESSIONS_AUDIT.md"
status: active
category: functional
derives-from:
  - UC-038-SECURITY-SUPPRESSION-AUDIT
verifiable-by: cucumber-bdd
acceptance-format: gherkin
cucumber-tags:
  - "@FR-038-SECURITY-SUPPRESSION-AUDIT-001"
  - "@automated"
supersedes: null
superseded-by: null
---

# FR-038-SECURITY-SUPPRESSION-AUDIT-001: Validación de Supresiones Auditadas con Expiración

## 1. Enunciado Normativo
Los motores de verificación de seguridad SAST y escaneo de credenciales DEBEN validar estrictamente los comentarios de supresión inline:
1. **Formato Obligatorio Estandarizado**: Los comentarios DEBEN cumplir con la estructura `// ai-sdlc:allow-sast rule="<ID>" reason="<TEXT>" expires="YYYY-MM-DD" approved-by="<ID>"` o su equivalente para secretos `// ai-sdlc:allow-secret rule="<ID>" reason="<TEXT>" expires="YYYY-MM-DD" approved-by="<ID>"`.
2. **Campos Requeridos**: Todo comentario de supresión DEBE contener obligatoriamente `reason`, `expires` (formato de fecha ISO `YYYY-MM-DD`) y `approved-by`. Supresiones sin estos campos o con formatos informales (`nosec`) son rechazadas.
3. **Control de Expiración en Tiempo Real**: Si la fecha `expires` es anterior a la fecha actual del sistema, la excepción se considera caducada y el hallazgo de seguridad debe bloquear el gate con código de salida 1.
4. **Inventario de Auditoría Consolidado**: Toda ejecución de verificación de seguridad DEBE generar o actualizar el reporte `reports/SUPPRESSIONS_AUDIT.md` detallando el censo de excepciones activas, caducadas e inválidas.

---

## 2. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@FR-038-SECURITY-SUPPRESSION-AUDIT-001 @automated @regression
Feature: Supresiones Auditadas con Expiración e Inventario
  @nominal
  Scenario: Supresión válida con fecha futura es aceptada y silencia el hallazgo
    Given una línea de código con un hallazgo de seguridad y una supresión válida con fecha futura
    When se ejecuta la verificación de seguridad
    Then el hallazgo es tolerado como supresión activa
    And la supresión queda registrada en "reports/SUPPRESSIONS_AUDIT.md"

  @boundary
  Scenario: Supresión con formato incompleto o informal es rechazada
    Given una línea de código con un hallazgo de seguridad y una supresión sin campo expires o approved-by
    When se ejecuta la verificación de seguridad
    Then la supresión es clasificada como inválida
    And el hallazgo de seguridad permanece activo bloqueando el gate

  @invalid
  Scenario: Supresión con fecha de expiración vencida bloquea el Quality Gate
    Given una línea de código con un hallazgo de seguridad y una supresión con fecha de caducidad pasada
    When se ejecuta la verificación de seguridad
    Then la supresión es identificada como expirada
    And el Quality Gate de seguridad falla inmediatamente con código de salida 1
```

---

## 3. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-23 | agent-system-architect | Especificación formal de supresiones auditadas de seguridad | CHG-038-SECURITY-SUPPRESSION-AUDIT |
