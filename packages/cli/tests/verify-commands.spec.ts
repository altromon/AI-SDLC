/**
 * Cites: FR-025-STRUCTURED-JSON-VERIFY-001
 * Tag: @FR-025-STRUCTURED-JSON-VERIFY-001
 */
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
    initProject({ targetDir: tempDir, agents: 'none' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('executes individual verify commands in text and json modes on initialized project', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Text mode executions (quality fails without coverage report on default policy; remaining 9 pass)
    expect(runVerifyQuality({ root: tempDir })).toBe(false);
    expect(runVerifyTraceability({ root: tempDir })).toBe(true);
    expect(runVerifyGovernance({ root: tempDir })).toBe(true);
    expect(runVerifyTesting({ root: tempDir })).toBe(true);
    expect(runVerifyPdac({ root: tempDir })).toBe(true);
    expect(runVerifySchemas({ root: tempDir })).toBe(true);
    expect(runVerifyFriction({ root: tempDir })).toBe(true);
    expect(runVerifyDuplicates({ root: tempDir })).toBe(true);
    expect(runVerifyGherkin({ root: tempDir })).toBe(true);
    expect(runVerifyPrivacy({ root: tempDir })).toBe(true);

    const expectJsonGate = (fn: () => boolean, gate: string, expectedSuccess: boolean) => {
      logSpy.mockClear();
      expect(fn()).toBe(expectedSuccess);
      const parsed = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(parsed.gate).toBe(gate);
      expect(parsed.success).toBe(expectedSuccess);
      expect(parsed.exitCode).toBe(expectedSuccess ? 0 : 1);
      expect(Array.isArray(parsed.violations)).toBe(true);
    };

    // JSON mode executions
    expectJsonGate(() => runVerifyQuality({ root: tempDir, json: true }), 'quality', false);
    expectJsonGate(() => runVerifyTraceability({ root: tempDir, json: true }), 'traceability', true);
    expectJsonGate(() => runVerifyGovernance({ root: tempDir, json: true }), 'governance', true);
    expectJsonGate(() => runVerifyTesting({ root: tempDir, json: true }), 'testing', true);
    expectJsonGate(() => runVerifyPdac({ root: tempDir, json: true }), 'pdac', true);
    expectJsonGate(() => runVerifySchemas({ root: tempDir, json: true }), 'schemas', true);
    expectJsonGate(() => runVerifyFriction({ root: tempDir, json: true }), 'friction', true);
    expectJsonGate(() => runVerifyDuplicates({ root: tempDir, json: true }), 'duplicates', true);
    expectJsonGate(() => runVerifyGherkin({ root: tempDir, json: true }), 'gherkin', true);
    expectJsonGate(() => runVerifyPrivacy({ root: tempDir, json: true }), 'privacy', true);
  });

  it('exercises failure-reporting branches across verify commands in text and json modes', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

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

    // 6. Verify concrete pass/fail outcomes across all 10 commands in text and JSON modes
    const expected: Array<[string, (json: boolean) => boolean, boolean, number]> = [
      ['quality', (json) => runVerifyQuality({ root: tempDir, json }), false, 1],
      ['traceability', (json) => runVerifyTraceability({ root: tempDir, json }), false, 1],
      ['governance', (json) => runVerifyGovernance({ root: tempDir, json }), true, 0],
      ['testing', (json) => runVerifyTesting({ root: tempDir, json }), false, 1],
      ['pdac', (json) => runVerifyPdac({ root: tempDir, json }), true, 0],
      ['schemas', (json) => runVerifySchemas({ root: tempDir, json }), false, 1],
      ['friction', (json) => runVerifyFriction({ root: tempDir, json }), true, 0],
      ['duplicates', (json) => runVerifyDuplicates({ root: tempDir, json }), true, 0],
      ['gherkin', (json) => runVerifyGherkin({ root: tempDir, json }), false, 1],
      ['privacy', (json) => runVerifyPrivacy({ root: tempDir, json }), true, 0],
    ];

    for (const [gate, runFn, expectedPass, expectedExit] of expected) {
      logSpy.mockClear();
      expect(runFn(false)).toBe(expectedPass);
      expect(logSpy).toHaveBeenCalled();

      logSpy.mockClear();
      expect(runFn(true)).toBe(expectedPass);
      const parsed = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(parsed.gate).toBe(gate);
      expect(parsed.success).toBe(expectedPass);
      expect(parsed.exitCode).toBe(expectedExit);
      if (!expectedPass) {
        expect(parsed.violations.length).toBeGreaterThan(0);
      }
    }
  });
});
