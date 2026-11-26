// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-070-bdd-step-language-sync.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a requirement with an extracted \".feature\" file and no \"tests/steps/*\" files yet at Checkpoint 1"],
  ['when', "\"aisdlc verify gherkin --features-only\" runs"],
  ['then', "declarative parity passes without requiring step definition files"],
  ['given', "when production source files citing the requirement exist and matching step files exist in \"tests/steps/\", full \"aisdlc verify gherkin\" passes"],
  ['given', "a \".feature\" file linked to production source files with extension \"<extension>\""],
  ['when', "\"aisdlc gherkin scaffold\" runs without \"--lang\""],
  ['then', "it infers target language \"<lang>\" and scaffolds step definitions for \"<lang>\""],
  ['given', "a \".feature\" file whose resolved production code is \".cs\""],
  ['given', "\"tests/steps/\" only contains \".steps.ts\" step definitions for that feature"],
  ['when', "full \"checkGherkinInSync\" runs with featuresOnly false"],
  ['then', "verification fails with \"STEP_LANGUAGE_MISMATCH\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
