// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-054-sca-maven-license-purl-fix-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a pom.xml declaring project license \"Apache-2.0\" and a dependency without license"],
  ['when', "the SCA scan runs"],
  ['then', "the dependency license is \"UNKNOWN\""],
  ['given', "a \"<ecosystem>\" dependency \"<name>\" at \"<version>\" with a vulnerability"],
  ['when', "the CycloneDX SBOM is generated"],
  ['then', "the vulnerability affects ref is \"<purl>\""],
  ['given', "it equals the component purl"],
  ['given', "a dependency with an unrecognized ecosystem"],
  ['then', "the purl starts with \"pkg:generic/\" and a warning is emitted"],
  ['given', "no \"pkg:npm\" is produced"],
  ['given', "a pom.xml dependency block with a comment \"<!-- license: MIT -->\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
