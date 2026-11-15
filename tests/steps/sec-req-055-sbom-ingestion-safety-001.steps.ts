// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-055-sbom-ingestion-safety-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "an SBOM file larger than 50 MiB"],
  ['when', "the SBOM ingestor loads it"],
  ['then', "it must be rejected with \"ERR_SBOM_TOO_LARGE\" before parsing"],
  ['given', "an SBOM in XML containing an external entity \"file:///etc/passwd\""],
  ['when', "the ingestor loads it"],
  ['then', "it must be rejected with \"ERR_SBOM_UNSUPPORTED\""],
  ['given', "no file content appears in the output"],
  ['given', "an SBOM JSON containing the key \"__proto__\""],
  ['when', "the ingestor parses it"],
  ['then', "it must be rejected with \"ERR_SBOM_UNSAFE_KEY\""],
  ['given', "an SBOM JSON nested deeper than 64 levels"],
  ['then', "it must be rejected with \"ERR_SBOM_LIMIT_EXCEEDED\""],
  ['given', "an SBOM path that is a symlink leaving the root or a non-regular file"],
  ['when', "the ingestor opens it"],
  ['then', "it must be rejected without reading its content"],
  ['given', "an SBOM with externalReferences and purl URLs"],
  ['when', "the ingestor processes it"],
  ['then', "no network request is made"],
  ['given', "an SBOM path whose realpath is outside the allowed root"],
  ['when', "the ingestor resolves the path"],
  ['then', "it must be rejected"],
  ['given', "a dependency resolved locally as \"MIT\" and an SBOM declaring \"GPL-3.0\""],
  ['when', "licenses are merged"],
  ['then', "the local license \"MIT\" is kept"],
  ['given', "no SBOM license is applied to that dependency"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
