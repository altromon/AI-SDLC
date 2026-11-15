// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-009-runtime-observability.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "el cliente de logging se encuentra configurado para \"CMP-CORE\""],
  ['when', "se registra un mensaje \"Operación ejecutada\" con nivel \"info\" y contexto activo"],
  ['then', "se emite una línea JSON conteniendo \"timestamp\", \"level\", \"service\", \"trace_id\", \"span_id\" y \"message\""],
  ['given', "el campo \"level\" es \"info\""],
  ['given', "los identificadores \"trace_id\" y \"span_id\" coinciden con el tramo actual"],
  ['given', "la variable de entorno \"LOG_LEVEL\" está configurada como \"<configured_level>\""],
  ['when', "se emite un registro con nivel \"<event_level>\""],
  ['then', "el resultado del filtrado es \"<action>\""],
  ['given', "una cabecera W3C \"traceparent\" válida \"00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01\""],
  ['when', "se procesa una llamada asíncrona iniciando un nuevo tramo"],
  ['then', "el nuevo span conserva el \"trace_id\" \"4bf92f3577b34da6a3ce929d0e0e4736\""],
  ['given', "genera un nuevo identificador \"span_id\" hijo diferenciado"],
  ['given', "se registran peticiones procesadas y duraciones de ejecución en el colector"],
  ['when', "el servicio expone las métricas para scraping en formato OpenMetrics"],
  ['then', "la salida de texto incluye las métricas \"aisdlc_requests_total\" y \"aisdlc_duration_seconds\""],
  ['given', "el formato es consumible de forma nativa por Prometheus y Grafana"],
  ['given', "una petición entrante que incluye campos sensibles (\"password\", \"authorization\", \"email\")"],
  ['when', "la información se procesa para registrar la auditoría operativa"],
  ['then', "el logger estructurado reemplaza los valores sensibles por \"[REDACTED]\""],
  ['given', "ninguna credencial o dato confidencial queda expuesto en texto claro"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
