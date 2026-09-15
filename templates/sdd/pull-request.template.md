---
id: PR-TEMPLATE-SDD-001
type: pull-request-template
title: "Plantilla Modular de Pull Request AI-SDLC"
version: "1.0.0"
schema-version: "1.0"
status: active
description: "Plantilla institucional para monitorizar puntos débiles y balance del plan (X/O) en entregas SDD"
---

# Pull Request: [TIER] - [ID-CAMBIO] - Título Breve

## 1. Identificación y Trazabilidad SDD

- **Especificación de Cambio SDD**: `specs/changes/active/<change-id>/`
- **Sidecar PDaC Handoff**: `specs/changes/active/<change-id>/handoff.yaml` (ID: `HOF-*`)
- **Nivel en Jerarquía Git (4 Tiers)**:
  - [ ] Tier 4: `task/<PARENT-ID>/<TSK-ID>-<slug>` ➔ `feat/<PARENT-ID>-<slug>`
  - [ ] Tier 3: `feat/<FEAT-ID>-<slug>` ➔ `release/vX.Y.Z`
  - [ ] Tier 2: `release/vX.Y.Z` ➔ `main`
- **Issues Vinculados**: Closes #... / Refs #...

---

## 2. 📋 Matriz de Ejecución del Plan y Estado de Pruebas (`X` vs `O`)

> [!IMPORTANT]
> **Norma de Exhaustividad Total Innegociable**:
> En esta tabla se deben incluir **todos y cada uno de los puntos identificados para implementar** en el plan de entrega (procedentes de `tasks.md`, de la especificación SDD o de los criterios del issue), sin omitir ninguno ni realizar agrupaciones abstractas.
>
> **Convención Obligatoria de Marcado**:
> - **`[X]` (Completado y Probado)**: El ítem está 100% implementado y cuenta con pruebas automatizadas verificables en disco (`tests/` o `.feature`) que pasan en verde.
> - **`[O]` (Problema / Bloqueo)**: Si hubo cualquier problema, limitación técnica, prueba fallida o alcance diferido, se marca obligatoriamente con `[O]` y **es obligatoria su justificación completa**:
>   1. **Causa raíz técnica** o limitación encontrada.
>   2. **Impacto** en el incremento o en el sistema.
>   3. **Mitigación** o justificación de por qué se pospone.
>   4. **Referencia formal** al issue de seguimiento (GitHub Issue o `ADR-TECH-DEBT-*`).
>
> *Cualquier PR con ítems planificados omitidos o con un `[O]` no justificado será bloqueado y rechazado inmediatamente por el Tech Lead.*

| ID Tarea / Ítem | Descripción Planificada | Estado (`[X]` / `[O]`) | Evidencia de Pruebas en Disco o Justificación Obligatoria de `[O]` |
| :--- | :--- | :---: | :--- |
| `TSK-001` | <!-- Ej: Definición de DTOs e Interfaces de Contrato --> | **[X]** | Cubierto en `tests/unit/dto.spec.ts` (100% pass) |
| `TSK-002` | <!-- Ej: Resiliencia ante desconexión de red --> | **[O]** | **Causa raíz:** Mock de socket TCP presenta race conditions en CI.<br>**Impacto:** Bajo en prod, test intermitente.<br>**Mitigación:** Timeout extendido temporal; seguimiento en issue #... |

---

## 3. 🗺️ Mapa de Puntos Débiles y Zonas de Riesgo (Weak Points Hotspots)

### A. Hotspots de Complejidad
<!-- Registrar funciones que rozan los límites de quality-policy.yaml: CC > 7 (máx 10), Cognitiva > 10 (máx 15), LOC > 30 (máx 40), MI < 70 (mín 50/65) -->
| Archivo | Función / Módulo | Métricas (CC / Cognitiva / LOC / MI) | Justificación Técnica de Mantenibilidad |
| :--- | :--- | :---: | :--- |
| <!-- ej: src/engine.ts --> | <!-- parsePayload() --> | CC: 8, Cog: 11, LOC: 32, MI: 72 | Parser determinista sin recursión; testeado exhaustivamente. |

