// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-079-sca-recursive-doctor-toolchains.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a polyglot repository containing nested \".NET\" (\"*.csproj\", \"Directory.Packages.props\", \"packages.lock.json\"), \"Gradle\" (\"build.gradle.kts\", \"gradle.lockfile\"), and \"Python\" (\"requirements.txt\") manifests within depth 3"],
  ['when', "\"scanWithNativeFs\" runs on the repository root and \"ToolchainHealthCheck.inspect\" runs on the repository"],
  ['then', "\"scanWithNativeFs\" emits \"pkg:nuget/\", \"pkg:maven/\", and \"pkg:pypi/\" dependencies resolved via their ecosystem license resolvers"],
  ['given', "\"ToolchainHealthCheck.inspect\" probes the native binaries for the stacks returned by \"detectProjectStacks\""],
  ['given', "a repository state with \"<condition>\""],
  ['when', "\"<operation>\" executes on the repository"],
  ['then', "the outcome satisfies \"<expected_behavior>\""],
  ['given', "a repository with a malformed manifest or a detected stack whose native binary is missing from PATH"],
  ['when', "\"scanWithNativeFs\" and \"ToolchainHealthCheck.inspect\" run"],
  ['then', "\"scanWithNativeFs\" completes without throwing on malformed manifests"],
  ['given', "\"ToolchainHealthCheck.inspect\" reports a structured \"fail\" finding with remediation for the missing binary"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
