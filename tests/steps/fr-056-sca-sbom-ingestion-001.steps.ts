// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-056-sca-sbom-ingestion-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a dependency \"lib@1.0\" UNRESOLVED locally and a CycloneDX SBOM declaring \"MIT\""],
  ['when', "the scan runs with \"--sbom sbom.json\""],
  ['then', "\"lib@1.0\" has license \"MIT\" with provenance \"sbom-declared\""],
  ['given', "a dependency \"lib@1.0\" resolved locally as \"MIT\" and an SBOM declaring \"GPL-3.0\""],
  ['then', "the license of \"lib@1.0\" remains \"MIT\""],
  ['given', "a valid SPDX SBOM with package \"lib@1.0\" declaring license \"<value>\""],
  ['then', "the license of \"lib\" is \"UNKNOWN\""],
  ['given', "a lockfile with \"a@1\" and \"b@1\" and an SBOM with \"a@1\" and \"c@1\""],
  ['then', "warnings report \"b@1\" as missing and \"c@1\" as extra"],
  ['given', "an SBOM input with defect \"<defect>\""],
  ['then', "the scan fails with error \"<error>\""],
  ['given', "no dependencies are reported"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
