// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-051-regulatory-compliance-bundle.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "un repositorio con verificaciones de Quality Gates de AI-SDLC ejecutadas"],
  ['when', "se ejecuta el comando \"aisdlc report compliance\""],
  ['then', "se genera el archivo \"reports/audit-evidence-bundle.json\" con formato JSON válido"],
  ['given', "el paquete contiene componentes NIST OSCAL assessment-results y atestación in-toto v1"],
  ['given', "las evidencias cubren los requisitos de EU AI Act Art 9-15, ISO/IEC 42001 y NIST SSDF"],
  ['given', "un entorno de integración continua sin claves privadas locales configuradas"],
  ['when', "se ejecuta \"aisdlc report compliance --keyless\""],
  ['then', "la atestación se genera utilizando identidad OIDC keyless o firma determinista reproducible"],
  ['given', "el comando finaliza con código de salida 0"],
  ['given', "una invocación del generador de cumplimiento con condición inválida \"<invalid_condition>\""],
  ['when', "se ejecuta el comando de reporte de cumplimiento"],
  ['then', "el proceso finaliza con código de salida 1 y un mensaje de diagnóstico descriptivo \"<error_diagnostic>\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
