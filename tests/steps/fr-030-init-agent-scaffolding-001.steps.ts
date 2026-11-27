// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-030-init-agent-scaffolding-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "un directorio vacío de proyecto"],
  ['when', "se ejecuta el comando \"aisdlc init\""],
  ['then', "se crean \".cursorrules\", \".gemini/rules\", las carpetas canónicas y las políticas base"],
  ['given', "un directorio que ya contiene archivos de código fuente del usuario"],
  ['when', "se ejecuta \"aisdlc init\""],
  ['then', "se genera el andamiaje de gobernanza preservando el código existente"],
  ['given', "una ruta destino inaccesible o bloqueada por confinamiento"],
  ['when', "se intenta ejecutar \"aisdlc init\" sobre dicha ruta"],
  ['then', "el comando aborta de forma controlada informando el error sin corrupción parcial"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
