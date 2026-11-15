// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-054-sca-maven-license-and-purl-fix.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a pom.xml declaring project license \"Apache-2.0\" and a dependency \"com.acme:lib\" without license"],
  ['when', "the SCA scan runs"],
  ['then', "the license of \"com.acme:lib\" is \"UNKNOWN\""],
  ['given', "a \"<ecosystem>\" dependency \"<name>\" at \"<version>\" with a vulnerability"],
  ['when', "the CycloneDX SBOM is generated"],
  ['then', "the vulnerability affects ref is \"<purl>\""],
  ['given', "it equals the purl of the component"],
  ['given', "a dependency with an unrecognized ecosystem"],
  ['then', "the purl starts with \"pkg:generic/\""],
  ['given', "a warning is emitted"],
  ['given', "no \"pkg:npm\" purl is produced"],
  ['given', "a Trivy package and a Syft artifact without purl and with a Go type"],
  ['when', "their output is parsed"],
  ['then', "the purl is built by buildPurl for the real ecosystem"],
  ['given', "the trivy and syft command lines remain unchanged"],
  ['given', "a pom.xml with \"<defect>\""],
  ['then', "the dependency license is \"UNKNOWN\""],
  ['given', "no entity is expanded"],
  ['given', "a pom.xml declaring an external entity \"file:///etc/passwd\""],
  ['when', "the pom is parsed"],
  ['then', "the pom is rejected with a sanitized warning"],
  ['given', "no file content or absolute path appears in the output"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
