---
id: CHG-053-CLI-MIGRATE
type: spec-change-proposal
title: CLI Migration Tool for Schemas Templates and Policies
status: applied
author: agent-developer / human-dev
citations:
  - id: UC-053-CLI-MIGRATE
    digest: sha256:58065e1b2138d99c8bcfc7b44e4be9c9072555429d21118ba8397e63691b8eb8
    comment: Artefacto citado en CHG-053-CLI-MIGRATE
  - id: FR-053-CLI-MIGRATE-001
    digest: sha256:b255452ecd24cfbf54f231c7c4dee4810683f9b650ba02cefa96aa5d3e0199d0
    comment: Citación de requirement (cli-migrate-lifecycle-sync)
  - id: SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001
    digest: sha256:d7bc0cb42a514b8f646ace49def3def63528715454d2929b481e5698ceb03533
    comment: Citación de security-requirement (Validación Estricta de Rutas y Confinamiento en Raíz de Repositorio (Path Traversal Defense))
  - id: SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001
    digest: sha256:eeb37a47e790381ce3ae7a6d6c44e7ae061f1c72ed4702a364f3a98483cd6d1a
    comment: Citación de security-requirement (Respaldo Preventivo Criptográficamente Verificado y No Destructivo)
  - id: SEC-REQ-053-ATOMIC-ROLLBACK-001
    digest: sha256:d3ce357ea527368e89b50c4eeec564e70fe1efc065b8faea8c56a70a27b3730d
    comment: Citación de security-requirement (Transaccionalidad de Migración y Rollback Automático ante Errores de Ejecución)
  - id: SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001
    digest: sha256:b769f5bb81667469b18edb46809276cfa724b0b3b74822c0341cdf946ef00d54
    comment: Citación de security-requirement (Invariante Ratchet de No Degradación en Sincronización de Políticas de Seguridad)
---


# Propuesta de Cambio: CHG-053-CLI-MIGRATE

## 1. Motivación y Alcance
CLI Migration Tool for Schemas Templates and Policies

## 2. Dependencias Externas Evaluadas
- Lista de dependencias nuevas a incorporar y verificación de licencia según `license-policy.yaml`.
