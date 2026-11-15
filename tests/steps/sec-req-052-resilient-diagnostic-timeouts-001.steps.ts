// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-052-resilient-diagnostic-timeouts-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a remote signing endpoint that induces latency exceeding 2000ms"],
  ['when', "the diagnostic command \"aisdlc doctor\" probes remote signing readiness"],
  ['then', "the probe must abort after at most 2000 milliseconds"],
  ['given', "the category must report a non-blocking warning \"ERR_NETWORK_PROBE_TIMEOUT\""],
  ['given', "the diagnostic process completes without hanging"],
  ['given', "an offline environment with no network connectivity to external registries"],
  ['when', "\"aisdlc doctor\" executes with valid local hooks, safe branch, and valid schemas"],
  ['then', "the toolchain and local health checks succeed"],
  ['given', "the offline network check emits a non-blocking warning"],
  ['given', "the overall process exits with exit code 1"],
  ['given', "an air-gapped environment with \"AI_SDLC_OFFLINE=1\" or flag \"--offline\""],
  ['when', "\"aisdlc doctor --offline --strict\" executes in a healthy local workspace"],
  ['then', "all remote network probes are skipped proactively"],
  ['given', "the diagnostics return overall pass status with exit code 0"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
