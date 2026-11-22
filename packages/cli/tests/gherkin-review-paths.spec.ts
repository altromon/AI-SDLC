/**
 * Cites: FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001, FR-031-WORKFLOW-AGENT-HANDOFF-001
 * Tag: @FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001 @FR-031-WORKFLOW-AGENT-HANDOFF-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runGherkinExtract, runGherkinScaffold } from '../src/commands/gherkin.js';
import { runReviewSubmit } from '../src/commands/review.js';

describe('CLI gherkin & review commands (Happy / Sad / Boundary / Malformed)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runGherkinExtract: handles empty workspace in text and json modes (happy/boundary)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-gherkin-'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      expect(runGherkinExtract({ root: tmpDir, silent: false })).toBe(true);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('BDD synchronization completed'));

      expect(runGherkinExtract({ root: tmpDir, json: true })).toBe(true);
      const parsed = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(parsed.command).toBe('gherkin:extract');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('runGherkinScaffold: handles missing feature error, GENERATOR_MISSING with promptFn, and fallback output (happy/sad)', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-scaffold-'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const missingOk = await runGherkinScaffold('specs/features/nonexistent.feature', {
        root: tmpDir,
        lang: 'ts',
        silent: false,
      });
      expect(missingOk).toBe(false);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Error'));

      const featDir = path.join(tmpDir, 'specs', 'features');
      fs.mkdirSync(featDir, { recursive: true });
      const featFile = path.join(featDir, 'sample.feature');
      fs.writeFileSync(featFile, 'Feature: Sample\n  Scenario: Ok\n    Given a\n    Then b\n', 'utf-8');

      // Fallback scaffolds deterministic steps
      const fallbackOk = await runGherkinScaffold(featFile, {
        root: tmpDir,
        lang: 'ts',
        fallback: true,
        silent: false,
      });
      expect(fallbackOk).toBe(true);
      expect(logSpy).toHaveBeenCalled();

      // Simulate GENERATOR_MISSING and promptFn declining install -> falls back
      const missingGenOk = await runGherkinScaffold(featFile, {
        root: tmpDir,
        lang: 'py',
        json: true,
        execFn: () => ({ status: 1, stdout: '', stderr: 'not found' }),
        promptFn: async () => false,
      });
      expect(missingGenOk).toBe(true);
      const scaffoldPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(scaffoldPayload.status).toBe('GENERATED_FALLBACK');
      expect(scaffoldPayload.success).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, scaffoldPayload.outputFile))).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('runReviewSubmit: handles rejected reviewer/change in text and json modes (sad/boundary)', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-review-'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(
        runReviewSubmit({
          root: tmpDir,
          change: 'chg-nonexistent',
          reviewer: 'agent-auditor',
          verdict: 'APPROVE',
          body: 'ok',
          json: true,
        })
      ).toBe(false);
      const parsed = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(parsed.command).toBe('review:submit');
      expect(parsed.success).toBe(false);

      expect(
        runReviewSubmit({
          root: tmpDir,
          change: 'chg-nonexistent',
          reviewer: 'agent-developer',
          verdict: 'APPROVE',
          body: 'ok',
          silent: false,
        })
      ).toBe(false);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Review submission rejected'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
