// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-059-polyglot-cli-orchestration-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a repository containing \"<ecosystem>\" markers and \"<tool>\" available on PATH"],
  ['when', "the verifier runs \"aisdlc verify sast --orchestrate\""],
  ['then', "\"<tool>\" executes with shell false outputting SARIF 2.1.0 into a temporary directory"],
  ['given', "findings are ingested via ingestSarifFiles and sorted canonically by relPath, lineNumber, and ruleId"],
  ['given', "the temporary SARIF directory is removed after verification"],
  ['given', "an interactive TTY session on \"<platform>\" where \"<tool>\" is not installed"],
  ['given', "the user confirms the prompt displaying the allowlisted \"<platform>\" command"],
  ['when', "the verifier runs \"aisdlc verify <subcommand>\""],
  ['then', "the allowlisted command executes with shell false and without sudo"],
  ['given', "\"<tool>\" runs as part of the verification"],
  ['given', "an interactive TTY session where \"semgrep\" is missing"],
  ['given', "the user declines the installation prompt"],
  ['when', "the verifier runs \"aisdlc verify sast --semgrep\""],
  ['then', "no installation command is executed"],
  ['given', "the verifier falls back cleanly to built-in SAST_RULES"],
  ['given', "\"<tool>\" is not installed on PATH"],
  ['given', "the environment or CLI sets \"<flag_or_env>\""],
  ['then', "no stdin prompt is requested"],
  ['given', "a warning containing the allowlisted install command is emitted"],
  ['given', "the verifier completes using built-in fallback rules"],
  ['given', "a repository with Python markers and \"bandit\" exiting with an error"],
  ['when', "the verifier runs \"aisdlc verify sast --orchestrate --non-interactive\""],
  ['then', "the temporary SARIF directory is still removed in finally cleanup"],
  ['given', "quality-policy.yaml sets \"fail_on_missing_tool: true\""],
  ['given', "\"trivy\" is missing from PATH"],
  ['when', "the verifier runs \"aisdlc verify licenses --tool trivy --non-interactive\""],
  ['then', "the verification exits with failure"],
  ['given', "the output identifies \"trivy\" as missing along with its allowlisted install command"],
  ['given', "a missing tool request outside the static OS allowlist or containing \"sudo\""],
  ['when', "the installer resolves the command for execution"],
  ['then', "execution is rejected with a security validation error and no process is spawned"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
