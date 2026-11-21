import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runVerifySkills } from '../src/commands/verify.js';

describe('CLI Command: aisdlc verify skills', () => {
  let tmpDir: string;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-verify-skills-'));
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('emits structured JSON for valid skills and optional execution evidence', () => {
    const skillDir = path.join(tmpDir, '.agent', 'skills', 'aisdlc-inspector');
    fs.mkdirSync(path.join(skillDir, 'references'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'reports'), { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'references', 'traceability-graph-legend.md'), '# Legend\n', 'utf-8');
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: aisdlc-inspector\ndescription: Interactive inspector for traceability graph.\n---\nSee [legend](./references/traceability-graph-legend.md).\n',
      'utf-8'
    );
    fs.writeFileSync(path.join(tmpDir, 'reports', 'mcp-audit.jsonl'), JSON.stringify({ tool: 'inspect_element', success: true }) + '\n', 'utf-8');

    const passed = runVerifySkills({ root: tmpDir, skill: 'aisdlc-inspector', json: true });
    expect(passed).toBe(true);
    const payload = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(payload.gate).toBe('skills');
    expect(payload.integrity.checkedSkills).toBe(1);
    expect(payload.evidence.status).toBe('VERIFIED');
  });

  it('returns false when a skill has broken reference links', () => {
    const skillDir = path.join(tmpDir, '.agent', 'skills', 'broken-skill');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, 'SKILL.md'),
      '---\nname: broken-skill\ndescription: Broken skill description.\n---\nSee [missing](./references/missing.md).\n',
      'utf-8'
    );

    const passed = runVerifySkills({ root: tmpDir, silent: true });
    expect(passed).toBe(false);
  });
});
