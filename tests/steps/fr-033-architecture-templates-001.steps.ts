// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-033-architecture-templates-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "el directorio \"templates/architecture/\" del framework"],
  ['when', "las pruebas automatizadas inspeccionan todas las plantillas de arquitectura"],
  ['then', "existen las plantillas de las secciones 1 a 12 con YAML frontmatter válido"],
  ['given', "cualquier plantilla en \"templates/architecture/\""],
  ['when', "se analiza su cabecera YAML frontmatter"],
  ['then', "contiene \"id\", \"type\", \"version\" y \"status\" conformes con arc42 y NAF v4"],
  ['given', "una plantilla de arquitectura ausente o con cabecera YAML malformada"],
  ['when', "se ejecuta la suite de validación de plantillas"],
  ['then', "la prueba falla identificando la plantilla no conforme"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
