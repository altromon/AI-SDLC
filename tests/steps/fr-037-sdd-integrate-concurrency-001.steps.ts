// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-037-sdd-integrate-concurrency-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a pull request merged into \"main\""],
  ['when', "the concurrency group is computed"],
  ['then', "the group key is \"sdd-integrate-main\""],
  ['given', "a push rejection due to remote changes"],
  ['when', "the retry loop executes git pull --rebase and pushes again"],
  ['then', "the push succeeds on the second attempt"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
