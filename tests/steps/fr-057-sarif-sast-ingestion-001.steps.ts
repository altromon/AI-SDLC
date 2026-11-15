// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-057-sarif-sast-ingestion-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a valid SARIF 2.1.0 report from \"semgrep\" with findings in \"src/b.ts:20\" and \"src/a.ts:10\""],
  ['given', "quality-policy.yaml sets sast_analysis.max_vulnerabilities to 0"],
  ['when', "the verifier runs with \"--sarif semgrep.sarif\""],
  ['then', "violations are sorted canonically with \"src/a.ts:10\" before \"src/b.ts:20\""],
  ['given', "the SAST gate fails because violations exceed max_vulnerabilities"],
  ['given', "a valid SARIF 2.1.0 report with a finding for rule \"B101\" at \"src/app.py:12\""],
  ['given', "\"src/app.py:12\" has an active \"ai-sdlc:allow-sast\" suppression for rule \"B101\""],
  ['when', "the verifier runs with \"--sarif bandit.sarif\""],
  ['then', "the finding for \"B101\" at \"src/app.py:12\" is suppressed"],
  ['given', "the SAST gate passes when no unsuppressed violations remain"],
  ['given', "a valid SARIF 2.1.0 result with level \"<level>\" and security-severity \"<sec_sev>\""],
  ['when', "the verifier runs with \"--sarif report.sarif\""],
  ['then', "the normalized SastViolation has severity \"<severity>\""],
  ['given', "two valid SARIF 2.1.0 reports \"bandit.sarif\" and \"gosec.sarif\""],
  ['when', "the verifier runs with \"--sarif bandit.sarif --sarif gosec.sarif\""],
  ['then', "findings from both tools are combined and sorted by relPath, lineNumber, and ruleId"],
  ['given', "a SARIF input with defect \"<defect>\""],
  ['when', "the verifier runs with \"--sarif input.sarif\""],
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
