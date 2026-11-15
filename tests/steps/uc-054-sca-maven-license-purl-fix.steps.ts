// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-054-sca-maven-license-purl-fix.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a pom.xml whose root project declares license \"Apache-2.0\""],
  ['given', "a dependency \"com.acme:lib:1.0\" with no license information"],
  ['when', "the SCA scan runs"],
  ['then', "the dependency license is \"UNKNOWN\""],
  ['given', "a pom.xml with root license \"MIT\" and no dependencies"],
  ['then', "no dependency is reported with license \"MIT\""],
  ['given', "a vulnerable dependency \"<name>@<version>\" of ecosystem \"<ecosystem>\""],
  ['when', "the CycloneDX SBOM is generated"],
  ['then', "the vulnerability affects ref is \"<purl>\""],
  ['given', "it does not start with \"pkg:npm/\" unless ecosystem is \"npm\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
