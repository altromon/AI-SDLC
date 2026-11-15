// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-037-sdd-integrate-concurrency.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "the system exhibits the defect identified in \"sdd-integrate-concurrency\""],
  ['when', "the patch fix is applied"],
  ['then', "the anomalous behavior is resolved and verification passes"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
