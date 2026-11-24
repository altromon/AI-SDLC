/**
 * Cites: FR-037-SDD-INTEGRATE-CONCURRENCY-001, FR-045-PDAC-SCHEMA-FAIL-CLOSED-001, FR-046-NATIVE-SDK-CLI-AST-001, FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001, FR-063-UI-E2E-MODALITY-GATE-001
 * Tag: @FR-037-SDD-INTEGRATE-CONCURRENCY-001 @FR-045-PDAC-SCHEMA-FAIL-CLOSED-001 @FR-046-NATIVE-SDK-CLI-AST-001 @FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001 @FR-063-UI-E2E-MODALITY-GATE-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runReportCompliance } from '../src/commands/report.js';
import { runChangeNew, runSddDeposit, runSddIntegrate, runSddVerify } from '../src/commands/sdd.js';

describe('CLI sdd & report compliance commands (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-sdd-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('runReportCompliance: rejects unknown options, runs dryRun, and catches errors (happy/sad/malformed)', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(runReportCompliance({ unknownFlag: true } as never)).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown option'));

    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'a.ts'), 'export const x = 1;\n', 'utf-8');
    expect(runReportCompliance({ root: tmpDir, dryRun: true })).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Digest:'));
  });

  it('runChangeNew & runSddDeposit & runSddVerify & runSddIntegrate: covers happy, sad, boundary, and json paths', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // runChangeNew: empty name (boundary/sad) and valid creation (happy)
    expect(runChangeNew({ root: tmpDir, name: '', silent: false })).toBe(false);
    expect(logSpy.mock.calls.length + errSpy.mock.calls.length).toBeGreaterThan(0);

    expect(runChangeNew({ root: tmpDir, name: 'Add telemetry', profile: 'standard', json: true })).toBe(true);
    const changePayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(changePayload.command).toBe('change:new');
    expect(changePayload.success).toBe(true);

    // runSddDeposit: auto-detects active change when change is empty
    expect(
      runSddDeposit({
        root: tmpDir,
        change: '',
        framework: 'openspec',
        requirements: 'FR-1',
        silent: false,
      })
    ).toBe(true);

    // runSddDeposit: valid deposit in JSON mode
    expect(
      runSddDeposit({
        root: tmpDir,
        change: changePayload.changeId,
        framework: 'openspec',
        requirements: 'FR-1,FR-2',
        useCases: 'UC-1',
        json: true,
      })
    ).toBe(true);
    const depositPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(depositPayload.command).toBe('sdd:deposit');
    expect(depositPayload.success).toBe(true);
    expect(depositPayload.exitCode).toBe(0);
    expect(depositPayload.handoff.subgraph.requirements).toEqual(['FR-1', 'FR-2']);
    expect(depositPayload.handoff.subgraph.useCases).toEqual(['UC-1']);

    // runSddVerify: text & json on workspace
    expect(runSddVerify({ root: tmpDir, silent: false })).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('SDD Integration COMPLIANT'));

    expect(runSddVerify({ root: tmpDir, json: true })).toBe(true);
    const verifyPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(verifyPayload.command).toBe('sdd:verify');
    expect(verifyPayload.success).toBe(true);
    expect(verifyPayload.exitCode).toBe(0);

    // runSddIntegrate: missing change without --all (sad), nonexistent change (sad), --all (boundary)
    expect(runSddIntegrate({ root: tmpDir, silent: false })).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('--change <id>'));

    expect(runSddIntegrate({ root: tmpDir, change: 'chg-999-missing', json: true })).toBe(false);
    const missingPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(missingPayload.command).toBe('sdd:integrate');
    expect(missingPayload.success).toBe(false);
    expect(missingPayload.exitCode).toBe(1);

    expect(runSddIntegrate({ root: tmpDir, all: true, silent: false })).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Batch canonical specification integration COMPLETED'));

    expect(runSddIntegrate({ root: tmpDir, all: true, json: true })).toBe(true);
    const batchPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(batchPayload.command).toBe('sdd:integrate:all');
    expect(batchPayload.success).toBe(true);
    expect(batchPayload.exitCode).toBe(0);
  });
});
