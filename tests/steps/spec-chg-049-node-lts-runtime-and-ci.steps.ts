// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-049-node-lts-runtime-and-ci.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "the root \"package.json\" manifest"],
  ['when', "inspecting the engines field"],
  ['then', "\"engines.node\" matches \">=20.0.0\""],
  ['given', "the GitHub Actions workflow \".github/workflows/ci.yml\""],
  ['when', "inspecting the verify-and-test job matrix"],
  ['then', "\"matrix.node-version\" contains exactly \"20.x\" and \"22.x\""],
  ['given', "\"matrix.node-version\" does not contain \"18.x\""],
  ['given', "an operational Node.js LTS environment running version \"<supported_version>\""],
  ['when', "the full test suite \"pnpm test\" is executed"],
  ['then', "all test suites pass without regressions"],
  ['given', "the starter workflow template \"templates/ci/github-workflows/ci.yml\""],
  ['when', "inspecting the matrix configuration"],
  ['then', "\"matrix.node-version\" targets only supported versions \"20.x\" and \"22.x\""],
  ['given', "an environment running Node.js \"<unsupported_version>\""],
  ['when', "runtime compatibility is evaluated against package.json engines"],
  ['then', "the engine range \">=20.0.0\" rejects the environment"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
