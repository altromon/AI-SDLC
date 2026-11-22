/**
 * Cites: FR-025-STRUCTURED-JSON-VERIFY-001, FR-030-INIT-AGENT-SCAFFOLDING-001, FR-052-CLI-DOCTOR-001
 * Tag: @FR-025-STRUCTURED-JSON-VERIFY-001 @FR-030-INIT-AGENT-SCAFFOLDING-001 @FR-052-CLI-DOCTOR-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { afterEach, describe, expect, it } from 'vitest';

const cliEntry = path.resolve(process.cwd(), 'packages/cli/dist/index.js');

describe('CLI index.ts command option wiring & input validation', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const d of tempDirs.splice(0)) {
      fs.rmSync(d, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('registers check --vuln and forwards --vuln on compiled CLI binary', () => {
    const helpOut = execFileSync('node', [cliEntry, 'check', '--help'], { encoding: 'utf-8' });
    expect(helpOut).toContain('--vuln');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-check-vuln-'));
    tempDirs.push(tmpDir);
    const res = spawnSync('node', [cliEntry, 'check', '--vuln', '--json', '--root', tmpDir], {
      encoding: 'utf-8',
    });
    expect(res.status).toBe(0);
    const parsed = JSON.parse(res.stdout);
    expect(parsed.command).toBe('check');
    expect(parsed.success).toBe(true);
    expect(Array.isArray(parsed.gates)).toBe(true);
    expect(parsed.gates.some((g: { name?: string }) => String(g.name).toLowerCase().includes('license'))).toBe(true);
  });

  it('registers sdd integrate --all and executes batch integration without --change', () => {
    const helpOut = execFileSync('node', [cliEntry, 'sdd', 'integrate', '--help'], { encoding: 'utf-8' });
    expect(helpOut).toContain('--all');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-sdd-all-'));
    tempDirs.push(tmpDir);
    const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001-batch');
    fs.mkdirSync(chgDir, { recursive: true });
    fs.writeFileSync(
      path.join(chgDir, 'handoff.yaml'),
      'id: HOF-001\nchangeId: chg-001-batch\nsubgraph:\n  requirements: [FR-1]\n  components: [CMP-1]\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(chgDir, 'tasks.md'),
      '---\ntasks:\n  - id: TSK-1\n    title: Done\n    status: completed\n---\n- [x] TSK-1: Done\n',
      'utf-8'
    );

    const out = execFileSync('node', [cliEntry, 'sdd', 'integrate', '--all', '--json', '--root', tmpDir], {
      encoding: 'utf-8',
    });
    const parsed = JSON.parse(out);
    expect(parsed.command).toBe('sdd:integrate:all');
    expect(parsed.processedChanges).toEqual(['chg-001-batch']);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid non-positive or non-numeric doctor --timeout values', () => {
    const badText = spawnSync('node', [cliEntry, 'doctor', '--timeout', 'abc'], { encoding: 'utf-8' });
    expect(badText.status).not.toBe(0);
    expect(badText.stderr).toContain('Invalid --timeout value');

    const badZero = spawnSync('node', [cliEntry, 'doctor', '--timeout', '0'], { encoding: 'utf-8' });
    expect(badZero.status).not.toBe(0);
    expect(badZero.stderr).toContain('Invalid --timeout value');
  });

  it('init --format JSON emits strictly parseable JSON without interactive menu leakage', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-init-json-'));
    tempDirs.push(tmpDir);
    const targetDir = path.join(tmpDir, 'proj');
    const out = execFileSync(
      'node',
      [cliEntry, 'init', targetDir, '--dry-run', '--ci', 'none', '--arch', 'none', '--agents', 'none', '--stack', 'none', '--format', 'JSON'],
      { encoding: 'utf-8' }
    );
    const parsed = JSON.parse(out);
    expect(parsed.command).toBe('init');
    expect(parsed.success).toBe(true);
    expect(parsed.dryRun).toBe(true);
  });
});
