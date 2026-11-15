// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-057-sarif-sast-ingestion.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a valid SARIF 2.1.0 report from \"<tool>\" with a \"<level>\" finding"],
  ['when', "the SAST verifier ingests the report with \"--sarif report.sarif\""],
  ['then', "the finding is normalized into a SastViolation with severity \"<severity>\""],
  ['given', "the gate evaluates the findings against quality-policy.yaml"],
  ['given', "a valid SARIF 2.1.0 report with 0 results"],
  ['when', "the SAST verifier ingests the report with \"--sarif empty.sarif\""],
  ['then', "0 SastViolation entries are produced"],
  ['given', "the SAST gate passes"],
  ['given', "a SARIF input with defect \"<defect>\""],
  ['when', "the SAST verifier ingests the report with \"--sarif bad.sarif\""],
  ['then', "the verification fails with error \"<error>\""],
  ['given', "no partial violations are reported"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
