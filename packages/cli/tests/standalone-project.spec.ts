import * as fs from 'fs';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runGherkinExtract } from '../src/commands/gherkin.js';
import {
  runVerifyAll,
  runVerifyGovernance,
  runVerifyLicenses,
  runVerifyPdac,
  runVerifyQuality,
  runVerifyTesting,
  runVerifyTraceability,
} from '../src/commands/verify.js';

describe('Standalone Unknown Project End-to-End Suite', () => {
  const tempProjectDir = path.join(process.cwd(), 'scratch', 'test-standalone-unknown-project');
  const examplesDir = path.join(process.cwd(), 'examples');

  beforeAll(() => {
    if (fs.existsSync(tempProjectDir)) {
      fs.rmSync(tempProjectDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempProjectDir, { recursive: true });

    // 1. Copy policies
    fs.copyFileSync(
      path.join(process.cwd(), 'quality-policy.yaml'),
      path.join(tempProjectDir, 'quality-policy.yaml')
    );
    fs.copyFileSync(
      path.join(process.cwd(), 'license-policy.yaml'),
      path.join(tempProjectDir, 'license-policy.yaml')
    );

    // 2. Copy product, security, architecture, compliance to root of temp project
    fs.cpSync(path.join(examplesDir, 'product'), path.join(tempProjectDir, 'product'), { recursive: true });
    fs.cpSync(path.join(examplesDir, 'security'), path.join(tempProjectDir, 'security'), { recursive: true });
    fs.cpSync(path.join(examplesDir, 'architecture'), path.join(tempProjectDir, 'architecture'), { recursive: true });
    fs.cpSync(path.join(examplesDir, 'compliance'), path.join(tempProjectDir, 'compliance'), { recursive: true });

    // 3. Copy src and tests to root of temp project
    fs.cpSync(path.join(examplesDir, 'src'), path.join(tempProjectDir, 'src'), { recursive: true });
    fs.cpSync(path.join(examplesDir, 'tests'), path.join(tempProjectDir, 'tests'), { recursive: true });

    // 4. Deploy change spec to standard active SDD path: specs/changes/active/chg-001-telemetry-ingestion
    const activeSpecsDest = path.join(tempProjectDir, 'specs', 'changes', 'active', 'chg-001-telemetry-ingestion');
    fs.mkdirSync(path.dirname(activeSpecsDest), { recursive: true });
    fs.cpSync(path.join(examplesDir, 'specs', 'chg-001-telemetry-ingestion'), activeSpecsDest, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(tempProjectDir)) {
      fs.rmSync(tempProjectDir, { recursive: true, force: true });
    }
  });

  it('should confirm that the standalone project has NO examples/ folder', () => {
    expect(fs.existsSync(path.join(tempProjectDir, 'examples'))).toBe(false);
    expect(fs.existsSync(path.join(tempProjectDir, 'product'))).toBe(true);
    expect(fs.existsSync(path.join(tempProjectDir, 'security'))).toBe(true);
    expect(fs.existsSync(path.join(tempProjectDir, 'architecture'))).toBe(true);
    expect(fs.existsSync(path.join(tempProjectDir, 'compliance', 'license-manifest.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(tempProjectDir, 'src'))).toBe(true);
    expect(fs.existsSync(path.join(tempProjectDir, 'tests'))).toBe(true);
  });

  it('should verify quality gate on standalone project', () => {
    const passed = runVerifyQuality({ root: tempProjectDir, silent: true });
    expect(passed).toBe(true);
  });

  it('should verify 360 traceability on standalone project', () => {
    const passed = runVerifyTraceability({ root: tempProjectDir, silent: true });
    expect(passed).toBe(true);
  });

  it('should verify tasks governance on standalone project', () => {
    const passed = runVerifyGovernance({ root: tempProjectDir, silent: true });
    expect(passed).toBe(true);
  });

  it('should verify testing coverage on standalone project', () => {
    const passed = runVerifyTesting({ root: tempProjectDir, silent: true });
    expect(passed).toBe(true);
  });

  it('should verify license compliance on standalone project', () => {
    const passed = runVerifyLicenses({ root: tempProjectDir, silent: true });
    expect(passed).toBe(true);
  });

  it('should verify PDaC graph without drift on standalone project', () => {
    const passed = runVerifyPdac({ root: tempProjectDir, silent: true });
    expect(passed).toBe(true);
  });

  it('should execute full verification suite (verify all) on standalone project successfully', () => {
    const passed = runVerifyAll({ root: tempProjectDir, silent: true });
    expect(passed).toBe(true);
  });

  it('should extract gherkin features on standalone project', () => {
    const passed = runGherkinExtract({ root: tempProjectDir, all: true });
    expect(passed).toBe(true);
  });
});
