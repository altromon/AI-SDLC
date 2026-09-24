---
id: ARCH-RUN-001
type: runtime-view
title: "06. Vista de Ejecución y Comportamiento Dinámico"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 6
naf-perspective: "Behaviour & Sequences"
sequences:
  - SEQ-NOMINAL-001
  - SEQ-DEGRADED-002
flows:
  - FLW-LIFECYCLE-001
satisfies-requirements:
  - FR-FUNCIONALIDAD-001
  - SEC-REQ-AUTH-001
supersedes: null
superseded-by: null
---

# 06. Vista de Ejecución / Runtime (arc42 Sec. 6 / NAF Behaviour)

## 1. Escenario Nominal: Flujo Principal de Negocio (`SEQ-NOMINAL-001`)
Describe la orquestación e interacción secuencial de componentes ante una solicitud típica de usuario o evento del sistema:

```mermaid
sequenceDiagram
    autonumber
    actor Client as Cliente Externo (ACT-CLIENT-001)
    participant Gateway as API Gateway (CMP-GATEWAY-001)
    participant Core as Motor de Dominio (CMP-CORE-001)
    participant Storage as Persistencia / DB (CMP-STORAGE-001)

    Client->>Gateway: POST /api/v1/recurso (Token Bearer / mTLS)
    Gateway->>Gateway: Validar esquema de entrada y autenticación
    alt Validación Fallida
        Gateway-->>Client: 400 Bad Request / 401 Unauthorized
    else Entrada Válida
        Gateway->>Core: Invocación in-process / gRPC
        Core->>Core: Ejecución de reglas de negocio
        Core->>Storage: Transacción determinista (INSERT / UPDATE)
        Storage-->>Core: Confirmación (ACK)
        Core-->>Gateway: Resultado de negocio
        Gateway-->>Client: 200 OK con payload de respuesta
    end
```

---

## 2. Escenario de Seguridad / Mitigación de Abusos (`SEQ-SEC-002`)
Modela el comportamiento y el aislamiento ante intentos maliciosos o cargas anómalas:

```mermaid
sequenceDiagram
    autonumber
    actor Attacker as Actor Amenaza (ACT-THREAT-001)
    participant DMZ as Gateway de Ingesta (SEC-ENC-DMZ-001)
    participant SIEM as Auditoría y SIEM (CMP-AUDIT-001)

    Attacker->>DMZ: Petición anómala (sin credenciales o con payload excesivo)
    DMZ->>DMZ: Detección por filtro de validación estricta
    DMZ->>SIEM: Registrar evento de anomalía con IP y fingerprint
    DMZ-->>Attacker: 403 Forbidden / Conexión abortada
```

---

## 3. Matriz de Escenarios Dinámicos y Requerimientos Asociados

| ID Escenario | Tipo | Requerimientos Satisfechos | Componentes Participantes |
| :--- | :---: | :--- | :--- |
| `SEQ-NOMINAL-001` | Nominal | `FR-FUNCIONALIDAD-001` | `CMP-GATEWAY-001`, `CMP-CORE-001` |
| `SEQ-SEC-002` | Seguridad | `SEC-REQ-AUTH-001` | `CMP-GATEWAY-001`, `CMP-AUDIT-001` |

---

## 4. Historial de Revisiones y Control de Versiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Definición inicial de vistas de ejecución | CHG-ARCH-001 |
