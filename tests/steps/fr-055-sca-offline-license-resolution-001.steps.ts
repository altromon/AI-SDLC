// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-055-sca-offline-license-resolution-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a python project with .venv METADATA declaring \"MIT\" for \"requests\""],
  ['when', "the SCA scan runs offline"],
  ['then', "\"requests\" has license \"MIT\""],
  ['given', "no external CLI is spawned"],
  ['given', "a go project without LICENSE in GOMODCACHE for module \"github.com/a/b\""],
  ['given', "\"go\" is available in the system PATH"],
  ['when', "the SCA scan runs with network denied"],
  ['then', "\"go list -m -json all\" is spawned with shell disabled, GOFLAGS \"-mod=readonly\" and GOPROXY \"off\""],
  ['given', "a dependency whose resolution fails with \"<cause>\""],
  ['then', "the license is \"UNRESOLVED\" with cause \"<cause>\""],
  ['given', "Gate 6 treats it exactly as \"UNKNOWN\""],
  ['given', "the scan completes without fatal error"],
  ['given', "a repository containing \"<blocker>\""],
  ['when', "the license resolver evaluates a dependency needing the CLI"],
  ['then', "no CLI process is spawned"],
  ['given', "the license is \"UNRESOLVED\" with cause \"blocked_by_repo_config\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
