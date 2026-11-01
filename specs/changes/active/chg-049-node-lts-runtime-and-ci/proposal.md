---
id: CHG-049-NODE-LTS-RUNTIME-AND-CI
type: spec-change-proposal
title: "Node LTS Runtime and CI Alignment"
status: draft
author: "Alfonso Troyano"
citations:
  - id: UC-030-INIT-AGENT-SCAFFOLDING
    digest: sha256:cab2aae26204d8a004f782c6a83535806d6cd9ca9aa8dc44152f136999d47f54
    comment: Citación de use-case (Scaffolding de Reglas de Agente en Inicialización de Proyecto)
  - id: FR-030-INIT-AGENT-SCAFFOLDING-001
    digest: sha256:cc12da31168cd033ac7d4752a8eecef01736190a9a12ae600d0775169fd1f88c
    comment: Requerimiento derivado de UC-030-INIT-AGENT-SCAFFOLDING
---

# Propuesta de Cambio: CHG-049-NODE-LTS-RUNTIME-AND-CI

## 1. Motivación y Alcance
En el marco de la inicialización de proyectos y definición de entorno gobernados por `UC-030-INIT-AGENT-SCAFFOLDING` y `FR-030-INIT-AGENT-SCAFFOLDING-001`, la plataforma AI-SDLC mantiene actualmente compatibilidad con Node.js 18 en su manifiesto raíz (`engines.node: >=18.0.0`) y en la matriz de ejecución de GitHub Actions (`ci.yml: [ 18.x, 20.x, 22.x ]`).

Node.js 18 (Hydrogen) alcanzó su Fin de Vida oficial (End-of-Life / EOL) el 30 de abril de 2025, dejando de recibir parches de seguridad y compatibilidad técnica con el toolchain moderno (ej. `pnpm 10`, `vitest` y TypeScript AST tooling). Mantener dicha versión genera sobrecostes computacionales en CI (~33% más tiempo de runner) y contradice la restricción arquitectónica del sistema `CON-TECH-002` (*Execution on Node.js LTS 20+*).

### Alcance
1. **Actualización de Manifiesto**: Restringir `"engines": { "node": ">=20.0.0" }` en `package.json`.
2. **Matriz de Integración Continua**: Actualizar la matriz de `.github/workflows/ci.yml` a `[ 20.x, 22.x ]` (Active LTS y Maintenance LTS), eliminando `18.x`.
3. **Plantillas Starter de Inicialización**: Actualizar las plantillas generadas en `templates/ci/github-workflows/ci.yml` y manuales de soporte para reflejar Node 20+ como línea base.

## 2. Dependencias Externas Evaluadas
- Cero dependencias adicionales. Conforme a `license-policy.yaml`.
