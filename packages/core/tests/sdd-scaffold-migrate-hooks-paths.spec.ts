import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getNextCorrelativeNumber, scaffoldSddChange, slugify } from '../src/adapters/sdd/scaffold.js';
import { GitHooksHealthCheck } from '../src/doctor/git-hooks-check.js';
import { MigrationService } from '../src/migrate/service.js';

describe('SDD Scaffold, MigrationService & GitHooksHealthCheck Paths (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-inc11-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('slugify & getNextCorrelativeNumber: normalizes accents/punctuation and computes next correlative (happy/boundary)', () => {
    expect(slugify('Añadir Autenticación OAuth2!')).toBe('anadir-autenticacion-oauth2');
    expect(slugify('---Hello___World---')).toBe('hello-world');
    expect(slugify('')).toBe('');

    expect(getNextCorrelativeNumber(tmpDir)).toBe(1);

    fs.mkdirSync(path.join(tmpDir, 'specs', 'changes', 'active', 'chg-004-auth'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'specs', 'changes', 'completed', 'chg-012-done'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'specs', 'changes', 'active', 'unrelated-dir'), { recursive: true });
    expect(getNextCorrelativeNumber(tmpDir)).toBe(13);
  });

  it('scaffoldSddChange: scaffolds patch and minor profiles and handles duplicate change error (happy/sad/boundary)', () => {
    const patchRes = scaffoldSddChange({
      rootDir: tmpDir,
      name: 'Fix typo in logger',
      profile: 'patch',
    });
    expect(patchRes.success).toBe(true);
    expect(fs.existsSync(patchRes.changeDir)).toBe(true);

    const stdRes = scaffoldSddChange({
      rootDir: tmpDir,
      name: 'Add audit export',
      profile: 'minor',
    });
    expect(stdRes.success).toBe(true);

    const dupRes = scaffoldSddChange({
      rootDir: tmpDir,
      changeId: stdRes.changeId,
      name: 'Duplicate change',
      profile: 'minor',
    });
    expect(dupRes.success).toBe(false);
  });

  it('MigrationService: preview, protected branch block, and non-git workspace migration (happy/sad/boundary)', async () => {
    const svc = new MigrationService();
    const previewRes = await svc.preview({ rootDir: tmpDir });
    expect(typeof previewRes.success).toBe('boolean');

    const mainBlocked = await svc.migrate({ rootDir: tmpDir, branch: 'main' });
    expect(mainBlocked.success).toBe(false);
    expect(mainBlocked.details.some((d) => (d.message || '').includes('ERR_PROTECTED_BRANCH_MIGRATION'))).toBe(true);

    const relBlocked = await svc.migrate({ rootDir: tmpDir, branch: 'release/v1.0.0' });
    expect(relBlocked.success).toBe(false);

    const nonGitRes = await svc.migrate({ rootDir: tmpDir, dryRun: false });
    expect(typeof nonGitRes.success).toBe('boolean');
  });

  it('GitHooksHealthCheck: reports missing .git and missing hooks cleanly (sad/boundary)', async () => {
    const check = new GitHooksHealthCheck();
    const noGit = await check.inspect({ rootDir: tmpDir });
    expect(noGit.findings.length).toBeGreaterThan(0);

    fs.mkdirSync(path.join(tmpDir, '.git', 'hooks'), { recursive: true });
    const missingHooks = await check.inspect({ rootDir: tmpDir });
    expect(missingHooks.status).not.toBe('pass');
  });
});
