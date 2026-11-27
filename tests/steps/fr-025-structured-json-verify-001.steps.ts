// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-025-structured-json-verify-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "un repositorio conforme con las compuertas de calidad"],
  ['when', "se ejecuta el comando de verificación con \"--json\""],
  ['then', "la salida estándar es JSON válido sin códigos ANSI y con \"success\" en true"],
  ['given', "un repositorio configurado para verificación"],
  ['when', "se ejecuta el comando de verificación con \"-o json\""],
  ['then', "la salida estándar es analizable mediante JSON.parse sin texto decorativo"],
  ['given', "un repositorio con una violación determinista detectada"],
  ['then', "el objeto JSON reporta el fallo y el proceso termina con código de salida 1"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
