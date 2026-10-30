/**
 * ==============================================================================
 * SentinelCore: Executable BDD / Cucumber Step Definitions (Issue #78)
 * Origen: examples/sentinel-core/tests/features/fr-telemetry-stream-001.feature
 * ==============================================================================
 */

import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { BddStepRegistry, executeBddFeature } from '../../../../packages/core/src/verifiers/bdd-runner.js';
import { ClientCertificateInfo, IngestResponse, TelemetryGateway } from '../../src/telemetry/gateway.js';
import { TelemetryFrame } from '../../src/telemetry/kinematics.js';

describe('BDD Feature Execution: FR-TELEMETRY-STREAM-001', () => {
  it('ejecuta todos los escenarios Gherkin de fr-telemetry-stream-001.feature y genera reporte Cucumber JSON', async () => {
    const registry = new BddStepRegistry();

    let gateway: TelemetryGateway;
    let currentCert: ClientCertificateInfo | null = null;
    let pendingFrame: TelemetryFrame | null = null;
    let lastResponse: IngestResponse | null = null;
    let publishedTopics: string[] = [];
    let alertLogs: string[] = [];
    const baseTimestamp = 1_700_000_000_000;

    registry
      .given('el gateway de ingesta en el enclave DMZ se encuentra activo y escuchando', () => {
        publishedTopics = [];
        alertLogs = [];
        lastResponse = null;
        gateway = new TelemetryGateway({
          publish: async (topic: string) => {
            publishedTopics.push(topic);
            return true;
          },
        });
      })
      .given(/^el dron "([^"]+)" ha completado el handshake mTLS con certificado de CA válido$/, ([droneId]) => {
        currentCert = {
          authorized: true,
          subjectCommonName: droneId,
          hardwareUuid: 'hw-uav-alpha-01',
          issuerOrg: 'SentinelCore Fleet CA',
        };
      })
      .given('que el dron envía una trama de telemetría con:', (_args, table) => {
        pendingFrame = {
          droneId: currentCert?.subjectCommonName || 'UAV-ALPHA-01',
          timestampMs: baseTimestamp,
          position: {
            latitude: parseFloat(table?.latitud || '0'),
            longitude: parseFloat(table?.longitud || '0'),
            altitudeMeters: parseFloat(table?.altitud_m || '0'),
          },
          speedMps: parseFloat(table?.velocidad || '0'),
        };
      })
      .when('el gateway procesa la trama recibida', async () => {
        expect(pendingFrame).not.toBeNull();
        lastResponse = await gateway.handleIncomingFrame(currentCert, pendingFrame!);
      })
      .then('la trama es validada exitosamente en menos de 50 milisegundos', () => {
        expect(lastResponse).not.toBeNull();
        expect(lastResponse!.accepted).toBe(true);
        expect(lastResponse!.processingTimeMs).toBeLessThan(50);
      })
      .then('se envía un ACK de confirmación al dron', () => {
        expect(lastResponse?.status).toBe('PROCESSED');
      })
      .then(/^se publica el evento en el topic Kafka "([^"]+)"$/, ([topic]) => {
        expect(publishedTopics).toContain(topic);
      })
      .given(
        /^que la última posición registrada del dron fue latitud ([0-9.-]+) y longitud ([0-9.-]+)$/,
        async ([lat, lon]) => {
          const initialFrame: TelemetryFrame = {
            droneId: currentCert?.subjectCommonName || 'UAV-ALPHA-01',
            timestampMs: baseTimestamp,
            position: {
              latitude: parseFloat(lat),
              longitude: parseFloat(lon),
              altitudeMeters: 120.0,
            },
            speedMps: 15.0,
          };
          const initRes = await gateway.handleIncomingFrame(currentCert, initialFrame);
          expect(initRes.accepted).toBe(true);
        }
      )
      .when(/^el dron envía 100ms después una trama con salto imposible "([0-9.]+)" km$/, async ([jumpKm]) => {
        const deltaDeg = parseFloat(jumpKm) / 111.0;
        const anomalousFrame: TelemetryFrame = {
          droneId: currentCert?.subjectCommonName || 'UAV-ALPHA-01',
          timestampMs: baseTimestamp + 100,
          position: {
            latitude: 40.4168 + deltaDeg,
            longitude: -3.7038,
            altitudeMeters: 120.0,
          },
          speedMps: 15.0,
        };
        lastResponse = await gateway.handleIncomingFrame(currentCert, anomalousFrame);
        if (!lastResponse.accepted) {
          alertLogs.push(`GEOSPATIAL_ALERT:${lastResponse.errorCode}`);
        }
      })
      .then('el sistema debe detectar la violación de la regla cinemática BR-TELEMETRY-VALIDITY', () => {
        expect(lastResponse?.accepted).toBe(false);
      })
      .then('la trama debe ser descartada inmediatamente', () => {
        expect(lastResponse?.status).toBe('REJECTED');
        expect(publishedTopics).toHaveLength(1);
      })
      .then(/^el gateway debe responder con el error "([^"]+)"$/, ([expectedErr]) => {
        expect(lastResponse?.errorCode).toBe(expectedErr);
      })
      .then('se debe registrar un evento de alerta geospacial en el log estructurado', () => {
        expect(alertLogs.length).toBeGreaterThan(0);
      });

    const featureFile = path.resolve(
      __dirname,
      '../features/fr-telemetry-stream-001.feature'
    );
    const reportOutput = path.resolve(
      __dirname,
      '../../reports/cucumber-report.json'
    );

    const report = await executeBddFeature(featureFile, registry, {
      rootDir: path.resolve(__dirname, '../..'),
      writeReportPath: reportOutput,
    });

    expect(report.passed).toBe(true);
    expect(report.scenarios).toHaveLength(3);
    expect(report.scenarios.every((s) => s.status === 'passed')).toBe(true);
  });
});
