/**
 * Cites: FR-030-INIT-AGENT-SCAFFOLDING-001, FR-033-ARCHITECTURE-TEMPLATES-001, FR-026-AGENT-NATIVE-CONFIGS-001
 * Tag: @FR-030-INIT-AGENT-SCAFFOLDING-001 @FR-033-ARCHITECTURE-TEMPLATES-001 @FR-026-AGENT-NATIVE-CONFIGS-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { InitProjectResult } from '@aisdlc/core';
import {
  emitInitJson,
  formatGranularityLabel,
  handleInitResult,
  parseAgentsChoice,
  parseArchitectureChoice,
  parseCiChoice,
  printCreatedItems,
  printGitHookStatus,
  printInitSuccess,
  runInit,
} from '../src/commands/init.js';

// eslint-disable-next-line no-control-regex
const ANSI_SGR_RE = /\u001b\[[0-9;]*m/g;
const stripAnsi = (s: string): string => s.replace(ANSI_SGR_RE, '');

function makeInitResult(overrides: Partial<InitProjectResult> = {}): InitProjectResult {
  return {
    success: true,
    targetDir: '/tmp/sample-proj',
    directoriesCreated: ['specs', 'product'],
    filesCreated: ['quality-policy.yaml'],
    filesUpdated: [],
    ciProvider: 'github',
    agentsConfigured: ['cursor'],
    architectureGranularity: 'minimal',
    stacksConfigured: ['typescript'],
    gitHookInstalled: true,
    ...overrides,
  };
}

describe('CLI init helpers & normalization regressions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parseCiChoice: maps numbers, names, case-insensitive input, empty default, and custom providers', () => {
    expect(parseCiChoice('')).toBe('github');
    expect(parseCiChoice('   ')).toBe('github');
    expect(parseCiChoice('1')).toBe('github');
    expect(parseCiChoice('2')).toBe('gitlab');
    expect(parseCiChoice('3')).toBe('azure');
    expect(parseCiChoice('4')).toBe('bitbucket');
    expect(parseCiChoice('5')).toBeUndefined();
    expect(parseCiChoice(' GitLab ')).toBe('gitlab');
    expect(parseCiChoice('NONE')).toBeUndefined();
    expect(parseCiChoice('CircleCI')).toBe('circleci');
  });

  it('parseArchitectureChoice: maps numbers, keywords, case-insensitive input, and custom granularities', () => {
    expect(parseArchitectureChoice('')).toBe('minimal');
    expect(parseArchitectureChoice('   ')).toBe('minimal');
    expect(parseArchitectureChoice('1')).toBe('minimal');
    expect(parseArchitectureChoice('MINIMAL')).toBe('minimal');
    expect(parseArchitectureChoice('2')).toBe('full');
    expect(parseArchitectureChoice('Full')).toBe('full');
    expect(parseArchitectureChoice('COMPLETE')).toBe('full');
    expect(parseArchitectureChoice('3')).toBe('none');
    expect(parseArchitectureChoice('NONE')).toBe('none');
    expect(parseArchitectureChoice('custom-level')).toBe('custom-level');
  });

  it('parseAgentsChoice: maps 1-7, empty default, case-insensitive NONE, and comma-separated targets', () => {
    expect(parseAgentsChoice('')).toBe('all');
    expect(parseAgentsChoice('  ')).toBe('all');
    expect(parseAgentsChoice('1')).toBe('all');
    expect(parseAgentsChoice('2')).toBe('cursor');
    expect(parseAgentsChoice('3')).toBe('claude');
    expect(parseAgentsChoice('4')).toBe('antigravity');
    expect(parseAgentsChoice('5')).toBe('copilot');
    expect(parseAgentsChoice('6')).toBe('mcp');
    expect(parseAgentsChoice('7')).toBe('none');
    expect(parseAgentsChoice('  NONE  ')).toBe('none');
    expect(parseAgentsChoice('Cursor, Claude')).toBe('cursor, claude');
  });

  it('formatGranularityLabel: formats full, complete, minimal, none, and undefined', () => {
    expect(formatGranularityLabel('full')).toBe('Full (arc42 + NAF v4, 12 sections)');
    expect(formatGranularityLabel('complete')).toBe('Full (arc42 + NAF v4, 12 sections)');
    expect(formatGranularityLabel('minimal')).toBe('Minimal / Baseline (ARCH-INTRO-*, CMP-* and ADR-*)');
    expect(formatGranularityLabel('none')).toBe('None');
    expect(formatGranularityLabel(undefined)).toBe('None');
  });

  it('printGitHookStatus: emits distinct messages for dryRun, installed, and non-git directories', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printGitHookStatus(true, false);
    expect(stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'))).toContain('DRY-RUN Install Git Hook');

    logSpy.mockClear();
    printGitHookStatus(false, true);
    expect(stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'))).toContain('Git Hook installed: prepare-commit-msg');

    logSpy.mockClear();
    printGitHookStatus(false, false);
    const noGitOut = stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(noGitOut).toContain('Git repository not detected at target.');
    expect(noGitOut).toContain('aisdlc git hook install');
  });

  it('printCreatedItems: handles empty arrays and directory/file/updated-file in normal and dryRun modes', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printCreatedItems([], 'file', false);
    expect(logSpy).not.toHaveBeenCalled();

    printCreatedItems(['specs'], 'directory', true);
    printCreatedItems(['specs'], 'directory', false);
    printCreatedItems(['a.md'], 'file', true);
    printCreatedItems(['a.md'], 'file', false);
    printCreatedItems(['b.md'], 'updated-file', true);
    printCreatedItems(['b.md'], 'updated-file', false);

    const lines = logSpy.mock.calls.map((c) => stripAnsi(String(c[0])));
    expect(lines[0]).toContain('DRY-RUN Create directory: specs');
    expect(lines[1]).toContain('Directory created: specs');
    expect(lines[2]).toContain('DRY-RUN Create file: a.md');
    expect(lines[3]).toContain('File generated: a.md');
    expect(lines[4]).toContain('DRY-RUN Update file: b.md');
    expect(lines[5]).toContain('File updated: b.md');
  });

  it('emitInitJson: emits valid JSON with optional defaults and error details on failure', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    emitInitJson(
      makeInitResult({ filesUpdated: undefined, stacksConfigured: undefined }),
      true,
      true
    );
    const okPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(okPayload.command).toBe('init');
    expect(okPayload.success).toBe(true);
    expect(okPayload.exitCode).toBe(0);
    expect(okPayload.dryRun).toBe(true);
    expect(okPayload.filesUpdated).toEqual([]);
    expect(okPayload.stacksConfigured).toEqual([]);
    expect(okPayload.error).toBeUndefined();

    emitInitJson(makeInitResult({ success: false, error: undefined }), false, false);
    const failPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(failPayload.success).toBe(false);
    expect(failPayload.exitCode).toBe(1);
    expect(failPayload.error).toBe('Error initializing project.');
  });

  it('printInitSuccess: prints full configuration summary and skips optional sections when empty/absent', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printInitSuccess(
      makeInitResult({
        filesUpdated: ['AGENTS.md'],
        ciProvider: 'gitlab',
        agentsConfigured: ['cursor', 'claude'],
        architectureGranularity: 'full',
      }),
      false
    );
    const fullOut = stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(fullOut).toContain('File updated: AGENTS.md');
    expect(fullOut).toContain('CI/CD configuration generated for provider: gitlab');
    expect(fullOut).toContain('Configured AI agents: cursor, claude');
    expect(fullOut).toContain('Full (arc42 + NAF v4, 12 sections)');

    logSpy.mockClear();
    printInitSuccess(
      makeInitResult({
        filesUpdated: [],
        ciProvider: undefined,
        agentsConfigured: [],
        architectureGranularity: undefined,
      }),
      true
    );
    const minimalOut = stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(minimalOut).not.toContain('CI/CD configuration generated');
    expect(minimalOut).not.toContain('Configured AI agents');
    expect(minimalOut).not.toContain('Architecture granularity');
  });

  it('handleInitResult: routes silent, console, and json modes for success and failure results', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(
      handleInitResult(makeInitResult({ success: false, error: 'boom' }), {
        isSilent: false,
        useJson: false,
        dryRun: false,
      })
    ).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('boom'));

    errSpy.mockClear();
    logSpy.mockClear();
    expect(
      handleInitResult(makeInitResult({ success: false, error: undefined }), {
        isSilent: true,
        useJson: true,
        dryRun: false,
      })
    ).toBe(false);
    expect(errSpy).not.toHaveBeenCalled();
    expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).exitCode).toBe(1);

    logSpy.mockClear();
    expect(
      handleInitResult(makeInitResult(), { isSilent: true, useJson: false, dryRun: false })
    ).toBe(true);
    expect(logSpy).not.toHaveBeenCalled();

    expect(
      handleInitResult(makeInitResult(), { isSilent: false, useJson: true, dryRun: true })
    ).toBe(true);
    expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).dryRun).toBe(true);
  });

  it('runInit: normalizes NONE and whitespace-padded false agents in real os.tmpdir() workspace', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-init-norm-'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const target1 = path.join(tmpDir, 'proj-none');
      expect(runInit(target1, { agents: 'NONE', ci: 'none', architecture: 'none', stack: 'none', json: true })).toBe(true);
      const p1 = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(p1.agentsConfigured).toEqual([]);
      expect(fs.existsSync(path.join(target1, '.cursor', 'rules'))).toBe(false);
      expect(fs.existsSync(path.join(target1, 'CLAUDE.md'))).toBe(false);

      const target2 = path.join(tmpDir, 'proj-false');
      expect(runInit(target2, { agents: '  false  ', ci: 'none', architecture: 'none', stack: 'none', json: true })).toBe(true);
      const p2 = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
      expect(p2.agentsConfigured).toEqual([]);
      expect(fs.existsSync(path.join(target2, '.claude'))).toBe(false);
      expect(fs.existsSync(path.join(target2, '.agent'))).toBe(false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });
});
