// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-056-sca-sbom-ingestion.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a dependency \"com.acme:lib\" UNRESOLVED locally and a valid \"<format>\" SBOM declaring \"pkg:maven/com.acme/lib@1.0\" with license \"Apache-2.0\""],
  ['when', "the SCA scan ingests the SBOM"],
  ['then', "the dependency \"com.acme:lib\" is audited with license \"Apache-2.0\" and provenance \"sbom-declared\""],
  ['given', "a valid CycloneDX SBOM with a component lacking licenses"],
  ['then', "the component license is \"UNKNOWN\""],
  ['given', "a dependency resolved locally as \"MIT\" and an SBOM declaring \"GPL-3.0\" for it"],
  ['then', "the license remains \"MIT\""],
  ['given', "an SBOM input with defect \"<defect>\""],
  ['then', "the scan fails with error \"<error>\""],
  ['given', "no partial dependencies are reported"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
