---
id: DSG-CHG-038-SECURITY-SUPPRESSION-AUDIT
type: spec-design
change-id: CHG-038-SECURITY-SUPPRESSION-AUDIT
title: "Diseño Técnico: Supresiones Auditadas de Seguridad con Expiración e Inventario"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-038-SECURITY-SUPPRESSION-AUDIT"
architecture-component: "CMP-CORE"
architecture-components:
  - CMP-CORE
  - CMP-CLI
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
citations:
  - id: UC-038-SECURITY-SUPPRESSION-AUDIT
    digest: sha256:4bfdc0357beb279b2c3bc2c5002c8b2ccb585cb0a7ca4c61bb874abf6f6a5fd8
    comment: Citación de use-case (Supresiones Auditadas con Caducidad e Inventario de Excepciones de Seguridad)
  - id: FR-038-SECURITY-SUPPRESSION-AUDIT-001
    digest: sha256:0723aa1776e8816f5841912cc7f3d6c9c2e2b6dd7238ff3d790c92ba0e8f5492
    comment: Citación de requirement (Validación de Supresiones Auditadas con Expiración y Generación de SUPPRESSIONS_AUDIT.md)
---

# Diseño Técnico: CHG-038-SECURITY-SUPPRESSION-AUDIT

## 1. Mapeo Arquitectónico y Enclave Zero Trust
La validación y auditoría de excepciones de seguridad reside en el motor de análisis estático (`CMP-CORE`, enclave `SEC-ENC-DMZ`) consumido por el comando de verificación de la CLI (`CMP-CLI`).

## 2. Contratos de Datos e Interfaces
Se define el tipo de datos `SecuritySuppression`:
- `kind`: `'sast' | 'secret'`
- `ruleId`: `string` (opcional/específico o genérico)
- `reason`: `string` (obligatorio)
- `expires`: `string` (ISO `YYYY-MM-DD`, obligatorio)
- `approvedBy`: `string` (email o identificador institucional, obligatorio)
- `status`: `'active' | 'expired' | 'invalid'`
- `filePath`: `string`
- `lineNumber`: `number`
- `rawComment`: `string`

Se introducen las funciones en `@ai-sdlc/core`:
- `parseSecuritySuppression(line: string, filePath: string, lineNumber: number, referenceDate?: Date): SecuritySuppression | null`
- `validateSecuritySuppression(suppression: SecuritySuppression): boolean`
- `generateSuppressionsAuditReport(suppressions: SecuritySuppression[]): string`

## 3. Comportamiento en Motores SAST y Secrets
- Si se detecta un patrón de supresión (`ai-sdlc:allow-sast` o `ai-sdlc:allow-secret`):
  - Se extraen atributos mediante regex estructurado: `rule="([^"]+)"`, `reason="([^"]+)"`, `expires="([^"]+)"`, `approved-by="([^"]+)"`.
  - Si falta `reason`, `expires` o `approved-by`, o si se usan formatos informales (`nosec`), el estado es `invalid`. La excepción NO se concede y el hallazgo se mantiene.
  - Si `expires < now` (comparado contra medianoche del día local o UTC), el estado es `expired`. La excepción NO se concede y bloquea el Quality Gate.
  - Si los metadatos son válidos y la fecha es futura, el estado es `active` y el hallazgo se silencia.
- Se consolidan las supresiones detectadas en el resultado y se genera el archivo `reports/SUPPRESSIONS_AUDIT.md`.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Todas las librerías empleadas son nativas de TypeScript/Node.js, sin dependencias externas de terceros.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-10-23 | agent-developer / human-dev | Diseño técnico formal de supresiones auditadas | CHG-038-SECURITY-SUPPRESSION-AUDIT |
