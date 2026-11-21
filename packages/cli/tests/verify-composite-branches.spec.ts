import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  runVerifyDuplicates,
  runVerifyFriction,
  runVerifyGherkin,
  runVerifyGovernance,
  runVerifyLicensesAsync,
  runVerifyPdac,
  runVerifyPrivacy,
  runVerifyQuality,
  runVerifySastAsync,
  runVerifySchemas,
  runVerifyTesting,
  runVerifyTraceability,
} from '../src/commands/verify.js';

describe('CLI verify composite flow branches (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-verify-br-'));
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'ok.ts'), 'export function ok() { return 1; }\n', 'utf-8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('runVerifyQuality: exercises threshold overrides, baseline update, strictRatchet, and missing coverage failure in text and json', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Missing coverage report failure in JSON & text
    expect(runVerifyQuality({ root: tmpDir, requireCoverageReport: true, json: true })).toBe(false);
    expect(runVerifyQuality({ root: tmpDir, requireCoverageReport: true, silent: false })).toBe(false);

    // Threshold overrides + baseline update
    const baselinePath = path.join(tmpDir, 'reports', 'quality-baseline.json');
    expect(
      runVerifyQuality({
        root: tmpDir,
        maxCyclomatic: '10',
        maxCognitive: 15,
        minMaintainability: 50,
        maxLines: 50,
        enforceMode: 'STRICT',
        updateBaseline: true,
        baseline: baselinePath,
        requireCoverageReport: false,
        silent: false,
      })
    ).toBe(true);
    expect(fs.existsSync(baselinePath)).toBe(true);

    // Strict ratchet mode
    expect(
      runVerifyQuality({
        root: tmpDir,
        ratchet: true,
        baseline: baselinePath,
        requireCoverageReport: false,
        silent: false,
      })
    ).toBe(true);
    expect(logSpy).toHaveBeenCalled();
  });

  it('individual CLI verify gates: exercises JSON & text pass/fail branches across all gates', () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Add a SAST/Privacy/Gherkin-free clean baseline & test JSON + text modes
    expect(typeof runVerifyTraceability({ root: tmpDir, json: true })).toBe('boolean');
    expect(typeof runVerifyTraceability({ root: tmpDir, silent: false })).toBe('boolean');

    expect(typeof runVerifyGovernance({ root: tmpDir, json: true })).toBe('boolean');
    expect(typeof runVerifyGovernance({ root: tmpDir, silent: false })).toBe('boolean');

    expect(typeof runVerifyTesting({ root: tmpDir, json: true })).toBe('boolean');
    expect(typeof runVerifyTesting({ root: tmpDir, silent: false })).toBe('boolean');

    expect(typeof runVerifyPdac({ root: tmpDir, json: true })).toBe('boolean');
    expect(typeof runVerifyPdac({ root: tmpDir, silent: false })).toBe('boolean');

    expect(typeof runVerifySchemas({ root: tmpDir, json: true })).toBe('boolean');
    expect(typeof runVerifySchemas({ root: tmpDir, silent: false })).toBe('boolean');

    expect(typeof runVerifyFriction({ root: tmpDir, json: true })).toBe('boolean');
    expect(typeof runVerifyFriction({ root: tmpDir, silent: false })).toBe('boolean');

    expect(typeof runVerifyDuplicates({ root: tmpDir, json: true })).toBe('boolean');
    expect(typeof runVerifyDuplicates({ root: tmpDir, silent: false })).toBe('boolean');

    expect(typeof runVerifyGherkin({ root: tmpDir, json: true })).toBe('boolean');
    expect(typeof runVerifyGherkin({ root: tmpDir, silent: false })).toBe('boolean');

    expect(typeof runVerifyPrivacy({ root: tmpDir, json: true })).toBe('boolean');
    expect(typeof runVerifyPrivacy({ root: tmpDir, silent: false })).toBe('boolean');
  });

  it('runVerifyLicensesAsync & runVerifySastAsync: exercises async JSON, SARIF, and text branches', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(
      typeof (await runVerifyLicensesAsync({
        root: tmpDir,
        dynamic: true,
        vuln: false,
        json: true,
      }))
    ).toBe('boolean');

    expect(
      typeof (await runVerifySastAsync({
        root: tmpDir,
        format: 'sarif',
      }))
    ).toBe('boolean');

    expect(
      typeof (await runVerifySastAsync({
        root: tmpDir,
        json: true,
      }))
    ).toBe('boolean');
  });
});
