// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-053-cli-migrate.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "the system is in a nominal operational state"],
  ['when', "the operation for \"CLI Migration Tool for Schemas Templates and Policies\" is processed"],
  ['then', "the operation completes successfully satisfying acceptance criteria"],
  ['given', "the system is configured with boundary value \"<value>\""],
  ['then', "the boundary result matches \"<expected>\""],
  ['given', "an invalid or malformed payload \"<payload>\""],
  ['when', "the operation for \"CLI Migration Tool for Schemas Templates and Policies\" is attempted"],
  ['then', "the system rejects the operation with \"<error>\""],
  ['given', "an unauthenticated actor or invalid credentials"],
  ['when', "the request reaches protected enclaves"],
  ['then', "the connection is rejected immediately and a security event is recorded"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
