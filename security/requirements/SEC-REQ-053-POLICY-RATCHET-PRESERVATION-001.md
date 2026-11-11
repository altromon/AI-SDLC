---
id: SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001
type: security-requirement
title: Invariante Ratchet de No Degradación en Sincronización de Políticas de Seguridad
status: active
version: 1.0.0
schema-version: '1.0'
security-domain: authorization
mitigates-abuse-case:
  - ABUSE-053-SILENT-SECURITY-POLICY-DOWNGRADE-001
compliance-references:
  - OWASP-ASVS-V1.1
  - OWASP-ASVS-V10.3
  - NIST-SSDF-PO.3
acceptance-format: gherkin
cucumber-tags:
  - '@SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001'
  - '@security'
  - '@mitigation'
  - '@migrate'
  - '@ratchet-preservation'
supersedes: null
superseded-by: null
---

# SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001: Invariante Ratchet de No Degradación de Políticas

## 1. Enunciado del Control Técnico
Al actualizar o fusionar archivos de políticas de gobernanza (`quality-policy.yaml`, `license-policy.yaml`, `privacy-policy.yaml`, `dlp-policy.yaml`), incluso cuando se suministre la opción explícita `--force`, el sistema DEBE aplicar la invariante de preservación ratchet (regla de no relajación de seguridad):
1. **Invariante Ratchet con Validación Estricta de Tipos**: Si la configuración local del usuario define umbrales más estrictos que la plantilla canónica entrante (por ejemplo, cobertura mínima de pruebas requerida del 90% frente al 80% estándar, o complejidad ciclomática máxima de 10 frente a 15), el sistema DEBE retener el umbral más estricto del usuario y jamás relajarlo automáticamente. Para prevenir evasiones por coerción de tipos o valores no numéricos (`NaN`, strings, objetos malformados), el evaluador DEBE validar estrictamente los tipos antes de comparaciones relacionales y fallar cerrado con `ERR_INVALID_POLICY_FORMAT` ante cualquier valor no tipado o corrupto. En listas de licencias bloqueadas y permitidas, los identificadores SPDX DEBEN normalizarse a mayúsculas antes de calcular uniones o intersecciones para evitar bypasses por discrepancia de mayúsculas/minúsculas.
2. **Preservación de Reglas Personalizadas de DLP y Privacidad**: Las reglas locales adicionales de detección de secretos, patrones regex de PII o definiciones de activos de datos (`DATA-ASSET-*`) DEBEN ser preservadas y combinadas aditivamente (union merge), impidiendo que una sincronización canónica elimine protecciones locales específicas.
3. **Bloqueo de Degradación sin Autorización Expresa**: Si un intento de sincronización requiere de forma forzosa reducir un nivel de protección de una política crítica de seguridad o gobernanza, la CLI DEBE emitir una advertencia de riesgo alto y requerir un flag de confirmación inequívoca adicional (`--allow-policy-downgrade`), abortando por defecto con código de salida `1`.

---

## 2. Trazabilidad Upstream y Mitigación

| Dimensión | Enlace / Artefacto | Tipo de Relación | Estado |
| :--- | :--- | :--- | :--- |
| **Abuse Case (Upstream)** | `ABUSE-053-SILENT-SECURITY-POLICY-DOWNGRADE-001` | Mitigates Abuse Case | Validated |
| **Use Case (Product)** | `UC-053-CLI-MIGRATE` | Governs Use Case | Validated |
| **Requisito Funcional** | `FR-053-CLI-MIGRATE-001` | Enforces Security | Validated |

---

## 3. Criterios de Mitigación en Formato Gherkin (Cucumber Security Tests)

```gherkin
@SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001 @security @mitigation @migrate @ratchet-preservation
Feature: Invariante Ratchet de No Degradación de Políticas de Seguridad
  As a Security Officer
  I want aisdlc migrate to preserve stricter local enterprise governance thresholds during migrations
  So that standard templates cannot accidentally relax security and quality requirements

  Scenario: Preservación de umbral de cobertura de código más estricto que el canónico
    Given a local "quality-policy.yaml" with code coverage threshold set to 95 percent
    And an incoming canonical template with standard coverage threshold of 80 percent
    When the migration is executed to synchronize policy templates
    Then the merged "quality-policy.yaml" must retain the stricter 95 percent coverage threshold
    And the relaxed canonical threshold of 80 percent is rejected

  Scenario: Fusión aditiva de patrones locales de DLP y prevención de fugas
    Given a local "dlp-policy.yaml" containing custom proprietary API key patterns
    When the canonical policy update adds new upstream token patterns
    Then the resulting policy must combine upstream patterns while keeping all local custom rules
    And no existing custom DLP inspection pattern is removed

  Scenario: Bloqueo de degradación forzosa sin bandera de confirmación inequívoca
    Given a migration configuration that would relax a blocked license category in "license-policy.yaml"
    When the command is executed with "--force" but without "--allow-policy-downgrade"
    Then the policy downgrade operation is blocked with diagnostic "ERR_SECURITY_POLICY_DOWNGRADE_BLOCKED"
    And the command exits with exit code 1
```

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | agent-threat-modeler | Especificación de invariante ratchet de no degradación de políticas en migración | CHG-053-CLI-MIGRATE |
