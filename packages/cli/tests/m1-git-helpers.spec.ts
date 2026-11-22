/**
 * Cites: FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001, FR-064-REASONING-EFFORT-TRAILER-001
 * Tag: @FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001 @FR-064-REASONING-EFFORT-TRAILER-001
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  printCheckoutFailure,
  printCheckoutSuccess,
  printInvalidBranchError,
  runGitCheckout,
  runGitPlan,
  runGitValidate,
} from '../src/commands/git.js';

// eslint-disable-next-line no-control-regex
const ANSI_SGR_RE = /\u001b\[[0-9;]*m/g;
const stripAnsi = (s: string): string => s.replace(ANSI_SGR_RE, '');

describe('CLI git helpers & whitespace/boundary guards', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('printInvalidBranchError: prints explicit error or fallback pattern message with allowed tiers', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    printInvalidBranchError('Does not match 4-tier model');
    const explicitOut = stripAnsi(errSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(explicitOut).toContain('[NAMING ERROR] Does not match 4-tier model');
    expect(explicitOut).toContain('Tier 4: task/<PARENT-ID>/<TSK-ID>-<slug>');

    errSpy.mockClear();
    printInvalidBranchError(undefined);
    expect(stripAnsi(String(errSpy.mock.calls[0]?.[0]))).toContain('[NAMING ERROR] Invalid pattern');
  });

  it('printCheckoutFailure: prints error and lists availableTasks with or without titles', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    printCheckoutFailure({
      success: false,
      taskId: 'TSK-999',
      createdBranches: [],
      error: 'Task TSK-999 not found',
      availableTasks: [
        { changeId: 'CHG-001', id: 'TSK-001', title: 'Auth API' },
        { changeId: 'CHG-002', id: 'TSK-002', title: '' },
      ],
    });
    expect(stripAnsi(String(errSpy.mock.calls[0]?.[0]))).toContain('Task TSK-999 not found');
    const listOut = stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(listOut).toContain('[CHG-001] TSK-001: Auth API');
    expect(listOut).toContain('[CHG-002] TSK-002');
    expect(listOut).not.toContain('TSK-002:');

    logSpy.mockClear();
    errSpy.mockClear();
    printCheckoutFailure({ success: false, taskId: 'TSK-999', createdBranches: [], error: 'No active changes', availableTasks: [] });
    expect(stripAnsi(String(errSpy.mock.calls[0]?.[0]))).toContain('No active changes');
    expect(stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'))).not.toContain('Available tasks');
  });

  it('printCheckoutSuccess: prints minimal fields and cascading createdBranches', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printCheckoutSuccess({
      success: true,
      taskId: 'TSK-001',
      changeId: 'CHG-010',
      releaseBranch: 'release/v1.2.0',
      featureBranch: 'feat/CHG-010-demo',
      taskBranch: 'task/CHG-010/TSK-001-init',
      createdBranches: ['feat/CHG-010-demo', 'task/CHG-010/TSK-001-init'],
      switchedBranch: 'task/CHG-010/TSK-001-init',
    });
    const fullOut = stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(fullOut).toContain('Detected change:   CHG-010');
    expect(fullOut).toContain('Cascading branches created:');
    expect(fullOut).toContain('├── feat/CHG-010-demo');
    expect(fullOut).toContain('task/CHG-010/TSK-001-init');

    logSpy.mockClear();
    printCheckoutSuccess({ success: true, taskId: 'TSK-001', createdBranches: [] });
    const minimalOut = stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(minimalOut).toContain('Detected change:   N/A');
    expect(minimalOut).not.toContain('Cascading branches created');
  });

  it('runGitValidate, runGitCheckout, and runGitPlan reject whitespace inputs and filter blank task tokens', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(runGitValidate('')).toBe(false);
    expect(runGitValidate('   ')).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Branch name to validate must be specified'));

    errSpy.mockClear();
    expect(runGitCheckout('   ', { silent: true })).toBe(false);
    expect(errSpy).not.toHaveBeenCalled();
    expect(runGitCheckout('   ', { silent: false })).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Task identifier to navigate must be specified'));

    logSpy.mockClear();
    expect(runGitPlan({ version: 'v2.0.0', feature: 'CHG-009-clean', tasks: 'TSK-1, , TSK-2, ' })).toBe(true);
    const planOut = stripAnsi(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(planOut).toContain('task/CHG-009/tsk-1');
    expect(planOut).toContain('task/CHG-009/tsk-2');
    expect(planOut).not.toContain('task/CHG-009/\n');

    logSpy.mockClear();
    expect(runGitPlan({ tasks: '   ' })).toBe(true);
    const fallbackOut = stripAnsi(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(fallbackOut).toContain('task/CHG-001/tsk-001-dto');
    expect(fallbackOut).toContain('task/CHG-001/tsk-002-gateway');

    logSpy.mockClear();
    expect(runGitPlan()).toBe(true);
    expect(stripAnsi(String(logSpy.mock.calls.at(-1)?.[0]))).toContain('task/CHG-001/tsk-001-dto');
  });
});
