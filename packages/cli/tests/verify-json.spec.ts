import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
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
});
