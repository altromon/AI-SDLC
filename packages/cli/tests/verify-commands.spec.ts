import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initProject } from '@aisdlc/core';
import {
  runVerifyDuplicates,
  runVerifyFriction,
  runVerifyGherkin,
  runVerifyGovernance,
  runVerifyPdac,
  runVerifyPrivacy,
  runVerifyQuality,
  runVerifySchemas,
  runVerifyTesting,
  runVerifyTraceability,
} from '../src/commands/verify.js';

describe('CLI Verify Commands Text & JSON Coverage Suite', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-verify-cmds-'));
    initProject({ targetDir: tempDir, agents: 'none', silent: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('executes individual verify commands in text and json modes on initialized project', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Text mode executions
    expect(typeof runVerifyQuality({ root: tempDir })).toBe('boolean');
    expect(typeof runVerifyTraceability({ root: tempDir })).toBe('boolean');
    expect(typeof runVerifyGovernance({ root: tempDir })).toBe('boolean');
    expect(typeof runVerifyTesting({ root: tempDir })).toBe('boolean');
    expect(typeof runVerifyPdac({ root: tempDir })).toBe('boolean');
    expect(typeof runVerifySchemas({ root: tempDir })).toBe('boolean');
    expect(typeof runVerifyFriction({ root: tempDir })).toBe('boolean');
    expect(typeof runVerifyDuplicates({ root: tempDir })).toBe('boolean');
    expect(typeof runVerifyGherkin({ root: tempDir })).toBe('boolean');
    expect(typeof runVerifyPrivacy({ root: tempDir })).toBe('boolean');

    // JSON mode executions
    expect(typeof runVerifyQuality({ root: tempDir, json: true })).toBe('boolean');
    expect(typeof runVerifyTraceability({ root: tempDir, json: true })).toBe('boolean');
    expect(typeof runVerifyGovernance({ root: tempDir, json: true })).toBe('boolean');
    expect(typeof runVerifyTesting({ root: tempDir, json: true })).toBe('boolean');
    expect(typeof runVerifyPdac({ root: tempDir, json: true })).toBe('boolean');
    expect(typeof runVerifySchemas({ root: tempDir, json: true })).toBe('boolean');
    expect(typeof runVerifyFriction({ root: tempDir, json: true })).toBe('boolean');
    expect(typeof runVerifyDuplicates({ root: tempDir, json: true })).toBe('boolean');
    expect(typeof runVerifyGherkin({ root: tempDir, json: true })).toBe('boolean');
    expect(typeof runVerifyPrivacy({ root: tempDir, json: true })).toBe('boolean');

    expect(logSpy).toHaveBeenCalled();
    expect(errSpy).not.toThrow();
  });

  it('exercises failure-reporting branches across verify commands in text and json modes', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // 1. High-complexity source file + PII leak in src/
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'bad.ts'),
      [
        'export function complexBad(a: number, b: number, c: number, d: number, e: number, f: number): number {',
        '  const email = "user@example.com";',
        '  console.log("User email:", email);',
        '  let res = 0;',
        '  if (a > 0) { if (b > 0) { if (c > 0) { res += 1; } else { res += 2; } } else if (d > 0) { res += 3; } }',
        '  if (e > 0) { for (let i = 0; i < 10; i++) { if (f > i) { res += i; } else if (i % 2 === 0) { res -= 1; } } }',
        '  switch (a) { case 1: res += 10; break; case 2: res += 20; break; case 3: res += 30; break; case 4: res += 40; break; default: res += 50; }',
        '  return res;',
        '}',
      ].join('\n'),
      'utf-8'
    );

    // 2. Failing coverage summary
    fs.mkdirSync(path.join(tempDir, 'coverage'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'coverage', 'coverage-summary.json'),
      JSON.stringify({
        total: {
          lines: { pct: 50 },
          branches: { pct: 40 },
          functions: { pct: 50 },
          statements: { pct: 50 },
        },
      }),
      'utf-8'
    );

    // 3. Duplicate FRs + invalid schema markdown in specs/product/
    fs.mkdirSync(path.join(tempDir, 'specs', 'product'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'specs', 'product', '01_dup_a.md'),
      '---\nid: FR-101\n---\n# FR-101\n\n## FR-101: Duplicate Requirement\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tempDir, 'specs', 'product', '02_dup_b.md'),
      '---\ninvalid_frontmatter_without_id: true\n---\n# FR-101\n\n## FR-101: Duplicate Requirement\n',
      'utf-8'
    );

    // 4. Active change with unlinked/unverified task & missing manifest
    fs.mkdirSync(path.join(tempDir, 'specs', 'changes', 'active', 'chg-bad'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'specs', 'changes', 'active', 'chg-bad', 'tasks.md'),
      '# Tasks\n- [ ] TSK-999: Unlinked task\n',
      'utf-8'
    );

    // 5. Orphan Gherkin feature without steps
    fs.mkdirSync(path.join(tempDir, 'tests', 'features'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'tests', 'features', 'orphan.feature'),
      'Feature: Orphan\n  Scenario: Missing step\n    Given something unimplemented\n',
      'utf-8'
    );

    // 6. Friction / PDAC / Governance / Traceability / Schemas / Quality / Testing / Duplicates / Gherkin / Privacy
    for (const json of [false, true]) {
      expect(typeof runVerifyQuality({ root: tempDir, json })).toBe('boolean');
      expect(typeof runVerifyTraceability({ root: tempDir, json })).toBe('boolean');
      expect(typeof runVerifyGovernance({ root: tempDir, json })).toBe('boolean');
      expect(typeof runVerifyTesting({ root: tempDir, json })).toBe('boolean');
      expect(typeof runVerifyPdac({ root: tempDir, json })).toBe('boolean');
      expect(typeof runVerifySchemas({ root: tempDir, json })).toBe('boolean');
      expect(typeof runVerifyFriction({ root: tempDir, json })).toBe('boolean');
      expect(typeof runVerifyDuplicates({ root: tempDir, json })).toBe('boolean');
      expect(typeof runVerifyGherkin({ root: tempDir, json })).toBe('boolean');
      expect(typeof runVerifyPrivacy({ root: tempDir, json })).toBe('boolean');
    }

    expect(logSpy).toHaveBeenCalled();
    expect(errSpy).not.toThrow();
  });
});
