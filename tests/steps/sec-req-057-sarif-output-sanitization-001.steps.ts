// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-057-sarif-output-sanitization-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a valid SARIF 2.1.0 finding with clean tool name, ruleId, message.text, and uri \"src/app.ts\""],
  ['when', "the SAST verifier normalizes and renders the finding"],
  ['then', "relPath is \"src/app.ts\""],
  ['given', "the CLI and report output preserve the sanitized finding details"],
  ['given', "a valid SARIF 2.1.0 finding whose artifactLocation.uri is a \"file://\" URI inside the project root"],
  ['when', "the SAST verifier normalizes the artifact location"],
  ['then', "relPath resolves deterministically to the relative path inside the project root"],
  ['given', "a SARIF 2.1.0 finding where \"<field>\" contains ANSI escape sequences and control characters"],
  ['when', "the SAST verifier renders the finding in CLI output and reports"],
  ['then', "no raw ANSI escape sequences or control characters appear in the output"],
  ['given', "a SARIF 2.1.0 finding with Markdown headings, injected links, or HTML tags in \"message.text\" and \"ruleId\""],
  ['when', "the SAST verifier renders the Markdown gate report"],
  ['then', "injected Markdown structures and raw HTML tags are neutralized"],
  ['given', "a SARIF 2.1.0 finding with artifactLocation.uri \"<malicious_uri>\""],
  ['when', "the SAST verifier validates and normalizes the URI"],
  ['then', "the verification fails with error \"ERR_SARIF_PATH_OUTSIDE_ROOT\""],
  ['given', "no partial violations are reported"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
