// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-027-normalize-ide-rulesets-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "the system is in an operational state"],
  ['when', "the operation for \"normalize-ide-rulesets\" is executed"],
  ['then', "the operation completes successfully"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
