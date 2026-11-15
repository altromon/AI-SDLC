// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-045-pdac-schema-fail-closed-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "the system is in an operational state"],
  ['when', "the operation for \"pdac-schema-fail-closed\" is executed"],
  ['then', "the operation completes successfully"],
  ['given', "the system receives boundary input \"<boundary_input>\""],
  ['when', "the operation for \"pdac-schema-fail-closed\" is evaluated at range limits"],
  ['then', "the system responds with expected boundary status \"<expected_status>\""],
  ['given', "the system receives invalid or out-of-range input \"<invalid_input>\""],
  ['when', "the operation for \"pdac-schema-fail-closed\" is invoked"],
  ['then', "the system rejects the request with error \"<error_code>\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
