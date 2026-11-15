// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-059-cli-orchestration-safety-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "an allowlisted SAST tool \"semgrep\" and a valid project workspace"],
  ['when', "the SAST CLI orchestrator executes the scan"],
  ['then', "the subprocess is invoked via \"execFileSync\" or \"spawnSync\" with \"shell: false\" and an explicit argument array"],
  ['given', "SARIF output is written inside a restrictive \"mkdtempSync\" directory"],
  ['given', "the generated SARIF report is validated through \"parseSarifDocument\" or \"ingestSarifFiles\""],
  ['given', "the temporary directory is removed via \"rmSync\" in a \"finally\" block"],
  ['given', "an execution condition \"<condition>\""],
  ['when', "the SAST CLI orchestrator runs tool discovery or execution"],
  ['then', "it never blocks awaiting stdin"],
  ['given', "the subprocess terminates within its bounded timeout"],
  ['given', "an untrusted input or repository artifact attempting \"<attack_vector>\""],
  ['when', "the SAST CLI orchestrator resolves the tool binary or install command"],
  ['then', "only hardcoded immutable allowlist binaries and OS-specific install commands are permitted"],
  ['given', "\"sudo\" or shell interpolation is never invoked"],
  ['given', "a SAST CLI subprocess that fails with host paths and sensitive environment variables in stderr"],
  ['when', "the orchestrator handles the failure and emits diagnostics"],
  ['then', "the temporary SARIF directory is still deleted in \"finally\""],
  ['given', "diagnostics do not leak host \"rootDir\" or sensitive environment variables"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
