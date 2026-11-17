// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-061-increment-profile-and-semver-guard.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "the current Git branch is \"feat/CHG-061-increment-profile-and-semver-guard\""],
  ['given', "\"specs/changes/active/CHG-061-INCREMENT-PROFILE-AND-SEMVER-GUARD\" contains \"spec.md\", \"design.md\", \"tasks.md\", and \"handoff.yaml\""],
  ['when', "\"guard-branch.cjs\" evaluates a file edit on \"packages/core/src/init/agent-templates.ts\""],
  ['then', "the hook output decision is \"allow\""],
  ['given', "the baseline package version is \"<base_version>\""],
  ['given', "the active SDD increment profiles to integrate are \"<profiles>\""],
  ['when', "the Step 6 SemVer bump rule is evaluated"],
  ['then', "the effective profile precedence is \"<effective_profile>\""],
  ['given', "the target version is \"<target_version>\""],
  ['given', "\"specs/changes/active\" has no active SDD increment with required artifacts"],
  ['when', "\"guard-branch.cjs\" evaluates a file edit on \"packages/core/src/init/coding-rules-templates.ts\""],
  ['then', "the hook output decision is \"deny\""],
  ['given', "the denial reason references \"specs/changes/active/\" and \"aisdlc-increment\""],
  ['given', "the current Git branch is \"feat/CHG-061-patch-bypass\""],
  ['given', "\"specs/changes/active/CHG-061-PATCH-BYPASS\" only has a \"spec.md\" with profile \"patch\""],
  ['when', "\"guard-branch.cjs\" evaluates a file edit on \"schemas/sdd/spec.schema.json\" or \"specs/security/SEC-REQ-001.md\""],
  ['given', "the denial reason states that protected Anti-Bypass paths require a \"standard\" or \"critical\" SDD increment"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
