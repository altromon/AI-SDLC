// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-telemetry-stream-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "el gateway de ingesta en el enclave DMZ se encuentra activo y escuchando"],
  ['given', "el dron \"UAV-ALPHA-01\" ha completado el handshake mTLS con certificado de CA válido"],
  ['given', "que el dron envía una trama de telemetría con:"],
  ['when', "el gateway procesa la trama recibida"],
  ['then', "la trama es validada exitosamente en menos de 50 milisegundos"],
  ['given', "se envía un ACK de confirmación al dron"],
  ['given', "se publica el evento en el topic Kafka \"telemetry.normalized.v1\""],
  ['given', "que la última posición registrada del dron fue latitud 40.4168 y longitud -3.7038"],
  ['when', "el dron envía 100ms después una trama con salto imposible \"<salto_km>\" km"],
  ['then', "el sistema debe detectar la violación de la regla cinemática BR-TELEMETRY-VALIDITY"],
  ['given', "la trama debe ser descartada inmediatamente"],
  ['given', "el gateway debe responder con el error \"<codigo_error>\""],
  ['given', "se debe registrar un evento de alerta geospacial en el log estructurado"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
