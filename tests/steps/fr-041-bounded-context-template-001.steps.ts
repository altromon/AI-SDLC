// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-041-bounded-context-template-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "un directorio vacío para un nuevo proyecto"],
  ['when', "se ejecuta la inicialización mediante \"initProject\""],
  ['then', "el archivo \"templates/product/bounded-context.template.md\" existe en el disco"],
  ['given', "contiene frontmatter válido con tipo \"bounded-context\" y prefijo \"BC-\""],
  ['given', "define secciones para propósito, lenguaje ubicuo, mapeo de contextos y componentes"],
  ['given', "el catálogo central \"STARTER_BASE_TEMPLATES\" exportado por \"@aisdlc/core\""],
  ['when', "se consulta la colección de plantillas de producto"],
  ['then', "existe una entrada con ruta relativa \"templates/product/bounded-context.template.md\""],
  ['given', "su contenido contiene el encabezado \"# BC-NAME-001: Bounded Context Name\""],
  ['given', "un catálogo de plantillas donde falta \"templates/product/bounded-context.template.md\""],
  ['when', "se ejecuta la verificación de integridad de scaffolding"],
  ['then', "la validación reporta la ausencia de la plantilla de Bounded Context"],
  ['given', "se marca la conformidad de templates como fallida"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
