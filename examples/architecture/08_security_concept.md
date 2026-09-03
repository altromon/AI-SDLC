# 08. Concepto de Seguridad Transversal (arc42 Sec. 8 / NAF Security)

## 1. Arquitectura Zero Trust y Modelo de Identidad
SentinelCore aplica un modelo Zero Trust en todas sus interfaces de red:
- **Identidad de Máquina a Máquina (M2M)**: Cada dron posee un elemento seguro TPM / Secure Element que custodia la clave privada de su certificado x509.
- **Autenticación Mutua (mTLS)**: Se impone TLS 1.3 con suites de cifrado modernas (ECDHE-ECDSA-AES256-GCM-SHA384).
- **Aislamiento en Enclaves**:
  - `SEC-ENC-DMZ-INGEST`: Gestiona la terminación mTLS y el parsing binario.
  - Si un pod de ingesta es comprometido, las reglas de red impiden el acceso lateral al plano de control de vuelos.

## 2. Protección de Datos y No Repudio
- Toda trama recibida se firma y se serializa con un timestamp inmutable antes de ingresar al topic de auditoría.
