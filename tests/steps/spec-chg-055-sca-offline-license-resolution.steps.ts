// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-055-sca-offline-license-resolution.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a python project with .venv METADATA declaring \"MIT\" for \"requests\""],
  ['when', "the SCA scan runs with network denied"],
  ['then', "\"requests\" has license \"MIT\" with provenance \"local-metadata\""],
  ['given', "no external CLI is spawned"],
  ['given', "a \"<ecosystem>\" project without local license metadata"],
  ['given', "\"<cli>\" is available in an absolute system PATH entry outside the project"],
  ['then', "\"<cli>\" is spawned with shell disabled and argv \"<argv>\""],
  ['given', "the child environment contains \"<env>\""],
  ['given', "a dependency whose resolution fails with \"<cause>\""],
  ['when', "the SCA scan runs and Gate 6 evaluates the result"],
  ['then', "the license is \"UNRESOLVED\" with reason \"<cause>\""],
  ['given', "the gate verdict, exit code and report are identical to those of \"UNKNOWN\""],
  ['given', "the scan completes without fatal error"],
  ['given', "a CLI that prints nothing or garbled output"],
  ['when', "its stdout is parsed"],
  ['then', "the dependency is \"UNRESOLVED\" with reason \"invalid_output\""],
  ['given', "a repository containing \"<blocker>\""],
  ['when', "the resolver evaluates a dependency that needs \"<cli>\""],
  ['then', "no process is spawned"],
  ['given', "the license is \"UNRESOLVED\" with reason \"blocked_by_repo_config\""],
  ['given', "50 manifests whose CLI each hangs"],
  ['when', "the scan runs"],
  ['then', "each invocation is killed after at most 10 seconds"],
  ['given', "once the global budget is exhausted the remaining dependencies are \"UNRESOLVED\" with reason \"budget_exceeded\""],
  ['given', "executables named \"cargo\" in the repo root and in \"node_modules/.bin\""],
  ['when', "the binary is resolved"],
  ['then', "only absolute system PATH entries outside the root are used"],
  ['given', "the planted executable is never spawned"],
  ['given', "go.exe and go.cmd in the project root on Windows"],
  ['then', "the cwd is not searched and no .cmd shim runs through a shell"],
  ['given', "RUSTC_WRAPPER, PYTHONPATH, NODE_OPTIONS, MAVEN_OPTS, JAVA_TOOL_OPTIONS, DOTNET_ROOT and HTTP_PROXY are set"],
  ['when', "any allowed CLI is launched"],
  ['then', "none of them reaches the child environment"],
  ['given', "a CLI failing with an absolute path and a secret in stderr"],
  ['when', "the report is generated"],
  ['then', "only the unresolvedReason enum value is reported"],
  ['given', "a Maven dependency with groupId \"../../etc\""],
  ['when', "the pom path under \"~/.m2\" is built"],
  ['then', "the realpath must stay inside \"~/.m2\""],
  ['given', "the dependency is \"UNRESOLVED\" with reason \"path_rejected\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
