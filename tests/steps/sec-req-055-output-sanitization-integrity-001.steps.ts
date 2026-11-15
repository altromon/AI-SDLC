// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-055-output-sanitization-integrity-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a CLI that returns a license containing ANSI escapes or 5000 characters"],
  ['when', "the license resolver parses the output"],
  ['then', "the dependency must be UNRESOLVED"],
  ['given', "the invalid value is not written to any report"],
  ['given', "CLI output JSON containing \"__proto__\" keys"],
  ['when', "the resolver parses it"],
  ['then', "Object.prototype must remain unmodified"],
  ['given', "a Maven dependency pom without license in \"~/.m2\""],
  ['when', "resolveLicense runs"],
  ['given', "the root project license is not attributed to it"],
  ['given', "a CLI failing with stderr containing \"C:\\Users\\alice\\secret\""],
  ['when', "the report is generated"],
  ['then', "the report must contain only the unresolvedReason enum value"],
  ['given', "no absolute path or stderr text appears"],
  ['given', "the \"go\" binary is not installed"],
  ['when', "scanInstalledLicenses runs"],
  ['then', "Go dependencies are UNRESOLVED with reason \"cli_not_installed\""],
  ['given', "the other ecosystems are still scanned"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
