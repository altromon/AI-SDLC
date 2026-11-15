// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-058-polyglot-pii-logging-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a DATA-ASSET artifact declaring field \"<field>\" with sensitivity \"pii\" under classification \"confidential-pii\""],
  ['given', "privacy-policy.yaml sets allow_in_logs to false for \"confidential_pii\""],
  ['given', "a \"<language>\" file \"<file>\" logs \"<field>\" using \"<statement>\" on line 5"],
  ['when', "verifyPrivacy scans the repository"],
  ['then', "a PrivacyViolation with ruleId \"PRIV-001-PII-IN-LOGS\", relPath \"<file>\", and lineNumber 5 is reported"],
  ['given', "the violation message does not leak raw PII values"],
  ['given', "a DATA-ASSET artifact with PII field \"email\""],
  ['given', "unmasked logger calls with \"email\" exist in \"src/z.py:12\" and \"src/a.go:4\""],
  ['then', "violations are returned in canonical order with \"src/a.go:4\" before \"src/z.py:12\""],
  ['given', "a DATA-ASSET artifact with internal field \"operator_callsign\" and pii field \"email\""],
  ['given', "privacy-policy.yaml sets allow_in_logs to true for \"internal\""],
  ['given', "\"src/app.ts\" logs \"operator_callsign\" on line 3 and logs \"email\" with \"// ai-sdlc:allow-pii\" on line 4"],
  ['then', "0 PII_IN_LOGS violations are reported for \"src/app.ts\""],
  ['given', "privacy-policy.yaml sets ci_gates.fail_on_pii_in_logs to false"],
  ['given', "\"src/app.py\" calls \"logger.info(email)\""],
  ['then', "0 PII_IN_LOGS violations are reported"],
  ['given', "a DATA-ASSET artifact containing malformed field entries and regex-unsafe field \"(a+)+$\""],
  ['given', "\"src/app.ts\" contains \"logger.info('ok')\""],
  ['then', "the scan completes deterministically without throwing an error or triggering ReDoS"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
