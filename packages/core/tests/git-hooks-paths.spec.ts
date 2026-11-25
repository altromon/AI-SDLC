import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installGitHooks, POST_COMMIT_SCRIPT, PRE_COMMIT_SCRIPT, PRE_PUSH_SCRIPT, PREPARE_COMMIT_MSG_SCRIPT } from '../src/git/hook-installer.js';

describe('installGitHooks (Happy / Sad / Boundary)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-hooks-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('installs pre-commit, prepare-commit-msg, pre-push and post-commit and creates .git/hooks if missing (happy/boundary)', () => {
    fs.mkdirSync(path.join(tmpDir, '.git'));

    const res = installGitHooks(tmpDir);
    expect(res.success).toBe(true);
    expect(res.installedHooks).toHaveLength(4);
    expect(fs.readFileSync(path.join(tmpDir, '.git', 'hooks', 'pre-commit'), 'utf-8')).toBe(PRE_COMMIT_SCRIPT);
    expect(fs.readFileSync(path.join(tmpDir, '.git', 'hooks', 'prepare-commit-msg'), 'utf-8')).toBe(
      PREPARE_COMMIT_MSG_SCRIPT
    );
    expect(fs.readFileSync(path.join(tmpDir, '.git', 'hooks', 'pre-push'), 'utf-8')).toBe(PRE_PUSH_SCRIPT);
    expect(fs.readFileSync(path.join(tmpDir, '.git', 'hooks', 'post-commit'), 'utf-8')).toBe(POST_COMMIT_SCRIPT);
  });

  it('fails gracefully when .git directory does not exist (sad)', () => {
    const res = installGitHooks(tmpDir);
    expect(res.success).toBe(false);
    expect(res.error).toContain('.git');
  });

  it('fails gracefully when writing hooks fails because hooks path is a file (sad/malformed)', () => {
    fs.mkdirSync(path.join(tmpDir, '.git'));
    fs.writeFileSync(path.join(tmpDir, '.git', 'hooks'), 'not-a-directory', 'utf-8');

    const res = installGitHooks(tmpDir);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Error al escribir hooks');
  });
});
