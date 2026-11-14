import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifySast, verifySastAsync } from '../src/verifiers/sast.js';
import {
  ensureTrivyAvailable,
  scanWithTrivy,
  scanWithTrivyAsync,
} from '../src/verifiers/sca/scanner.js';
import { verifyLicenses, verifyLicensesAsync } from '../src/verifiers/licenses.js';

vi.mock('child_process', async (importOriginal) => {
  const mod = await importOriginal<typeof import('child_process')>();
  return { ...mod };
});

describe('CHG-059 TSK-003: SAST, Trivy SCA, and License Verifier Async Orchestration Integration', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix = 'aisdlc-tsk003-'): string {
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

  describe('verifySastAsync & synchronous verifySast preservation', () => {
    it('merges orchestrated native CLI findings with built-in SAST_RULES canonically', async () => {
      const rootDir = makeTmpDir('aisdlc-sast-merge-');
      const binDir = makeTmpDir('aisdlc-sast-bin-');
      fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(rootDir, 'pyproject.toml'), '[project]\nname="demo"\n');
      fs.writeFileSync(path.join(rootDir, 'src', 'vuln.ts'), 'const x = eval(userCode);\n');

      const banditBin = path.join(binDir, process.platform === 'win32' ? 'bandit.exe' : 'bandit');
      fs.writeFileSync(banditBin, '');
      if (process.platform !== 'win32') fs.chmodSync(banditBin, 0o755);
      vi.stubEnv('PATH', binDir);

      vi.spyOn(child_process, 'spawnSync').mockImplementation((_cmd, args) => {
        const argList = (args as string[]) || [];
        const outIdx = argList.indexOf('-o');
        if (outIdx >= 0 && argList[outIdx + 1]) {
          fs.writeFileSync(
            argList[outIdx + 1],
            JSON.stringify({
              version: '2.1.0',
              runs: [
                {
                  tool: { driver: { name: 'bandit' } },
                  results: [
                    {
                      ruleId: 'B101',
                      level: 'error',
                      message: { text: 'Use of assert detected' },
                      locations: [
                        {
                          physicalLocation: {
                            artifactLocation: { uri: 'src/app.py' },
                            region: { startLine: 3 },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            }),
          );
          return { status: 1, stdout: '', stderr: '', pid: 1, output: [null, '', ''], signal: null };
        }
        return { status: 0, stdout: '', stderr: '', pid: 2, output: [null, '', ''], signal: null };
      });

      const result = await verifySastAsync({
        rootDir,
        orchestrate: true,
        nonInteractive: true,
      });

      expect(result.success).toBe(false);
      expect(result.violations.some((v) => v.ruleId === 'SAST-003-UNSAFE-EVAL')).toBe(true);
      expect(result.violations.some((v) => v.ruleId === 'B101')).toBe(true);
      expect(result.executedTools).toContain('bandit');
    });

    it('fails verifySastAsync when semgrep is requested but missing and quality-policy.yaml sets fail_on_missing_tool: true', async () => {
      const rootDir = makeTmpDir('aisdlc-sast-policy-');
      const emptyPath = makeTmpDir('aisdlc-sast-empty-');
      fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(rootDir, 'src', 'clean.ts'), 'export const ok = true;\n');
      fs.writeFileSync(
        path.join(rootDir, 'quality-policy.yaml'),
        'release_thresholds:\n  sast_analysis:\n    fail_on_missing_tool: true\n',
      );
      vi.stubEnv('PATH', emptyPath);

      const result = await verifySastAsync({
        rootDir,
        semgrep: true,
        nonInteractive: true,
      });

      expect(result.success).toBe(false);
      expect(result.warnings?.some((w) => w.toLowerCase().includes('semgrep'))).toBe(true);
    });

    it('preserves synchronous verifySast behavior', () => {
      const rootDir = makeTmpDir('aisdlc-sast-sync-');
      fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(rootDir, 'src', 'clean.ts'), 'export const ok = true;\n');
      const syncResult = verifySast({ rootDir });
      expect(syncResult.success).toBe(true);
    });
  });

  describe('scanWithTrivyAsync, ensureTrivyAvailable & verifyLicensesAsync', () => {
    it('ensureTrivyAvailable and scanWithTrivyAsync handle missing trivy gracefully in non-interactive mode', async () => {
      const rootDir = makeTmpDir('aisdlc-trivy-root-');
      const emptyPath = makeTmpDir('aisdlc-trivy-empty-');
      vi.stubEnv('PATH', emptyPath);

      const ensureRes = await ensureTrivyAvailable({ nonInteractive: true });
      expect(ensureRes.available).toBe(false);
      expect(ensureRes.warning).toBeTruthy();

      const scanRes = await scanWithTrivyAsync(rootDir, { nonInteractive: true });
      expect(scanRes.dependencies).toEqual([]);
      expect(scanRes.warnings.some((w) => w.toLowerCase().includes('trivy'))).toBe(true);
    });

    it('verifyLicensesAsync reads fail_on_missing_tool from license-policy.yaml when trivy is missing', async () => {
      const rootDir = makeTmpDir('aisdlc-lic-policy-');
      const emptyPath = makeTmpDir('aisdlc-lic-empty-');
      fs.writeFileSync(path.join(rootDir, 'package.json'), '{"name":"demo","version":"1.0.0"}\n');
      fs.writeFileSync(
        path.join(rootDir, 'license-policy.yaml'),
        'version: "1.0"\nci_gates:\n  fail_on_missing_tool: true\n',
      );
      vi.stubEnv('PATH', emptyPath);

      const result = await verifyLicensesAsync({
        rootDir,
        tool: 'trivy',
        nonInteractive: true,
      });

      expect(result.success).toBe(false);
      expect(result.warnings?.some((w) => w.toLowerCase().includes('trivy'))).toBe(true);
    });

    it('verifyLicensesAsync enforces fail_on_missing_tool with default tool and scanVulnerabilities', async () => {
      const rootDir = makeTmpDir('aisdlc-lic-default-');
      const emptyPath = makeTmpDir('aisdlc-lic-default-empty-');
      fs.writeFileSync(path.join(rootDir, 'package.json'), '{"name":"demo","version":"1.0.0"}\n');
      fs.writeFileSync(
        path.join(rootDir, 'license-policy.yaml'),
        'version: "1.0"\nci_gates:\n  fail_on_missing_tool: true\n',
      );
      vi.stubEnv('PATH', emptyPath);

      const result = await verifyLicensesAsync({
        rootDir,
        nonInteractive: true,
      });

      expect(result.success).toBe(false);
      expect(result.warnings?.some((w) => w.toLowerCase().includes('trivy'))).toBe(true);
    });

    it('preserves synchronous scanWithTrivy and verifyLicenses exports', () => {
      expect(typeof scanWithTrivy).toBe('function');
      expect(typeof verifyLicenses).toBe('function');
    });
  });
});
