// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-061-increment-profile-and-semver-guard.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "the repository is on branch \"feat/CHG-061-sample\" with version \"1.2.3\""],
  ['given', "an active SDD increment \"CHG-061-SAMPLE\" with profile \"standard\" has \"spec.md\", \"design.md\", \"tasks.md\", and \"handoff.yaml\" in \"specs/changes/active/CHG-061-SAMPLE\""],
  ['when', "the agent edits \"packages/core/src/index.ts\" through \"guard-branch.cjs\" and completes Step 6 integration"],
  ['then', "\"guard-branch.cjs\" returns decision \"allow\""],
  ['given', "the software version is bumped once to \"1.3.0\""],
  ['given', "current software version is \"<current_version>\""],
  ['given', "pending increments in the batch have profiles \"<profiles_list>\""],
  ['when', "Step 6 SemVer consolidation is applied"],
  ['then', "the highest profile rank resolved is \"<winning_profile>\""],
  ['given', "the resulting software version is \"<next_version>\""],
  ['given', "the repository is on branch \"feat/CHG-061-no-spec\""],
  ['given', "\"specs/changes/active\" contains no valid active SDD increment directory"],
  ['when', "the agent attempts to edit \"packages/core/src/index.ts\" or \"tests/sample.test.ts\""],
  ['then', "\"guard-branch.cjs\" returns decision \"deny\" mentioning \"specs/changes/active/\" and \"aisdlc-increment\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      // Verified via packages/core/tests/increment-profile-semver-guard.spec.ts
    });
  }
}
