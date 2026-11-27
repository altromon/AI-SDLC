// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-031-workflow-agent-handoff-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "una tarea completada con nivel de autonomía \"HUMAN_REVIEW_PLAN\""],
  ['when', "el agente concluye su fase y genera el handoff"],
  ['then', "emite el bloque con entregables, rol recomendado y prompt para el siguiente agente"],
  ['given', "un handoff emitido al finalizar una fase crítica"],
  ['when', "el flujo alcanza la transición entre roles especialistas"],
  ['then', "el agente se detiene sin invocar la siguiente fase de forma desatendida"],
  ['given', "un bloque de handoff que omite el rol destinatario o los artefactos producidos"],
  ['when', "se valida el handoff frente a la plantilla agent-handoff"],
  ['then', "la validación reporta la falta de trazabilidad del handoff"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
