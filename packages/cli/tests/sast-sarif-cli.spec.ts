import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runVerifySast } from '../src/commands/verify.js';

describe('CHG-057 TSK-004: CLI --sarif <path...> option & fail-closed exit codes', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix = 'aisdlc-sast-sarif-cli-'): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('registers --sarif <paths...> option on verify sast command in CLI index', () => {
    const indexPath = path.resolve(process.cwd(), 'packages/cli/src/index.ts');
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('--sarif');
  });

  it('does NOT auto-discover SARIF files in rootDir when --sarif is omitted', () => {
    const rootDir = makeTmpDir();
    fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'src', 'clean.ts'), 'export const ok = true;\n', 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'malformed.sarif'), '{ bad json', 'utf-8');

    const passed = runVerifySast({ root: rootDir, silent: true });
    expect(passed).toBe(true);
  });

  it('ingests multiple --sarif paths and emits JSON gate result with exit code semantics', () => {
    const rootDir = makeTmpDir();
    fs.writeFileSync(
      path.join(rootDir, 'a.sarif'),
      JSON.stringify({
        version: '2.1.0',
        runs: [
          {
            tool: { driver: { name: 'bandit' } },
            results: [
              {
                ruleId: 'B101',
                level: 'error',
                message: { text: 'Assert used' },
                locations: [{ physicalLocation: { artifactLocation: { uri: 'src/a.py' }, region: { startLine: 4 } } }],
              },
            ],
          },
        ],
      }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(rootDir, 'b.sarif'),
      JSON.stringify({ version: '2.1.0', runs: [{ tool: { driver: { name: 'gosec' } }, results: [] }] }),
      'utf-8'
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const passed = runVerifySast({
      root: rootDir,
      sarif: ['a.sarif', 'b.sarif'],
      json: true,
    } as Parameters<typeof runVerifySast>[0]);

    expect(passed).toBe(false);
    const jsonCall = logSpy.mock.calls.find((c) => typeof c[0] === 'string' && c[0].includes('"gate": "sast"'));
    expect(jsonCall).toBeDefined();
    const payload = JSON.parse(jsonCall![0] as string);
    expect(payload.summary.totalFilesScanned).toBe(2);
    expect(payload.summary.violationsCount).toBe(1);
    expect(payload.exitCode).toBe(1);
  });

  it('fails closed (returns false / exit code 1) without partial violations on SarifIngestionError', () => {
    const rootDir = makeTmpDir();
    fs.writeFileSync(
      path.join(rootDir, 'valid.sarif'),
      JSON.stringify({
        version: '2.1.0',
        runs: [
          {
            tool: { driver: { name: 'semgrep' } },
            results: [
              {
                ruleId: 'R1',
                level: 'error',
                message: { text: 'Should not be emitted' },
                locations: [{ physicalLocation: { artifactLocation: { uri: 'src/a.ts' }, region: { startLine: 1 } } }],
              },
            ],
          },
        ],
      }),
      'utf-8'
    );

    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const passed = runVerifySast({
      root: rootDir,
      sarif: ['valid.sarif', 'missing.sarif'],
      json: true,
    } as Parameters<typeof runVerifySast>[0]);

    expect(passed).toBe(false);
    const emittedPartial = logSpy.mock.calls.some((c) => String(c[0]).includes('Should not be emitted'));
    expect(emittedPartial).toBe(false);
    const errorOutput = errSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(errorOutput).not.toContain(rootDir);
  });
});
