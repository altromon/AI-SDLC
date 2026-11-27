// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-029-expert-user-agent-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "una especificación y diseño sometidos a evaluación de usabilidad"],
  ['when', "agent-expert-user emite el informe siguiendo la plantilla canónica"],
  ['then', "el informe separa los hallazgos entre núcleo MVP y banco de ideas de roadmap"],
  ['given', "un diseño cuyo alcance coincide íntegramente con el núcleo MVP"],
  ['when', "agent-expert-user genera el informe de feedback"],
  ['then', "la sección de roadmap se mantiene explícitamente vacía sin omitir la estructura canónica"],
  ['given', "un borrador de informe sin separación entre requisitos MVP y roadmap"],
  ['when', "se valida la conformidad con la plantilla user-design-feedback"],
  ['then', "la validación detecta la omisión estructural"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
