---
id: DSG-CHG-028-NATIVE-MCP-SERVER
type: spec-design
change-id: CHG-028-NATIVE-MCP-SERVER
title: "Diseño Técnico: native-mcp-server"
version: "1.0.0"
schema-version: "1.0"
handoff: "HOF-CHG-028-NATIVE-MCP-SERVER"
architecture-component: "CMP-CORE"
enclave: "SEC-ENC-DMZ"
status: draft
citations:
  - id: FR-028-NATIVE-MCP-SERVER-001
    digest: sha256:b5654893362291dd0b29d37632e2e124b908152b86b7d75eb1a97511e1d7f7c2
    comment: Requerimiento funcional canónico asociado (Génesis CHG-028-NATIVE-MCP-SERVER)
---

# Diseño Técnico: CHG-028-NATIVE-MCP-SERVER

## 1. Mapeo Arquitectónico y Enclave Zero Trust
El servidor MCP se implementa como el paquete `@ai-sdlc/mcp` y se expone opcionalmente a través del subcomando `aisdlc mcp` en `@ai-sdlc/cli`. Opera en el enclave perimetral (`SEC-ENC-DMZ`) comunicándose mediante transporte estándar `stdio` con clientes IDE locales sin abrir sockets de red externos.

## 2. Contratos de Datos e Interfaces
- **MCP Server Factory**: `createMcpServer(options: { rootDir?: string })` instancia `McpServer` registrando herramientas con esquemas Zod rigurosos.
- **Herramientas Resumen**:
  - `new`: Inicialización o bootstrap de AI-SDLC en directorio objetivo con soporte de proveedores CI (`github`, `gitlab`, `azure`, `bitbucket`).
  - `verify`: Ejecución consolidada de los 9 Quality Gates deterministas.
  - `report`: Generación combinada de informes (dashboard web interactivo HTML y reporte de calidad Markdown).
- **Herramientas Granulares**: Scaffolding (`sdd_change_new`), auto-fix (`sdd_check_fix`), integración (`sdd_integrate`), verificación individual (`verify_quality`, `verify_schemas`, `verify_security`, `verify_traceability`, `verify_governance`, `verify_testing`, `verify_licenses`, `verify_duplicates`), y telemetría (`kpi_pr`, `git_detect_author`).
- **Recursos Canónicos**: `aisdlc://policies/quality`, `aisdlc://policies/licenses`, `aisdlc://changes/active`, `aisdlc://changes/completed`.

## 3. Protocolos de Manejo de Errores y Mitigación
Mapeo de excepciones a respuestas estructuradas MCP `{ isError: true, content: [...] }` garantizando que los fallos operativos no causen la caída del proceso del servidor.

## 4. Conformidad con la Política de Licencias (`license-policy.yaml`)
`@modelcontextprotocol/sdk` y `zod` cuentan con licencia MIT conforme con Categoría A de `license-policy.yaml`.

## 5. Historial de Revisiones

| Versión | Fecha | Autor | Descripción del Cambio | Referencia |
| :--- | :--- | :--- | :--- | :--- |
| **1.0.0** | 2026-09-18 | agent-developer / human-dev | Diseño técnico formal inicial | CHG-028-NATIVE-MCP-SERVER |
