// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-052-tamper-resistant-hook-verification-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a git hook file \".git/hooks/pre-commit\" that is empty or contains only a dummy \"exit 0\" without AI-SDLC markers"],
  ['when', "the diagnostic health check \"aisdlc doctor\" runs"],
  ['then', "the hooks category must fail with error code \"ERR_HOOKS_TAMPERED\""],
  ['given', "the process must terminate with exit code 2"],
  ['given', "a git hook file \".git/hooks/pre-commit\" containing the header \"# AI-SDLC: Universal Protected Branches Guard\" but missing branch rejection logic"],
  ['given', "a git hook \".git/hooks/pre-commit\" pointing as a symbolic link to an external target"],
  ['then', "the hooks category must fail with error code \"ERR_HOOKS_SYMLINK_REJECTED\""],
  ['given', "a git hook file \".git/hooks/pre-commit\" containing canonical AI-SDLC protected branches enforcement logic and exit 1 guard"],
  ['given', "a git hook file \".git/hooks/prepare-commit-msg\" containing canonical automated commit trailers injection hook"],
  ['given', "executable permissions are granted on both hook files without symlinks"],
  ['then', "the hooks category reports passing status with active tamper verification"],
  ['given', "the process continues diagnostic evaluation without hook-related failures"],
  ['given', "an existing non-canonical hook \".git/hooks/pre-commit\""],
  ['when', "\"aisdlc doctor --fix\" is executed"],
  ['then', "the original hook is backed up to \".git/hooks/pre-commit.bak.<timestamp>\""],
  ['given', "the canonical AI-SDLC hook is installed safely"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
