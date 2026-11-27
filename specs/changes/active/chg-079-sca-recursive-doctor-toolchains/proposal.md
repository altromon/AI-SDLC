---
id: CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
type: spec-change-proposal
title: SCA Recursive Multi-Ecosystem & Doctor Native Toolchains
status: draft
author: agent-system-architect
citations:
  - id: UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
    digest: sha256:d0c9e4c3cdbcce64a1ae31b343b579cb80e866e54e3c661558d9f2378be3600d
    comment: Citación de use-case (Recursive Multi-Ecosystem SCA Scanning and Stack-Aware Doctor Toolchains)
  - id: FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001
    digest: sha256:40ea7693995c9098e193c9fec72d3fcc7e6f40f690fa163682af9e1fcf67bc95
    comment: Requerimiento derivado de UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS
---


# Propuesta de Cambio: CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS

## 1. Motivación y Alcance
Resolver el Issue #234 dotando a `scanWithNativeFs` (`packages/core/src/verifiers/sca/scanner.ts`) de descubrimiento recursivo acotado de manifiestos y lockfiles multi-ecosistema y haciendo que `ToolchainHealthCheck` (`packages/core/src/doctor/toolchain-check.ts`) verifique los binarios nativos de los stacks presentes en el repositorio.

El cambio:
- **Descubrimiento Recursivo Acotado en `scanWithNativeFs`**: recorre subdirectorios hasta `maxDepth = 3` (alineado con `detectProjectStacks`), omitiendo enlaces simbólicos y directorios de artefactos (`node_modules`, `.git`, `dist`, `target`, `bin`, `obj`, `.venv`, `venv`).
- **Extractores Nativos Multi-Ecosistema**:
  - **.NET**: `*.csproj`, `Directory.Packages.props` (`<PackageReference>` / `<PackageVersion>`) y `packages.lock.json` -> `pkg:nuget/...` resueltos con `license-dotnet.ts`.
  - **Gradle**: `build.gradle`, `build.gradle.kts` y `gradle.lockfile` -> `pkg:maven/...` resueltos con `license-java.ts`.
  - **Python**: `requirements.txt` (en adición a `pyproject.toml`, `poetry.lock`, `uv.lock`, `Pipfile.lock`) -> `pkg:pypi/...` resueltos con `license-python.ts`.
- **`ToolchainHealthCheck` Consciente del Stack**: consulta `detectProjectStacks(rootDir)` para sondear los binarios nativos de cada stack detectado (`dotnet`, `python`/`python3`, `go`, `cargo`, `java`/`mvn`/`gradle`, `cmake`/`clang-tidy`) y exige `pnpm` únicamente cuando existe `pnpm-lock.yaml` en `rootDir`.
- Opera bajo el perfil `minor` (`1 UC-* = 1 CHG-*`) sin modificar `schemas/`.

## 2. Impacto en Artefactos
| Capa | Elemento | Tipo de Cambio | Descripción |
| :--- | :--- | :--- | :--- |
| Product | `UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS` | `EXISTING` | Caso de uso origen del incremento. |
| Product | `FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001` | `EXISTING` | Requisito funcional normativo. |
| Architecture | `CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS` | `NEW` | Subcomponente arquitectónico en `CMP-CORE` (`SEC-ENC-DMZ`). |
| Code | `packages/core/src/verifiers/sca/scanner.ts`, `license-resolve.ts` | `MODIFIED` | Recorrido recursivo acotado (`maxDepth = 3`) y extractores nativos `.NET`, `Gradle`, `Python`. |
| Code | `packages/core/src/doctor/toolchain-check.ts`, `process-runner.ts`, `types/doctor.ts` | `MODIFIED` | Sondeo consciente del stack vía `detectProjectStacks`, `pnpm` condicional y whitelist segura de binarios. |

## 3. Dependencias Externas Evaluadas
- Ninguna dependencia externa nueva. Se reutilizan APIs estándar de Node.js (`fs`, `path`, `node:child_process`) y utilidades existentes en `@aisdlc/core` conforme a `license-policy.yaml`.
