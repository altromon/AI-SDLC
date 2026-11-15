// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-047-mcp-server-hardening-dlp.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "un servidor MCP configurado con política DLP"],
  ['when', "un agente ejecuta una herramienta MCP autorizada"],
  ['then', "la respuesta se devuelve con cualquier dato sensible enmascarado y se registra la auditoría"],
  ['given', "un intento de acceder a una ruta \"<target_path>\""],
  ['when', "se valida el confinamiento en el servidor MCP"],
  ['then', "la ruta es aceptada únicamente si se encuentra dentro de la raíz"],
  ['given', "una solicitud no autorizada con ruta o rol \"<invalid_input>\""],
  ['when', "la herramienta MCP procesa la solicitud"],
  ['then', "la ejecución es rechazada con error de seguridad \"<error_code>\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
