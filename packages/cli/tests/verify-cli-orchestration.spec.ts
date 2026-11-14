import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  runVerifyAll,
  runVerifyLicenses,
  runVerifyLicensesAsync,
  runVerifySast,
  runVerifySastAsync,
  runVerifySecurity,
} from '../src/commands/verify.js';

describe('CHG-059 TSK-004: CLI verify flags & async orchestration wiring', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix = 'aisdlc-cli-orch-'): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('registers --orchestrate, --non-interactive, --no-install-prompt, and --ci on verify sast and verify licenses in packages/cli/src/index.ts', () => {
    const indexPath = path.resolve(process.cwd(), 'packages/cli/src/index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');

    const sastIdx = content.indexOf(".command('sast')");
    const licensesIdx = content.indexOf(".command('licenses')");
    expect(sastIdx).toBeGreaterThan(-1);
    expect(licensesIdx).toBeGreaterThan(-1);

    const sastBlock = content.slice(sastIdx, sastIdx + 900);
    expect(sastBlock).toContain('--orchestrate');
    expect(sastBlock).toContain('--non-interactive');
    expect(sastBlock).toContain('--no-install-prompt');
    expect(sastBlock).toContain('--ci');

    const licensesBlock = content.slice(licensesIdx, licensesIdx + 1200);
    expect(licensesBlock).toContain('--non-interactive');
    expect(licensesBlock).toContain('--no-install-prompt');
    expect(licensesBlock).toContain('--ci');
  });

  it('runVerifySastAsync executes cleanly with --orchestrate and --non-interactive on a clean repo and emits JSON gate payload', async () => {
    const rootDir = makeTmpDir();
    const emptyPath = makeTmpDir('aisdlc-cli-empty-path-');
    fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'src', 'clean.ts'), 'export const safe = 1;\n');
    vi.stubEnv('PATH', emptyPath);

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const passed = await runVerifySastAsync({
      root: rootDir,
      orchestrate: true,
      nonInteractive: true,
      json: true,
    });

    expect(passed).toBe(true);
    const jsonCall = logSpy.mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('"gate": "sast"'));
    expect(jsonCall).toBeDefined();
    const payload = JSON.parse(jsonCall![0] as string);
    expect(payload.exitCode).toBe(0);
  });

  it('runVerifyLicensesAsync returns false when trivy is missing and license-policy.yaml sets fail_on_missing_tool: true', async () => {
    const rootDir = makeTmpDir();
    const emptyPath = makeTmpDir('aisdlc-cli-lic-empty-');
    fs.writeFileSync(path.join(rootDir, 'package.json'), '{"name":"demo","version":"1.0.0"}\n');
    fs.writeFileSync(
      path.join(rootDir, 'license-policy.yaml'),
      'version: "1.0"\nci_gates:\n  fail_on_missing_tool: true\n',
    );
    vi.stubEnv('PATH', emptyPath);

    const passed = await runVerifyLicensesAsync({
      root: rootDir,
      tool: 'trivy',
      nonInteractive: true,
      silent: true,
    });

    expect(passed).toBe(false);
  });

  it('preserves synchronous runVerifySast/runVerifyLicenses and wires runVerifySecurity and runVerifyAll', async () => {
    expect(typeof runVerifySast).toBe('function');
    expect(typeof runVerifyLicenses).toBe('function');

    const rootDir = makeTmpDir();
    fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'src', 'clean.ts'), 'export const ok = true;\n');

    const secOk = await runVerifySecurity({ root: rootDir, silent: true });
    expect(secOk).toBe(true);
    expect(typeof runVerifyAll).toBe('function');
  });

  it('runVerifySastAsync writes result.warnings to stderr in console mode and includes warnings in --json output', async () => {
    const rootDir = makeTmpDir('aisdlc-cli-warn-');
    const emptyPath = makeTmpDir('aisdlc-cli-warn-empty-');
    fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'src', 'clean.ts'), 'export const safe = 1;\n');
    vi.stubEnv('PATH', emptyPath);

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const consoleOk = await runVerifySastAsync({
      root: rootDir,
      semgrep: true,
      nonInteractive: true,
    });
    expect(consoleOk).toBe(true);
    const stderrText = stderrSpy.mock.calls.map((c) => String(c[0])).join('');
    expect(stderrText).toContain('[SAST WARNING]');
    expect(stderrText.toLowerCase()).toContain('semgrep');

    logSpy.mockClear();
    const jsonOk = await runVerifySastAsync({
      root: rootDir,
      semgrep: true,
      nonInteractive: true,
      json: true,
    });
    expect(jsonOk).toBe(true);
    const jsonCall = logSpy.mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('"gate": "sast"'));
    expect(jsonCall).toBeDefined();
    const payload = JSON.parse(jsonCall![0] as string);
    expect(Array.isArray(payload.warnings)).toBe(true);
    expect(payload.warnings.some((w: string) => w.toLowerCase().includes('semgrep'))).toBe(true);
  });
});
