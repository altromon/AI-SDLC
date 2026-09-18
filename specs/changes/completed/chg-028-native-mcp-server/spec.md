---
id: SPEC-CHG-028-NATIVE-MCP-SERVER
type: delivery-spec
change-id: CHG-028-NATIVE-MCP-SERVER
profile: standard
---

# Especificación de Entrega: CHG-028-NATIVE-MCP-SERVER
 
## 1. Escenarios de Comportamiento Funcional

### Escenario 1: Inicialización y descubrimiento de herramientas y recursos
- **GIVEN**: El cliente IDE o agente inicia el proceso del servidor MCP mediante transporte `stdio`.
- **WHEN**: El cliente envía la solicitud `tools/list` y `resources/list`.
- **THEN**: El servidor responde con el catálogo completo de herramientas (incluidas `new`, `verify`, `report`) y recursos canónicos con sus esquemas JSON correspondientes.

### Escenario 2: Ejecución exitosa de comando resumen verify
- **GIVEN**: El servidor MCP se encuentra en ejecución activa.
- **WHEN**: El cliente invoca la herramienta `verify` con argumentos por defecto.
- **THEN**: El servidor ejecuta deterministamente las compuertas de calidad y devuelve el payload estructurado con veredicto, gates evaluados y conteo de violaciones.

---

## 2. Escenarios de Ciberseguridad y Mitigación (Abuse Scenarios)

### Escenario 3: Manejo seguro de rutas e inyección de parámetros
- **GIVEN**: Un cliente intenta invocar una herramienta MCP con rutas arbitrarias o argumentos con secuencias de path traversal (`../../etc`).
- **WHEN**: La herramienta procesa los parámetros de entrada.
- **THEN**: Los esquemas Zod y resolutores de ruta validan y normalizan los argumentos dentro del espacio de trabajo seguro sin ejecutar comandos de shell descontrolados.
