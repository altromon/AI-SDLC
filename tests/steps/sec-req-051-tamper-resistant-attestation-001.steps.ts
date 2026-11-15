// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-051-tamper-resistant-attestation-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "an audit evidence bundle \"reports/audit-evidence-bundle.json\" with valid SHA-256 digests"],
  ['when', "a malicious actor alters a Quality Gate finding from \"failed\" to \"passed\""],
  ['then', "the cryptographic verification of the in-toto attestation subject must fail"],
  ['given', "the verification tool must exit with status code 1 and diagnostic \"ERR_EVIDENCE_HASH_MISMATCH\""],
  ['given', "identical verification results across two distinct compilation runs"],
  ['when', "the compliance bundle generator outputs \"reports/audit-evidence-bundle.json\""],
  ['then', "both generated files must produce identical SHA-256 digests"],
  ['given', "object keys must adhere to RFC 8785 canonical serialization"],
  ['given', "arrays must be deterministically sorted by id, ruleId or path"],
  ['given', "execution in CI mode with only 11 Quality Gate reports or a stale commit hash"],
  ['when', "the command \"aisdlc report compliance --strict\" is executed"],
  ['then', "the command must fail with status code 1"],
  ['given', "report an error indicating incomplete gates or stale Git commit provenance"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
