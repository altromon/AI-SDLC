// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-obs-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "el sistema de observabilidad está inicializado con nivel \"INFO\""],
  ['when', "se procesa una operación con trace_id \"trace-100\" y span_id \"span-200\""],
  ['then', "se emite un registro JSON que contiene \"level\", \"trace_id\", \"span_id\" y \"message\""],
  ['given', "el nivel de log está configurado en \"<configured_level>\""],
  ['when', "se intenta emitir un mensaje de nivel \"<event_level>\""],
  ['then', "el mensaje es \"<action>\" según la jerarquía de severidad"],
  ['given', "un payload que contiene datos sensibles o PII"],
  ['when', "el evento se escribe en el logger estructurado"],
  ['then', "los campos sensibles son enmascarados impidiendo fugas de privacidad"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
