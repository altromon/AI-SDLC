/**
 * Cites: FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001
 * Tag: @FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GherkinScaffoldResult } from '@aisdlc/core';

const rlQuestionMock = vi.fn();
const rlCloseMock = vi.fn();
const rlOnMock = vi.fn();

vi.mock('readline', () => ({
  createInterface: vi.fn(() => ({
    question: rlQuestionMock,
    close: rlCloseMock,
    on: rlOnMock,
  })),
}));

import {
  defaultConfirmInstall,
  emitGherkinJson,
  emitScaffoldOutput,
  handleInteractiveMissing,
  printGherkinResult,
  printScaffoldText,
} from '../src/commands/gherkin.js';

// eslint-disable-next-line no-control-regex
const ANSI_SGR_RE = /\u001b\[[0-9;]*m/g;
const stripAnsi = (s: string): string => s.replace(ANSI_SGR_RE, '');

function makeScaffoldResult(overrides: Partial<GherkinScaffoldResult> = {}): GherkinScaffoldResult {
  return {
    success: true,
    status: 'GENERATED_NATIVE',
    lang: 'ts',
    featureFile: 'specs/features/sample.feature',
    outputFile: 'tests/steps/sample.steps.ts',
    scenariosCount: 1,
    stepsCount: 2,
    ...overrides,
  };
}

describe('CLI gherkin helpers & edge-case fixes', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('printGherkinResult: prints empty summary, feature list, and branches on result.success', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    printGherkinResult({
      success: true,
      features: [],
      totalScenarios: 0,
    });
    const emptyOut = stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(emptyOut).toContain('Generated .feature files:    0');
    expect(emptyOut).toContain('BDD synchronization completed successfully.');

    logSpy.mockClear();
    printGherkinResult({
      success: true,
      features: [
        {
          featureName: 'Login',
          sourceFile: 'specs/login.md',
          outputFile: 'specs/features/login.feature',
          scenarioCount: 3,
        },
      ],
      totalScenarios: 3,
    });
    const featureOut = stripAnsi(logSpy.mock.calls.map((c) => String(c[0])).join('\n'));
    expect(featureOut).toContain('Login');
    expect(featureOut).toContain('3 scenarios');

    logSpy.mockClear();
    printGherkinResult({
      success: false,
      features: [],
      totalScenarios: 0,
    });
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('BDD synchronization completed with errors.'));
    expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).not.toContain('completed successfully');
  });

  it('emitGherkinJson: emits structured JSON with exitCode 0 on success and 1 on failure', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    emitGherkinJson({ success: true, features: [], totalScenarios: 2 });
    const okJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(okJson).toEqual({
      command: 'gherkin:extract',
      success: true,
      exitCode: 0,
      totalScenarios: 2,
      features: [],
    });

    emitGherkinJson({ success: false, features: [], totalScenarios: 0 });
    const failJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(failJson.success).toBe(false);
    expect(failJson.exitCode).toBe(1);
  });

  it('defaultConfirmInstall: handles y, YES, n, empty, and EOF close fallback', async () => {
    rlQuestionMock.mockImplementationOnce((_q: string, cb: (ans: string) => void) => cb('y'));
    expect(await defaultConfirmInstall('Install? ')).toBe(true);

    rlQuestionMock.mockImplementationOnce((_q: string, cb: (ans: string) => void) => cb('  YES  '));
    expect(await defaultConfirmInstall('Install? ')).toBe(true);

    rlQuestionMock.mockImplementationOnce((_q: string, cb: (ans: string) => void) => cb('n'));
    expect(await defaultConfirmInstall('Install? ')).toBe(false);

    rlQuestionMock.mockImplementationOnce((_q: string, cb: (ans: string) => void) => cb(''));
    expect(await defaultConfirmInstall('Install? ')).toBe(false);
    expect(rlCloseMock).toHaveBeenCalledTimes(4);

    // Simulate EOF close before question callback responds
    rlOnMock.mockImplementation((event: string, cb: () => void) => {
      if (event === 'close') {
        queueMicrotask(cb);
      }
    });
    rlQuestionMock.mockImplementationOnce(() => {});
    expect(await defaultConfirmInstall('Install? ')).toBe(false);
  });

  it('printScaffoldText: formats ERROR (with/without errorCode & fallbackReason), GENERATOR_MISSING, and generated files', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    printScaffoldText(
      makeScaffoldResult({
        success: false,
        status: 'ERROR',
        errorCode: 'ERR_FEATURE_NOT_FOUND',
        fallbackReason: 'missing file',
      })
    );
    expect(stripAnsi(String(errSpy.mock.calls.at(-1)?.[0]))).toContain(
      'Error (ERR_FEATURE_NOT_FOUND): specs/features/sample.feature - missing file'
    );

    printScaffoldText(
      makeScaffoldResult({
        success: false,
        status: 'ERROR',
        errorCode: undefined,
        fallbackReason: undefined,
      })
    );
    const noCodeErr = stripAnsi(String(errSpy.mock.calls.at(-1)?.[0]));
    expect(noCodeErr).toContain('Error (ERROR): specs/features/sample.feature');
    expect(noCodeErr).not.toContain('undefined');

    printScaffoldText(
      makeScaffoldResult({
        success: false,
        status: 'GENERATED_NATIVE',
      })
    );
    expect(stripAnsi(String(errSpy.mock.calls.at(-1)?.[0]))).toContain('Error (GENERATED_NATIVE)');

    printScaffoldText(
      makeScaffoldResult({
        success: false,
        status: 'GENERATOR_MISSING',
        generatorBin: 'pytest-bdd',
        installCommand: undefined,
        license: 'MIT',
      })
    );
    expect(stripAnsi(String(logSpy.mock.calls.at(-1)?.[0]))).toContain('Native generator (pytest-bdd) missing');

    logSpy.mockClear();
    printScaffoldText(
      makeScaffoldResult({
        success: true,
        status: 'GENERATED_NATIVE',
        outputFile: 'tests/a.steps.ts',
        outputFiles: undefined,
      })
    );
    expect(stripAnsi(String(logSpy.mock.calls.at(-1)?.[0]))).toContain('[GENERATED_NATIVE] ➔ tests/a.steps.ts');

    logSpy.mockClear();
    printScaffoldText(
      makeScaffoldResult({
        success: true,
        status: 'GENERATED_FALLBACK',
        outputFiles: ['tests/a.steps.ts', 'tests/a.steps.py'],
      })
    );
    expect(logSpy).toHaveBeenCalledTimes(2);
  });

  it('handleInteractiveMissing: falls back when declined and attempts install when confirmed in os.tmpdir()', async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-gherkin-interactive-'));
    try {
      const featDir = path.join(tmpDir, 'specs', 'features');
      fs.mkdirSync(featDir, { recursive: true });
      const featFile = path.join(featDir, 'auth.feature');
      fs.writeFileSync(featFile, 'Feature: Auth\n  Scenario: Login\n    Given user\n    Then ok\n', 'utf-8');

      const missingRes = makeScaffoldResult({
        success: false,
        status: 'GENERATOR_MISSING',
        lang: 'py',
        featureFile: featFile,
        installCommand: 'pip install pytest-bdd',
        license: 'MIT',
      });

      const declined = await handleInteractiveMissing(
        missingRes,
        featFile,
        {
          lang: 'py',
          promptFn: async () => false,
          execFn: () => ({ status: 127, stdout: '', stderr: 'not found' }),
        },
        tmpDir
      );
      expect(declined.success).toBe(true);
      expect(declined.status).toBe('GENERATED_FALLBACK');

      const installExecSpy = vi.fn(() => ({ status: 1, stdout: '', stderr: 'pip unavailable' }));
      const confirmed = await handleInteractiveMissing(
        missingRes,
        featFile,
        {
          lang: 'py',
          promptFn: async () => true,
          execFn: installExecSpy,
        },
        tmpDir
      );
      expect(confirmed.success).toBe(false);
      expect(confirmed.status).toBe('GENERATOR_MISSING');
      expect(installExecSpy).toHaveBeenCalledTimes(2);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    }
  });

  it('emitScaffoldOutput: handles json, silent, and text output modes', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const res = makeScaffoldResult();

    emitScaffoldOutput(res, { lang: 'ts', silent: false }, true);
    expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).status).toBe('GENERATED_NATIVE');

    logSpy.mockClear();
    emitScaffoldOutput(res, { lang: 'ts', silent: true }, false);
    expect(logSpy).not.toHaveBeenCalled();

    emitScaffoldOutput(res, { lang: 'ts', silent: false }, false);
    expect(stripAnsi(String(logSpy.mock.calls.at(-1)?.[0]))).toContain('[GENERATED_NATIVE]');
  });
});
