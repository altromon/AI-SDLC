import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  detectProjectEcosystems,
  orchestratePolyglotSast,
} from '../src/verifiers/sast-orchestrator.js';

vi.mock('child_process', async (importOriginal) => {
  const mod = await importOriginal<typeof import('child_process')>();
  return { ...mod };
});

function buildSampleSarif(toolName: string, ruleId: string, uri: string, startLine: number): string {
  return JSON.stringify({
    version: '2.1.0',
    runs: [
      {
        tool: { driver: { name: toolName } },
        results: [
          {
            ruleId,
            level: 'error',
            message: { text: `${toolName} finding ${ruleId}` },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri },
                  region: { startLine },
                },
              },
            ],
          },
        ],
      },
    ],
  });
}

describe('CHG-059 TSK-002: Polyglot SAST Orchestrator (detectProjectEcosystems & orchestratePolyglotSast)', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix = 'aisdlc-sast-orch-'): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  function installFakeBinaries(binDir: string, names: string[]): void {
    for (const name of names) {
      const file = path.join(binDir, process.platform === 'win32' ? `${name}.exe` : name);
      fs.writeFileSync(file, '');
      if (process.platform !== 'win32') fs.chmodSync(file, 0o755);
    }
  }

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  describe('detectProjectEcosystems', () => {
    it('detects python, go, dotnet, java, and node ecosystems deterministically from manifests and source files', () => {
      const rootDir = makeTmpDir();
      fs.writeFileSync(path.join(rootDir, 'pyproject.toml'), '[project]\nname="demo"\n');
      fs.writeFileSync(path.join(rootDir, 'go.mod'), 'module example.com/demo\n');
      fs.writeFileSync(path.join(rootDir, 'App.csproj'), '<Project />\n');
      fs.writeFileSync(path.join(rootDir, 'pom.xml'), '<project />\n');
      fs.writeFileSync(path.join(rootDir, 'package.json'), '{"name":"demo"}\n');

      const ecosystems = detectProjectEcosystems(rootDir);
      expect(ecosystems).toEqual(expect.arrayContaining(['python', 'go', 'dotnet', 'java', 'node']));
      expect(new Set(ecosystems).size).toBe(ecosystems.length);
    });

    it('detects ecosystems from source file extensions even without manifest files', () => {
      const rootDir = makeTmpDir();
      fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(rootDir, 'src', 'app.py'), 'print("hi")\n');
      fs.writeFileSync(path.join(rootDir, 'src', 'main.go'), 'package main\n');

      const ecosystems = detectProjectEcosystems(rootDir);
      expect(ecosystems).toContain('python');
      expect(ecosystems).toContain('go');
    });

    it('detects node ecosystem from tsconfig.json manifest', () => {
      const rootDir = makeTmpDir();
      fs.writeFileSync(path.join(rootDir, 'tsconfig.json'), '{"compilerOptions":{}}\n');
      expect(detectProjectEcosystems(rootDir)).toContain('node');
    });
  });

  describe('orchestratePolyglotSast', () => {
    it('invokes native CLIs and semgrep with shell: false, bounded timeout, accepts exit 0/1 with non-empty SARIF, and ingests via two-root pipeline', async () => {
      const rootDir = makeTmpDir('aisdlc-orch-proj-');
      const binDir = makeTmpDir('aisdlc-orch-bin-');
      fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(rootDir, 'pyproject.toml'), '[project]\nname="py"\n');
      fs.writeFileSync(path.join(rootDir, 'go.mod'), 'module example.com/go\n');
      fs.writeFileSync(path.join(rootDir, 'src', 'app.py'), 'assert True\n');
      fs.writeFileSync(path.join(rootDir, 'src', 'main.go'), 'package main\n');

      installFakeBinaries(binDir, ['bandit', 'gosec', 'semgrep']);
      vi.stubEnv('PATH', binDir);

      let capturedTmpDir: string | undefined;
      const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockImplementation((cmd, args, opts) => {
        expect(opts?.shell).toBe(false);
        expect(opts?.timeout).toBeGreaterThan(0);

        const argList = (args as string[]) || [];
        const outIdx = argList.findIndex((a) => a === '-o' || a === '-out' || a === '--output');
        const outFile = outIdx >= 0 ? argList[outIdx + 1] : undefined;
        if (outFile) {
          capturedTmpDir = path.dirname(outFile);
          const base = path.basename(String(cmd));
          if (base.startsWith('bandit')) {
            fs.writeFileSync(outFile, buildSampleSarif('bandit', 'B101', 'src/app.py', 1));
            return { status: 1, stdout: '', stderr: '', pid: 1, output: [null, '', ''], signal: null };
          }
          if (base.startsWith('gosec')) {
            fs.writeFileSync(outFile, buildSampleSarif('gosec', 'G101', 'src/main.go', 2));
            return { status: 1, stdout: '', stderr: '', pid: 2, output: [null, '', ''], signal: null };
          }
          if (base.startsWith('semgrep')) {
            fs.writeFileSync(outFile, JSON.stringify({ version: '2.1.0', runs: [{ tool: { driver: { name: 'semgrep' } }, results: [] }] }));
            return { status: 0, stdout: '', stderr: '', pid: 3, output: [null, '', ''], signal: null };
          }
        }
        return { status: 0, stdout: '', stderr: '', pid: 4, output: [null, '', ''], signal: null };
      });

      const result = await orchestratePolyglotSast(rootDir, {
        nonInteractive: true,
      });

      expect(spawnSpy).toHaveBeenCalled();
      expect(result.ecosystems).toEqual(expect.arrayContaining(['python', 'go']));
      expect(result.executedTools).toEqual(expect.arrayContaining(['bandit', 'gosec', 'semgrep']));
      expect(result.violations.length).toBe(2);
      expect(result.violations[0]).toMatchObject({ relPath: 'src/app.py', ruleId: 'B101', lineNumber: 1 });
      expect(result.violations[1]).toMatchObject({ relPath: 'src/main.go', ruleId: 'G101', lineNumber: 2 });

      // Temporary SARIF directory must be cleaned up in finally
      expect(capturedTmpDir).toBeDefined();
      expect(fs.existsSync(capturedTmpDir!)).toBe(false);
    });

    it('handles status > 1, ETIMEDOUT, and missing eslint SARIF formatter as non-blocking redacted diagnostics and still cleans tmpDir', async () => {
      const rootDir = makeTmpDir('aisdlc-orch-diag-');
      const binDir = makeTmpDir('aisdlc-orch-diag-bin-');
      fs.writeFileSync(path.join(rootDir, 'pyproject.toml'), '[project]\nname="py"\n');
      fs.writeFileSync(path.join(rootDir, 'package.json'), '{"name":"node"}\n');
      fs.writeFileSync(path.join(rootDir, 'App.csproj'), '<Project />\n');
      fs.writeFileSync(path.join(rootDir, 'pom.xml'), '<project />\n');

      installFakeBinaries(binDir, ['bandit', 'eslint', 'dotnet', 'spotbugs', 'semgrep']);
      vi.stubEnv('PATH', binDir);

      const createdTmpDirs = new Set<string>();
      vi.spyOn(child_process, 'spawnSync').mockImplementation((cmd, args) => {
        const argList = (args as string[]) || [];
        for (const a of argList) {
          if (a.includes('aisdlc-sast-')) {
            const cleaned = a.replace(/^\/p:ErrorLog=/, '').replace(/,version=2\.1$/, '');
            createdTmpDirs.add(path.dirname(cleaned));
          }
        }
        const base = path.basename(String(cmd));
        if (base.startsWith('bandit')) {
          return {
            status: 2,
            stdout: '',
            stderr: `Fatal error in ${rootDir} with GITHUB_TOKEN=ghp_secret123`,
            pid: 10,
            output: [null, '', `Fatal error in ${rootDir} with GITHUB_TOKEN=ghp_secret123`],
            signal: null,
          };
        }
        if (base.startsWith('eslint')) {
          return {
            status: 2,
            stdout: '',
            stderr: 'Cannot find module @microsoft/eslint-formatter-sarif',
            pid: 11,
            output: [null, '', 'Cannot find module @microsoft/eslint-formatter-sarif'],
            signal: null,
          };
        }
        if (base.startsWith('semgrep')) {
          const err = new Error('ETIMEDOUT') as NodeJS.ErrnoException;
          err.code = 'ETIMEDOUT';
          return {
            status: null,
            stdout: '',
            stderr: '',
            pid: 12,
            output: [null, '', ''],
            signal: null,
            error: err,
          };
        }
        return { status: 0, stdout: '', stderr: '', pid: 13, output: [null, '', ''], signal: null };
      });

      const result = await orchestratePolyglotSast(rootDir, {
        nonInteractive: true,
      });

      expect(result.diagnostics.some((d) => d.tool === 'bandit' && d.status === 'failed')).toBe(true);
      expect(result.diagnostics.some((d) => d.tool === 'eslint' && d.status === 'failed')).toBe(true);
      expect(result.diagnostics.some((d) => d.tool === 'semgrep' && d.status === 'failed')).toBe(true);

      const allMessages = [...result.warnings, ...result.diagnostics.map((d) => d.message ?? '')].join('\n');
      expect(allMessages).not.toContain(rootDir);
      expect(allMessages).not.toContain('ghp_secret123');

      for (const dir of createdTmpDirs) {
        expect(fs.existsSync(dir)).toBe(false);
      }
    });

    it('preserves valid findings from healthy tools when another tool produces malformed SARIF', async () => {
      const rootDir = makeTmpDir('aisdlc-orch-partial-');
      const binDir = makeTmpDir('aisdlc-orch-partial-bin-');
      fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(rootDir, 'pyproject.toml'), '[project]\nname="py"\n');
      fs.writeFileSync(path.join(rootDir, 'go.mod'), 'module example.com/go\n');
      fs.writeFileSync(path.join(rootDir, 'src', 'app.py'), 'assert True\n');
      fs.writeFileSync(path.join(rootDir, 'src', 'main.go'), 'package main\n');

      installFakeBinaries(binDir, ['bandit', 'gosec']);
      vi.stubEnv('PATH', binDir);

      vi.spyOn(child_process, 'spawnSync').mockImplementation((cmd, args) => {
        const argList = (args as string[]) || [];
        const outIdx = argList.findIndex((a) => a === '-o' || a === '-out');
        const outFile = outIdx >= 0 ? argList[outIdx + 1] : undefined;
        const base = path.basename(String(cmd));
        if (outFile && base.startsWith('bandit')) {
          fs.writeFileSync(outFile, '{not-valid-json');
          return { status: 1, stdout: '', stderr: '', pid: 1, output: [null, '', ''], signal: null };
        }
        if (outFile && base.startsWith('gosec')) {
          fs.writeFileSync(outFile, buildSampleSarif('gosec', 'G101', 'src/main.go', 2));
          return { status: 1, stdout: '', stderr: '', pid: 2, output: [null, '', ''], signal: null };
        }
        return { status: 0, stdout: '', stderr: '', pid: 3, output: [null, '', ''], signal: null };
      });

      const result = await orchestratePolyglotSast(rootDir, {
        semgrep: false,
        nonInteractive: true,
      });

      expect(result.violations.some((v) => v.ruleId === 'G101' && v.relPath === 'src/main.go')).toBe(true);
      expect(result.warnings.some((w) => w.includes('bandit.sarif'))).toBe(true);
    });
  });
});
