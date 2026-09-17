import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { scanFileForSast, verifySast } from '../src/verifiers/sast.js';

describe('Shift-Left SAST Verifier (@ai-sdlc/core)', () => {
  it('should detect SQL injection vulnerabilities via dynamic string concatenation', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-sast-test-'));
    try {
      const vulnFile = path.join(tempDir, 'db.ts');
      fs.writeFileSync(
        vulnFile,
        'const res = await db.query(`SELECT * FROM users WHERE id = ${userId}`);\n'
      );

      const findings = scanFileForSast(vulnFile, tempDir);
      expect(findings.length).toBe(1);
      expect(findings[0].type).toBe('SQL_INJECTION');
      expect(findings[0].severity).toBe('CRITICAL');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should detect Command Injection vulnerabilities via child_process.exec', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-sast-test-'));
    try {
      const vulnFile = path.join(tempDir, 'exec.ts');
      fs.writeFileSync(
        vulnFile,
        'child_process.exec(`ping ${targetHost}`);\n'
      );

      const findings = scanFileForSast(vulnFile, tempDir);
      expect(findings.length).toBe(1);
      expect(findings[0].type).toBe('COMMAND_INJECTION');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should detect dynamic code evaluation with eval', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-sast-test-'));
    try {
      const vulnFile = path.join(tempDir, 'eval.ts');
      fs.writeFileSync(vulnFile, 'const fn = eval(userCode);\n');

      const findings = scanFileForSast(vulnFile, tempDir);
      expect(findings.length).toBe(1);
      expect(findings[0].type).toBe('UNSAFE_EVAL');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should respect inline suppression comments (ai-sdlc:allow-sast)', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-sast-test-'));
    try {
      const vulnFile = path.join(tempDir, 'suppressed.ts');
      fs.writeFileSync(
        vulnFile,
        'const res = await db.query(`SELECT * FROM users WHERE id = ${userId}`); // ai-sdlc:allow-sast\n'
      );

      const findings = scanFileForSast(vulnFile, tempDir);
      expect(findings.length).toBe(0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should pass cleanly on repository packages without unmitigated security vulnerabilities', () => {
    const res = verifySast({ rootDir: process.cwd() });
    expect(res.success).toBe(true);
    expect(res.violationsCount).toBe(0);
  });
});
