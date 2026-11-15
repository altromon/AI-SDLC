// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-042-bounded-contexts-and-docs-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "el directorio \"product/bounded-contexts\" en el repositorio"],
  ['when', "se validan los archivos \"BC-AI-SDLC-GOVERNANCE.md\", \"BC-OPERATOR-INTERFACE.md\" y \"BC-AGENT-INTERFACE.md\""],
  ['then', "todos los artefactos cumplen con \"bounded-context.schema.json\""],
  ['given', "declaran sus componentes asociados \"CMP-CORE\", \"CMP-CLI\" y \"CMP-MCP-SERVER\""],
  ['given', "los Bounded Contexts activos en la capa de producto"],
  ['when', "se ejecuta \"buildGraphElements\" para el dashboard"],
  ['then', "los nodos de tipo \"bounded-context\" se ubican en la capa \"product\""],
  ['given', "se generan aristas con relación \"encompasses\" hacia los componentes asociados"],
  ['given', "un archivo en \"product/bounded-contexts\" cuyo ID no inicia con \"BC-\""],
  ['when', "se ejecuta la verificación de esquemas"],
  ['then', "el validador reporta una infracción de esquema por ID inválido"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
