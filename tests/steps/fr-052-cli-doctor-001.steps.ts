// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-052-cli-doctor-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "the repository has valid Git hooks installed in .git/hooks/"],
  ['given', "the active Git branch is a dedicated non-protected branch"],
  ['given', "JSON schemas and PDaC are synchronized without errors"],
  ['given', "required runtimes Node.js LTS, pnpm, and Git CLI are available in PATH"],
  ['given', "signing keys or keyless OIDC configuration are ready"],
  ['when', "the command \"aisdlc doctor\" is executed"],
  ['then', "all diagnostic checks report passing status"],
  ['given', "the command exits with exit code 0"],
  ['given', "the repository has Git hooks installed and valid branch safety"],
  ['given', "JSON schemas and toolchain runtimes are valid"],
  ['given', "optional local signing keys are missing with fallback available"],
  ['then', "the diagnostic report highlights non-blocking warnings"],
  ['given', "the command exits with exit code 1"],
  ['given', "the repository environment has a critical defect \"<defect_type>\""],
  ['then', "the diagnostic report flags a critical failure with error \"<error_message>\""],
  ['given', "the command exits with exit code 2"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
