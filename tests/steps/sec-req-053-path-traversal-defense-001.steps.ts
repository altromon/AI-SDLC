// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-053-path-traversal-defense-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a migration source or target path containing \"../../../etc/passwd\" or \"..\\\\..\\\\system.ini\""],
  ['when', "the path resolver evaluates the target migration candidate"],
  ['then', "the operation must be aborted with error \"ERR_PATH_TRAVERSAL_DETECTED\""],
  ['given', "no file outside the repository boundary is opened, created, or modified"],
  ['given', "a resolved file path that resolves outside the canonical repository root"],
  ['when', "the migration engine validates the write target"],
  ['then', "the validation must fail with \"ERR_PATH_OUTSIDE_REPO_ROOT\""],
  ['given', "the process must terminate with exit code 2"],
  ['given', "a target file path pointing to a symlink referencing \"/etc/shadow\" or outside workspace"],
  ['when', "the migration engine inspects the destination target"],
  ['then', "the symlink write must be rejected with diagnostic \"ERR_SYMLINK_ESCAPE_DETECTED\""],
  ['given', "the migration must be aborted cleanly"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
