// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-052-no-secret-leak-diagnostics-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "an Ed25519 private key configured at a local path"],
  ['when', "the diagnostic health check \"aisdlc doctor\" inspects signing readiness"],
  ['then', "the diagnostic output must display only the key fingerprint or public identifier"],
  ['given', "the private key content must never appear in stdout, stderr, or JSON reports"],
  ['given', "an environment with an active \"OIDC_TOKEN\" or \"GITHUB_TOKEN\""],
  ['when', "\"aisdlc doctor --json\" outputs the environment diagnosis"],
  ['then', "any reported credential field must be masked with redacted placeholders"],
  ['given', "no raw token string with entropy > 4.5 is emitted in the output"],
  ['given', "an internal diagnostic error whose error stack contains an API secret \"dummy-secret-token-sample\""],
  ['when', "the diagnostic error is caught and converted to a DiagnosticFinding"],
  ['then', "the DlpSanitizer must sanitize \"finding.message\", \"finding.details\", and error stack trace"],
  ['given', "the emitted JSON and terminal output must contain \"[REDACTED:API_TOKEN]\" instead of the raw secret"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
