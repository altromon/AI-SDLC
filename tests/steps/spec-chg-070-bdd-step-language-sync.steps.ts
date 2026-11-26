// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-070-bdd-step-language-sync.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a Markdown requirement extracted to a \".feature\" file with \"# ID Requerimiento:\" and \"# Origen:\" headers"],
  ['given', "no step definition files exist yet in \"tests/steps/\" during Checkpoint 1"],
  ['when', "\"aisdlc verify gherkin --features-only\" executes"],
  ['then', "only \"MISSING\", \"OUT_OF_SYNC\", and \"ORPHAN_FEATURE\" are checked and verification passes"],
  ['given', "when production source files citing the requirement or design contracts exist alongside matching \"tests/steps/\" files, full \"aisdlc verify gherkin\" passes"],
  ['given', "a \".feature\" file linked via citation or design contracts to production source files with extension \"<extension>\""],
  ['when', "\"resolveFeatureTargetLanguages\" runs and \"aisdlc gherkin scaffold\" is invoked without \"--lang\""],
  ['then', "the inferred target languages include \"<lang>\""],
  ['given', "step definitions are scaffolded for \"<lang>\" in \"tests/steps/\""],
  ['given', "a \".feature\" file whose associated production source files resolve to language \"cs\""],
  ['given', "\"tests/steps/\" contains \".steps.ts\" step definitions for that feature instead of C# step definitions"],
  ['when', "full \"checkGherkinInSync\" runs with featuresOnly false"],
  ['then', "verification fails and reports \"STEP_LANGUAGE_MISMATCH\""],
  ['given', "a repository containing symlinks or excluded directories such as \"node_modules/\" or \".git/\""],
  ['when', "\"resolveFeatureTargetLanguages\" scans for production source files"],
  ['then', "symlinks and excluded directories are never traversed or resolved outside the repository root"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
