// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-055-cli-hijack-resistance-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a scanned repo containing an executable named \"cargo\" in its root and in \"node_modules/.bin\""],
  ['when', "runSafe resolves the binary"],
  ['then', "it must resolve only from absolute system PATH entries"],
  ['given', "the planted executable is never spawned"],
  ['given', "a repo with \".cargo/config.toml\" defining \"rustc-wrapper\""],
  ['when', "the license resolver evaluates the Rust dependency"],
  ['then', "\"cargo metadata\" must not be executed"],
  ['given', "resolution falls back to local registry metadata or UNRESOLVED"],
  ['given', "a scanned repo on Windows containing \"go.exe\" and \"go.cmd\" in its root"],
  ['then', "it must not search the cwd"],
  ['given', "no \".cmd\" or \".bat\" shim is executed through a shell"],
  ['given', "a dependency whose license is readable from local metadata"],
  ['when', "resolveLicense runs"],
  ['then', "no external CLI is invoked"],
  ['given', "a Maven dependency with groupId \"../../etc\""],
  ['when', "the resolver builds the path under \"~/.m2\""],
  ['then', "the realpath must stay inside \"~/.m2\""],
  ['given', "the dependency is reported UNRESOLVED with reason \"cache_missing\""],
  ['given', "a repo containing \"sitecustomize.py\""],
  ['when', "runSafe launches \"pip-licenses\""],
  ['then', "the environment must include \"PYTHONNOUSERSITE=1\" and exclude \"PYTHONPATH\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
