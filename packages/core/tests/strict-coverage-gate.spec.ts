import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { verifyQualityGate } from '../src/index.js';

function makeTempProject(enforceMode: 'STRICT' | 'PERMISSIVE'): string {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-strict-cov-'));
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'src', 'index.ts'), 'export function ok(): number {\n  return 1;\n}\n', 'utf-8');
  fs.writeFileSync(
    path.join(tmp, 'quality-policy.yaml'),
    `version: "1.0"\nenforcement_mode: "${enforceMode}"\n`,
    'utf-8'
  );
  return tmp;
}

describe('@CHG-062-STRICT-COVERAGE-GATE Strict mode requires code coverage report', () => {
  it('fails quality gate in STRICT mode when code coverage report is missing', () => {
    const tmp = makeTempProject('STRICT');
    try {
      const result = verifyQualityGate({ rootDir: tmp });
      expect(result.success).toBe(false);
      expect(result.coverageViolations.some((v) => v.includes('Missing code coverage summary report'))).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('allows missing code coverage report in PERMISSIVE mode', () => {
    const tmp = makeTempProject('PERMISSIVE');
    try {
      const result = verifyQualityGate({ rootDir: tmp });
      expect(result.success).toBe(true);
      expect(result.coverageViolations).toEqual([]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('allows missing code coverage report in STRICT mode when requireCoverageReport is false', () => {
    const tmp = makeTempProject('STRICT');
    try {
      const result = verifyQualityGate({ rootDir: tmp, requireCoverageReport: false });
      expect(result.success).toBe(true);
      expect(result.coverageViolations).toEqual([]);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
