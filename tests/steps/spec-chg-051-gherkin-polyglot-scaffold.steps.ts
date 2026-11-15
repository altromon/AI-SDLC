// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-051-gherkin-polyglot-scaffold.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a valid Gherkin \".feature\" file containing Given, When, and Then steps"],
  ['when', "\"aisdlc gherkin scaffold\" is executed with \"--lang ts,py\""],
  ['then', "the CLI checks each native generator via shell-free spawnSync and writes failing RED step definitions for every requested language"],
  ['given', "a valid Gherkin \".feature\" file and target stack \"<lang>\" where native binary installed is \"<installed>\""],
  ['when', "\"aisdlc gherkin scaffold\" is executed in agent JSON mode"],
  ['then', "the CLI returns status \"<status>\" with native command \"<native_cmd>\" and install command \"<install_cmd>\""],
  ['given', "a scaffold invocation with feature file \"<feature>\" and language \"<lang>\""],
  ['when', "\"aisdlc gherkin scaffold\" is attempted"],
  ['then', "the CLI rejects the execution with error code \"<error>\""],
  ['given', "a crafted feature file path containing shell metacharacters or an unapproved missing native generator"],
  ['when', "\"aisdlc gherkin scaffold\" inspects or invokes the native binary"],
  ['then', "child processes are executed strictly with \"shell: false\" and no package installation runs without explicit user permission"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
