// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-051-sensitive-data-filter-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a verification result containing an exposed secret token"],
  ['when', "the command \"aisdlc report compliance\" compiles the evidence bundle"],
  ['then', "the generated file \"reports/audit-evidence-bundle.json\" must not contain the raw token"],
  ['given', "the token occurrence must be replaced with the redaction pattern \"[REDACTED_SECRET]\""],
  ['given', "a verification result with rawOutput containing credentials in URI, Bearer token or private key PEM block"],
  ['when', "the compliance bundle engine processes the failure diagnostics"],
  ['then', "rawOutput and diagnostics must not contain URI credentials, raw Bearer tokens or private key blocks"],
  ['given', "the sensitive strings must be masked with \"[REDACTED_SECRET]\" or \"[REDACTED_SECRET_KEY]\""],
  ['given', "Git commit metadata containing personal author email \"developer@company.internal\""],
  ['when', "the compliance bundle serializes provenance records"],
  ['then', "personal email addresses must be masked or pseudonymized"],
  ['given', "no raw individual email addresses must appear in the final OSCAL assessment-results"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
