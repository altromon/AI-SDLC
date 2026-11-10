/**
 * CLI Tests for `aisdlc gherkin scaffold` (RED Phase)
 * Cites: FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001, CHG-051-GHERKIN-POLYGLOT-SCAFFOLD
 * Tag: @FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001 @CHG-051-GHERKIN-POLYGLOT-SCAFFOLD
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as gherkinCli from '../src/commands/gherkin.js';

type RunGherkinScaffoldFn = (
  featurePath: string,
  options: {
    root?: string;
    lang: string | string[];
    output?: string;
    install?: boolean;
    fallback?: boolean;
    json?: boolean;
    format?: string;
    silent?: boolean;
    promptFn?: (question: string) => Promise<boolean>;
    execFn?: (cmd: string, args: string[]) => {
      status: number | null;
      stdout: string;
      stderr: string;
    };
  }
) => Promise<boolean> | boolean;

function getRunGherkinScaffold(): RunGherkinScaffoldFn {
  const fn = (gherkinCli as Record<string, unknown>).runGherkinScaffold as RunGherkinScaffoldFn | undefined;
  expect(fn, 'runGherkinScaffold must be exported from packages/cli/src/commands/gherkin.ts').toBeTypeOf('function');
  return fn!;
}

describe('@FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001: aisdlc gherkin scaffold CLI handler', () => {
  let tmpDir: string;
  let featureFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-gherkin-scaffold-'));
    const featuresDir = path.join(tmpDir, 'tests', 'features');
    fs.mkdirSync(featuresDir, { recursive: true });
    featureFile = path.join(featuresDir, 'login.feature');
    fs.writeFileSync(
      featureFile,
      [
        '@FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001',
        'Feature: Login authentication',
        '  Scenario: Valid credentials',
        '    Given a registered user',
        '    When the user submits valid credentials',
        '    Then the user is authenticated',
      ].join('\n'),
      'utf-8'
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('emits structured JSON with status GENERATOR_MISSING and installCommand when native binary is missing in --json mode', async () => {
    const runGherkinScaffold = getRunGherkinScaffold();
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((msg: unknown) => {
      logs.push(String(msg));
    });

    const ok = await runGherkinScaffold(featureFile, {
      root: tmpDir,
      lang: 'py',
      json: true,
      execFn: () => ({ status: 127, stdout: '', stderr: 'not found' }),
    });

    expect(ok).toBe(false);
    const payload = JSON.parse(logs.join('\n'));
    expect(payload.status).toBe('GENERATOR_MISSING');
    expect(payload.installCommand).toBe('pip install pytest-bdd');
    expect(payload.license).toBe('MIT');
  });

  it('scaffolds failing RED step definitions across multiple languages ("ts,py") when --fallback is passed', async () => {
    const runGherkinScaffold = getRunGherkinScaffold();
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((msg: unknown) => {
      logs.push(String(msg));
    });

    const ok = await runGherkinScaffold(featureFile, {
      root: tmpDir,
      lang: 'ts,py',
      fallback: true,
      json: true,
      execFn: () => ({ status: 127, stdout: '', stderr: 'not found' }),
    });

    expect(ok).toBe(true);
    const payload = JSON.parse(logs.join('\n'));
    expect(payload.success).toBe(true);
    expect(payload.status).toBe('GENERATED_FALLBACK');
    expect(payload.langs).toEqual(['ts', 'py']);
    expect(payload.outputFiles).toHaveLength(2);
  });
});
