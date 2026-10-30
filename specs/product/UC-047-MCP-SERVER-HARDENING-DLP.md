---
id: UC-047-MCP-SERVER-HARDENING-DLP
type: use-case
title: Hardening de seguridad del servidor MCP y DLP universal
status: active
version: "1.0.0"
schema-version: "1.0"
primary-actor: ACT-AI-AGENT
supporting-actors:
  - ACT-HUMAN-ENGINEER
governed-by:
  - BR-SPEC-TRACEABILITY-INVARIANT
supersedes: null
superseded-by: null
---

# UC-047-MCP-SERVER-HARDENING-DLP: Hardening de seguridad del servidor MCP y DLP universal

## 1. Intención y Resultado
Proteger el servidor Model Context Protocol (@aisdlc/mcp) restringiendo el confinamiento de rutas en el workspace para prevenir Directory Traversal, aplicando sistemáticamente DLP en todas las herramientas para enmascarar secretos y PII, implementando control de acceso basado en roles (RBAC) para herramientas de mutación y manteniendo un log de auditoría inmutable con hashes SHA-256.

## 2. Precondiciones
- Servidor MCP iniciado con una raíz de workspace (`rootDir`).
- Políticas DLP y de control de acceso configuradas.

## 3. Flujo Principal
1. Un agente invoca una herramienta MCP.
2. El servidor MCP valida los permisos según el rol asignado al agente.
3. Se verifica que cualquier ruta solicitada resida dentro de los límites del workspace.
4. Se ejecuta la herramienta de forma segura.
5. La respuesta se sanitiza con la política DLP del workspace.
6. Se registra una entrada en el log de auditoría con la traza de ejecución y el hash SHA-256 de los parámetros.

## 4. Criterios de Aceptación en Formato Gherkin (Cucumber)

```gherkin
@UC-047-MCP-SERVER-HARDENING-DLP @automated @security
Feature: Hardening de seguridad del servidor MCP y DLP universal
  @nominal
  Scenario: Invocación exitosa de herramienta MCP con sanitización DLP
    Given un servidor MCP configurado con política DLP
    When un agente ejecuta una herramienta MCP autorizada
    Then la respuesta se devuelve con cualquier dato sensible enmascarado y se registra la auditoría

  @boundary
  Scenario Outline: Confinamiento de rutas dentro del workspace
    Given un intento de acceder a una ruta "<target_path>"
    When se valida el confinamiento en el servidor MCP
    Then la ruta es aceptada únicamente si se encuentra dentro de la raíz

    Examples:
      | target_path           |
      | ./specs               |
      | ./architecture        |

  @invalid
  Scenario Outline: Bloqueo de path traversal y mutación no autorizada
    Given una solicitud no autorizada con ruta o rol "<invalid_input>"
    When la herramienta MCP procesa la solicitud
    Then la ejecución es rechazada con error de seguridad "<error_code>"

    Examples:
      | invalid_input          | error_code           |
      | ../../etc/passwd       | ERR_PATH_TRAVERSAL   |
      | unauthorized_mutation  | ERR_FORBIDDEN_ROLE   |
```
