// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-059-polyglot-cli-orchestration.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a repository with \"<ecosystem>\" project markers and \"<tool>\" installed"],
  ['when', "the verifier runs \"verify sast --orchestrate\""],
  ['then', "\"<tool>\" is invoked with \"shell: false\" to emit a SARIF 2.1.0 report in a temp directory"],
  ['given', "the SARIF report is ingested deterministically via CHG-057 and evaluated against quality-policy.yaml"],
  ['given', "the temporary SARIF directory is cleaned up after execution"],
  ['given', "an interactive TTY session where \"<tool>\" is missing on OS \"<os>\""],
  ['when', "the user runs \"verify <command>\" and confirms the allowlisted install command"],
  ['then', "the allowlisted non-sudo installer runs with \"shell: false\""],
  ['given', "the verification proceeds using \"<tool>\""],
  ['given', "a non-interactive environment with \"CI=true\" and \"semgrep\" missing"],
  ['then', "no interactive stdin prompt is shown"],
  ['given', "a non-blocking warning with install instructions is emitted"],
  ['given', "built-in SAST rules still execute"],
  ['given', "quality-policy.yaml sets \"fail_on_missing_tool: true\""],
  ['given', "\"trivy\" is missing in a \"--non-interactive\" session"],
  ['when', "the verifier runs \"verify licenses --tool trivy --non-interactive\""],
  ['then', "the verification fails without blocking on stdin"],
  ['given', "the error reports the missing tool \"trivy\" and its allowlisted install command"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
