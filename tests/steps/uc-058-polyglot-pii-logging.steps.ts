// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-058-polyglot-pii-logging.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a DATA-ASSET artifact with confidential-pii field \"<field>\""],
  ['given', "privacy-policy.yaml sets allow_in_logs to false for confidential_pii"],
  ['given', "a \"<language>\" source file logs \"<field>\" via \"<logger_call>\" at line 10"],
  ['when', "verifyPrivacy executes Gate 12"],
  ['then', "a PII_IN_LOGS violation is reported with exact relPath and lineNumber 10"],
  ['given', "a DATA-ASSET artifact with internal field \"operator_callsign\""],
  ['given', "privacy-policy.yaml sets allow_in_logs to true for internal"],
  ['given', "a source file logs \"operator_callsign\" and another line logs \"email\" with \"ai-sdlc:allow-pii\""],
  ['then', "zero PII_IN_LOGS violations are reported"],
  ['given', "a DATA-ASSET artifact with malformed field entries and regex-unsafe field name \"(a+)+$\""],
  ['given', "a source file contains corporate logger calls"],
  ['then', "the verifier completes deterministically without throwing or experiencing ReDoS"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
