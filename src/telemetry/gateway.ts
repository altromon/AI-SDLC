/**
 * ==============================================================================
 * SentinelCore: Gateway de Ingesta Telemétrica WSS (SRV-TELEMETRY-INGEST)
 * ==============================================================================
 * Gestiona conexiones WebSocket con autenticación mTLS obligatoria (TLS 1.3).
 * Deserializa tramas y delega la validación cinemática antes de publicar en Kafka.
 * ==============================================================================
 */

import { TelemetryFrame, validateKinematics, ValidationResult } from './kinematics';

export interface ClientCertificateInfo {
  authorized: boolean;
  subjectCommonName: string;
  hardwareUuid: string;
  issuerOrg: string;
}

export interface IngestResponse {
  accepted: boolean;
  status: 'PROCESSED' | 'REJECTED' | 'UNAUTHORIZED';
  errorCode: string | null;
  processingTimeMs: number;
}

export interface KafkaPublisher {
  publish(topic: string, message: TelemetryFrame): Promise<boolean>;
}

export class TelemetryGateway {
  private lastKnownFrames: Map<string, TelemetryFrame> = new Map();
  private publisher: KafkaPublisher;

  constructor(publisher: KafkaPublisher) {
    this.publisher = publisher;
  }

  /**
   * Valida las credenciales criptográficas mTLS del cliente x509.
   */
  public verifyTlsPeer(cert: ClientCertificateInfo | null): boolean {
    if (!cert || !cert.authorized) {
      return false;
    }
    return cert.hardwareUuid.length > 0 && cert.issuerOrg === 'SentinelCore Fleet CA';
  }

  /**
   * Procesa una trama telemétrica entrante desde el socket seguro.
   */
  public async handleIncomingFrame(
    cert: ClientCertificateInfo | null,
    frame: TelemetryFrame
  ): Promise<IngestResponse> {
    const startTime = Date.now();

    if (!this.verifyTlsPeer(cert)) {
      return {
        accepted: false,
        status: 'UNAUTHORIZED',
        errorCode: 'TLS_PEER_CERT_MISSING',
        processingTimeMs: Date.now() - startTime
      };
    }

    const previousFrame = this.lastKnownFrames.get(frame.droneId) || null;
    const validation: ValidationResult = validateKinematics(previousFrame, frame);

    if (!validation.isValid) {
      return {
        accepted: false,
        status: 'REJECTED',
        errorCode: validation.errorCode,
        processingTimeMs: Date.now() - startTime
      };
    }

    this.lastKnownFrames.set(frame.droneId, frame);
    await this.publisher.publish('telemetry.normalized.v1', frame);

    return {
      accepted: true,
      status: 'PROCESSED',
      errorCode: null,
      processingTimeMs: Date.now() - startTime
    };
  }
}
