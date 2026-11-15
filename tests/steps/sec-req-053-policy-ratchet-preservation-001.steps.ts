// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-053-policy-ratchet-preservation-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a local \"quality-policy.yaml\" with code coverage threshold set to 95 percent"],
  ['given', "an incoming canonical template with standard coverage threshold of 80 percent"],
  ['when', "the migration is executed to synchronize policy templates"],
  ['then', "the merged \"quality-policy.yaml\" must retain the stricter 95 percent coverage threshold"],
  ['given', "the relaxed canonical threshold of 80 percent is rejected"],
  ['given', "a local \"dlp-policy.yaml\" containing custom proprietary API key patterns"],
  ['when', "the canonical policy update adds new upstream token patterns"],
  ['then', "the resulting policy must combine upstream patterns while keeping all local custom rules"],
  ['given', "no existing custom DLP inspection pattern is removed"],
  ['given', "a migration configuration that would relax a blocked license category in \"license-policy.yaml\""],
  ['when', "the command is executed with \"--force\" but without \"--allow-policy-downgrade\""],
  ['then', "the policy downgrade operation is blocked with diagnostic \"ERR_SECURITY_POLICY_DOWNGRADE_BLOCKED\""],
  ['given', "the command exits with exit code 1"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
