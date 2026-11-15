// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-053-cli-migrate.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "un repositorio AI-SDLC con esquemas y políticas canónicas previas sin alteraciones"],
  ['when', "se ejecuta el comando \"aisdlc migrate\""],
  ['then', "los esquemas, plantillas y políticas se sincronizan con las versiones canónicas actualizadas"],
  ['given', "se genera un respaldo preventivo en el directorio \".backup\""],
  ['given', "el proceso finaliza con código de salida 0"],
  ['given', "un repositorio AI-SDLC con actualizaciones canónicas pendientes"],
  ['when', "se ejecuta el comando \"aisdlc migrate --dry-run\""],
  ['then', "el plan de migración y diferencias se visualizan en la terminal"],
  ['given', "ningún archivo en el disco es modificado ni se crean respaldos"],
  ['given', "un repositorio donde \"quality-policy.yaml\" contiene reglas personalizadas por el usuario"],
  ['when', "se ejecuta el comando \"aisdlc migrate\" sin la opción \"--force\""],
  ['then', "el archivo \"quality-policy.yaml\" permanece intacto conservando las modificaciones del usuario"],
  ['given', "se informa en el reporte de la retención por override detectado"],
  ['given', "el proceso finaliza con código de salida 1"],
  ['given', "un repositorio donde \"quality-policy.yaml\" contiene reglas modificadas"],
  ['when', "se ejecuta el comando \"aisdlc migrate --force --backup\""],
  ['then', "se crea un respaldo con marca de tiempo en \".backup\" antes de la mutación"],
  ['given', "\"quality-policy.yaml\" se actualiza a la versión canónica más reciente"],
  ['given', "un entorno de repositorio con condición de fallo \"<failure_condition>\""],
  ['then', "la ejecución se detiene con diagnóstico de error \"<error_diagnostic>\""],
  ['given', "el proceso finaliza con código de salida 2"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
