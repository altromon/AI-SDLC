---
id: DSG-CHG-037-SDD-INTEGRATE-CONCURRENCY
type: spec-design
change-id: CHG-037-SDD-INTEGRATE-CONCURRENCY
title: "Diseño Técnico: Control de Concurrencia y Reintentos en sdd-integrate-on-merge"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-037-SDD-INTEGRATE-CONCURRENCY"
architecture-component: "CMP-CORE"
architecture-components:
  - CMP-CORE
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
citations:
  - id: UC-037-SDD-INTEGRATE-CONCURRENCY
    comment: Caso de uso origen para control de concurrencia y reintentos en sdd-integrate
  - id: FR-037-SDD-INTEGRATE-CONCURRENCY-001
    comment: Requerimiento funcional canónico asociado
---

# Diseño Técnico: CHG-037-SDD-INTEGRATE-CONCURRENCY

## 1. Mapeo Arquitectónico y Enclave Zero Trust
La sincronización canónica automatizada post-merge se materializa en los flujos de trabajo de CI/CD (`.github/workflows/sdd-integrate-on-merge.yml`), las plantillas base en `templates/ci/github-workflows/sdd-integrate-on-merge.yml` y las constantes embebidas en `@ai-sdlc/core` (`CMP-CORE`, enclave `SEC-ENC-DMZ`).

## 2. Decisiones Técnicas y Mecanismos de Sincronización
1. **Grupo de Concurrencia Serializado por Rama Destino**:
   - `group: sdd-integrate-${{ github.event.pull_request.base.ref || github.ref_name }}`
   - `cancel-in-progress: false`
   - Esto agrupa todas las ejecuciones dirigidas a una misma rama (ej. `main`), garantizando su ejecución en cola y evitando ejecuciones paralelas descoordinadas.
2. **Estrategia Pull & Rebase con Retroceso Exponencial**:
   - Previo a cada intento de push, ejecutar `git pull --rebase origin "$TARGET_BRANCH"`.
   - Si el push es rechazado por un cambio concurrente en el remoto, reintentar hasta 3 veces con retroceso exponencial (`DELAY=2`, duplicándose tras cada fallo).
3. **Sincronización en Plantillas y Generación**:
   - Actualizar `.github/workflows/sdd-integrate-on-merge.yml`.
   - Actualizar `templates/ci/github-workflows/sdd-integrate-on-merge.yml`.
   - Actualizar `STARTER_GITHUB_SDD_INTEGRATE` en `packages/core/src/init/index.ts`.
   - Re-ejecutar `scripts/generate-starters.ts` para mantener la sincronía con `starter-templates.ts`.
