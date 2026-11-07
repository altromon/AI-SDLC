/**
 * Tests for CLI: aisdlc review submit (reviewer write channel)
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runReviewSubmit } from '../src/commands/review.js';

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
});
