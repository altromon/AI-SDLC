import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Target import that will exist once developer implements packages/cli/src/commands/migrate.ts
// @ts-expect-error Implemented in TSK-006 by agent-developer
import { runMigrate } from '../src/commands/migrate.js';

describe('Migrate CLI Command Integration Suite (FR-053-CLI-MIGRATE-001)', () => {
  let tmpDir: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-migrate-cli-'));
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('executes "aisdlc migrate --dry-run" and outputs preview plan without filesystem mutations (exitCode 0)', async () => {
    // Setup initial project structure
    fs.mkdirSync(path.join(tmpDir, 'schemas'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'schemas', 'task-plan.json'), '{"version": "0.9.0"}', 'utf-8');

    const exitCode = await runMigrate({ root: tmpDir, dryRun: true });
    expect(exitCode).toBe(0);

    // Verify no backup directory was created
    expect(fs.existsSync(path.join(tmpDir, '.backup'))).toBe(false);
    // Verify file remains untouched
    expect(fs.readFileSync(path.join(tmpDir, 'schemas', 'task-plan.json'), 'utf-8')).toBe('{"version": "0.9.0"}');
  });

  it('executes "aisdlc migrate" preserving local overrides and exiting with code 1 when overrides exist', async () => {
    // Setup local customized policy
    fs.writeFileSync(path.join(tmpDir, 'quality-policy.yaml'), 'quality:\n  coverage:\n    min: 99\n', 'utf-8');

    const exitCode = await runMigrate({ root: tmpDir, force: false });
    // Local overrides preserved without force returns exit code 1
    expect(exitCode).toBe(1);

    // Verify local file was preserved untouched
    const content = fs.readFileSync(path.join(tmpDir, 'quality-policy.yaml'), 'utf-8');
    expect(content).toContain('min: 99');
  });

  it('executes "aisdlc migrate --force" updating overrides after creating backup and exiting with code 0', async () => {
    fs.writeFileSync(path.join(tmpDir, 'quality-policy.yaml'), 'quality:\n  coverage:\n    min: 99\n', 'utf-8');

    const exitCode = await runMigrate({ root: tmpDir, force: true, backup: true });
    expect(exitCode).toBe(0);

    // Verify backup created
    const backupDir = path.join(tmpDir, '.backup');
    expect(fs.existsSync(backupDir)).toBe(true);
  });

  it('executes "aisdlc migrate --json" emitting structured JSON with exitCode and summary', async () => {
    const exitCode = await runMigrate({ root: tmpDir, dryRun: true, json: true });
    expect(typeof exitCode).toBe('number');

    const jsonCall = logSpy.mock.calls.find((call) => {
      try {
        const parsed = JSON.parse(call[0]);
        return parsed && typeof parsed.exitCode === 'number' && parsed.summary !== undefined;
      } catch {
        return false;
      }
    });

    expect(jsonCall).toBeDefined();
    const report = JSON.parse(jsonCall![0]);
    expect(report).toHaveProperty('exitCode');
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('details');
  });

  it('rejects migration on protected branches (main, master, release/*) with exit code 2', async () => {
    // Simulate git repo on branch main
    const exitCode = await runMigrate({ root: tmpDir, branch: 'main', dryRun: false });
    expect(exitCode).toBe(2);
  });
});
