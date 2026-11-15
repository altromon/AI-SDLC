// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-053-non-destructive-backup-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a repository with existing policy files \"quality-policy.yaml\" and \"license-policy.yaml\""],
  ['when', "the migration command is executed with write actions"],
  ['then', "a timestamped backup directory is created under \".backup\""],
  ['given', "a \"manifest.json\" containing Unix LF SHA-256 digests for all backed up files is generated"],
  ['given', "original policy content matches the backed up replica byte-by-byte"],
  ['given', "a repository where \"quality-policy.yaml\" contains customized enterprise thresholds"],
  ['when', "the command \"aisdlc migrate\" is executed without \"--force\""],
  ['then', "the local \"quality-policy.yaml\" file is retained untouched on disk"],
  ['given', "a warning is output indicating an override conflict was preserved"],
  ['given', "the command exits with exit code 1"],
  ['given', "an automated migration backup operation"],
  ['when', "the backup directory \".backup\" is initialized"],
  ['then', "the directory permissions must be restricted to the active user"],
  ['given', "the \".backup\" path is ensured to be tracked in \".gitignore\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
