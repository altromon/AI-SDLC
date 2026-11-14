---
id: CHG-056-SCA-SBOM-INGESTION
type: spec-change-proposal
title: "SCA SBOM ingestion"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-056-SCA-SBOM-INGESTION
    digest: sha256:55a3930202cf6a2b189d314ece3855bcf9dce4dd747894482ee0f917b128a63f
    comment: Citación upstream
  - id: FR-056-SCA-SBOM-INGESTION-001
    digest: sha256:798419682a1d8b413f2c8e3d72fd16f4905b74832abcdceb2eb1d7a51b2dfc4a
    comment: Citación upstream
  - id: BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
    digest: sha256:b967c3e510f66024ee48be54ae3c0175a02055fa7a4a5dd265e313e3672f4a94
    comment: Citación upstream
---

# Propuesta de Cambio: CHG-056-SCA-SBOM-INGESTION

## 1. Motivación y Alcance
Ingesta explícita (--sbom) de SBOM CycloneDX/SPDX JSON que solo rellena huecos de licencia (la resolución local siempre gana; procedencia sbom-declared), con verificación cruzada contra lockfiles. Independiente de CHG-054/055. OSV fuera de alcance (#194).

## 2. Dependencias Externas Evaluadas
Ninguna nueva (license-policy.yaml): JSON nativo, sin parser XML.
