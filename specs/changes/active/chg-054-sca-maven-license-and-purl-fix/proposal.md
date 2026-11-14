---
id: CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX
type: spec-change-proposal
title: "SCA Maven license and PURL fix"
status: draft
author: "agent-system-architect"
citations:
  - id: UC-054-SCA-MAVEN-LICENSE-PURL-FIX
    digest: sha256:205354315e6f9b6ea28aeccf32526218d5d92fef63fb56fedb6fff839abb37d7
    comment: Citación upstream
  - id: FR-054-SCA-MAVEN-LICENSE-PURL-FIX-001
    digest: sha256:2a69ed39684f961e72d8400bdbb695a643828319866c77006e8860f4e95c4a52
    comment: Citación upstream
  - id: BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY
    digest: sha256:b967c3e510f66024ee48be54ae3c0175a02055fa7a4a5dd265e313e3672f4a94
    comment: Citación upstream
---

# Propuesta de Cambio: CHG-054-SCA-MAVEN-LICENSE-AND-PURL-FIX

## 1. Motivación y Alcance
Corregir (a) la herencia de licencia raíz de pom.xml hacia dependencias (BR-SCA-LICENSE-ATTRIBUTION-INTEGRITY) y (b) los PURL fijados a pkg:npm en sbom.ts (componentes y affects.ref) y en los fallbacks de Trivy/Syft. Cambia la salida pública del SBOM, por lo que usa perfil standard. Componente: CMP-054-SCA-LICENSE-RESOLUTION.

## 2. Dependencias Externas Evaluadas
Ninguna nueva (license-policy.yaml). El rechazo de DOCTYPE/ENTITY en pom.xml usa un tokenizador estricto propio.
