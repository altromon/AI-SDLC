---
id: SPEC-CHG-030-INIT-AGENT-SCAFFOLDING
type: delivery-spec
change-id: CHG-030-INIT-AGENT-SCAFFOLDING
profile: standard
---

# Especificación de Entrega: CHG-030-INIT-AGENT-SCAFFOLDING

## 1. Escenarios de Comportamiento Funcional

### Escenario 1: Despliegue de Agentes vía Flag CLI o Parámetro MCP
- **GIVEN**: Un proyecto inicializándose con `aisdlc init --agents all` o `new { agents: "all" }`.
- **WHEN**: Se invoca el flujo de inicialización.
- **THEN**: Se generan las carpetas `.agent/rules/`, `.cursor/rules/`, `.github/` y los archivos correspondientes a Antigravity, Cursor, Claude Code, Copilot y MCP (`.cursor/mcp.json`, `antigravity.mcp.json`, `.vscode/mcp.json`).

### Escenario 2: Interrogación Interactiva en TTY
- **GIVEN**: El usuario ejecuta `aisdlc init` en una terminal interactiva (TTY) sin especificar `--agents`.
- **WHEN**: El proceso detecta `process.stdin.isTTY === true`.
- **THEN**: Presenta un menú interactivo con opciones (Todos, Cursor, Claude, Antigravity, Copilot, Solo MCP, Ninguno), captura la selección del usuario y aplica los agentes seleccionados.

---

## 2. Escenarios de Ciberseguridad y Mitigación (Abuse Scenarios)

### Escenario 3: Prevención de Sobreescritura Accidental o Maliciosa (No-Clobber)
- **GIVEN**: Un repositorio que ya posee reglas o políticas personalizadas (ej. `CLAUDE.md` o `.cursor/rules/ai-sdlc-core.mdc`).
- **WHEN**: Se ejecuta la inicialización con `--agents all`.
- **THEN**: El motor detecta la preexistencia del archivo y lo omite limpiamente, protegiendo contra pérdida accidental de configuraciones.

### Escenario 4: Sanitización de Rutas (Path Traversal Prevention)
- **GIVEN**: Un valor malicioso en `targetDir` intentando salir del directorio de trabajo.
- **WHEN**: Se valida la ruta de destino.
- **THEN**: Se resuelve la ruta absoluta de forma segura dentro de los límites autorizados del sistema.
