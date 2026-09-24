---
id: ARCH-QUAL-001
type: quality-requirements
title: "10. Requerimientos de Calidad y Árbol de Calidad"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 10
naf-perspective: "Quality Perspective"
cites-quality-requirements:
  - QR-LATENCY-001
  - QR-AVAILABILITY-001
  - QR-MAINTAINABILITY-001
supersedes: null
superseded-by: null
---

# 10. Requerimientos de Calidad (arc42 Sec. 10 / NAF Quality)

## 1. Árbol de Calidad (Quality Tree)
Estructura jerárquica de los atributos de calidad clave del sistema según la norma ISO/IEC 25010:

```mermaid
graph TD
    QualityTree[Calidad del Sistema] --> Performance[Eficiencia de Desempeño]
    QualityTree --> Reliability[Fiabilidad y Resiliencia]
    QualityTree --> Security[Seguridad Zero Trust]
    QualityTree --> Maintainability[Mantenibilidad As-Code]

    Performance --> P1[Latencia en Tiempo Real: QR-LATENCY-001]
    Reliability --> R1[Disponibilidad 99.99%: QR-AVAILABILITY-001]
    Security --> S1[Autenticación Estricta: SEC-REQ-AUTH-001]
    Maintainability --> M1[Complejidad Ciclomática <= 10: quality-policy.yaml]
```

---

## 2. Escenarios de Calidad Evaluables (Quality Scenarios)
Definición de escenarios concretos con estímulo, entorno, respuesta y medida:

| ID Requerimiento | Atributo ISO | Estímulo y Entorno | Respuesta del Sistema | Medida Objetiva |
| :--- | :--- | :--- | :--- | :--- |
| `QR-LATENCY-001` | Rendimiento | Carga pico de 10,000 req/s | Procesamiento y persistencia en cola | Latencia p95 < 50ms |
| `QR-AVAILABILITY-001` | Fiabilidad | Caída abrupta de 1 nodo trabajador | Redistribución automática de pods | Pérdida de servicio = 0s |
| `QR-MAINTAINABILITY-001`| Mantenibilidad | Refactorización de submódulos | Ejecución de Release Gates deterministas | CC $\le 10$, LOC $\le 40$ |

---

## 3. Historial de Revisiones y Control de Versiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Definición inicial del árbol de calidad | CHG-ARCH-001 |
