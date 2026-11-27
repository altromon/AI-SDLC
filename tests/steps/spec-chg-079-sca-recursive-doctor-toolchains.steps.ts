// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-079-sca-recursive-doctor-toolchains.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a polyglot repository containing nested \".NET\" (\"*.csproj\", \"Directory.Packages.props\", \"packages.lock.json\"), \"Gradle\" (\"build.gradle.kts\", \"gradle.lockfile\"), and \"Python\" (\"requirements.txt\") manifests within depth 3"],
  ['when', "\"scanWithNativeFs\" and \"scanDependencies\" run on the repository root and \"ToolchainHealthCheck.inspect\" runs on the repository"],
  ['then', "\"scanWithNativeFs\" emits raw \"pkg:nuget/\", \"pkg:maven/\", and \"pkg:pypi/\" dependencies with \"path\" pointing to the discovered manifest/lockfile and \"scanDependencies\" resolves their licenses via \"resolveLicense\" (including nested \".venv\"/\"venv\" \"site-packages\")"],
  ['given', "\"ToolchainHealthCheck.inspect\" probes the native binaries for the stacks returned by \"detectProjectStacks\""],
  ['given', "a repository state with \"<condition>\""],
  ['when', "\"<operation>\" executes on the repository"],
  ['then', "the outcome satisfies \"<expected_behavior>\""],
  ['given', "a repository with a malformed manifest or a detected stack whose native binary is missing from PATH"],
  ['when', "\"scanWithNativeFs\" and \"ToolchainHealthCheck.inspect\" run"],
  ['then', "\"scanWithNativeFs\" completes without throwing on malformed manifests"],
  ['given', "\"ToolchainHealthCheck.inspect\" reports a structured \"fail\" finding with remediation for the missing binary"],
  ['given', "a repository containing a symlinked directory pointing outside rootDir and detected native stacks"],
  ['when', "\"scanWithNativeFs\" traverses the directory tree and \"ToolchainHealthCheck.inspect\" probes stack binaries via \"SafeProcessRunnerAdapter\""],
  ['then', "symlinks are skipped without escaping rootDir or entering infinite loops"],
  ['given', "only allowlisted stack executables are invoked with \"shell: false\" and sanitized environment"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
