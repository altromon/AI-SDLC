---
id: ARCH-CTX-001
type: context-and-scope
title: "03. Contexto y Alcance del Sistema"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 3
naf-perspective: "Operational Perspective"
operational-exchanges:
  - OIE-CANAL-001
context-boundaries:
  - CTX-PERIMETER-001
supersedes: null
superseded-by: null
---

# 03. Contexto y Alcance (arc42 Sec. 3 / NAF Operational)

## 1. Contexto de Negocio (Business Context)
Modela los límites conceptuales del sistema respecto a los usuarios, sistemas externos colaboradores y fuentes de datos externas.

### 1.1 Diagrama de Contexto de Negocio
```mermaid
graph LR
    User[Actor / Usuario Final] -->|Petición de Servicio| System([Sistema AI-SDLC])
    System -->|Consulta / Enriquecimiento| ExtService[Sistema Externo / API Partner]
    System -->|Registro de Auditoría| SIEM[Sistema SIEM / Auditoría]
```

### 1.2 Intercambios de Información Operativa (`OIE-*`)
| ID Intercambio | Origen / Destino | Carga Útil / Mensaje | Protocolo / Canal | Formato |
| :--- | :--- | :--- | :--- | :--- |
| `OIE-COMM-001` | Usuario ➔ Sistema | Solicitud de Operación | HTTPS / REST | JSON (Schema v1) |
| `OIE-NOTIF-002`| Sistema ➔ Usuario | Eventos y Notificaciones | WebSocket / WSS | JSON Streaming |
| `OIE-AUDIT-003`| Sistema ➔ SIEM | Trazas Inmutables de Auditoría | Syslog / TLS | RFC 5424 |

---

## 2. Contexto Técnico e Infraestructura Perimetral
Modela los canales físicos y lógicos que cruzan la frontera del sistema (redes DMZ, balanceadores, cortafuegos y proxies inversos).

### 2.1 Diagrama de Contexto Técnico
```mermaid
graph TD
    Client[Cliente / Navegador / App] -->|TLS 1.3 / Port 443| LB[Reverse Proxy / WAF]
    LB -->|mTLS / Red Interna DMZ| Gateway[API Gateway / Ingestión]
    Gateway -->|gRPC / IPC| Core[Servicios de Dominio]
```

---

## 3. Historial de Revisiones y Control de Versiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Definición inicial de contexto y alcance | CHG-ARCH-001 |
