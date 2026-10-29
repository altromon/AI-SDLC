import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  BddStepRegistry,
  executeBddFeature,
  parseFeatureDocument,
  verifyTestingCoverage,
} from '../src/index.js';

describe('BDD Executable Runner & Cucumber Report Ingestion (Issue #78)', () => {
  it('should parse Feature, Background, Scenario, DataTables, and Scenario Outline with Examples', () => {
    const rawFeature = `
      @FR-TEST-001 @automated
      Feature: Payment Gateway Validation
        Background:
          Given the payment service is initialized

        Scenario: Successful nominal payment
          Given a payment request with:
            | amount   | 100.0 |
            | currency | EUR   |
          When the payment is processed
          Then the transaction status is "APPROVED"

        Scenario Outline: Rejected anomalous amounts
          When a payment of "<amount>" EUR is submitted
          Then the gateway rejects with "<code_err>"

          Examples:
            | amount | code_err        |
            | -10    | ERR_NEGATIVE    |
            | 999999 | ERR_LIMIT_EXCEED|
    `;

    const doc = parseFeatureDocument(rawFeature);
    expect(doc.featureName).toBe('Payment Gateway Validation');
    expect(doc.tags).toContain('@FR-TEST-001');
    expect(doc.backgroundSteps).toHaveLength(1);
    expect(doc.scenarios).toHaveLength(2);
    expect(doc.scenarios[0].steps[0].table).toEqual({ amount: '100.0', currency: 'EUR' });
    expect(doc.scenarios[1].isOutline).toBe(true);
    expect(doc.scenarios[1].examples).toHaveLength(2);
  });

  it('should execute feature scenarios against step registry, write cucumber-report.json, and pass verifyTestingCoverage', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-bdd-runner-'));
    try {
      const featureFile = path.join(tmpDir, 'tests', 'features', 'fr-pay-001.feature');
      fs.mkdirSync(path.dirname(featureFile), { recursive: true });
      fs.writeFileSync(
        featureFile,
        [
          '@FR-PAY-001 @automated',
          'Feature: Payment Processing',
          '  Background:',
          '    Given the gateway is online',
          '  Scenario: Valid payment',
          '    When client sends "50" EUR',
          '    Then response is "OK"',
        ].join('\n'),
        'utf-8'
      );

      const registry = new BddStepRegistry();
      let online = false;
      let status = '';

      registry
        .given('the gateway is online', () => {
          online = true;
        })
        .when(/^client sends "(\d+)" EUR$/, ([amount]) => {
          if (online && Number(amount) > 0) status = 'OK';
        })
        .then(/^response is "([^"]+)"$/, ([expected]) => {
          expect(status).toBe(expected);
        });

      const reportPath = path.join(tmpDir, 'reports', 'cucumber-report.json');
      const execReport = await executeBddFeature(featureFile, registry, {
        rootDir: tmpDir,
        writeReportPath: reportPath,
      });

      expect(execReport.passed).toBe(true);
      expect(fs.existsSync(reportPath)).toBe(true);

      const covResult = verifyTestingCoverage({
        rootDir: tmpDir,
        enforceCucumberExecution: true,
      });
      expect(covResult.success).toBe(true);
      expect(covResult.cucumberExecution?.passed).toBe(true);
      expect(covResult.cucumberExecution?.passedScenarios).toBe(1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should mark verifyTestingCoverage as failed when cucumber-report.json contains failed or undefined steps', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-bdd-fail-'));
    try {
      const featureFile = path.join(tmpDir, 'tests', 'features', 'fr-fail-001.feature');
      fs.mkdirSync(path.dirname(featureFile), { recursive: true });
      fs.writeFileSync(
        featureFile,
        [
          '@FR-FAIL-001',
          'Feature: Missing Step Feature',
          '  Scenario: Undefined step scenario',
          '    Given an unimplemented step',
        ].join('\n'),
        'utf-8'
      );

      const registry = new BddStepRegistry();
      const reportPath = path.join(tmpDir, 'reports', 'cucumber-report.json');
      const execReport = await executeBddFeature(featureFile, registry, {
        rootDir: tmpDir,
        writeReportPath: reportPath,
      });

      expect(execReport.passed).toBe(false);
      expect(execReport.scenarios[0].status).toBe('undefined');

      const covResult = verifyTestingCoverage({
        rootDir: tmpDir,
        enforceCucumberExecution: true,
      });
      expect(covResult.success).toBe(false);
      expect(covResult.cucumberExecution?.passed).toBe(false);
      expect(covResult.cucumberExecution?.failedScenarios).toBe(1);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
