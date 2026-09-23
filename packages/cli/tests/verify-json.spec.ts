/**
 * Cites: FR-025-STRUCTURED-JSON-VERIFY-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  runVerifyAll,
  runVerifyDuplicates,
  runVerifyFriction,
  runVerifyGovernance,
  runVerifyLicenses,
  runVerifyPdac,
  runVerifyQuality,
  runVerifySast,
  runVerifySchemas,
  runVerifySecrets,
  runVerifySecurity,
  runVerifyTesting,
  runVerifyTraceability,
} from '../src/commands/verify.js';
import { runCheck } from '../src/commands/check.js';
import { runGherkinExtract } from '../src/commands/gherkin.js';
import { runInit } from '../src/commands/init.js';
import {
  runChangeNew,
  runSddDeposit,
  runSddIntegrate,
  runSddVerify,
} from '../src/commands/sdd.js';

const ANSI_REGEX = /\u001b\[[0-9;]*m/;

function captureConsoleLog(fn: () => void): string {
  const originalLog = console.log;
  let output = '';
  console.log = (...args: unknown[]) => {
    output += args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') + '\n';
  };
  try {
    fn();
  } finally {
    console.log = originalLog;
  }
  return output.trim();
}

describe('@ai-sdlc/cli Structured JSON Output Suite (aisdlc verify --json)', () => {
  it('should emit valid JSON without ANSI codes for runVerifyQuality in nominal pass', () => {
    let passed: boolean = false;
    const output = captureConsoleLog(() => {
      passed = runVerifyQuality({ json: true });
    });

    expect(passed).toBe(true);
    expect(output).not.toMatch(ANSI_REGEX);

    const parsed = JSON.parse(output);
    expect(parsed.gate).toBe('quality');
    expect(parsed.success).toBe(true);
    expect(parsed.exitCode).toBe(0);
    expect(parsed.summary).toBeDefined();
    expect(parsed.summary.totalFiles).toBeGreaterThan(0);
    expect(parsed.summary.totalFunctions).toBeGreaterThan(0);
    expect(parsed.summary.passCount).toBe(parsed.summary.totalFunctions);
    expect(parsed.summary.failCount).toBe(0);
    expect(Array.isArray(parsed.violations)).toBe(true);
    expect(parsed.violations.length).toBe(0);
  });

  it('should emit valid JSON with violations and exitCode 1 when quality gate fails', () => {
    let passed: boolean = true;
    const output = captureConsoleLog(() => {
      passed = runVerifyQuality({ json: true, maxCyclomatic: 1, enforceMode: 'STRICT' });
    });

    expect(passed).toBe(false);
    expect(output).not.toMatch(ANSI_REGEX);

    const parsed = JSON.parse(output);
    expect(parsed.gate).toBe('quality');
    expect(parsed.success).toBe(false);
    expect(parsed.exitCode).toBe(1);
    expect(parsed.summary.failCount).toBeGreaterThan(0);
    expect(parsed.violations.length).toBeGreaterThan(0);
    expect(parsed.violations[0].metric).toBe('quality');
    expect(parsed.violations[0].metrics).toBeDefined();
  });

  it('should emit valid JSON for runVerifyTraceability', () => {
    let passed: boolean = false;
    const output = captureConsoleLog(() => {
      passed = runVerifyTraceability({ json: true });
    });

    expect(passed).toBe(true);
    expect(output).not.toMatch(ANSI_REGEX);

    const parsed = JSON.parse(output);
    expect(parsed.gate).toBe('traceability');
    expect(parsed.success).toBe(true);
    expect(parsed.exitCode).toBe(0);
    expect(parsed.summary.totalRequirements).toBeGreaterThan(0);
    expect(parsed.summary.orphanCount).toBe(0);
    expect(parsed.violations).toEqual([]);
  });

  it('should emit valid JSON for runVerifyGovernance', () => {
    let passed: boolean = false;
    const output = captureConsoleLog(() => {
      passed = runVerifyGovernance({ json: true });
    });

    expect(passed).toBe(true);
    expect(output).not.toMatch(ANSI_REGEX);

    const parsed = JSON.parse(output);
    expect(parsed.gate).toBe('governance');
    expect(parsed.success).toBe(true);
    expect(parsed.exitCode).toBe(0);
    expect(parsed.summary.totalTasks).toBeGreaterThan(0);
    expect(parsed.summary.modeCounts).toBeDefined();
    expect(parsed.violations).toEqual([]);
  });

  it('should emit valid JSON for runVerifyTesting', () => {
    let passed: boolean = false;
    const output = captureConsoleLog(() => {
      passed = runVerifyTesting({ json: true });
    });

    expect(passed).toBe(true);
    expect(output).not.toMatch(ANSI_REGEX);

    const parsed = JSON.parse(output);
    expect(parsed.gate).toBe('testing');
    expect(parsed.success).toBe(true);
    expect(parsed.exitCode).toBe(0);
    expect(parsed.summary.passedRequirements).toBe(parsed.summary.totalRequirements);
    expect(parsed.summary.failedRequirements).toBe(0);
    expect(parsed.violations).toEqual([]);
  });

  it('should emit valid JSON for runVerifyLicenses including artifacts metadata', () => {
    let passed: boolean = false;
    const output = captureConsoleLog(() => {
      passed = runVerifyLicenses({ json: true });
    });

    expect(passed).toBe(true);
    expect(output).not.toMatch(ANSI_REGEX);

    const parsed = JSON.parse(output);
    expect(parsed.gate).toBe('licenses');
    expect(parsed.success).toBe(true);
    expect(parsed.exitCode).toBe(0);
    expect(parsed.summary.totalEvaluated).toBeGreaterThan(0);
    expect(parsed.summary.violationsCount).toBe(0);
    expect(parsed.violations).toEqual([]);
    expect(parsed.artifacts).toBeDefined();
  });

  it('should emit valid JSON for runVerifyPdac', () => {
    let passed: boolean = false;
    const output = captureConsoleLog(() => {
      passed = runVerifyPdac({ json: true });
    });

    expect(passed).toBe(true);
    expect(output).not.toMatch(ANSI_REGEX);

    const parsed = JSON.parse(output);
    expect(parsed.gate).toBe('pdac');
    expect(parsed.success).toBe(true);
    expect(parsed.exitCode).toBe(0);
    expect(parsed.summary.totalNodes).toBeGreaterThan(0);
    expect(parsed.summary.driftCount).toBe(0);
    expect(parsed.violations).toEqual([]);
  });

  it('should emit valid JSON for runVerifySchemas', () => {
    let passed: boolean = false;
    const output = captureConsoleLog(() => {
      passed = runVerifySchemas({ json: true });
    });

    expect(passed).toBe(true);
    expect(output).not.toMatch(ANSI_REGEX);

    const parsed = JSON.parse(output);
    expect(parsed.gate).toBe('schemas');
    expect(parsed.success).toBe(true);
    expect(parsed.exitCode).toBe(0);
    expect(parsed.summary.validCount).toBe(parsed.summary.totalEvaluated);
    expect(parsed.summary.invalidCount).toBe(0);
    expect(parsed.violations).toEqual([]);
  });

  it('should emit valid JSON for runVerifyDuplicates', () => {
    let passed: boolean = false;
    const output = captureConsoleLog(() => {
      passed = runVerifyDuplicates({ json: true });
    });

    expect(passed).toBe(true);
    expect(output).not.toMatch(ANSI_REGEX);

    const parsed = JSON.parse(output);
    expect(parsed.gate).toBe('duplicates');
    expect(parsed.success).toBe(true);
    expect(parsed.exitCode).toBe(0);
    expect(parsed.summary.errorCount).toBe(0);
    expect(parsed.violations).toEqual([]);
  });

  it('should emit valid JSON for runVerifyFriction', () => {
    let passed: boolean = false;
    const output = captureConsoleLog(() => {
      passed = runVerifyFriction({ json: true });
    });

    expect(passed).toBe(true);
    expect(output).not.toMatch(ANSI_REGEX);

    const parsed = JSON.parse(output);
    expect(parsed.gate).toBe('friction');
    expect(parsed.success).toBe(true);
    expect(parsed.exitCode).toBe(0);
    expect(parsed.summary.profile).toBeDefined();
    expect(parsed.violations).toEqual([]);
  });

  it('should emit valid JSON for runVerifySecrets and report exitCode 4 upon secret detection', () => {
    // 1. Nominal clean pass
    let cleanPassed: boolean = false;
    const cleanOutput = captureConsoleLog(() => {
      cleanPassed = runVerifySecrets({ json: true });
    });

    expect(cleanPassed).toBe(true);
    const cleanParsed = JSON.parse(cleanOutput);
    expect(cleanParsed.gate).toBe('secrets');
    expect(cleanParsed.success).toBe(true);
    expect(cleanParsed.exitCode).toBe(0);
    expect(cleanParsed.summary.findingsCount).toBe(0);

    // 2. Failure with exposed secret
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-test-secrets-json-'));
    try {
      const leakedFile = path.join(tempDir, 'credentials.ts');
      const fakeToken = ['ghp_', '123456789012345678901234567890123456'].join('');
      fs.writeFileSync(leakedFile, `export const token = "${fakeToken}";\n`);

      let leakPassed: boolean = true;
      const leakOutput = captureConsoleLog(() => {
        leakPassed = runVerifySecrets({ root: tempDir, json: true });
      });

      expect(leakPassed).toBe(false);
      const leakParsed = JSON.parse(leakOutput);
      expect(leakParsed.gate).toBe('secrets');
      expect(leakParsed.success).toBe(false);
      expect(leakParsed.exitCode).toBe(4);
      expect(leakParsed.summary.findingsCount).toBeGreaterThan(0);
      expect(leakParsed.violations.length).toBeGreaterThan(0);
      expect(leakParsed.violations[0].ruleId).toBeDefined();
      expect(leakParsed.violations[0].maskedMatch).toBeDefined();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should emit valid JSON for runVerifySast and report exitCode 1 upon vulnerability', () => {
    // 1. Nominal clean pass
    let cleanPassed: boolean = false;
    const cleanOutput = captureConsoleLog(() => {
      cleanPassed = runVerifySast({ json: true });
    });

    expect(cleanPassed).toBe(true);
    const cleanParsed = JSON.parse(cleanOutput);
    expect(cleanParsed.gate).toBe('sast');
    expect(cleanParsed.success).toBe(true);
    expect(cleanParsed.exitCode).toBe(0);

    // 2. Failure with SQL Injection
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-test-sast-json-'));
    try {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'db.ts'),
        'const query = await db.query(`SELECT * FROM users WHERE id = "${userId}"`);\n'
      );

      let sastPassed: boolean = true;
      const sastOutput = captureConsoleLog(() => {
        sastPassed = runVerifySast({ root: tempDir, json: true });
      });

      expect(sastPassed).toBe(false);
      const sastParsed = JSON.parse(sastOutput);
      expect(sastParsed.gate).toBe('sast');
      expect(sastParsed.success).toBe(false);
      expect(sastParsed.exitCode).toBe(1);
      expect(sastParsed.summary.violationsCount).toBeGreaterThan(0);
      expect(sastParsed.violations[0].severity).toBeDefined();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should emit valid JSON for runVerifySecurity and report exitCode 4 when secrets are exposed', () => {
    // 1. Nominal clean pass
    let cleanPassed: boolean = false;
    const cleanOutput = captureConsoleLog(() => {
      cleanPassed = runVerifySecurity({ json: true });
    });

    expect(cleanPassed).toBe(true);
    const cleanParsed = JSON.parse(cleanOutput);
    expect(cleanParsed.gate).toBe('security');
    expect(cleanParsed.success).toBe(true);
    expect(cleanParsed.exitCode).toBe(0);
    expect(cleanParsed.summary.secretsScanned).toBeDefined();
    expect(cleanParsed.summary.sastScanned).toBeDefined();

    // 2. Failure with exposed secret in security gate
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-test-security-json-'));
    try {
      const leakedFile = path.join(tempDir, 'auth.ts');
      const fakeKey = ['AKIA', 'IOSFODNN7EXAMPLE'].join('');
      fs.writeFileSync(leakedFile, `const aws = "${fakeKey}";\n`);

      let secPassed: boolean = true;
      const secOutput = captureConsoleLog(() => {
        secPassed = runVerifySecurity({ root: tempDir, json: true });
      });

      expect(secPassed).toBe(false);
      const secParsed = JSON.parse(secOutput);
      expect(secParsed.gate).toBe('security');
      expect(secParsed.success).toBe(false);
      expect(secParsed.exitCode).toBe(4);
      expect(secParsed.violations.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should emit consolidated valid JSON for runVerifyAll with all 9 gates mapped', () => {
    let allPassed: boolean = false;
    const output = captureConsoleLog(() => {
      allPassed = runVerifyAll({ json: true });
    });

    expect(allPassed).toBe(true);
    expect(output).not.toMatch(ANSI_REGEX);

    const parsed = JSON.parse(output);
    expect(parsed.gate).toBe('all');
    expect(parsed.success).toBe(true);
    expect(parsed.exitCode).toBe(0);
    expect(parsed.summary.totalGates).toBe(9);
    expect(parsed.summary.passedGates).toBe(9);
    expect(parsed.summary.failedGates).toBe(0);

    const expectedGates = [
      'quality',
      'traceability',
      'governance',
      'testing',
      'licenses',
      'pdac',
      'schemas',
      'duplicates',
      'security',
    ];

    for (const gateName of expectedGates) {
      expect(parsed.gates[gateName]).toBeDefined();
      expect(parsed.gates[gateName].success).toBe(true);
    }
    expect(parsed.violations).toEqual([]);
  });

  describe('Environment Variable and Format Selection Suite (FR-027-ENV-OUTPUT-JSON-001)', () => {
    const origFormat = process.env.AISDLC_FORMAT;
    const origOutput = process.env.AISDLC_OUTPUT;

    afterEach(() => {
      if (origFormat !== undefined) {
        process.env.AISDLC_FORMAT = origFormat;
      } else {
        delete process.env.AISDLC_FORMAT;
      }
      if (origOutput !== undefined) {
        process.env.AISDLC_OUTPUT = origOutput;
      } else {
        delete process.env.AISDLC_OUTPUT;
      }
    });

    it('should emit JSON when AISDLC_FORMAT=json is set in environment (FR-027-ENV-OUTPUT-JSON-001)', () => {
      process.env.AISDLC_FORMAT = 'json';
      let passed: boolean = false;
      const output = captureConsoleLog(() => {
        passed = runVerifyQuality();
      });

      expect(passed).toBe(true);
      expect(output).not.toMatch(ANSI_REGEX);
      const parsed = JSON.parse(output);
      expect(parsed.gate).toBe('quality');
      expect(parsed.success).toBe(true);
    });

    it('should emit JSON when AISDLC_OUTPUT=json is set in environment (FR-027-ENV-OUTPUT-JSON-001)', () => {
      process.env.AISDLC_OUTPUT = 'json';
      let passed: boolean = false;
      const output = captureConsoleLog(() => {
        passed = runVerifyTraceability();
      });

      expect(passed).toBe(true);
      expect(output).not.toMatch(ANSI_REGEX);
      const parsed = JSON.parse(output);
      expect(parsed.gate).toBe('traceability');
      expect(parsed.success).toBe(true);
    });

    it('should emit JSON when options.format="json" is passed explicitly (FR-027-ENV-OUTPUT-JSON-001)', () => {
      let passed: boolean = false;
      const output = captureConsoleLog(() => {
        passed = runVerifyGovernance({ format: 'json' });
      });

      expect(passed).toBe(true);
      expect(output).not.toMatch(ANSI_REGEX);
      const parsed = JSON.parse(output);
      expect(parsed.gate).toBe('governance');
      expect(parsed.success).toBe(true);
    });

    it('should prioritize explicit json: false over AISDLC_FORMAT=json (FR-027-ENV-OUTPUT-JSON-001)', () => {
      process.env.AISDLC_FORMAT = 'json';
      let passed: boolean = false;
      const output = captureConsoleLog(() => {
        passed = runVerifyQuality({ json: false });
      });

      expect(passed).toBe(true);
      expect(() => JSON.parse(output)).toThrow();
      expect(output).toContain('Release Gate APROBADO');
    });

    it('should prioritize explicit format: "text" over AISDLC_FORMAT=json (FR-027-ENV-OUTPUT-JSON-001)', () => {
      process.env.AISDLC_FORMAT = 'json';
      let passed: boolean = false;
      const output = captureConsoleLog(() => {
        passed = runVerifyQuality({ format: 'text' });
      });

      expect(passed).toBe(true);
      expect(() => JSON.parse(output)).toThrow();
      expect(output).toContain('Release Gate APROBADO');
    });

    it('should emit human-readable text by default when no flags or env vars are set (FR-027-ENV-OUTPUT-JSON-001)', () => {
      delete process.env.AISDLC_FORMAT;
      delete process.env.AISDLC_OUTPUT;
      let passed: boolean = false;
      const output = captureConsoleLog(() => {
        passed = runVerifyQuality();
      });

      expect(passed).toBe(true);
      expect(() => JSON.parse(output)).toThrow();
      expect(output).toContain('Release Gate APROBADO');
    });

    it('should emit consolidated JSON for runVerifyAll when AISDLC_FORMAT=json is set (FR-027-ENV-OUTPUT-JSON-001)', () => {
      process.env.AISDLC_FORMAT = 'json';
      let passed: boolean = false;
      const output = captureConsoleLog(() => {
        passed = runVerifyAll();
      });

      expect(passed).toBe(true);
      expect(output).not.toMatch(ANSI_REGEX);
      const parsed = JSON.parse(output);
      expect(parsed.gate).toBe('all');
      expect(parsed.summary.totalGates).toBe(9);
      expect(parsed.violations).toEqual([]);
    });
  });

  describe('Unified JSON Output Suite for check, sdd, gherkin, init (#58)', () => {
    let tmpDir: string;

    afterEach(() => {
      delete process.env.AISDLC_FORMAT;
      delete process.env.AISDLC_OUTPUT;
      if (tmpDir && fs.existsSync(tmpDir)) {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
    });

    it('should emit valid JSON without ANSI codes for runCheck({ json: true })', () => {
      let passed: boolean = false;
      const output = captureConsoleLog(() => {
        passed = runCheck({ json: true });
      });

      expect(passed).toBe(true);
      expect(output).not.toMatch(ANSI_REGEX);

      const parsed = JSON.parse(output);
      expect(parsed.command).toBe('check');
      expect(parsed.success).toBe(true);
      expect(parsed.exitCode).toBe(0);
      expect(Array.isArray(parsed.gates)).toBe(true);
      expect(parsed.gates.length).toBe(9);
    });

    it('should emit valid JSON for runCheck when AISDLC_FORMAT=json is set', () => {
      process.env.AISDLC_FORMAT = 'json';
      let passed: boolean = false;
      const output = captureConsoleLog(() => {
        passed = runCheck();
      });

      expect(passed).toBe(true);
      expect(output).not.toMatch(ANSI_REGEX);

      const parsed = JSON.parse(output);
      expect(parsed.command).toBe('check');
      expect(parsed.success).toBe(true);
    });

    it('should emit valid JSON without ANSI codes for runGherkinExtract({ json: true })', () => {
      let passed: boolean = false;
      const output = captureConsoleLog(() => {
        passed = runGherkinExtract({ json: true });
      });

      expect(passed).toBe(true);
      expect(output).not.toMatch(ANSI_REGEX);

      const parsed = JSON.parse(output);
      expect(parsed.command).toBe('gherkin:extract');
      expect(parsed.success).toBe(true);
      expect(parsed.exitCode).toBe(0);
      expect(parsed.totalScenarios).toBeDefined();
      expect(Array.isArray(parsed.features)).toBe(true);
    });

    it('should emit valid JSON without ANSI codes for runInit with --dry-run and --json', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-test-init-json-'));
      let passed: boolean = false;
      const output = captureConsoleLog(() => {
        passed = runInit(tmpDir, { json: true, dryRun: true, ci: 'github', agents: 'none' });
      });

      expect(passed).toBe(true);
      expect(output).not.toMatch(ANSI_REGEX);

      const parsed = JSON.parse(output);
      expect(parsed.command).toBe('init');
      expect(parsed.success).toBe(true);
      expect(parsed.exitCode).toBe(0);
      expect(parsed.dryRun).toBe(true);
      expect(parsed.ciProvider).toBe('github');
      expect(Array.isArray(parsed.directoriesCreated)).toBe(true);
      expect(Array.isArray(parsed.filesCreated)).toBe(true);
    });

    it('should emit valid JSON without ANSI codes for runSddVerify({ json: true })', () => {
      let passed: boolean = false;
      const output = captureConsoleLog(() => {
        passed = runSddVerify({ json: true });
      });

      expect(passed).toBe(true);
      expect(output).not.toMatch(ANSI_REGEX);

      const parsed = JSON.parse(output);
      expect(parsed.command).toBe('sdd:verify');
      expect(parsed.success).toBe(true);
      expect(parsed.exitCode).toBe(0);
      expect(parsed.totalHandoffs).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(parsed.handoffs)).toBe(true);
    });

    it('should emit valid JSON without ANSI codes for runSddDeposit({ json: true })', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-test-sdd-deposit-json-'));
      let passed: boolean = false;
      const output = captureConsoleLog(() => {
        passed = runSddDeposit({
          root: tmpDir,
          change: 'chg-999-test-deposit',
          framework: 'openspec',
          title: 'Test Deposit',
          requirements: 'FR-001,FR-002',
          useCases: 'UC-001',
          json: true,
        });
      });

      expect(passed).toBe(true);
      expect(output).not.toMatch(ANSI_REGEX);

      const parsed = JSON.parse(output);
      expect(parsed.command).toBe('sdd:deposit');
      expect(parsed.success).toBe(true);
      expect(parsed.exitCode).toBe(0);
      expect(parsed.changeId).toBe('chg-999-test-deposit');
      expect(parsed.depositedPath).toBeDefined();
      expect(parsed.handoff).toBeDefined();
      expect(parsed.handoff.subgraph.requirements).toEqual(['FR-001', 'FR-002']);
    });

    it('should emit valid JSON without ANSI codes for runSddIntegrate when no active change is detected', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-test-sdd-integrate-json-'));
      let passed: boolean = true;
      const output = captureConsoleLog(() => {
        passed = runSddIntegrate({
          root: tmpDir,
          auto: true,
          json: true,
        });
      });

      expect(passed).toBe(false);
      expect(output).not.toMatch(ANSI_REGEX);

      const parsed = JSON.parse(output);
      expect(parsed.command).toBe('sdd:integrate');
      expect(parsed.success).toBe(false);
      expect(parsed.exitCode).toBe(1);
      expect(parsed.error).toBeDefined();
    });

    it('should emit valid JSON without ANSI codes for runChangeNew({ json: true })', () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-test-change-new-json-'));
      let passed: boolean = false;
      const output = captureConsoleLog(() => {
        passed = runChangeNew({
          root: tmpDir,
          name: 'test-change-new',
          profile: 'patch',
          framework: 'openspec',
          json: true,
        });
      });

      expect(passed).toBe(true);
      expect(output).not.toMatch(ANSI_REGEX);

      const parsed = JSON.parse(output);
      expect(parsed.command).toBe('change:new');
      expect(parsed.success).toBe(true);
      expect(parsed.exitCode).toBe(0);
      expect(parsed.canonicalId).toBeDefined();
      expect(parsed.profile).toBe('patch');
      expect(Array.isArray(parsed.createdFiles)).toBe(true);
    });
  });
});

