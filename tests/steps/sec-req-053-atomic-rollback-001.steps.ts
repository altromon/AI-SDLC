// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-053-atomic-rollback-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a migration process in progress where an I/O write error occurs midway"],
  ['when', "the error is trapped by the migration transaction manager"],
  ['then', "all partially modified files are rolled back to their exact pre-migration state"],
  ['given', "temporary staging directories are cleaned up"],
  ['given', "the command exits with exit code 2"],
  ['given', "a candidate schema file that is syntactically invalid or truncated to 0 bytes"],
  ['when', "the pre-commit integrity validator inspects the staged schema files"],
  ['then', "the staged migration transaction is aborted"],
  ['given', "no corrupted files are promoted to the active \"schemas/\" directory"],
  ['given', "diagnostic error \"ERR_MIGRATION_VALIDATION_FAILED\" is logged"],
  ['given', "a successful migration execution"],
  ['when', "all validated files are promoted to the active workspace"],
  ['then', "any temporary staging artifacts are completely removed"],
  ['given', "the process exits with exit code 0"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
