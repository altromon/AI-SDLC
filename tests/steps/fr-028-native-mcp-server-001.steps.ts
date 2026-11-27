// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-028-native-mcp-server-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "un cliente MCP conectado por transporte stdio al servidor nativo"],
  ['when', "el cliente solicita \"tools/list\" e invoca una herramienta de verificación"],
  ['then', "el servidor devuelve el catálogo completo y el resultado estructurado de la herramienta"],
  ['given', "un workspace inicializado sin cambios SDD activos"],
  ['when', "el cliente MCP invoca las herramientas de inspección y verificación"],
  ['then', "el servidor responde de forma determinista con estado válido sin errores de protocolo"],
  ['given', "parámetros con tipos inválidos o una ruta con traversal fuera del root"],
  ['when', "el cliente MCP invoca una herramienta del servidor"],
  ['then', "la solicitud es rechazada con error estructurado de validación o confinamiento"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
