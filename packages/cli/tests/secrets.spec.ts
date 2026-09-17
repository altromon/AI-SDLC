import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { runVerifySast, runVerifySecrets } from '../src/commands/verify.js';

describe('@ai-sdlc/cli Secret & SAST Verification Suite', () => {
  it('should pass secret verification on clean repository', () => {
    const passed = runVerifySecrets({ silent: true });
    expect(passed).toBe(true);
  });

  it('should pass sast verification on clean repository', () => {
    const passed = runVerifySast({ silent: true });
    expect(passed).toBe(true);
  });

  it('should fail secret verification when repository contains leaked credentials', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-cli-secrets-'));
    try {
      const badFile = path.join(tempDir, 'leak.ts');
      const mockToken = ['ghp_', '123456789012345678901234567890123456'].join('');
      fs.writeFileSync(badFile, `const token = "${mockToken}";\n`);

      const passed = runVerifySecrets({ root: tempDir, silent: true });
      expect(passed).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should fail SAST verification when source directory contains SQL injection', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-cli-sast-'));
    try {
      const srcDir = path.join(tempDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      const badFile = path.join(srcDir, 'query.ts');
      fs.writeFileSync(
        badFile,
        'const q = await db.query(`SELECT * FROM users WHERE email = "${userEmail}"`);\n'
      );

      const passed = runVerifySast({ root: tempDir, silent: true });
      expect(passed).toBe(false);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
