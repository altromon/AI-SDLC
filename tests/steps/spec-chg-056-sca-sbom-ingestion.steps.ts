// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-056-sca-sbom-ingestion.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a dependency \"lib@1.0\" UNRESOLVED locally and a valid \"<format>\" SBOM declaring \"MIT\" for it"],
  ['when', "the scan runs with \"--sbom sbom.json\""],
  ['then', "\"lib@1.0\" has license \"MIT\" with provenance \"sbom-declared\""],
  ['given', "a dependency \"lib@1.0\" resolved locally as \"MIT\" and an SBOM declaring \"GPL-3.0\""],
  ['then', "the license of \"lib@1.0\" remains \"MIT\""],
  ['given', "an \"sbom.json\" at the project root"],
  ['when', "the scan runs without \"--sbom\""],
  ['then', "the file is never opened"],
  ['given', "an SPDX SBOM with package \"lib@1.0\" declaring license \"<value>\""],
  ['then', "the license of \"lib\" is \"UNKNOWN\""],
  ['given', "a lockfile with \"a@1\" and \"b@1\" and an SBOM with \"a@1\" and \"c@1\""],
  ['then', "warnings list \"b@1\" as missing and \"c@1\" as extra in canonical order"],
  ['given', "an SBOM with <what>"],
  ['then', "the result is \"<result>\""],
  ['given', "an SBOM input with defect \"<defect>\""],
  ['then', "the scan fails with error \"<error>\""],
  ['given', "no dependencies are reported"],
  ['given', "an SBOM path that is a symlink to a file outside the root"],
  ['when', "the ingestor opens it"],
  ['then', "it is rejected with \"ERR_SBOM_PATH_OUTSIDE_ROOT\" without reading the content"],
  ['given', "an SBOM with externalReferences URLs"],
  ['when', "the SBOM is ingested"],
  ['then', "no network request is made"],
  ['given', "an SBOM license with ANSI sequences or more than 200 characters"],
  ['then', "the license is \"UNKNOWN\""],
  ['given', "errors and warnings contain no absolute paths"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
