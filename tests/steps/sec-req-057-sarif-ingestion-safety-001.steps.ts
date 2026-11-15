// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-057-sarif-ingestion-safety-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a regular SARIF 2.1.0 file inside the project root within size, depth, and result limits"],
  ['when', "the SAST verifier ingests the report with \"--sarif reports/valid.sarif\""],
  ['then', "the report is parsed offline without network requests"],
  ['given', "normalized SastViolation entries are produced"],
  ['given', "a SARIF input exceeding the resource limit \"<limit_case>\""],
  ['when', "the SAST verifier ingests the report with \"--sarif bounded.sarif\""],
  ['then', "the verification fails with error \"<error>\""],
  ['given', "no partial violations are reported"],
  ['given', "a SARIF path representing \"<attack_vector>\""],
  ['when', "the SAST verifier attempts to open the SARIF path"],
  ['given', "the target outside the project root is not read"],
  ['given', "a SARIF JSON payload containing the unsafe key \"<unsafe_key>\""],
  ['when', "the SAST verifier parses the SARIF payload"],
  ['then', "the verification fails with error \"ERR_SARIF_UNSAFE_KEY\""],
  ['given', "Object.prototype remains unmodified"],
  ['given', "a SARIF 2.1.0 input with a valid first run followed by malformed JSON or invalid structure"],
  ['when', "the SAST verifier ingests the report"],
  ['then', "the verification fails with error \"ERR_SARIF_MALFORMED\""],
  ['given', "zero partial SastViolation entries are returned"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
