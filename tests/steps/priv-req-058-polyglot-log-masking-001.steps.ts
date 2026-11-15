// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/privacy/priv-req-058-polyglot-log-masking-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a privacy-policy.yaml where \"public\" and \"internal\" classifications set \"allow_in_logs: true\""],
  ['given', "a DATA-ASSET-* inventory declaring \"<field>\" as \"<classification>\""],
  ['when', "the polyglot PII-SAST scanner inspects a \"<language>\" source file logging \"<expression>\""],
  ['then', "zero \"PRIV-001-PII-IN-LOGS\" violations are reported for that line"],
  ['given', "a repository located at host rootDir \"/srv/ci/runner-42/workspace/app\""],
  ['given', "a DATA-ASSET-* field \"patient_diagnosis\" classified as \"special-category-sensitive\" with \"allow_in_logs: false\""],
  ['when', "the scanner detects an unmasked log call on line 27 of \"src/services/intake.py\" containing a literal PII value"],
  ['then', "\"reports/PRIVACY_SCAN_REPORT.md\" and CLI diagnostics include relPath \"src/services/intake.py\""],
  ['given', "the diagnostic includes lineNumber \"27\" and ruleId \"PRIV-001-PII-IN-LOGS\" with field identifier \"patient_diagnosis\""],
  ['given', "the diagnostic output does not contain the host rootDir \"/srv/ci/runner-42/workspace/app\""],
  ['given', "the diagnostic output does not contain any raw runtime PII literal"],
  ['given', "a privacy-policy.yaml with \"ci_gates.fail_on_pii_in_logs: true\""],
  ['given', "a DATA-ASSET-* field \"<field>\" classified as \"<classification>\" with \"allow_in_logs: false\""],
  ['when', "the polyglot PII-SAST scanner inspects \"<language>\" code executing \"<log_statement>\""],
  ['then', "a \"HIGH\" severity \"PRIV-001-PII-IN-LOGS\" violation is emitted"],
  ['given', "Gate 12 verification fails with non-zero exit status"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
