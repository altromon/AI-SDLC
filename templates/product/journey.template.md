---
id: JRN-NOMBRE-001
type: journey
title: Título Descriptivo del Journey de Usuario u Operador
status: draft
version: "1.0.0"
schema-version: "1.0"
persona: ACT-OPERADOR-001
stages:
  - "Descubrimiento y Planificación"
  - "Configuración y Pre-vuelo"
  - "Ejecución de Misión"
  - "Análisis Posterior y Cierre"
touchpoints:
  - "Portal web de planificación de misiones"
  - "Estación de control en tierra (GCS)"
  - "Panel de telemetría en tiempo real"
  - "Exportador de reportes de vuelo"
related-use-cases:
  - UC-PLANIFICAR-MISION-001
  - UC-MONITOREAR-VUELO-001
pain-points:
  - "Latencia en la carga de mapas de navegación sin conexión"
  - "Complejidad en la reconciliación manual de planes de vuelo"
supersedes: null
superseded-by: null
---

# JRN-NOMBRE-001: Título Descriptivo del Journey de Usuario u Operador

## 1. Perfil del Actor / Persona Principal
- **Actor Protagonista**: `ACT-OPERADOR-001`
- **Objetivo Principal**: Completar el flujo operativo con alta eficiencia, seguridad y visibilidad en tiempo real.

---

## 2. Mapa de Etapas del Journey

| Etapa | Objetivo del Usuario | Puntos de Contacto (Touchpoints) | Fricciones / Pain Points |
| :--- | :--- | :--- | :--- |
| **1. Descubrimiento y Planificación** | Diseñar la ruta y validar restricciones operativas | Portal web de planificación de misiones | Complejidad en la reconciliación manual de planes de vuelo |
| **2. Configuración y Pre-vuelo** | Verificar estado de los subsistemas y enlace | Estación de control en tierra (GCS) | Latencia en la carga de mapas de navegación sin conexión |
| **3. Ejecución de Misión** | Supervisar telemetría y responder a alertas | Panel de telemetría en tiempo real | Ninguna detectada en flujo nominal |
| **4. Análisis Posterior y Cierre** | Exportar logs de misión y métricas de desempeño | Exportador de reportes de vuelo | Tiempos de consolidación de telemetría |

---

## 3. Trazabilidad a Casos de Uso y Producto

- `UC-PLANIFICAR-MISION-001`: Planificación y validación de corredores seguros.
- `UC-MONITOREAR-VUELO-001`: Ingesta y visualización de telemetría en tiempo real.

---

## 4. Historial de Revisiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-23 | Product Manager / UX Lead | Definición inicial del journey del operador | CHG-INIT-001 |
