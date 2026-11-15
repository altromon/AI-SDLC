// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-053-cli-migrate-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "the repository has unmodified baseline schemas, templates, and policies"],
  ['when', "the command \"aisdlc migrate\" is executed"],
  ['then', "all canonical schemas, templates, and policies are synchronized"],
  ['given', "a timestamped backup directory is created under \".backup\""],
  ['given', "the command exits with exit code 0"],
  ['given', "pending upstream updates exist for repository schemas and policies"],
  ['when', "the command \"aisdlc migrate --dry-run\" is executed"],
  ['then', "a detailed migration preview plan is displayed in standard output"],
  ['given', "no files in the workspace are modified or created"],
  ['given', "the repository contains local user modifications in \"quality-policy.yaml\""],
  ['when', "the command \"aisdlc migrate\" is executed without \"--force\""],
  ['then', "the locally modified \"quality-policy.yaml\" is preserved unchanged"],
  ['given', "the migration report notes the skipped override"],
  ['given', "the command exits with exit code 1"],
  ['when', "the command \"aisdlc migrate --force --backup\" is executed"],
  ['then', "a timestamped backup of existing files is created under \".backup\""],
  ['given', "\"quality-policy.yaml\" is updated to the latest canonical version"],
  ['given', "the migration environment encounters a critical condition \"<critical_condition>\""],
  ['then', "the execution terminates reporting critical error \"<error_code>\""],
  ['given', "the command exits with exit code 2"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
