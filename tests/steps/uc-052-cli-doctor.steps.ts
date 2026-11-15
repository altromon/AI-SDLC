// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-052-cli-doctor.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "un repositorio configurado correctamente con hooks instalados"],
  ['given', "una rama de trabajo no protegida activa"],
  ['given', "esquemas JSON válidos y herramientas del toolchain presentes"],
  ['given', "configuración de firma disponible"],
  ['when', "se ejecuta el comando \"aisdlc doctor\""],
  ['then', "el reporte muestra todas las categorías en estado satisfactorio"],
  ['given', "el proceso finaliza con código de salida 0"],
  ['given', "un repositorio con herramientas y hooks válidos"],
  ['given', "sin claves de firma locales opcionales configuradas"],
  ['then', "el reporte muestra advertencias no críticas"],
  ['given', "el proceso finaliza con código de salida 1"],
  ['given', "un repositorio con defecto crítico \"<critical_defect>\""],
  ['then', "el reporte identifica la categoría fallida con diagnóstico \"<failure_diagnostic>\""],
  ['given', "el proceso finaliza con código de salida 2"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
