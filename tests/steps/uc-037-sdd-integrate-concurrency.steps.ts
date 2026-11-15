// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-037-sdd-integrate-concurrency.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "un entorno de integración continua con colisión concurrente de commits"],
  ['when', "se ejecuta el script de sincronización canónica con reintentos y retroceso exponencial"],
  ['then', "el comando realiza pull rebase y completa el push exitosamente dentro de los 3 intentos"],
  ['given', "múltiples eventos pull_request cerrados simultáneamente contra \"main\""],
  ['when', "GitHub Actions evalúa el grupo de concurrencia del workflow"],
  ['then', "todas las ejecuciones comparten la clave \"sdd-integrate-main\" serializándose con cancel-in-progress false"],
  ['given', "un conflicto insalvable en git push persistente por 3 intentos"],
  ['when', "se agota el número máximo de reintentos"],
  ['then', "el workflow finaliza con código de salida 1 y mensaje de error descriptivo"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
