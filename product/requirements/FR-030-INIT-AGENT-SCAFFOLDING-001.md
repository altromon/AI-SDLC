---
id: FR-030-INIT-AGENT-SCAFFOLDING-001
type: requirement
version: "1.0.0"
schema-version: "1.0"
title: Scaffolding de Reglas Cursor y Antigravity en Comando Init
status: active
category: functional
derives-from:
  - UC-030-INIT-AGENT-SCAFFOLDING
verifiable-by: automated-unit-test
acceptance-format: declarative-prose
supersedes: null
superseded-by: null
---

# FR-030-INIT-AGENT-SCAFFOLDING-001: Scaffolding en Init

## 1. Enunciado Normativo
El comando `aisdlc init` DEBE generar el andamiaje completo para la gobernanza de agentes de IA, incluyendo la creación de archivos de reglas para Cursor (`.cursorrules`) y Google Antigravity (`.gemini/rules`), así como las carpetas canónicas de artefactos y políticas de gobernanza de software.

## 2. Criterios de Aceptación
- **Criterio 1 (Inicialización Limpia)**: La ejecución de `init` sobre un directorio nuevo crea la estructura canónica sin errores.
- **Criterio 2 (Reglas Operativas)**: Los archivos de reglas de agentes generados contienen los mandamientos inquebrantables y definiciones de roles especializadas.
