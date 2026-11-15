// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-051-regulatory-compliance-bundle-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "the AI-SDLC project has executed Quality Gate verifications"],
  ['when', "the command \"aisdlc report compliance\" is executed"],
  ['then', "the file \"reports/audit-evidence-bundle.json\" is generated"],
  ['given', "the evidence bundle contains valid NIST OSCAL assessment-results components"],
  ['given', "the evidence bundle contains an in-toto attestation referencing the 12 Quality Gates"],
  ['given', "the controls mapping covers EU AI Act Art 9-15, ISO/IEC 42001, and NIST SSDF SP 800-218"],
  ['given', "a CI/CD headless execution environment without local private signing keys"],
  ['when', "the command \"aisdlc report compliance\" is executed with keyless or dry-run configuration"],
  ['then', "the in-toto attestation is recorded with OIDC keyless claims or deterministic reproducibility hash"],
  ['given', "the command exits with status code 0"],
  ['given', "an invalid execution request with condition \"<invalid_input>\""],
  ['when', "the compliance reporting operation is invoked"],
  ['then', "the process aborts with exit code 1 and error diagnostic \"<error_code>\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
