// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-055-sca-offline-license-resolution.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a \"<ecosystem>\" project with local metadata declaring \"<license>\" for \"<dependency>\""],
  ['when', "the SCA scan runs offline"],
  ['then', "\"<dependency>\" has license \"<license>\""],
  ['given', "no external CLI is spawned"],
  ['given', "a rust project without local crate metadata"],
  ['given', "\"cargo\" is available in PATH"],
  ['then', "the license is resolved via \"cargo metadata --offline\""],
  ['given', "the process is spawned without a shell with a bounded cwd and a timeout"],
  ['given', "a project whose dependency cannot be resolved because \"<cause>\""],
  ['then', "the dependency license is \"UNRESOLVED\""],
  ['given', "the report states the cause \"<cause>\""],
  ['given', "no network access is attempted"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
