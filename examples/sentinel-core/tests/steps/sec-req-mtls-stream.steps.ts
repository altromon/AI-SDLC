// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/security/sec-req-mtls-stream.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "el gateway de ingesta perimetral SEC-ENC-DMZ-INGEST está configurado con TLS 1.3"],
  ['given', "la CA raíz de drones autorizados está cargada en el truststore del servidor"],
  ['given', "un atacante geospacial ACT-THREAT-SPOOFER intenta establecer conexión WSS"],
  ['given', "el cliente no presenta ningún certificado cliente x509 en el handshake"],
  ['when', "se ejecuta la negociación TLS"],
  ['then', "el handshake debe ser abortado de inmediato a nivel de transporte TCP"],
  ['given', "no se debe permitir la apertura del socket WebSocket"],
  ['given', "se debe registrar un evento de alerta de seguridad en el SIEM con código \"TLS_PEER_CERT_MISSING\""],
  ['given', "un cliente que presenta un certificado con el defecto \"<defecto_certificado>\""],
  ['when', "se intenta completar el handshake mTLS"],
  ['then', "el gateway debe terminar la sesión con el error TLS \"<alerta_tls>\""],
  ['given', "el intento debe ser bloqueado antes de invocar la lógica de aplicación"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
