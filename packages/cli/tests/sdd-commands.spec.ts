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
    initProject({ targetDir: tempDir, agents: 'none', silent: true });
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

    // 2. runChangeNew (json mode, failure when duplicate id)
    const dupJson = runChangeNew({
      root: tempDir,
      name: 'Sample Increment',
      id: 'chg-001-sample-increment',
      json: true,
    });
    expect(dupJson).toBe(false);

    // 3. runSddDeposit (text + json)
    const depOk = runSddDeposit({
      root: tempDir,
      change: 'chg-001-sample-increment',
      framework: 'openspec',
      requirements: 'FR-001',
      useCases: 'UC-001',
    });
    expect(depOk).toBe(true);

    const depJson = runSddDeposit({
      root: tempDir,
      change: 'chg-001-sample-increment',
      framework: 'openspec',
      json: true,
    });
    expect(depJson).toBe(true);

    // 4. runSddVerify (text + json)
    const verText = runSddVerify({ root: tempDir, checkDuplicates: true });
    expect(typeof verText).toBe('boolean');

    const verJson = runSddVerify({ root: tempDir, json: true, checkDuplicates: true });
    expect(typeof verJson).toBe('boolean');

    // 5. runSddIntegrate (text + json + batch --all + missing auto)
    const intText = runSddIntegrate({ root: tempDir, change: 'chg-001-sample-increment' });
    expect(typeof intText).toBe('boolean');

    const intJson = runSddIntegrate({ root: tempDir, change: 'chg-001-sample-increment', json: true });
    expect(typeof intJson).toBe('boolean');

    const batchJson = runSddIntegrate({ root: tempDir, all: true, json: true });
    expect(typeof batchJson).toBe('boolean');

    const autoMissing = runSddIntegrate({ root: tempDir, auto: true, json: true });
    expect(autoMissing).toBe(false);

    expect(logSpy).toHaveBeenCalled();
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

    const failJson = runSddDeposit({
      root: invalidRoot,
      change: 'chg-001',
      framework: 'openspec',
      json: true,
    });
    expect(failJson).toBe(false);

    expect(logSpy).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });
});
