// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-051-gherkin-polyglot-scaffold-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a valid Gherkin feature file with nominal, boundary, and invalid scenarios"],
  ['when', "the CLI command \"aisdlc gherkin scaffold\" is executed for target languages \"ts,py\""],
  ['then', "the command inspects each native generator binary using shell-free execution and outputs failing RED step definitions for every requested language"],
  ['given', "a Gherkin feature file and target language \"<lang>\" with native binary availability \"<binary_present>\""],
  ['when', "the CLI command \"aisdlc gherkin scaffold\" is evaluated"],
  ['then', "the system responds with status \"<expected_status>\" and install hint \"<install_cmd>\""],
  ['given', "an invalid scaffold request with feature path \"<feature_path>\" and language \"<lang>\""],
  ['when', "the CLI command \"aisdlc gherkin scaffold\" is invoked"],
  ['then', "the system rejects the request with error \"<error_code>\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
