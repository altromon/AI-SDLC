---
id: UC-051-REGULATORY-COMPLIANCE-BUNDLE
type: use-case
title: Generación del paquete de evidencia de cumplimiento normativo (EU AI Act, ISO/IEC 42001, NIST SSDF)
status: active
version: 1.0.0
schema-version: '1.0'
primary-actor: ACT-DEVSECOPS-ENGINEER
supporting-actors:
  - ACT-AI-AGENT
  - ACT-COMPLIANCE-AUDITOR
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---


# UC-051-REGULATORY-COMPLIANCE-BUNDLE: Generación del paquete de evidencia de cumplimiento normativo

## 1. Intención y Resultado
Exportar un paquete consolidado y criptográficamente verificable de evidencias de auditoría y cumplimiento normativo (`reports/audit-evidence-bundle.json`) generado a partir de las 12 Quality Gates de AI-SDLC. El paquete mapea automáticamente los resultados hacia los marcos regulatorios internacionales: EU AI Act (Artículos 9 a 15 sobre gestión de riesgos, gobernanza de datos, documentación técnica, registro de eventos, transparencia, supervisión humana, precisión, robustez y ciberseguridad), ISO/IEC 42001 (Sistema de Gestión de Inteligencia Artificial) y NIST SSDF (SP 800-218). La estructura del bundle integra el modelo de resultados de evaluación NIST OSCAL (Open Security Controls Assessment Language) y atestaciones in-toto con firmas o sellos deterministas de procedencia.

## 2. Precondiciones
- El repositorio cuenta con especificaciones de producto, arquitectura, tareas y verificaciones ejecutables de AI-SDLC.
- Las herramientas de inspección y Quality Gates (`aisdlc verify *`) están disponibles para generar o recopilar telemetría de verificación.
- En entornos CI/CD desatendidos, el sistema opera con atestaciones basadas en OIDC/keyless o firmas deterministas en modo dry-run cuando no existan claves locales privadas.

## 3. Flujo Principal (Nominal)
1. El usuario u operador CI invoca el comando `aisdlc report compliance`.
2. El sistema recopila los resultados de las 12 Quality Gates de AI-SDLC (Quality, Traceability, Governance, Testing, Gherkin, Licenses, PDaC, Schemas, Duplicates, Security, Privacy, Friction).
3. El motor de mapeo normativo correlaciona cada evidencia con los controles correspondientes:
   - **EU AI Act**: Art. 9 (Gestión de riesgos), Art. 10 (Gobernanza de datos), Art. 11 (Documentación técnica), Art. 12 (Registro automático de eventos / logs), Art. 13 (Transparencia e información), Art. 14 (Supervisión humana), Art. 15 (Precisión, robustez y ciberseguridad).
   - **ISO/IEC 42001**: Cláusulas de gobernanza de ciclo de vida, evaluación de impacto y controles de IA.
   - **NIST SSDF (SP 800-218)**: Prácticas de desarrollo seguro de software (PO, PS, PW, RV).
4. El sistema estructura las evaluaciones bajo el estándar NIST OSCAL `assessment-results` y genera una atestación in-toto v1 conteniendo los sujetos, predicados de verificación y hashes SHA-256 canónicos.
5. Se escribe el archivo consolidado en `reports/audit-evidence-bundle.json`.
6. El comando finaliza con código de salida 0 y un resumen de cumplimiento emitido en salida estándar.

## 4. Flujos Alternativos y de Excepción
- **Flujo Alternativo (CI/CD Headless sin claves locales)**:
  - Cuando no se proporcionan claves criptográficas privadas locales ni tokens KMS, el comando detecta el contexto CI y emite la atestación in-toto con firma OIDC/keyless (Cosign/Sigstore) o modo determinista reproducible, registrando el digest SHA-256 canónico del bundle sin fallar por ausencia de clave privada física.
- **Flujo de Excepción (Flags inválidas o Quality Gates no ejecutadas/fallidas con política estricta)**:
  - Si se especifican opciones no reconocidas, o si se activa el modo estricto (`--strict`) y faltan reportes/gates obligatorios o existen violaciones bloqueantes, el comando aborta inmediatamente con código de salida 1 y un diagnóstico claro en `stderr`.

## 5. Restricciones No Funcionales
- **Formato Estándar**: Estricto apego a esquemas JSON de NIST OSCAL (versión 1.0.0+) e in-toto Attestation Framework (v1.0).
- **Determinismo y Reproducibilidad**: Ordenamiento canónico de claves JSON y colecciones para garantizar hashes SHA-256 idempotentes en entornos idénticos.
- **Rendimiento**: Generación del bundle completo en menos de 5 segundos en repositorios estándar cuando los reportes previos ya han sido calculados.

## 6. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-051-REGULATORY-COMPLIANCE-BUNDLE @automated @compliance
Feature: Generación del paquete de evidencia de cumplimiento normativo
  As a DevSecOps engineer or compliance auditor
  I want to generate a consolidated regulatory compliance evidence bundle
  So that adherence to EU AI Act, ISO/IEC 42001, and NIST SSDF is provable and machine-verifiable

  @nominal
  Scenario: Generación exitosa del paquete de evidencia normativo consolidado
    Given un repositorio con verificaciones de Quality Gates de AI-SDLC ejecutadas
    When se ejecuta el comando "aisdlc report compliance"
    Then se genera el archivo "reports/audit-evidence-bundle.json" con formato JSON válido
    And el paquete contiene componentes NIST OSCAL assessment-results y atestación in-toto v1
    And las evidencias cubren los requisitos de EU AI Act Art 9-15, ISO/IEC 42001 y NIST SSDF

  @boundary
  Scenario: Ejecución en entorno CI/CD headless sin claves criptográficas locales
    Given un entorno de integración continua sin claves privadas locales configuradas
    When se ejecuta "aisdlc report compliance --keyless"
    Then la atestación se genera utilizando identidad OIDC keyless o firma determinista reproducible
    And el comando finaliza con código de salida 0

  @invalid
  Scenario Outline: Manejo de errores por parámetros inválidos o reportes incompletos
    Given una invocación del generador de cumplimiento con condición inválida "<invalid_condition>"
    When se ejecuta el comando de reporte de cumplimiento
    Then el proceso finaliza con código de salida 1 y un mensaje de diagnóstico descriptivo "<error_diagnostic>"

    Examples:
      | invalid_condition        | error_diagnostic               |
      | flag_desconocida_--foo   | unknown option '--foo'         |
      | strict_con_gates_faltantes | ERR_MISSING_REQUIRED_EVIDENCE |
```


## Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-11 | AI-SDLC Integration Engine | Implementación verificada (TSK-001, TSK-002, TSK-003, TSK-004, TSK-005) | chg-051-regulatory-compliance-bundle |
