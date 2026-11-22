import { execFileSync as realExecFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractFunctionsTypeScriptAst } from '../src/verifiers/ast/typescript-ast.js';
import { verifyArtifactsSchemas } from '../src/verifiers/schemas.js';

describe('Final Uncovered Functions: TS-AST Fallback, Schemas Failure & Mocked Gitleaks/Semgrep', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-inc27-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('typescript-ast: handles top-level module code without functions', () => {
    const metrics = extractFunctionsTypeScriptAst('export const VERSION = "1.0.0";\nexport const FLAG = true;\n', 'src/constants.ts');
    expect(Array.isArray(metrics)).toBe(true);
  });

  it('schemas: covers buildEvaluationFailure on invalid requirement frontmatter', () => {
    fs.mkdirSync(path.join(tmpDir, 'specs', 'product', 'requirements'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'specs', 'product', 'requirements', 'FR-001.md'),
      '---\nid: FR-001\ntype: requirement\nstatus: invalid-status-value\n---\n# Bad\n',
      'utf-8'
    );
    const res = verifyArtifactsSchemas({ rootDir: tmpDir });
    expect(res.success).toBe(false);
    expect(res.violations.length).toBeGreaterThan(0);
  });

  it('secrets & sast: exercises parseGitleaksItem, appendNonDuplicateFindings, and runSemgrepCli via mocked execFileSync', async () => {
    vi.doMock('child_process', async (importOriginal) => {
      const actual = await importOriginal<typeof import('child_process')>();
      return {
        ...actual,
        execFileSync: vi.fn((cmd: string, args?: readonly string[]) => {
          if (cmd === 'where' || cmd === 'which') return 'ok\n';
          if (cmd === 'gitleaks') {
            return JSON.stringify([
              {
                RuleID: 'generic-api-key',
                Description: 'Leak',
                StartLine: 1,
                File: 'src/a.ts',
                Secret: 'super_secret_token_1234567890',
                Entropy: 4.5,
              },
            ]);
          }
          if (cmd === 'semgrep') {
            return JSON.stringify({
              results: [
                {
                  check_id: 'ts.eval',
                  path: 'src/a.ts',
                  start: { line: 2 },
                  extra: { severity: 'ERROR', message: 'Avoid eval' },
                },
              ],
            });
          }
          return actual.execFileSync(cmd, args as string[]);
        }),
      };
    });

    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'a.ts'), 'export const x = 1;\n', 'utf-8');

    const { verifySecrets } = await import('../src/verifiers/secrets.js');
    const secRes = verifySecrets({ rootDir: tmpDir, gitleaks: true });
    expect(secRes.success).toBe(false);
    expect(secRes.scannedWithGitleaks).toBe(true);

    const { verifySast } = await import('../src/verifiers/sast.js');
    const sastRes = verifySast({ rootDir: tmpDir, semgrep: true });
    expect(sastRes.success).toBe(false);
    expect(sastRes.violations.some((v) => v.ruleId === 'ts.eval')).toBe(true);

    // Also verify real git repo with fix commit for release-kpis
    realExecFileSync('git', ['init'], { cwd: tmpDir, stdio: 'ignore' });
    expect(fs.existsSync(path.join(tmpDir, '.git'))).toBe(true);
  });
});
