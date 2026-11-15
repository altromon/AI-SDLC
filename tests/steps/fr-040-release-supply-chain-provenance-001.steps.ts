// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-040-release-supply-chain-provenance-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "el archivo de workflow de GitHub Actions \".github/workflows/release.yml\""],
  ['when', "se audita la configuración de permisos y publicación"],
  ['then', "contiene el permiso \"id-token: write\" y \"attestations: write\""],
  ['given', "el comando de publicación de changesets incluye \"--provenance\""],
  ['given', "incluye la instalación de Cosign con \"sigstore/cosign-installer\""],
  ['given', "incluye la acción de atestación de procedencia SLSA \"actions/attest-build-provenance\""],
  ['given', "la plantilla de documentación técnica \"templates/manuals/production-manual.template.md\""],
  ['when', "se audita la sección de verificación criptográfica de la release"],
  ['then', "incluye el comando de verificación con Cosign utilizando \"cosign verify-blob\""],
  ['given', "incluye el comando de verificación de atestación SLSA utilizando \"gh attestation verify\""],
  ['given', "la plantilla satisface el esquema institucional \"production-manual.schema.json\""],
  ['given', "una configuración de pipeline donde se omite \"--provenance\" o falta el permiso \"id-token: write\""],
  ['when', "se ejecuta la auditoría estricta de Supply Chain Security"],
  ['then', "la validación detecta incumplimiento de procedencia"],
  ['given', "se marca la configuración como no conforme con el estándar AI-SDLC"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