### B. Casos Límite y Puntos Ciegos (Edge Cases)
<!-- Escenarios no cubiertos por tests unitarios automatizados (concurrencia, timeouts de red, memoria, jitter) -->
- [ ] **Caso Límite 1**: <!-- Descripción del escenario, riesgo estimado y mitigación operativa -->
- [ ] **Caso Límite 2**: <!-- Descripción del escenario, riesgo estimado y mitigación operativa -->

### C. Asunciones de la IA (AI Assumptions)
<!-- Comportamientos o heurísticas asumidas por el agente durante la implementación que requieren ojo crítico humano -->
- [ ] **Asunción 1**: <!-- Ej: Se asume que el payload siempre vendrá pre-parseado en UTF-8 -->
- [ ] **Asunción 2**: <!-- Ej: Se definió un timeout por defecto de 5000ms al no estar estipulado en la spec -->

---

## 4. 🛡️ Superficie de Ataque y Ciberseguridad (STRIDE / Zero Trust)

- [ ] **Nuevos Canales Externos**: ¿Introduce endpoints HTTP, sockets, canales IPC o brokers?
- [ ] **Sanitización e Inputs**: ¿Se validan todos los datos externos con esquemas de tipado estricto (Zod/JSON Schema)?
- [ ] **Serialización Insegura**: ¿Se evita deserialización polimórfica o evaluación dinámica de código?
- [ ] **Secretos y Enclaves**: ¿Se manipulan claves, credenciales, variables de entorno sensibles o enclaves (`SEC-ENC-*`)?
- [ ] **Requisitos de Seguridad Mitigados**: IDs implementados (ej. `SEC-REQ-*`) y tests asociados (`SEC-TEST-*` o `.feature`).

---

## 5. 📦 Inspección de Dependencias y Licencias

- **Nuevas Dependencias Añadidas**:
  | Paquete | Versión | Tipo de Licencia | Verificación `license-policy.yaml` |
  | :--- | :---: | :---: | :---: |
  | <!-- ej. zod --> | <!-- ^3.22.4 --> | <!-- MIT --> | <!-- ✔ Conforme (Permisiva) --> |
- [ ] Cero dependencias con licencias prohibidas (GPLv3/AGPL/comerciales no aprobadas).
- [ ] Verificación ejecutada con éxito (`pnpm run verify:licenses`).

---

## 6. ✅ Checklist Determinista de Pre-Vuelo (Release Gates)

- [ ] **Tipado Estricto y Linter**: `pnpm run typecheck` (cero errores, cero supresiones injustificadas).
- [ ] **Quality Gate**: `pnpm run verify:quality` (CC $\le 10$, Cognitiva $\le 15$, MI $\ge 50$, LOC $\le 40$).
- [ ] **Pruebas BDD / Unitarias**: `pnpm run verify:testing` (escenarios Gherkin sincronizados y pasando al 100%).
- [ ] **Trazabilidad 360°**: `pnpm run verify:traceability` (sin requerimientos huérfanos).
- [ ] **Licencias Open Source**: `pnpm run verify:licenses` (cumplimiento estricto de políticas).
- [ ] **Conformidad de Esquemas**: `pnpm run verify:schemas` (100% de artefactos conformes con JSON Schema).
- [ ] **Suite Completa de Tests**: `pnpm run test:all` / `pnpm run verify:all` (visto bueno general de CI).

---

## 7. 🚨 Plan de Contingencia, Observabilidad y Rollback

- **Métricas y Alarmas de Observabilidad**: <!-- ¿Qué métricas (latencia p99, tasa de error 5xx, memoria) o logs deben vigilarse tras el despliegue? -->
- **Procedimiento de Rollback**: <!-- Comando o procedimiento exacto para revertir el cambio sin impacto colateral (ej. git revert -m 1 <sha>) -->
