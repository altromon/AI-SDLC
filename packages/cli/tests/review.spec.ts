/**
 * Tests for CLI: aisdlc review submit (reviewer write channel)
 * Cites: FR-031-WORKFLOW-AGENT-HANDOFF-001
 * Tag: @FR-031-WORKFLOW-AGENT-HANDOFF-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { printJsonResult, printTextResult, runReviewSubmit } from '../src/commands/review.js';

describe('aisdlc review submit', () => {
  let rootDir: string;
  const changeId = 'chg-900-sample-change';

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-review-'));
    fs.mkdirSync(path.join(rootDir, 'specs', 'changes', 'active', changeId), { recursive: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  it('persists the report and returns true', () => {
    const ok = runReviewSubmit({
      root: rootDir,
      change: changeId,
      reviewer: 'agent-compliance-checker',
      verdict: 'COMPLIANT',
      body: 'All licenses permitted.',
      silent: true,
    });

    expect(ok).toBe(true);
    expect(
      fs.existsSync(path.join(rootDir, 'specs', 'changes', 'active', changeId, 'reviews', 'agent-compliance-checker.md'))
    ).toBe(true);
  });

  it('emits the report location and digest as JSON', () => {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((msg: string) => {
      logs.push(String(msg));
    });

    const ok = runReviewSubmit({
      root: rootDir,
      change: changeId,
      reviewer: 'agent-code-reviewer',
      verdict: 'SUGGESTIONS',
      body: '[CLEAN_CODE_SUGGESTION] rename x.',
      json: true,
    });

    expect(ok).toBe(true);
    const payload = JSON.parse(logs.join('\n'));
    expect(payload.command).toBe('review:submit');
    expect(payload.success).toBe(true);
    expect(payload.reportPath).toBe(`specs/changes/active/${changeId}/reviews/agent-code-reviewer.md`);
    expect(payload.digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns false for a non-reviewer role', () => {
    const ok = runReviewSubmit({
      root: rootDir,
      change: changeId,
      reviewer: 'agent-developer',
      verdict: 'COMPLIANT',
      body: 'x',
      silent: true,
    });

    expect(ok).toBe(false);
  });

  it('printJsonResult emits structured payload for both success and error states', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printJsonResult(
      { change: changeId, reviewer: 'agent-code-reviewer', verdict: 'COMPLIANT', body: 'ok' },
      { success: true, verdict: 'COMPLIANT', reportPath: 'reviews/r.md', digest: 'abc123' }
    );
    const okPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(okPayload).toEqual({
      command: 'review:submit',
      success: true,
      change: changeId,
      reviewer: 'agent-code-reviewer',
      verdict: 'COMPLIANT',
      reportPath: 'reviews/r.md',
      digest: 'abc123',
    });

    printJsonResult(
      { change: changeId, reviewer: 'agent-developer', verdict: 'COMPLIANT', body: 'x' },
      { success: false, error: 'Unauthorized reviewer' }
    );
    const errPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(errPayload.success).toBe(false);
    expect(errPayload.error).toBe('Unauthorized reviewer');
  });

  it('printTextResult prints report summary on success and fallback/error text on failure', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    printTextResult({ success: true, reportPath: 'r.md', verdict: 'COMPLIANT', digest: 'deadbeef' });
    expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Review report persisted: ');
    expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('deadbeef');

    logSpy.mockClear();
    printTextResult({ success: true });
    expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('Verdict:');

    printTextResult({ success: false, error: 'Invalid verdict' });
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid verdict'));

    errSpy.mockClear();
    printTextResult({ success: false });
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown error'));
  });
});
