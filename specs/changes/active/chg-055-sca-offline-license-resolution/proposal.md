---
id: CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION
type: spec-change-proposal
title: "SCA offline license resolution"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-055-SCA-OFFLINE-LICENSE-RESOLUTION
    digest: sha256:38d5b5d3b076f939ac06ff8b7c9970f46cfea53e343282b37da8783978dfc5e9
    comment: Citación upstream
  - id: FR-055-SCA-OFFLINE-LICENSE-RESOLUTION-001
    digest: sha256:3c5d2e59cbeec0bac5bd87a94595bff7a3c5c3789943fd2b582b836997942562
    comment: Citación upstream
  - id: BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
    digest: sha256:b967c3e510f66024ee48be54ae3c0175a02055fa7a4a5dd265e313e3672f4a94
    comment: Citación upstream
  - id: BR-SCA-EXTERNAL-CLI-SAFE-EXECUTION
    digest: sha256:4ff171048a4f674c53c72528e260f54f815d4ffc94a649c9f4bdbb51485fbc3c
    comment: Citación upstream
---

# Propuesta de Cambio: CHG-055-SCA-OFFLINE-LICENSE-RESOLUTION

## 1. Motivación y Alcance
Resolución offline de licencias (Python, Rust, Go, Java, .NET, Node): parseo de archivos -> CLI endurecido -> UNRESOLVED (≡ UNKNOWN). Decisión PO: se mantienen todos los CLIs de issue #161 con medidas de bloqueo (archivos bloqueantes, tabla argv/env, entorno saneado, binario del PATH del sistema). Depende de CHG-054.

## 2. Dependencias Externas Evaluadas
Ninguna nueva (solo node:child_process, node:fs, node:path; license-policy.yaml).
