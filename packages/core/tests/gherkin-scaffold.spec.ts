/**
 * AI-SDLC: Polyglot Gherkin Step Definition Scaffolding Test Suite (RED Phase)
 * Cites: FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001, CHG-051-GHERKIN-POLYGLOT-SCAFFOLD, SPEC-CHG-051-GHERKIN-POLYGLOT-SCAFFOLD
 * Tag: @FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001 @CHG-051-GHERKIN-POLYGLOT-SCAFFOLD
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as core from '../src/index.js';
import * as gherkinScaffold from '../src/verifiers/gherkin-scaffold.js';
import { BddStepRegistry, executeBddFeature, type GherkinGeneratorSpec } from '../src/index.js';

type ScaffoldFn = (options: {
  rootDir?: string;
  featurePath: string;
  lang: string | string[];
  outputPath?: string;
  installMissing?: boolean;
  allowFallback?: boolean;
  execFn?: (cmd: string, args: string[]) => {
    status: number | null;
    stdout: string;
    stderr: string;
    error?: Error;
  };
}) => {
  success: boolean;
  status: 'GENERATED_NATIVE' | 'GENERATOR_MISSING' | 'GENERATED_FALLBACK' | 'ERROR';
  errorCode?: 'ERR_FEATURE_NOT_FOUND' | 'ERR_UNSUPPORTED_LANGUAGE' | 'ERR_INSTALL_FAILED';
  lang: string;
  langs?: Array<'ts' | 'py' | 'go' | 'rs' | 'cs'>;
  featureFile: string;
  outputFile?: string;
  outputFiles?: string[];
  generatorBin?: string;
  nativeCommand?: string;
  installCommand?: string;
  license?: string;
  fallbackReason?: string;
  content?: string;
  scenariosCount: number;
  stepsCount: number;
  results?: Array<Record<string, unknown>>;
};

function getScaffoldGherkinSteps(): ScaffoldFn {
  const fn = (core as Record<string, unknown>).scaffoldGherkinSteps as ScaffoldFn | undefined;
  expect(fn, 'scaffoldGherkinSteps must be exported from @aisdlc/core').toBeTypeOf('function');
  return fn!;
}

const SAMPLE_FEATURE_CONTENT = [
  '@FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001 @automated',
  'Feature: Sample Polyglot Scaffold Feature',
  '  @nominal',
  '  Scenario: Nominal step with "quoted" argument',
  '    Given a valid Gherkin "feature" file',
  '    When the user executes "aisdlc gherkin scaffold"',
  '    Then the output file is created in RED state',
  '',
  '  @boundary',
  '  Scenario: Boundary check',
  '    Given a boundary step with \'single\' and "double" quotes',
  '    Then the boundary check fails in RED state',
  '',
  '  @invalid',
  '  Scenario: Invalid input rejection',
  '    Given an invalid input payload',
  '    Then the system rejects the payload',
].join('\n');

describe('@FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001 @CHG-051-GHERKIN-POLYGLOT-SCAFFOLD: Polyglot Gherkin Scaffold Core Engine', () => {
  const repoRoot = path.resolve(__dirname, '../../..');
  let tmpDir: string;
  let sampleFeaturePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-gherkin-scaffold-'));
    const featuresDir = path.join(tmpDir, 'tests', 'features');
    fs.mkdirSync(featuresDir, { recursive: true });
    sampleFeaturePath = path.join(featuresDir, 'sample.feature');
    fs.writeFileSync(sampleFeaturePath, SAMPLE_FEATURE_CONTENT, 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('BDD Feature Execution: fr-051-gherkin-polyglot-scaffold-001.feature', () => {
    it('executes all @nominal, @boundary, and @invalid scenarios in fr-051-gherkin-polyglot-scaffold-001.feature', async () => {
      const scaffoldGherkinSteps = getScaffoldGherkinSteps();
      const registry = new BddStepRegistry();

      let currentFeaturePath = sampleFeaturePath;
      let currentLang = 'ts';
      let currentBinaryPresent = true;
      let execCalls: Array<{ cmd: string; args: string[] }> = [];
      let lastResult: ReturnType<ScaffoldFn> | undefined;

      registry
        .given('a valid Gherkin feature file with nominal, boundary, and invalid scenarios', () => {
          currentFeaturePath = sampleFeaturePath;
          currentBinaryPresent = true;
          execCalls = [];
        })
        .when(/^the CLI command "aisdlc gherkin scaffold" is executed for target languages "([^"]+)"$/, ([langs]) => {
          currentLang = langs;
          lastResult = scaffoldGherkinSteps({
            rootDir: tmpDir,
            featurePath: currentFeaturePath,
            lang: currentLang,
            allowFallback: true,
            execFn: (cmd, args) => {
              execCalls.push({ cmd, args });
              return { status: 1, stdout: '', stderr: 'not installed' };
            },
          });
        })
        .then(
          'the command inspects each native generator binary using shell-free execution and outputs failing RED step definitions for every requested language',
          () => {
            expect(lastResult).toBeDefined();
            expect(lastResult!.success).toBe(true);
            expect(execCalls.length).toBeGreaterThanOrEqual(2);
            expect(lastResult!.outputFiles?.length).toBe(2);
            for (const out of lastResult!.outputFiles || []) {
              const absOut = path.isAbsolute(out) ? out : path.join(tmpDir, out);
              expect(fs.existsSync(absOut)).toBe(true);
            }
          }
        )
        .given(
          /^a Gherkin feature file and target language "([^"]+)" with native binary availability "([^"]+)"$/,
          ([lang, binaryPresent]) => {
            currentFeaturePath = sampleFeaturePath;
            currentLang = lang;
            currentBinaryPresent = binaryPresent === 'true';
            execCalls = [];
          }
        )
        .when('the CLI command "aisdlc gherkin scaffold" is evaluated', () => {
          lastResult = scaffoldGherkinSteps({
            rootDir: tmpDir,
            featurePath: currentFeaturePath,
            lang: currentLang,
            execFn: (cmd, args) => {
              execCalls.push({ cmd, args });
              if (currentBinaryPresent) {
                return { status: 0, stdout: '// native snippet output', stderr: '' };
              }
              return { status: 127, stdout: '', stderr: 'command not found' };
            },
          });
        })
        .then(/^the system responds with status "([^"]+)" and install hint "([^"]+)"$/, ([expectedStatus, installCmd]) => {
          expect(lastResult).toBeDefined();
          if (expectedStatus === 'SCAFFOLD_CREATED') {
            expect(lastResult!.success).toBe(true);
            expect(['GENERATED_NATIVE', 'GENERATED_FALLBACK']).toContain(lastResult!.status);
          } else {
            expect(lastResult!.status).toBe(expectedStatus);
          }
          expect(lastResult!.installCommand).toContain(installCmd);
        })
        .given(
          /^an invalid scaffold request with feature path "([^"]+)" and language "([^"]+)"$/,
          ([featurePath, lang]) => {
            currentFeaturePath =
              featurePath === 'valid_feature.feature'
                ? sampleFeaturePath
                : path.join(tmpDir, featurePath);
            currentLang = lang;
          }
        )
        .when('the CLI command "aisdlc gherkin scaffold" is invoked', () => {
          lastResult = scaffoldGherkinSteps({
            rootDir: tmpDir,
            featurePath: currentFeaturePath,
            lang: currentLang,
            execFn: () => ({ status: 0, stdout: '', stderr: '' }),
          });
        })
        .then(/^the system rejects the request with error "([^"]+)"$/, ([errorCode]) => {
          expect(lastResult).toBeDefined();
          expect(lastResult!.success).toBe(false);
          expect(lastResult!.status).toBe('ERROR');
          expect(lastResult!.errorCode).toBe(errorCode);
        });

      const featureFile = path.join(repoRoot, 'tests', 'features', 'fr-051-gherkin-polyglot-scaffold-001.feature');
      const report = await executeBddFeature(featureFile, registry, { rootDir: repoRoot });
      expect(report.passed).toBe(true);
      expect(report.scenarios.every((s) => s.status === 'passed')).toBe(true);
    });
  });

  describe('BDD Feature Execution: spec-chg-051-gherkin-polyglot-scaffold.feature (@functional & @security)', () => {
    it('executes all scenarios in spec-chg-051-gherkin-polyglot-scaffold.feature', async () => {
      const scaffoldGherkinSteps = getScaffoldGherkinSteps();
      const registry = new BddStepRegistry();

      let currentFeaturePath = sampleFeaturePath;
      let currentLang = 'ts';
      let currentInstalled = true;
      let execCalls: Array<{ cmd: string; args: string[] }> = [];
      let lastResult: ReturnType<ScaffoldFn> | undefined;

      registry
        .given('a valid Gherkin ".feature" file containing Given, When, and Then steps', () => {
          currentFeaturePath = sampleFeaturePath;
          execCalls = [];
        })
        .when(/^"aisdlc gherkin scaffold" is executed with "--lang ([^"]+)"$/, ([langs]) => {
          lastResult = scaffoldGherkinSteps({
            rootDir: tmpDir,
            featurePath: currentFeaturePath,
            lang: langs,
            allowFallback: true,
            execFn: (cmd, args) => {
              execCalls.push({ cmd, args });
              return { status: 1, stdout: '', stderr: 'missing' };
            },
          });
        })
        .then(
          'the CLI checks each native generator via shell-free spawnSync and writes failing RED step definitions for every requested language',
          () => {
            expect(lastResult).toBeDefined();
            expect(lastResult!.success).toBe(true);
            expect(execCalls.length).toBeGreaterThanOrEqual(2);
            expect(lastResult!.outputFiles?.length).toBe(2);
          }
        )
        .given(
          /^a valid Gherkin "\.feature" file and target stack "([^"]+)" where native binary installed is "([^"]+)"$/,
          ([lang, installed]) => {
            currentFeaturePath = sampleFeaturePath;
            currentLang = lang;
            currentInstalled = installed === 'true';
            execCalls = [];
          }
        )
        .when('"aisdlc gherkin scaffold" is executed in agent JSON mode', () => {
          lastResult = scaffoldGherkinSteps({
            rootDir: tmpDir,
            featurePath: currentFeaturePath,
            lang: currentLang,
            execFn: (cmd, args) => {
              execCalls.push({ cmd, args });
              return currentInstalled
                ? { status: 0, stdout: '// generated steps', stderr: '' }
                : { status: 127, stdout: '', stderr: 'ENOENT' };
            },
          });
        })
        .then(
          /^the CLI returns status "([^"]+)" with native command "([^"]+)" and install command "([^"]+)"$/,
          ([expectedStatus, nativeCmd, installCmd]) => {
            expect(lastResult).toBeDefined();
            if (expectedStatus === 'SCAFFOLD_CREATED') {
              expect(lastResult!.success).toBe(true);
              expect(['GENERATED_NATIVE', 'GENERATED_FALLBACK']).toContain(lastResult!.status);
            } else {
              expect(lastResult!.status).toBe(expectedStatus);
            }
            expect(lastResult!.nativeCommand).toContain(nativeCmd.replace(' <feature>', ''));
            expect(lastResult!.installCommand).toContain(installCmd);
          }
        )
        .given(/^a scaffold invocation with feature file "([^"]+)" and language "([^"]+)"$/, ([feat, lang]) => {
          currentFeaturePath = feat === 'valid.feature' ? sampleFeaturePath : path.join(tmpDir, feat);
          currentLang = lang;
        })
        .when('"aisdlc gherkin scaffold" is attempted', () => {
          lastResult = scaffoldGherkinSteps({
            rootDir: tmpDir,
            featurePath: currentFeaturePath,
            lang: currentLang,
            execFn: () => ({ status: 0, stdout: '', stderr: '' }),
          });
        })
        .then(/^the CLI rejects the execution with error code "([^"]+)"$/, ([errorCode]) => {
          expect(lastResult).toBeDefined();
          expect(lastResult!.success).toBe(false);
          expect(lastResult!.errorCode).toBe(errorCode);
        })
        .given('a crafted feature file path containing shell metacharacters or an unapproved missing native generator', () => {
          const specialFeature = path.join(tmpDir, 'tests', 'features', 'semi;echo_pwned.feature');
          fs.writeFileSync(specialFeature, SAMPLE_FEATURE_CONTENT, 'utf-8');
          currentFeaturePath = specialFeature;
          execCalls = [];
        })
        .when('"aisdlc gherkin scaffold" inspects or invokes the native binary', () => {
          lastResult = scaffoldGherkinSteps({
            rootDir: tmpDir,
            featurePath: currentFeaturePath,
            lang: 'py',
            installMissing: false,
            allowFallback: false,
            execFn: (cmd, args) => {
              execCalls.push({ cmd, args });
              return { status: 127, stdout: '', stderr: 'missing' };
            },
          });
        })
        .then(
          'child processes are executed strictly with "shell: false" and no package installation runs without explicit user permission',
          () => {
            expect(lastResult).toBeDefined();
            expect(lastResult!.status).toBe('GENERATOR_MISSING');
            expect(execCalls.some((c) => c.cmd === 'pip')).toBe(false);
          }
        );

      const specFeatureFile = path.join(repoRoot, 'tests', 'features', 'spec-chg-051-gherkin-polyglot-scaffold.feature');
      const report = await executeBddFeature(specFeatureFile, registry, { rootDir: repoRoot });
      expect(report.passed).toBe(true);
    });
  });

  describe('Step 1 & 2: Native Generator Detection, Missing Binary Handling, and Explicit Install', () => {
    it.each([
      {
        lang: 'ts',
        expectedBin: 'npx',
        expectedInstall: 'pnpm add -D @cucumber/cucumber',
        expectedLicense: 'MIT',
      },
      {
        lang: 'py',
        expectedBin: 'pytest-bdd',
        expectedInstall: 'pip install pytest-bdd',
        expectedLicense: 'MIT',
      },
      {
        lang: 'go',
        expectedBin: 'godog',
        expectedInstall: 'go install github.com/cucumber/godog/cmd/godog@latest',
        expectedLicense: 'MIT',
      },
      {
        lang: 'rs',
        expectedBin: 'cargo',
        expectedInstall: 'cargo add --dev cucumber',
        expectedLicense: 'MIT OR Apache-2.0',
      },
      {
        lang: 'cs',
        expectedBin: 'dotnet',
        expectedInstall: 'dotnet add package Reqnroll',
        expectedLicense: 'BSD-3-Clause',
      },
    ])(
      'returns GENERATOR_MISSING with installCommand and license when $lang binary is absent and neither installMissing nor allowFallback is enabled',
      ({ lang, expectedBin, expectedInstall, expectedLicense }) => {
        const scaffoldGherkinSteps = getScaffoldGherkinSteps();
        const calls: Array<{ cmd: string; args: string[] }> = [];

        const res = scaffoldGherkinSteps({
          rootDir: tmpDir,
          featurePath: sampleFeaturePath,
          lang,
          execFn: (cmd, args) => {
            calls.push({ cmd, args });
            return { status: 127, stdout: '', stderr: 'not found' };
          },
        });

        expect(res.success).toBe(false);
        expect(res.status).toBe('GENERATOR_MISSING');
        expect(res.generatorBin).toBe(expectedBin);
        expect(res.installCommand).toBe(expectedInstall);
        expect(res.license).toBe(expectedLicense);
        expect(calls.length).toBe(1);

        if (lang === 'ts') {
          expect(calls[0].cmd).toBe('npx');
          expect(calls[0].args).toContain('--no-install');
        }
      }
    );

    it('returns GENERATED_NATIVE when native binary is present', () => {
      const scaffoldGherkinSteps = getScaffoldGherkinSteps();
      const calls: Array<{ cmd: string; args: string[] }> = [];

      const res = scaffoldGherkinSteps({
        rootDir: tmpDir,
        featurePath: sampleFeaturePath,
        lang: 'ts',
        execFn: (cmd, args) => {
          calls.push({ cmd, args });
          return { status: 0, stdout: '// native cucumber-js snippets\nGiven("step", () => {});', stderr: '' };
        },
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('GENERATED_NATIVE');
      expect(res.outputFile).toBeDefined();
      expect(calls.length).toBe(2);
    });

    it('runs install command when installMissing is true and then generates native steps (GENERATED_NATIVE)', () => {
      const scaffoldGherkinSteps = getScaffoldGherkinSteps();
      const calls: Array<{ cmd: string; args: string[] }> = [];
      let installed = false;

      const res = scaffoldGherkinSteps({
        rootDir: tmpDir,
        featurePath: sampleFeaturePath,
        lang: 'py',
        installMissing: true,
        execFn: (cmd, args) => {
          calls.push({ cmd, args });
          if (cmd === 'pip' && args[0] === 'install') {
            installed = true;
            return { status: 0, stdout: 'Successfully installed pytest-bdd', stderr: '' };
          }
          if (!installed) {
            return { status: 127, stdout: '', stderr: 'pytest-bdd not found' };
          }
          return { status: 0, stdout: '# native pytest-bdd generated steps\n', stderr: '' };
        },
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('GENERATED_NATIVE');
      expect(calls.some((c) => c.cmd === 'pip' && c.args.includes('pytest-bdd'))).toBe(true);
    });
  });

  describe('Step 3: Deterministic RED Fallback Templates Across All 5 Languages (@nominal & @boundary)', () => {
    it.each([
      {
        lang: 'ts',
        expectedPattern: /throw new Error\(/,
        expectedFrameworkHint: /BddStepRegistry/,
      },
      {
        lang: 'py',
        expectedPattern: /raise NotImplementedError\(/,
        expectedFrameworkHint: /pytest_bdd/,
      },
      {
        lang: 'go',
        expectedPattern: /godog\.ErrPending/,
        expectedFrameworkHint: /godog\.ScenarioContext/,
      },
      {
        lang: 'rs',
        expectedPattern: /panic!\(/,
        expectedFrameworkHint: /cucumber/,
      },
      {
        lang: 'cs',
        expectedPattern: /PendingStepException/,
        expectedFrameworkHint: /Reqnroll/,
      },
    ])(
      'generates deterministic RED fallback template for $lang with explicit failing assertions and escaped quotes',
      ({ lang, expectedPattern, expectedFrameworkHint }) => {
        const scaffoldGherkinSteps = getScaffoldGherkinSteps();

        const res = scaffoldGherkinSteps({
          rootDir: tmpDir,
          featurePath: sampleFeaturePath,
          lang,
          allowFallback: true,
          execFn: () => ({ status: 127, stdout: '', stderr: 'not installed' }),
        });

        expect(res.success).toBe(true);
        expect(res.status).toBe('GENERATED_FALLBACK');
        expect(res.content).toBeDefined();
        expect(res.content).toMatch(expectedPattern);
        expect(res.content).toMatch(expectedFrameworkHint);
        expect(res.scenariosCount).toBe(3);
        expect(res.stepsCount).toBeGreaterThanOrEqual(5);

        const outPath = path.isAbsolute(res.outputFile!)
          ? res.outputFile!
          : path.join(tmpDir, res.outputFile!);
        expect(fs.existsSync(outPath)).toBe(true);
        const diskContent = fs.readFileSync(outPath, 'utf-8');
        expect(diskContent).toMatch(expectedPattern);
      }
    );

    it('supports multi-language invocations via comma-separated string ("ts,py") and array (["ts", "py", "go"])', () => {
      const scaffoldGherkinSteps = getScaffoldGherkinSteps();

      const commaRes = scaffoldGherkinSteps({
        rootDir: tmpDir,
        featurePath: sampleFeaturePath,
        lang: 'ts,py',
        allowFallback: true,
        execFn: () => ({ status: 127, stdout: '', stderr: 'missing' }),
      });

      expect(commaRes.success).toBe(true);
      expect(commaRes.status).toBe('GENERATED_FALLBACK');
      expect(commaRes.langs).toEqual(['ts', 'py']);
      expect(commaRes.outputFiles).toHaveLength(2);
      expect(commaRes.results).toHaveLength(2);

      const arrayRes = scaffoldGherkinSteps({
        rootDir: tmpDir,
        featurePath: sampleFeaturePath,
        lang: ['ts', 'py', 'go', 'ts'], // includes duplicate 'ts' to verify deduplication
        allowFallback: true,
        execFn: () => ({ status: 127, stdout: '', stderr: 'missing' }),
      });

      expect(arrayRes.success).toBe(true);
      expect(arrayRes.langs).toEqual(['ts', 'py', 'go']);
      expect(arrayRes.outputFiles).toHaveLength(3);
      expect(arrayRes.results).toHaveLength(3);
    });
  });

  describe('Invalid & Security Scenarios (@invalid & @security)', () => {
    it('rejects unsupported languages ("ruby", "ts,fortran") with ERR_UNSUPPORTED_LANGUAGE', () => {
      const scaffoldGherkinSteps = getScaffoldGherkinSteps();

      const resSingle = scaffoldGherkinSteps({
        rootDir: tmpDir,
        featurePath: sampleFeaturePath,
        lang: 'ruby',
      });
      expect(resSingle.success).toBe(false);
      expect(resSingle.status).toBe('ERROR');
      expect(resSingle.errorCode).toBe('ERR_UNSUPPORTED_LANGUAGE');

      const resMulti = scaffoldGherkinSteps({
        rootDir: tmpDir,
        featurePath: sampleFeaturePath,
        lang: 'ts,fortran',
      });
      expect(resMulti.success).toBe(false);
      expect(resMulti.status).toBe('ERROR');
      expect(resMulti.errorCode).toBe('ERR_UNSUPPORTED_LANGUAGE');
    });

    it('rejects missing .feature file with ERR_FEATURE_NOT_FOUND', () => {
      const scaffoldGherkinSteps = getScaffoldGherkinSteps();

      const res = scaffoldGherkinSteps({
        rootDir: tmpDir,
        featurePath: path.join(tmpDir, 'does-not-exist.feature'),
        lang: 'ts',
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('ERROR');
      expect(res.errorCode).toBe('ERR_FEATURE_NOT_FOUND');
    });

    it('prevents argument flag injection when feature filename starts with "-" or traverses outside rootDir (@security)', () => {
      const scaffoldGherkinSteps = getScaffoldGherkinSteps();
      const dashFeature = path.join(tmpDir, '-malicious-flag.feature');
      fs.writeFileSync(dashFeature, SAMPLE_FEATURE_CONTENT, 'utf-8');

      const calls: Array<{ cmd: string; args: string[] }> = [];
      const res = scaffoldGherkinSteps({
        rootDir: tmpDir,
        featurePath: '-malicious-flag.feature',
        lang: 'py',
        execFn: (cmd, args) => {
          calls.push({ cmd, args });
          return { status: 0, stdout: '# steps', stderr: '' };
        },
      });

      if (res.success) {
        // If resolved to an absolute/relative path, no positional arg passed to binary may start with raw "-"
        for (const call of calls) {
          if (call.args.includes('generate')) {
            const targetArg = call.args[call.args.length - 1];
            expect(targetArg.startsWith('-')).toBe(false);
          }
        }
      } else {
        expect(res.status).toBe('ERROR');
      }
    });
  });

  describe('@CHG-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX @FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001: Polyglot Compiler Stdout, Symbol Uniqueness, Go Regex & Rust Clippy Fixes', () => {
    it.each([
      {
        lang: 'cs' as const,
        compilerStdout: 'MSBuild version 17.8.3+195e7f5a3 for .NET\n  Determining projects to restore...\n  Build succeeded.\n',
        expectedTemplateMarker: /public class SampleSteps/,
      },
      {
        lang: 'rs' as const,
        compilerStdout: '   Compiling aisdlc-bdd v0.1.0\n    Finished `test` profile [unoptimized + debuginfo]\nrunning 0 tests\ntest result: ok.\n',
        expectedTemplateMarker: /panic!\("RED: Step not implemented:/,
      },
    ])(
      'discards compiler/runner stdout for $lang when execFn returns status 0 and emits GENERATED_FALLBACK with accurate fallbackReason',
      ({ lang, compilerStdout, expectedTemplateMarker }) => {
        const scaffoldGherkinSteps = getScaffoldGherkinSteps();
        const res = scaffoldGherkinSteps({
          rootDir: tmpDir,
          featurePath: sampleFeaturePath,
          lang,
          allowFallback: true,
          execFn: () => ({ status: 0, stdout: compilerStdout, stderr: '' }),
        });

        expect(res.success).toBe(true);
        expect(res.status).toBe('GENERATED_FALLBACK');
        expect(res.content).toBeDefined();
        expect(res.content).not.toContain(compilerStdout.trim());
        expect(res.content).toMatch(expectedTemplateMarker);
        expect(res.fallbackReason).toBeDefined();
        expect(res.fallbackReason).toMatch(/does not emit step-definition source code/i);
        expect(res.fallbackReason).not.toMatch(/not installed/i);

        const outPath = path.isAbsolute(res.outputFile!)
          ? res.outputFile!
          : path.join(tmpDir, res.outputFile!);
        const diskContent = fs.readFileSync(outPath, 'utf-8');
        expect(diskContent).not.toContain(compilerStdout.trim());
        expect(diskContent).toMatch(expectedTemplateMarker);
      }
    );

    it('scaffolds multiple features (including kebab-case and numeric-leading stems) across cs, go, rs, py, ts with zero symbol collisions', () => {
      const scaffoldGherkinSteps = getScaffoldGherkinSteps();
      const loginFeature = path.join(tmpDir, 'tests', 'features', '01-login.feature');
      const checkoutFeature = path.join(tmpDir, 'tests', 'features', 'user-checkout.feature');
      fs.writeFileSync(
        loginFeature,
        'Feature: 01 Login\n  Scenario: Login\n    Given a registered user\n',
        'utf-8'
      );
      fs.writeFileSync(
        checkoutFeature,
        'Feature: User Checkout\n  Scenario: Checkout\n    Given a cart with items\n',
        'utf-8'
      );

      for (const lang of ['cs', 'go', 'rs', 'py', 'ts'] as const) {
        const loginRes = scaffoldGherkinSteps({
          rootDir: tmpDir,
          featurePath: loginFeature,
          lang,
          allowFallback: true,
          execFn: () => ({ status: 127, stdout: '', stderr: 'not installed' }),
        });
        const checkoutRes = scaffoldGherkinSteps({
          rootDir: tmpDir,
          featurePath: checkoutFeature,
          lang,
          allowFallback: true,
          execFn: () => ({ status: 127, stdout: '', stderr: 'not installed' }),
        });

        expect(loginRes.success).toBe(true);
        expect(checkoutRes.success).toBe(true);
        expect(loginRes.outputFile).not.toBe(checkoutRes.outputFile);

        if (lang === 'cs') {
          expect(loginRes.content).toMatch(/public class _01LoginSteps\b/);
          expect(checkoutRes.content).toMatch(/public class UserCheckoutSteps\b/);
        } else if (lang === 'go') {
          expect(loginRes.content).toMatch(/func Initialize_01LoginScenario\(ctx \*godog\.ScenarioContext\)/);
          expect(checkoutRes.content).toMatch(/func InitializeUserCheckoutScenario\(ctx \*godog\.ScenarioContext\)/);
        }
      }
    });

    it('renderGoFallback escapes regex metacharacters without injecting \\" and handles backticks via Go string concatenation', () => {
      const rendered = gherkinScaffold.renderGoFallback('tests/features/go-regex.feature', [
        { keyword: 'Given', text: 'user (admin) buys "item" [1]? + $9.99' },
        { keyword: 'When', text: 'payload has `raw` backticks' },
      ]);

      expect(rendered).not.toContain('\\"');
      expect(rendered).toContain('\\(admin\\)');
      expect(rendered).toContain('buys "item"');
      expect(rendered).toContain('\\[1\\]\\?');
      expect(rendered).toContain('\\+');
      expect(rendered).toContain('\\$9\\.99');
      expect(rendered).toContain('+ "`" +');
    });

    it('renderRsFallback emits panic! instead of todo! and safely formats braces { and }', () => {
      const rendered = gherkinScaffold.renderRsFallback('tests/features/rs-clippy.feature', [
        { keyword: 'Given', text: 'payload {"key": "value"} is received' },
      ]);

      expect(rendered).toContain('panic!("RED: Step not implemented: {}",');
      expect(rendered).not.toContain('todo!(');
      expect(rendered).toContain('{\\"key\\": \\"value\\"}');
    });

    it('GherkinGeneratorSpec, featurePascalStem, formatGoRawRegexLiteral, and resolveFallbackReason satisfy CHG-071 contracts', () => {
      const csSpec: GherkinGeneratorSpec = gherkinScaffold.GHERKIN_GENERATOR_SPECS.cs;
      const rsSpec: GherkinGeneratorSpec = gherkinScaffold.GHERKIN_GENERATOR_SPECS.rs;
      const tsSpec: GherkinGeneratorSpec = gherkinScaffold.GHERKIN_GENERATOR_SPECS.ts;

      expect(csSpec.emitsSourceStdout).toBe(false);
      expect(rsSpec.emitsSourceStdout).toBe(false);
      expect(tsSpec.emitsSourceStdout).toBeUndefined();

      expect(gherkinScaffold.featurePascalStem('alpha-flow.feature')).toBe('AlphaFlow');
      expect(gherkinScaffold.featurePascalStem('order_create.feature')).toBe('OrderCreate');
      expect(gherkinScaffold.featurePascalStem('01-login.feature')).toBe('_01Login');
      expect(gherkinScaffold.featurePascalStem('---.feature')).toBe('Generated');

      expect(gherkinScaffold.formatGoRawRegexLiteral('^simple$')).toBe('`^simple$`');
      expect(gherkinScaffold.formatGoRawRegexLiteral('^run `cmd`$')).toBe('`^run ` + "`" + `cmd` + "`" + `$`');

      expect(gherkinScaffold.resolveFallbackReason(csSpec)).toContain('does not emit step-definition source code');
      expect(gherkinScaffold.resolveFallbackReason(tsSpec)).toContain('not installed');
    });

    it('discards compiler stdout for cs and rs even when allowFallback is omitted, and handles malformed/empty inputs & edge backticks', () => {
      const scaffoldGherkinSteps = getScaffoldGherkinSteps();

      for (const lang of ['cs', 'rs'] as const) {
        const res = scaffoldGherkinSteps({
          rootDir: tmpDir,
          featurePath: sampleFeaturePath,
          lang,
          execFn: () => ({ status: 0, stdout: 'Compiler output noise', stderr: '' }),
        });
        expect(res.success).toBe(true);
        expect(res.status).toBe('GENERATED_FALLBACK');
        expect(res.content).not.toContain('Compiler output noise');
      }

      expect(gherkinScaffold.formatGoRawRegexLiteral('')).toBe('``');
      expect(gherkinScaffold.formatGoRawRegexLiteral('`abc')).toBe('`` + "`" + `abc`');
      expect(gherkinScaffold.formatGoRawRegexLiteral('abc`')).toBe('`abc` + "`" + ``');
      expect(gherkinScaffold.formatGoRawRegexLiteral('a``b')).toBe('`a` + "`" + `` + "`" + `b`');

      const emptyFeatureRes = scaffoldGherkinSteps({ rootDir: tmpDir, featurePath: '', lang: 'ts' });
      expect(emptyFeatureRes.success).toBe(false);
      expect(emptyFeatureRes.status).toBe('ERROR');

      const emptyLangRes = scaffoldGherkinSteps({ rootDir: tmpDir, featurePath: sampleFeaturePath, lang: '' });
      expect(emptyLangRes.success).toBe(false);
      expect(emptyLangRes.errorCode).toBe('ERR_UNSUPPORTED_LANGUAGE');

      const malformedFeature = path.join(tmpDir, 'tests', 'features', 'malformed-empty.feature');
      fs.writeFileSync(malformedFeature, 'Not a valid gherkin header\nRandom garbage text\n', 'utf-8');
      const malformedRes = scaffoldGherkinSteps({
        rootDir: tmpDir,
        featurePath: malformedFeature,
        lang: 'go',
        allowFallback: true,
        execFn: () => ({ status: 127, stdout: '', stderr: 'missing' }),
      });
      expect(malformedRes.success).toBe(true);
      expect(malformedRes.scenariosCount).toBe(0);
      expect(malformedRes.stepsCount).toBe(0);
      expect(malformedRes.content).toContain('func InitializeMalformedEmptyScenario');
    });
  });
});
