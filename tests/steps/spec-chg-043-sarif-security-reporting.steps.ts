// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/spec-chg-043-sarif-security-reporting.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "un resultado de análisis SAST con violaciones y un resultado de escaneo de secretos"],
  ['when', "se invoca el generador generateSecuritySarifReport"],
  ['then', "el schema del documento es \"https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json\""],
  ['given', "la versión del documento es \"2.1.0\""],
  ['given', "cada resultado contiene uri de artefacto y línea de inicio física"],
  ['given', "las reglas incluyen metadatos y severidades estandarizadas"],
  ['given', "un análisis sin violaciones SAST y sin secretos detectados"],
  ['when', "se genera el reporte SARIF"],
  ['then', "el arreglo results está vacío"],
  ['given', "el veredicto del gate se mantiene conforme"],
  ['given', "una violación de severidad CRITICAL en SAST o Secretos"],
  ['when', "se mapea la violación a resultado SARIF"],
  ['then', "el campo level del resultado es \"error\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
