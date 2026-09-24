---
id: ARCH-CONSTR-001
type: architecture-constraints
title: "02. Restricciones de Arquitectura"
status: proposed # proposed, accepted, deprecated, superseded
version: "1.0.0"
schema-version: "1.0"
arc42-section: 2
naf-perspective: "Architecture Constraints"
constraints:
  - CON-TECH-001
  - ACON-ORG-001
license-policy: "license-policy.yaml"
supersedes: null
superseded-by: null
---

# 02. Restricciones de Arquitectura (arc42 Sec. 2 / NAF Constraints)

## 1. Restricciones Técnicas Innegociables (`CON-*`)
Limitaciones impuestas por hardware, software base, sistemas operativos, protocolos de red o compatibilidad binaria:

| ID Restricción | Nombre de la Restricción | Descripción y Justificación Técnica |
| :--- | :--- | :--- |
| `CON-TECH-001` | Compatibilidad Multiplataforma | Soporte obligatorio para Linux x86_64, ARM64 y Windows Server |
| `CON-TECH-002` | Runtime y Toolchain Fijada | Ejecución sobre Node.js LTS 20+ y empaquetado determinista con pnpm |
| `CON-TECH-003` | Cero Memoria Dinámica Descontrolada | Límite máximo de consumo de 512 MB por proceso en contenedores |

---

## 2. Restricciones Organizativas y de Proceso (`ACON-*`)
Reglas de gobernanza, normativas institucionales y convenios de equipo:

| ID Restricción | Nombre | Directiva Vinculante |
| :--- | :--- | :--- |
| `ACON-ORG-001` | Gobernanza Git en 4 Tiers | Flujo estricto: task ➔ feat ➔ release ➔ main |
| `ACON-ORG-002` | Soberanía Humana Innegociable | Prohibición estricta de auto-aprobación desatendida de PRs por IA |

---

## 3. Conformidad de Licencias Open Source (`LIC-POL-*`)
Conforme a `license-policy.yaml`:
- **Permisivas (ALLOW)**: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC.
- **Copyleft Débil (REVIEW_REQUIRED)**: LGPL-2.1+, MPL-2.0 (restringidas a enlace dinámico desacoplado).
- **Copyleft Fuerte / Viral (DENY)**: GPLv2, GPLv3, AGPLv3 (estrictamente prohibidas en el árbol de dependencias).

---

## 4. Historial de Revisiones y Control de Versiones

| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-24 | Lead Architect | Definición inicial de restricciones | CHG-ARCH-001 |
