/**
 * Cites: FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001, FR-064-REASONING-EFFORT-TRAILER-001
 * Tag: @FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001 @FR-064-REASONING-EFFORT-TRAILER-001
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const classifyBranchMock = vi.fn();
const generateBranchHierarchyPlanMock = vi.fn();
const checkoutTaskBranchMock = vi.fn();
const installGitHooksMock = vi.fn();
const detectAuthorIdentityMock = vi.fn();

vi.mock('@aisdlc/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aisdlc/core')>();
  return {
    ...actual,
    classifyBranch: classifyBranchMock,
    generateBranchHierarchyPlan: generateBranchHierarchyPlanMock,
    checkoutTaskBranch: checkoutTaskBranchMock,
    installGitHooks: installGitHooksMock,
    detectAuthorIdentity: detectAuthorIdentityMock,
  };
});

describe('CLI git commands (Happy / Sad / Boundary / Malformed)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('runGitValidate & runGitPlan: handles empty, valid, invalid branch and plan defaults (happy/sad/boundary)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { runGitValidate, runGitPlan } = await import('../src/commands/git.js');

    expect(runGitValidate('')).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('must be specified'));

    classifyBranchMock.mockReturnValueOnce({
      valid: true,
      tier: 3,
      tierName: 'Feature',
      parentRequirement: 'main',
      targetMerge: 'main',
    });
    expect(runGitValidate('feat/CHG-001-test')).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('COMPLIANT'));

    classifyBranchMock.mockReturnValueOnce({ valid: false, error: 'Bad branch' });
    expect(runGitValidate('bad/branch')).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Bad branch'));

    generateBranchHierarchyPlanMock.mockReturnValueOnce({ planText: 'PLAN_OK' });
    expect(runGitPlan({})).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('PLAN_OK'));
  });

  it('runGitCheckout & runGitHookInstall & runGitDetectAuthor: covers success, failures, silent, and json modes (happy/sad/boundary)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { runGitCheckout, runGitHookInstall, runGitDetectAuthor } = await import('../src/commands/git.js');

    expect(runGitCheckout('', { silent: true })).toBe(false);
    expect(runGitCheckout('')).toBe(false);

    checkoutTaskBranchMock.mockReturnValueOnce({
      success: false,
      error: 'Task not found',
      availableTasks: [{ changeId: 'CHG-1', id: 'TSK-1', title: 'Sample' }],
    });
    expect(runGitCheckout('TSK-999')).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Task not found'));

    checkoutTaskBranchMock.mockReturnValueOnce({
      success: true,
      changeId: 'CHG-1',
      releaseBranch: 'release/v1.0.0',
      featureBranch: 'feat/CHG-1',
      taskBranch: 'task/CHG-1/TSK-1',
      createdBranches: ['task/CHG-1/TSK-1'],
      switchedBranch: 'task/CHG-1/TSK-1',
    });
    expect(runGitCheckout('TSK-1')).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Cascading branches created'));

    installGitHooksMock.mockReturnValueOnce({ success: true, installedHooks: ['.git/hooks/pre-commit'] });
    expect(runGitHookInstall({ root: '/tmp/repo' })).toBe(true);

    installGitHooksMock.mockReturnValueOnce({ success: false, error: 'No .git' });
    expect(runGitHookInstall({ root: '/tmp/repo' })).toBe(false);

    detectAuthorIdentityMock.mockReturnValue({
      authorType: 'agent',
      model: 'Gemini',
      promptTokens: 10,
      completionTokens: 20,
      activeTimeSeconds: 5,
      reasoningEffort: 'medium',
    });
    expect(runGitDetectAuthor({ json: true })).toBe(true);
    expect(runGitDetectAuthor({ json: false })).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('agent|Gemini|10|20|5|medium'));
  });
});
