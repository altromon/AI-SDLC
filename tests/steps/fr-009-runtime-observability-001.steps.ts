// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-009-runtime-observability-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "el componente \"CMP-CORE\" emite un evento informativo con mensaje \"Proceso completado\""],
  ['when', "se procesa la salida a través de ILogger"],
  ['then', "se genera una línea JSON válida con los campos \"timestamp\", \"level\", \"service\" y \"message\""],
  ['given', "el campo \"level\" tiene el valor \"info\""],
  ['given', "la variable de entorno \"LOG_LEVEL\" está configurada como \"warn\""],
  ['when', "se registran mensajes con niveles \"debug\", \"info\", \"warn\" y \"error\""],
  ['then', "los mensajes con nivel \"debug\" e \"info\" son descartados"],
  ['given', "los mensajes con nivel \"warn\" y \"error\" son emitidos correctamente"],
  ['given', "una cabecera \"traceparent\" válida de formato W3C"],
  ['when', "la operación inicia un tramo (span) hijo"],
  ['then', "el identificador \"trace_id\" se propaga al span y a todos los logs asociados"],
  ['given', "se genera un nuevo \"span_id\" correlacionado"],
  ['given', "se ejecutan operaciones con métricas de conteo y duración"],
  ['when', "se invoca el exportador de métricas para scraping"],
  ['then', "la salida cumple con la especificación de formato texto de Prometheus"],
  ['given', "incluye contadores de peticiones y duraciones de latencia"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
