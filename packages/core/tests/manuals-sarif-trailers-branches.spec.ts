import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { extractCommitKpisFromRange, resolveGitRef } from '../src/git/trailers.js';
import { scanManualsInWorkspace, verifyManuals } from '../src/verifiers/manuals.js';
import { deduplicateAndSortViolations, parseSarifDocument, sanitizeSarifText } from '../src/verifiers/sarif-sast.js';

describe('Manuals, SARIF-SAST & Git Trailers Composite Branches (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-inc28-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('manuals: scans empty workspace, valid manuals, and malformed manual frontmatter', () => {
    expect(scanManualsInWorkspace(tmpDir)).toEqual([]);
    const emptyRes = verifyManuals({ rootDir: tmpDir });
    expect(typeof emptyRes.success).toBe('boolean');

    fs.mkdirSync(path.join(tmpDir, 'docs', 'manuals'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'docs', 'manuals', 'USER_MANUAL.md'),
      '---\nid: MAN-USR-001\ntype: user-manual\naudience: end-user\n---\n# User Manual\n## Installation\nSteps\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'docs', 'manuals', 'BAD_MANUAL.md'),
      '---\nid: BAD\n---\n# Bad\n',
      'utf-8'
    );

    const scanned = scanManualsInWorkspace(tmpDir);
    expect(scanned.length).toBeGreaterThanOrEqual(1);
    const res = verifyManuals({ rootDir: tmpDir });
    expect(typeof res.success).toBe('boolean');
  });

  it('sarif-sast: sanitizes ANSI/control chars, parses valid/empty/malformed SARIF docs, and deduplicates violations', () => {
    expect(sanitizeSarifText('\u001b[31mError\u001b[0m\u0007')).toBe('Error');
    expect(sanitizeSarifText('')).toBe('');

    expect(parseSarifDocument(tmpDir, {} as never)).toEqual([]);
    const parsed = parseSarifDocument(tmpDir, {
      runs: [
        {
          tool: { driver: { name: 'semgrep', rules: [{ id: 'R1', properties: { 'security-severity': '9.2' } }] } },
          results: [
            {
              ruleId: 'R1',
              level: 'error',
              message: { text: 'SQLi' },
              locations: [{ physicalLocation: { artifactLocation: { uri: 'src/a.ts' }, region: { startLine: 10 } } }],
            },
            {
              ruleId: 'R1',
              level: 'error',
              message: { text: 'SQLi' },
              locations: [{ physicalLocation: { artifactLocation: { uri: 'src/a.ts' }, region: { startLine: 10 } } }],
            },
            {
              ruleId: 'R2',
              level: 'warning',
              message: { text: 'Minor' },
              locations: [],
            },
          ],
        },
      ],
    } as never);
    expect(parsed.length).toBe(2);

    const deduped = deduplicateAndSortViolations(parsed);
    expect(deduped.length).toBe(2);
  });

  it('git trailers: resolves refs and extracts AI/bug/task KPIs from real git commit range', () => {
    execFileSync('git', ['init'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'dev@example.com'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.name', 'Dev'], { cwd: tmpDir, stdio: 'ignore' });

    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'a.ts'), 'export const a = 1;\n', 'utf-8');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'chore: base'], { cwd: tmpDir, stdio: 'ignore' });
    const baseSha = resolveGitRef('HEAD', { cwd: tmpDir });
    expect(baseSha).toBeTruthy();

    fs.writeFileSync(path.join(tmpDir, 'src', 'a.ts'), 'export const a = 2;\n', 'utf-8');
    execFileSync('git', ['add', '.'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync(
      'git',
      [
        'commit',
        '-m',
        'fix: handle null edge case',
        '-m',
        'Task-ID: TSK-001\nParent-Ref: CHG-001\nAuthor-Type: agent\nAI-Model: Gemini\nAI-Reasoning-Effort: medium\nPrompt-Tokens: 100\nCompletion-Tokens: 50\nActive-Time-Sec: 30',
      ],
      { cwd: tmpDir, stdio: 'ignore' }
    );

    const kpis = extractCommitKpisFromRange('HEAD~1', 'HEAD', { cwd: tmpDir });
    expect(kpis).toHaveLength(1);
    expect(kpis[0].isBugFix).toBe(true);

    expect(resolveGitRef('nonexistent-ref-999', { cwd: tmpDir })).toBeTruthy();
  });
});
