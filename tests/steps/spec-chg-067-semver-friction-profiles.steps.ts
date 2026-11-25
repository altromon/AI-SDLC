// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-067-semver-friction-profiles.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "the system is configured with the SemVer friction profile \"<profile>\""],
  ['when', "profile validation is executed across schema, types, CLI, MCP, progressive-friction, and guard-branch.cjs"],
  ['then', "the profile \"<profile>\" is accepted without errors"],
  ['given', "an SDD change without an explicit profile field"],
  ['when', "the effective profile is resolved by progressive-friction and guard-branch.cjs"],
  ['then', "the resolved default profile is \"minor\""],
  ['given', "a user or agent specifies the legacy profile \"<legacy_profile>\""],
  ['when', "profile validation is executed in schema, CLI, MCP, progressive-friction, or guard-branch.cjs"],
  ['then', "the system strictly rejects \"<legacy_profile>\" as invalid and requires \"patch\", \"minor\", or \"major\""],
  ['given', "an active SDD increment with profile \"patch\""],
  ['when', "an agent attempts to modify a protected Anti-Bypass path such as \"schemas/sdd/spec.schema.json\""],
  ['then', "progressive-friction and guard-branch.cjs block the modification and require \"minor\" or \"major\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
