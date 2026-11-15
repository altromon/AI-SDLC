// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-043-sarif-security-reporting-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "un conjunto de violaciones detectadas por SAST y Secretos"],
  ['when', "se genera el reporte de seguridad en formato SARIF"],
  ['then', "el documento contiene la versión \"2.1.0\" y el esquema oficial de OASIS"],
  ['given', "cada hallazgo contiene ubicación física de archivo y línea"],
  ['given', "las reglas incluyen metadatos de severidad y taxonomía CWE o OWASP"],
  ['given', "un análisis de seguridad donde no se detectan secretos ni vulnerabilidades SAST"],
  ['then', "el documento SARIF es válido con una lista de resultados vacía"],
  ['given', "el listado de reglas evaluadas permanece disponible en el driver de la herramienta"],
  ['given', "una violación crítica de inyección de comandos o credencial expuesta"],
  ['when', "se serializa el hallazgo a formato SARIF"],
  ['then', "el resultado se categoriza con nivel \"error\""],
  ['given', "se incluye la recomendación y mensaje descriptivo de remediación"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
