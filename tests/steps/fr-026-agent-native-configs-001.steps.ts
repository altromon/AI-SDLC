// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-026-agent-native-configs-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "un repositorio con directivas canónicas configuradas"],
  ['when', "se ejecuta la sincronización de configuraciones nativas de agentes"],
  ['then', "se generan los archivos de reglas para Cursor y Antigravity con la cabecera canónica"],
  ['given', "los archivos nativos de reglas coinciden con el hash canónico esperado"],
  ['when', "se ejecuta la verificación de deriva de reglas"],
  ['then', "la verificación concluye sin discrepancias"],
  ['given', "un archivo de reglas nativas alterado manualmente en disco"],
  ['then', "se reporta la discrepancia de hash respecto al contenido canónico"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
