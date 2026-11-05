import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { installGitHooks } from '../src/git/hook-installer.js';

const AGENT_VARS = ['AI_MODEL', 'AI_AGENT_NAME', 'ANTIGRAVITY_AGENT', 'ANTIGRAVITY_AGENT_ID', 'ANTIGRAVITY_CONVERSATION_ID', 'CLAUDE_CODE', 'CURSOR_AGENT', 'WINDSURF_AGENT', 'AIDER_MODEL'];

function git(cwd: string, args: string[], env: NodeJS.ProcessEnv = {}): number {
  const clean = { ...process.env };
  for (const v of AGENT_VARS) delete clean[v];
  return spawnSync('git', args, { cwd, env: { ...clean, ...env } }).status ?? -1;
}

describe('pre-commit immutable coding rules guard', () => {
  it('blocks agents from adding a rules file but allows humans', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-'));
    try {
      git(cwd, ['init', '-q', '-b', 'feat/x']);
      git(cwd, ['config', 'user.email', 'a@b.c']);
      git(cwd, ['config', 'user.name', 't']);
      installGitHooks(cwd);
      fs.writeFileSync(path.join(cwd, 'Directory.Build.props'), '<Project/>');
      git(cwd, ['add', 'Directory.Build.props']);
      expect(git(cwd, ['commit', '-m', 'x'], { AI_MODEL: 'x' })).not.toBe(0);
      expect(git(cwd, ['commit', '-m', 'x'])).toBe(0);
    } finally {
      spawnSync('cmd', ['/c', 'rmdir', '/s', '/q', cwd]);
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});