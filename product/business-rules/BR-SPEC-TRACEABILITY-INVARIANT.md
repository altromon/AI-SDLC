---
id: BR-SPEC-TRACEABILITY-INVARIANT
type: business-rule
version: "1.0.0"
schema-version: "1.0"
title: Invariante de Trazabilidad Estricta entre Requisitos, Arquitectura y Pruebas
status: active
enforcement-level: strict-invariant
governs:
  - UC-025-STRUCTURED-JSON-VERIFY
  - UC-028-NATIVE-MCP-SERVER
supersedes: null
superseded-by: null
---

# BR-SPEC-TRACEABILITY-INVARIANT: Invariante de Trazabilidad Estricta

## 1. Declaración de la Regla
Todo artefacto de software generado o modificado por agentes autónomos debe mantener trazabilidad bidireccional estricta (100%) a través de la matriz PDaC (Product -> Design -> Architecture -> Code/Test).

## 2. Nivel de Aplicación
- **strict-invariant:** Ningún PR o entrega puede superar el Quality Gate de AI-SDLC si existe un elemento con estado `DRIFT` o sin cobertura de pruebas automatizadas asociada.
