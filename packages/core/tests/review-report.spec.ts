/**
 * Tests for the reviewer write channel: submitReviewReport
 * (the only sanctioned write path for read-only reviewer agents)
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REVIEWER_ROLES, REVIEW_VERDICTS, submitReviewReport } from '../src/index.js';

describe('submitReviewReport (reviewer write channel)', () => {
  let rootDir: string;
  const changeId = 'chg-900-sample-change';

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-review-report-'));
    fs.mkdirSync(path.join(rootDir, 'specs', 'changes', 'active', changeId), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true });
  });

  const submit = (overrides: Record<string, unknown> = {}) =>
    submitReviewReport({
      rootDir,
      changeId,
      reviewer: 'agent-code-reviewer',
      verdict: 'BLOCKING',
      body: '[BLOCKING] src/a.ts: function exceeds 40 lines.',
      ...overrides,
    });

  it('exposes the reviewer roles and the three protocol verdicts', () => {
    expect(REVIEW_VERDICTS).toEqual(['COMPLIANT', 'SUGGESTIONS', 'BLOCKING']);
    expect(REVIEWER_ROLES).toContain('agent-code-reviewer');
    expect(REVIEWER_ROLES).toContain('agent-security-auditor');
    expect(REVIEWER_ROLES).toContain('agent-compliance-checker');
    expect(REVIEWER_ROLES).toContain('agent-privacy-officer');
    expect(REVIEWER_ROLES).not.toContain('agent-developer');
  });

  it('writes the report under the change reviews folder and returns its location and digest', () => {
    const result = submit();

    expect(result.success).toBe(true);
    expect(result.reportPath).toBe(`specs/changes/active/${changeId}/reviews/agent-code-reviewer.md`);
    const abs = path.join(rootDir, ...(result.reportPath as string).split('/'));
    expect(fs.existsSync(abs)).toBe(true);

    const content = fs.readFileSync(abs, 'utf-8');
    expect(content).toContain('reviewer: agent-code-reviewer');
    expect(content).toContain('verdict: BLOCKING');
    expect(content).toContain(`change: ${changeId}`);
    expect(content).toContain('function exceeds 40 lines');

    const expected = crypto.createHash('sha256').update(content.replace(/\r\n/g, '\n')).digest('hex');
    expect(result.digest).toBe(expected);
    expect(result.verdict).toBe('BLOCKING');
  });

  it('overwrites a previous report of the same reviewer (re-review) with a new digest', () => {
    const first = submit();
    const second = submit({ verdict: 'COMPLIANT', body: 'All findings fixed.' });

    expect(second.success).toBe(true);
    expect(second.reportPath).toBe(first.reportPath);
    expect(second.digest).not.toBe(first.digest);
    const files = fs.readdirSync(path.join(rootDir, 'specs', 'changes', 'active', changeId, 'reviews'));
    expect(files).toEqual(['agent-code-reviewer.md']);
  });

  it('rejects a reviewer role that is not a reviewer and writes nothing', () => {
    const result = submit({ reviewer: 'agent-developer' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/reviewer/i);
    expect(fs.existsSync(path.join(rootDir, 'specs', 'changes', 'active', changeId, 'reviews'))).toBe(false);
  });

  it('rejects an invalid verdict', () => {
    const result = submit({ verdict: 'LGTM' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/verdict/i);
  });

  it('rejects an empty body', () => {
    const result = submit({ body: '   ' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/body/i);
  });

  it('rejects change ids that try to traverse paths and writes outside nothing', () => {
    for (const bad of ['../../etc', '..', 'chg/../../x', 'a\\b']) {
      const result = submit({ changeId: bad });
      expect(result.success, `change '${bad}' must be rejected`).toBe(false);
    }
    expect(fs.existsSync(path.join(rootDir, 'etc'))).toBe(false);
  });

  it('rejects a change that is not active', () => {
    const result = submit({ changeId: 'chg-901-missing' });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it('applies the workspace DLP policy to the persisted body', () => {
    fs.writeFileSync(
      path.join(rootDir, 'dlp-policy.yaml'),
      `version: "1.0.0"\nrules:\n  - id: CUSTOM-SECRET\n    description: "Custom Secret Token"\n    pattern: "SECRET_TOKEN_[A-Z0-9_]+"\n    replacement: "[REDACTED_CUSTOM-SECRET]"\n`
    );

    const result = submit({ body: 'Leaked SECRET_TOKEN_ABC123 in src/config.ts' });

    expect(result.success).toBe(true);
    const content = fs.readFileSync(path.join(rootDir, ...(result.reportPath as string).split('/')), 'utf-8');
    expect(content).not.toContain('SECRET_TOKEN_ABC123');
    expect(content).toContain('[REDACTED_CUSTOM-SECRET]');
  });
});
