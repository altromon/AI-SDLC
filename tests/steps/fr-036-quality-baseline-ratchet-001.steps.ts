// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-036-quality-baseline-ratchet-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "un repositorio con violaciones de complejidad preexistentes registradas en \"quality-baseline.json\""],
  ['when', "se ejecuta \"aisdlc verify quality\" en modo ratchet"],
  ['then', "las violaciones registradas en el baseline son toleradas como advertencias"],
  ['given', "el veredicto del Quality Gate es satisfactorio con código de salida 0"],
  ['given', "un repositorio con baseline activo y modo ratchet habilitado"],
  ['when', "se añade una nueva función que excede la complejidad ciclomática máxima de 10"],
  ['then', "el motor detecta la nueva violación no registrada en el baseline"],
  ['given', "el Quality Gate falla inmediatamente con código de salida 1"],
  ['given', "una función registrada en baseline con complejidad ciclomática 12"],
  ['when', "se modifica la función incrementando su complejidad a 15"],
  ['then', "el motor detecta el empeoramiento métrico respecto al baseline"],
  ['given', "el Quality Gate rechaza el cambio con código de salida 1"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
