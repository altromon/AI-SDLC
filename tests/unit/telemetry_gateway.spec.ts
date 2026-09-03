/**
 * ==============================================================================
 * SentinelCore: Pruebas Unitarias del Gateway de Ingesta (FR-001 / SEC-REQ-001)
 * ==============================================================================
 */

import { TelemetryGateway, ClientCertificateInfo } from '../../src/telemetry/gateway';
import { TelemetryFrame, validateKinematics } from '../../src/telemetry/kinematics';

describe('TelemetryGateway & Kinematics', () => {
  const validCert: ClientCertificateInfo = {
    authorized: true,
    subjectCommonName: 'UAV-ALPHA-01',
    hardwareUuid: 'hw-9988-7766',
    issuerOrg: 'SentinelCore Fleet CA'
  };

  const mockPublisher = {
    publish: async (_topic: string, _message: TelemetryFrame) => true
  };

  it('debe rechazar conexión sin certificado mTLS válido', async () => {
    const gateway = new TelemetryGateway(mockPublisher);
    const frame: TelemetryFrame = {
      droneId: 'UAV-ALPHA-01',
      timestampMs: Date.now(),
      position: { latitude: 40.4168, longitude: -3.7038, altitudeMeters: 120 },
      speedMps: 15
    };

    const response = await gateway.handleIncomingFrame(null, frame);
    expect(response.accepted).toBe(false);
    expect(response.status).toBe('UNAUTHORIZED');
    expect(response.errorCode).toBe('TLS_PEER_CERT_MISSING');
  });

  it('debe aceptar tramas con cinemática coherente', async () => {
    const gateway = new TelemetryGateway(mockPublisher);
    const frame: TelemetryFrame = {
      droneId: 'UAV-ALPHA-01',
      timestampMs: Date.now(),
      position: { latitude: 40.4168, longitude: -3.7038, altitudeMeters: 120 },
      speedMps: 15
    };

    const response = await gateway.handleIncomingFrame(validCert, frame);
    expect(response.accepted).toBe(true);
    expect(response.status).toBe('PROCESSED');
  });

  it('debe descartar tramas con salto cinemático imposible', () => {
    const t0 = Date.now();
    const frame1: TelemetryFrame = {
      droneId: 'UAV-ALPHA-01',
      timestampMs: t0,
      position: { latitude: 40.4168, longitude: -3.7038, altitudeMeters: 120 },
      speedMps: 15
    };

    // Salto de 50 km en 100 ms (imposible para un UAV)
    const frame2: TelemetryFrame = {
      droneId: 'UAV-ALPHA-01',
      timestampMs: t0 + 100,
      position: { latitude: 40.8168, longitude: -3.7038, altitudeMeters: 120 },
      speedMps: 15
    };

    const result = validateKinematics(frame1, frame2);
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe('NACK-INVALID-KINEMATICS');
  });
});
