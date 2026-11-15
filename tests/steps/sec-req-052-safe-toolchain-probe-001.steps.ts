// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-052-safe-toolchain-probe-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a request to probe toolchain versions for \"node\", \"pnpm\", and \"git\""],
  ['when', "the diagnostic probes are launched by the doctor runner"],
  ['then', "each probe process must be invoked with \"shell: false\" and arguments array [\"--version\"]"],
  ['given', "no shell interpreter executable \"/bin/sh\" or \"cmd.exe\" is spawned"],
  ['given', "an environment containing \"NODE_OPTIONS=--require /tmp/malicious.js\" and \"LD_PRELOAD=/tmp/libevil.so\""],
  ['when', "the SafeProcessRunnerAdapter executes a toolchain probe"],
  ['then', "\"NODE_OPTIONS\", \"NODE_PATH\", \"LD_PRELOAD\", \"DYLD_INSERT_LIBRARIES\", and \"GIT_EXEC_PATH\" must be purged from child process environment"],
  ['given', "only the sanitized whitelisted environment variables are provided"],
  ['given', "a request to diagnose an untrusted toolchain executable \"evil_tool; rm -rf /\""],
  ['when', "the doctor probe scheduler evaluates the executable name"],
  ['then', "the probe must be rejected with diagnostic \"ERR_UNAUTHORIZED_PROBE_TOOL\""],
  ['given', "no process execution is attempted"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
