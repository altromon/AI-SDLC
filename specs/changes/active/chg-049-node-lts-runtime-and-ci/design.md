---
id: DSG-CHG-049-NODE-LTS-RUNTIME-AND-CI
type: spec-design
change-id: CHG-049-NODE-LTS-RUNTIME-AND-CI
title: "Diseño Técnico: Node LTS Runtime and CI Alignment"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-049-NODE-LTS-RUNTIME-AND-CI"
architecture-component: "CMP-CORE"
enclave: "SEC-ENC-DMZ"
status: draft
contracts: []
citations:
  - id: UC-030-INIT-AGENT-SCAFFOLDING
    digest: sha256:cab2aae26204d8a004f782c6a83535806d6cd9ca9aa8dc44152f136999d47f54
    comment: Citación de use-case (Scaffolding de Reglas de Agente en Inicialización de Proyecto)
  - id: FR-030-INIT-AGENT-SCAFFOLDING-001
    digest: sha256:cc12da31168cd033ac7d4752a8eecef01736190a9a12ae600d0775169fd1f88c
    comment: Requerimiento derivado de UC-030-INIT-AGENT-SCAFFOLDING
---

# Diseño Técnico: CHG-049-NODE-LTS-RUNTIME-AND-CI

## 1. Mapeo Arquitectónico y Enclave Zero Trust
Este cambio actualiza la configuración de runtime y toolchain en `CMP-CORE` y `CMP-CLI`, formalizando la restricción arquitectónica `CON-TECH-002` (*Execution on Node.js LTS 20+ and deterministic packaging with pnpm*) y alineando los pipelines de CI (`.github/workflows/ci.yml`) y las plantillas de andamiaje generadas por `aisdlc init`.

```mermaid
flowchart TD
    subgraph CI["GitHub Actions Pipeline (.github/workflows/ci.yml)"]
        Node20["Node 20.x (Maintenance LTS)"]
        Node22["Node 22.x (Active LTS)"]
    end

    subgraph Toolchain["Monorepo Toolchain (pnpm 10)"]
        Engines["package.json engines: >=20.0.0"]
        Core["@aisdlc/core (CMP-CORE)"]
        CLI["@aisdlc/cli (CMP-CLI)"]
    end

    Node20 --> Engines
    Node22 --> Engines
    Engines --> Core
    Engines --> CLI
```

## 2. Contratos de Datos e Interfaces
- **Configuración de Manifiesto (`package.json`)**:
  ```json
  "engines": {
    "node": ">=20.0.0"
  }
  ```
- **Matriz de CI (`.github/workflows/ci.yml` y `templates/ci/github-workflows/ci.yml`)**:
  ```yaml
  strategy:
    matrix:
      node-version: [ 20.x, 22.x ]
  ```

## 3. Protocolos de Manejo de Errores y Mitigación
- La ejecución en entornos con Node.js < 20.0.0 emitirá las advertencias de compatibilidad `EBADENGINE` de los gestores de paquetes estándar (`pnpm`, `npm`).
- El step de subida SARIF a GitHub Code Scanning en CI permanece condicionado a la versión Active LTS (`matrix.node-version == '22.x'`).

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
Cero dependencias adicionales añadidas o modificadas. Pleno cumplimiento de `license-policy.yaml`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-11-01 | Alfonso Troyano | Diseño técnico para alineación a Node 20 y 22 LTS | CHG-049-NODE-LTS-RUNTIME-AND-CI |
