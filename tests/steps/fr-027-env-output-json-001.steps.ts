// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-027-env-output-json-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "la variable de entorno \"AISDLC_FORMAT\" establecida en \"json\""],
  ['when', "se ejecuta un comando de verificación sin flags explícitos de formato"],
  ['then', "la salida se emite en formato JSON válido"],
  ['when', "se ejecuta el comando con \"--format text\" o \"--no-json\""],
  ['then', "la salida respeta el formato de texto explícito de la línea de comandos"],
  ['given', "la variable de entorno \"AISDLC_OUTPUT\" establecida en un valor no reconocido"],
  ['when', "se ejecuta el comando de verificación sin flags de formato"],
  ['then', "la salida mantiene el formato de texto legible por defecto"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
