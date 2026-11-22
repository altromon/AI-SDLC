import { afterEach, describe, expect, it, vi } from 'vitest';

const questionMock = vi.fn();
const closeMock = vi.fn();
const initProjectMock = vi.fn();

vi.mock('node:readline/promises', () => ({
  createInterface: vi.fn(() => ({
    question: questionMock,
    close: closeMock,
  })),
}));

vi.mock('@aisdlc/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aisdlc/core')>();
  return {
    ...actual,
    initProject: initProjectMock,
  };
});

describe('CLI init prompts & runInit (Happy / Sad / Boundary / Malformed)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('promptForCi: maps 1-5, empty default, named values, and closes readline even on error (happy/boundary/sad)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { promptForCi } = await import('../src/commands/init.js');

    questionMock.mockResolvedValueOnce('');
    expect(await promptForCi()).toBe('github');

    questionMock.mockResolvedValueOnce('2');
    expect(await promptForCi()).toBe('gitlab');

    questionMock.mockResolvedValueOnce('5');
    expect(await promptForCi()).toBeUndefined();

    questionMock.mockResolvedValueOnce('azure');
    expect(await promptForCi()).toBe('azure');

    questionMock.mockResolvedValueOnce('custom-ci');
    expect(await promptForCi()).toBe('custom-ci');

    questionMock.mockRejectedValueOnce(new Error('stdin closed'));
    await expect(promptForCi()).rejects.toThrow('stdin closed');
    expect(closeMock).toHaveBeenCalledTimes(6);
  });

  it('promptForArchitecture & promptForAgents: maps numeric choices, empty defaults, and custom values (happy/boundary)', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { promptForArchitecture, promptForAgents } = await import('../src/commands/init.js');

    questionMock.mockResolvedValueOnce('');
    expect(await promptForArchitecture()).toBe('minimal');
    questionMock.mockResolvedValueOnce('2');
    expect(await promptForArchitecture()).toBe('full');
    questionMock.mockResolvedValueOnce('3');
    expect(await promptForArchitecture()).toBe('none');
    questionMock.mockResolvedValueOnce('custom-arch');
    expect(await promptForArchitecture()).toBe('custom-arch');

    questionMock.mockResolvedValueOnce('');
    expect(await promptForAgents()).toBe('all');
    questionMock.mockResolvedValueOnce('4');
    expect(await promptForAgents()).toBe('antigravity');
    questionMock.mockResolvedValueOnce('cursor,claude');
    expect(await promptForAgents()).toBe('cursor,claude');
  });

  it('runInit: handles json success/failure, dryRun, architecture granularities, and errors (happy/sad/boundary)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { runInit } = await import('../src/commands/init.js');

    initProjectMock.mockReturnValueOnce({
      success: true,
      errors: [],
      targetDir: '/tmp/proj',
      directoriesCreated: ['specs'],
      filesCreated: ['AGENTS.md'],
      filesUpdated: ['CLAUDE.md'],
      ciProvider: 'github',
      agentsConfigured: ['cursor'],
      architectureGranularity: 'full',
      stacksConfigured: ['typescript'],
      gitHookInstalled: true,
    });

    expect(runInit('.', { json: true, dryRun: true })).toBe(true);
    const jsonCall = logSpy.mock.calls.find((c) => String(c[0]).includes('"command": "init"'));
    expect(jsonCall).toBeDefined();

    initProjectMock.mockReturnValueOnce({
      success: false,
      errors: ['permission denied'],
      targetDir: '/tmp/proj',
      directoriesCreated: [],
      filesCreated: [],
      error: 'permission denied',
    });
    expect(runInit('.', { json: true })).toBe(false);

    initProjectMock.mockReturnValueOnce({
      success: true,
      errors: [],
      targetDir: '/tmp/proj',
      directoriesCreated: ['specs'],
      filesCreated: [],
      filesUpdated: [],
      ciProvider: 'github',
      agentsConfigured: [],
      architectureGranularity: 'minimal',
      stacksConfigured: [],
      gitHookInstalled: false,
    });
    expect(runInit('.', { silent: false, dryRun: false })).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Minimal / Baseline'));

    initProjectMock.mockReturnValueOnce({
      success: false,
      errors: ['write failed'],
      targetDir: '/tmp/proj',
      directoriesCreated: [],
      filesCreated: [],
      error: 'write failed',
    });
    expect(runInit('.', { silent: false })).toBe(false);
    expect(errSpy).toHaveBeenCalled();
  });
});
