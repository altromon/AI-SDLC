import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DoctorReporter } from '../src/doctor/reporter.js';
import { NativeFileSystemProbeAdapter } from '../src/doctor/fs-probe.js';
import type { DoctorReport } from '../src/types/doctor.js';

describe('NativeFileSystemProbeAdapter (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;
  let probe: NativeFileSystemProbeAdapter;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-fs-probe-'));
    probe = new NativeFileSystemProbeAdapter();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exists: returns true for existing file, false for missing and empty path (happy/sad/boundary)', async () => {
    const filePath = path.join(tmpDir, 'sample.txt');
    fs.writeFileSync(filePath, 'hello', 'utf-8');

    expect(await probe.exists(filePath)).toBe(true);
    expect(await probe.exists(path.join(tmpDir, 'missing.txt'))).toBe(false);
    expect(await probe.exists('')).toBe(false);
  });

  it('readFile: reads UTF-8 content, empty file boundary, and rejects on missing file or directory (happy/sad/boundary)', async () => {
    const filePath = path.join(tmpDir, 'data.txt');
    const emptyPath = path.join(tmpDir, 'empty.txt');
    fs.writeFileSync(filePath, 'línea-áéíóú', 'utf-8');
    fs.writeFileSync(emptyPath, '', 'utf-8');

    expect(await probe.readFile(filePath)).toBe('línea-áéíóú');
    expect(await probe.readFile(emptyPath)).toBe('');
    await expect(probe.readFile(path.join(tmpDir, 'nonexistent.txt'))).rejects.toThrow();
    await expect(probe.readFile(tmpDir)).rejects.toThrow();
  });

  it('getFileSize: returns exact byte size, 0 for empty file, and rejects on missing path (happy/sad/boundary)', async () => {
    const filePath = path.join(tmpDir, 'bytes.bin');
    const emptyPath = path.join(tmpDir, 'zero.bin');
    fs.writeFileSync(filePath, Buffer.from([1, 2, 3, 4, 5]));
    fs.writeFileSync(emptyPath, '');

    expect(await probe.getFileSize(filePath)).toBe(5);
    expect(await probe.getFileSize(emptyPath)).toBe(0);
    await expect(probe.getFileSize(path.join(tmpDir, 'missing.bin'))).rejects.toThrow();
  });

  it('isExecutable: returns boolean for existing file and false for missing or malformed path (happy/sad/malformed)', async () => {
    const filePath = path.join(tmpDir, 'script.sh');
    fs.writeFileSync(filePath, '#!/bin/sh\necho ok\n', 'utf-8');

    const result = await probe.isExecutable(filePath);
    expect(typeof result).toBe('boolean');
    expect(await probe.isExecutable(path.join(tmpDir, 'missing.sh'))).toBe(false);
    expect(await probe.isExecutable('')).toBe(false);
  });

  it('isSymbolicLink: returns false for regular file, missing path, and malformed null-byte path (happy/sad/malformed)', () => {
    const filePath = path.join(tmpDir, 'regular.txt');
    fs.writeFileSync(filePath, 'ok', 'utf-8');

    expect(probe.isSymbolicLink(filePath)).toBe(false);
    expect(probe.isSymbolicLink(path.join(tmpDir, 'missing.txt'))).toBe(false);
    expect(probe.isSymbolicLink('invalid\0path')).toBe(false);
  });
});

describe('DoctorReporter (Happy / Sad / Boundary / Malformed)', () => {
  const reporter = new DoctorReporter();

  it('formatTerminal: formats pass report with empty findings and no remediations (happy/boundary)', () => {
    const report: DoctorReport = {
      timestamp: '2026-01-01T00:00:00.000Z',
      overallStatus: 'pass',
      exitCode: 0,
      categories: [
        {
          category: 'toolchain',
          title: 'Core Toolchain',
          status: 'pass',
          findings: [],
        },
      ],
      remediations: [],
    };

    const output = reporter.formatTerminal(report);
    expect(output).toContain('AI-SDLC Doctor Environment Diagnostics');
    expect(output).toContain('✅ PASS (Exit Code: 0)');
    expect(output).toContain('✅ [TOOLCHAIN] Core Toolchain');
    expect(output).toContain('No issues detected.');
    expect(output).not.toContain('Suggested Remediations');
  });

  it('formatTerminal: formats warn and fail findings with remediations (sad)', () => {
    const report: DoctorReport = {
      timestamp: '2026-01-01T00:00:00.000Z',
      overallStatus: 'fail',
      exitCode: 1,
      categories: [
        {
          category: 'git_hooks',
          title: 'Git Hooks',
          status: 'fail',
          findings: [
            { id: 'HOOK-1', status: 'fail', message: 'Missing pre-commit hook', remediation: 'Run pnpm run git:hook:install' },
            { id: 'HOOK-2', status: 'warn', message: 'Outdated hook version' },
            { id: 'HOOK-3', status: 'pass', message: 'Branch safety active' },
          ],
        },
        {
          category: 'security_tools',
          title: 'Security Tools',
          status: 'warn',
          findings: [{ id: 'SEC-1', status: 'warn', message: 'Semgrep missing' }],
        },
      ],
      remediations: ['Run pnpm run git:hook:install', 'Install semgrep'],
    };

    const output = reporter.formatTerminal(report);
    expect(output).toContain('❌ FAIL (Exit Code: 1)');
    expect(output).toContain('❌ [HOOK-1] Missing pre-commit hook');
    expect(output).toContain('Remediation: Run pnpm run git:hook:install');
    expect(output).toContain('⚠️ [HOOK-2] Outdated hook version');
    expect(output).toContain('ℹ️ [HOOK-3] Branch safety active');
    expect(output).toContain('⚠️ [SECURITY_TOOLS] Security Tools');
    expect(output).toContain('=== Suggested Remediations ===');
    expect(output).toContain('- Install semgrep');
  });

  it('formatTerminal: handles warn overallStatus and empty categories boundary (boundary)', () => {
    const report: DoctorReport = {
      timestamp: '',
      overallStatus: 'warn',
      exitCode: 0,
      categories: [],
      remediations: [],
    };

    const output = reporter.formatTerminal(report);
    expect(output).toContain('⚠️ WARN (Exit Code: 0)');
  });

  it('formatJson: serializes valid DoctorReport JSON and throws on circular malformed structure (happy/malformed)', () => {
    const report: DoctorReport = {
      timestamp: '2026-01-01T00:00:00.000Z',
      overallStatus: 'pass',
      exitCode: 0,
      categories: [],
      remediations: [],
    };
    const parsed = JSON.parse(reporter.formatJson(report));
    expect(parsed.overallStatus).toBe('pass');

    const circular: Record<string, unknown> = { ...report };
    circular.self = circular;
    expect(() => reporter.formatJson(circular as unknown as DoctorReport)).toThrow();
  });
});
