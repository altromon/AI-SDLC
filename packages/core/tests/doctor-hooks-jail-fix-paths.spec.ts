import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GitHooksHealthCheck } from '../src/doctor/git-hooks-check.js';
import { FileSystemJailAdapter } from '../src/migrate/fs-jail.js';

describe('GitHooksHealthCheck fixHooks & FileSystemJailAdapter ensureDirectorySafe/isSymlinkSafe', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-inc25-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('GitHooksHealthCheck: exercises fix: true (overwriteHook & fixHooks) when hooks are missing or outdated', async () => {
    fs.mkdirSync(path.join(tmpDir, '.git', 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.git', 'hooks', 'pre-commit'), '#!/bin/sh\necho old\n', 'utf-8');

    const check = new GitHooksHealthCheck();
    const res = await check.inspect({ rootDir: tmpDir, fix: true });
    expect(['pass', 'warn', 'fail']).toContain(res.status);
    expect(fs.existsSync(path.join(tmpDir, '.git', 'hooks', 'prepare-commit-msg'))).toBe(true);
  });

  it('FileSystemJailAdapter: exercises ensureDirectorySafe and isSymlinkSafe', async () => {
    const jail = new FileSystemJailAdapter();
    await jail.ensureDirectorySafe(tmpDir, 'schemas/new-sub');
    expect(fs.existsSync(path.join(tmpDir, 'schemas', 'new-sub'))).toBe(true);
    expect(await jail.isSymlinkSafe(tmpDir, 'schemas/new-sub')).toBe(false);
    expect(await jail.isSymlinkSafe(tmpDir, 'schemas/nonexistent')).toBe(false);
    await expect(jail.ensureDirectorySafe(tmpDir, '../outside')).rejects.toThrow('ERR_PATH_TRAVERSAL_DETECTED');
  });
});
