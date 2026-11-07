import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { STARTER_GUARD_BRANCH_CJS } from '../src/init/coding-rules-templates.js';

function decide(cwd: string, guard: string, target: string): string {
  const input = JSON.stringify({ toolCall: { args: { Path: target } }, workspacePaths: [cwd] });
  const r = spawnSync('node', [guard], { input, encoding: 'utf-8' });
  return JSON.parse(r.stdout).decision;
}

describe('generated guard-branch.cjs template', () => {
  it('denies creation, traversal and nested rules files; allows normal files', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-'));
    const guard = path.join(cwd, 'guard.cjs');
    fs.writeFileSync(guard, STARTER_GUARD_BRANCH_CJS);
    try {
      expect(decide(cwd, guard, path.join(cwd, 'Directory.Build.props'))).toBe('deny');
      expect(decide(cwd, guard, path.join(cwd, '.github', 'CODEOWNERS'))).toBe('deny');
      expect(decide(cwd, guard, path.join(cwd, 'src', 'Api', 'Directory.Build.props'))).toBe('deny');
      expect(decide(cwd, guard, path.join(cwd, '.gemini', '..', 'tsconfig.strict.json'))).toBe('deny');
      expect(decide(cwd, guard, path.join(cwd, 'src', 'scratch', '..', '..', '.golangci.yml'))).toBe('deny');
      expect(decide(cwd, guard, path.join(cwd, 'src', 'app.ts'))).toBe('allow');
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});