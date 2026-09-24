---
id: ARCH-CROSS-001
type: cross-cutting-concepts
title: "08. Conceptos Transversales de Arquitectura"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 8
naf-perspective: "Information & Security"
data-models:
  - DATA-MODEL-001
security-enclaves:
  - SEC-ENC-DMZ-001
security-policies:
  - SEC-POL-TLS-001
supersedes: null
superseded-by: null
---

# 08. Conceptos Transversales (arc42 Sec. 8 / NAF Information & Security)

## 1. Concepto de Seguridad Transversal y Modelo Zero Trust
Describe el enfoque global de seguridad, autenticación, autorización y aislamiento en enclaves (`SEC-ENC-*`):

### 1.1 Identidad y Autenticación de Máquina a Máquina (M2M)
- Toda comunicación entre servicios requiere autenticación mutua (mTLS) con certificados x509 rotados periódicamente.
- Las claves privadas están custodiadas en enclaves seguros (TPM, HSM o gestores de secretos centralizados).

### 1.2 Políticas de Seguridad Vinculantes (`SEC-POL-*`)
| ID Política | Ámbito | Descripción del Control |
| :--- | :--- | :--- |
| `SEC-POL-TLS-001` | Comunicaciones en Red | TLS 1.3 mandatorio con suites de cifrado modernas (ECDHE-ECDSA-AES256-GCM) |
| `SEC-POL-ZERO-LEAK`| Datos en Reposo | Cifrado AES-256 en volumen y enmascaramiento estricto de PII en logs |

---

## 2. Modelos de Datos y Esquemas Transversales (`DATA-*`)
Especifica los esquemas de intercambio e interfaces canónicas:

| ID Modelo | Formato / Esquema | Ruta de la Especificación | Propósito |
| :--- | :--- | :--- | :--- |
| `DATA-SCHEMA-001` | JSON Schema / OpenAPI 3.1 | `docs/architecture/08_cross_cutting/data_models/api.json` | Contrato de API externa |
| `DATA-EVENT-002`  | AsyncAPI / Protobuf | `docs/architecture/08_cross_cutting/data_models/events.yaml`| Eventos asíncronos internos |

---

## 3. Observabilidad, Métricas y Auditoría Inmutable
- **Trazabilidad Distribuida**: Inyección de encabezados W3C Trace Context (`traceparent`) a través de OpenTelemetry.
- **Métricas Operativas**: Exposición de métricas RED (Rate, Errors, Duration) en formato Prometheus.
- **Logs Estructurados**: Formato JSON determinista con campos obligatorios (`timestamp`, `level`, `trace_id`, `component_id`).

---

## 4. Historial de Revisiones y Control de Versiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Definición inicial de conceptos transversales | CHG-ARCH-001 |
