// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-055-safe-exec-hardening-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a request to resolve licenses with \"cargo\""],
  ['when', "runSafe launches the process"],
  ['then', "it must use \"shell: false\" and arguments [\"metadata\",\"--offline\",\"--locked\",\"--frozen\",\"--format-version\",\"1\"]"],
  ['given', "no shell interpreter \"/bin/sh\" or \"cmd.exe\" is spawned"],
  ['given', "a repository containing \"<blocker>\""],
  ['when', "runSafe is asked to launch \"<cli>\""],
  ['then', "it must refuse and no process is spawned"],
  ['given', "the dependency is UNRESOLVED with reason \"blocked_by_repo_config\""],
  ['given', "a request to run \"<cli>\""],
  ['when', "runSafe builds the argv"],
  ['then', "the argv must contain \"--ignore-scripts\""],
  ['given', "\"mvn\" never receives the goal \"license:download-licenses\""],
  ['given', "a CLI that prints nothing or invalid JSON"],
  ['when', "runSafe parses its stdout"],
  ['then', "the dependency is UNRESOLVED with reason \"invalid_output\""],
  ['given', "a go project with a go.mod"],
  ['when', "runSafe launches \"go list -m -json all\""],
  ['then', "the environment must contain \"GOFLAGS=-mod=readonly\", \"GOPROXY=off\" and \"GOTOOLCHAIN=local\""],
  ['given', "go.mod and go.sum must remain byte-identical"],
  ['given', "an environment containing \"RUSTC_WRAPPER=/tmp/evil\" and \"PYTHONPATH=/tmp/evil\" and \"NODE_OPTIONS=--require /tmp/x.js\""],
  ['when', "runSafe launches any allowed binary"],
  ['then', "those variables must be purged from the child environment"],
  ['given', "only whitelisted variables are provided"],
  ['given', "a cwd whose realpath resolves outside the scan root"],
  ['when', "runSafe validates the cwd"],
  ['then', "it must return UNRESOLVED without executing the process"],
  ['given', "a CLI that hangs or emits more than maxBuffer bytes"],
  ['when', "runSafe waits for completion"],
  ['then', "the process is killed and the result is UNRESOLVED with reason \"cli_timeout\""],
  ['given', "the scan continues without a fatal exception"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
