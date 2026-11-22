/**
 * Cites: FR-037-SDD-INTEGRATE-CONCURRENCY-001, FR-045-PDAC-SCHEMA-FAIL-CLOSED-001, FR-046-NATIVE-SDK-CLI-AST-001, FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001, FR-063-UI-E2E-MODALITY-GATE-001
 * Tag: @FR-037-SDD-INTEGRATE-CONCURRENCY-001 @FR-045-PDAC-SCHEMA-FAIL-CLOSED-001 @FR-046-NATIVE-SDK-CLI-AST-001 @FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001 @FR-063-UI-E2E-MODALITY-GATE-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initProject } from '@aisdlc/core';
import { runChangeNew, runSddDeposit, runSddIntegrate, runSddVerify } from '../src/commands/sdd.js';

describe('CLI SDD & Change Commands Coverage Suite', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-sdd-'));
    initProject({ targetDir: tempDir, agents: 'none' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('executes runChangeNew, runSddDeposit, runSddVerify, and runSddIntegrate in text and json modes', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 1. runChangeNew (text mode)
    const created = runChangeNew({
      root: tempDir,
      name: 'Sample Increment',
      id: 'chg-001-sample-increment',
      profile: 'standard',
      framework: 'openspec',
    });
    expect(created).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('chg-001-sample-increment'));

    // 2. runChangeNew (json mode, failure when duplicate id)
    const dupJson = runChangeNew({
      root: tempDir,
      name: 'Sample Increment',
      id: 'chg-001-sample-increment',
      json: true,
    });
    expect(dupJson).toBe(false);
    const dupPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(dupPayload.command).toBe('change:new');
    expect(dupPayload.success).toBe(false);
    expect(dupPayload.exitCode).toBe(1);
    expect(dupPayload.errors.length).toBeGreaterThan(0);

    // 3. runSddDeposit (text + json)
    const depOk = runSddDeposit({
      root: tempDir,
      change: 'chg-001-sample-increment',
      framework: 'openspec',
      requirements: 'FR-001',
      useCases: 'UC-001',
    });
    expect(depOk).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('HOF-CHG-001-SAMPLE-INCREMENT'));

    const depJson = runSddDeposit({
      root: tempDir,
      change: 'chg-001-sample-increment',
      framework: 'openspec',
      json: true,
    });
    expect(depJson).toBe(true);
    const depPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(depPayload.command).toBe('sdd:deposit');
    expect(depPayload.success).toBe(true);
    expect(depPayload.exitCode).toBe(0);
    expect(depPayload.changeId).toBe('chg-001-sample-increment');

    // 4. runSddVerify (text + json)
    const verText = runSddVerify({ root: tempDir, checkDuplicates: true });
    expect(verText).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('SDD Integration COMPLIANT'));

    const verJson = runSddVerify({ root: tempDir, json: true, checkDuplicates: true });
    expect(verJson).toBe(true);
    const verPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(verPayload.command).toBe('sdd:verify');
    expect(verPayload.success).toBe(true);
    expect(verPayload.exitCode).toBe(0);
    expect(verPayload.validHandoffs).toBeGreaterThanOrEqual(1);

    // 5. runSddIntegrate (text + json + batch --all + missing auto)
    const intText = runSddIntegrate({ root: tempDir, change: 'chg-001-sample-increment' });
    expect(intText).toBe(false);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Integration BLOCKED'));

    const intJson = runSddIntegrate({ root: tempDir, change: 'chg-001-sample-increment', json: true });
    expect(intJson).toBe(false);
    const intPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(intPayload.command).toBe('sdd:integrate');
    expect(intPayload.success).toBe(false);
    expect(intPayload.exitCode).toBe(1);

    const batchJson = runSddIntegrate({ root: tempDir, all: true, json: true });
    expect(batchJson).toBe(true);
    const batchPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(batchPayload.command).toBe('sdd:integrate:all');
    expect(batchPayload.success).toBe(true);
    expect(batchPayload.exitCode).toBe(0);

    const autoMissing = runSddIntegrate({ root: tempDir, auto: true, json: true });
    expect(autoMissing).toBe(false);
    const autoPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(autoPayload.command).toBe('sdd:integrate');
    expect(autoPayload.success).toBe(false);
    expect(autoPayload.exitCode).toBe(1);

    expect(errSpy).not.toHaveBeenCalled();
  });

  it('handles runSddDeposit error gracefully in text and json modes', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const invalidRoot = path.join(tempDir, 'quality-policy.yaml');

    const failText = runSddDeposit({
      root: invalidRoot,
      change: 'chg-001',
      framework: 'openspec',
    });
    expect(failText).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Error depositing sidecar'));

    const failJson = runSddDeposit({
      root: invalidRoot,
      change: 'chg-001',
      framework: 'openspec',
      json: true,
    });
    expect(failJson).toBe(false);

    const jsonPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(jsonPayload.command).toBe('sdd:deposit');
    expect(jsonPayload.success).toBe(false);
    expect(jsonPayload.exitCode).toBe(1);
    expect(typeof jsonPayload.error).toBe('string');
    expect(jsonPayload.error.length).toBeGreaterThan(0);
    expect(jsonPayload.error).not.toBe('undefined');
  });
});
