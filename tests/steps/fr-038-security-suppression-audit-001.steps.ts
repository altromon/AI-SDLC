// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-038-security-suppression-audit-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "una línea de código con un hallazgo de seguridad y una supresión válida con fecha futura"],
  ['when', "se ejecuta la verificación de seguridad"],
  ['then', "el hallazgo es tolerado como supresión activa"],
  ['given', "la supresión queda registrada en \"reports/SUPPRESSIONS_AUDIT.md\""],
  ['given', "una línea de código con un hallazgo de seguridad y una supresión sin campo expires o approved-by"],
  ['then', "la supresión es clasificada como inválida"],
  ['given', "el hallazgo de seguridad permanece activo bloqueando el gate"],
  ['given', "una línea de código con un hallazgo de seguridad y una supresión con fecha de caducidad pasada"],
  ['then', "la supresión es identificada como expirada"],
  ['given', "el Quality Gate de seguridad falla inmediatamente con código de salida 1"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
