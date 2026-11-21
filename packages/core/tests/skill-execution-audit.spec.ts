import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { verifySkillExecutionEvidence } from '../src/verifiers/skill-execution-audit.js';

describe('Skill Execution Evidence Verifier (mcp-audit.jsonl)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-skill-audit-'));
    fs.mkdirSync(path.join(tmpDir, 'reports'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns NO_EVIDENCE when mcp-audit.jsonl does not exist', () => {
    const res = verifySkillExecutionEvidence(tmpDir, 'aisdlc-doctor-migrate');
    expect(res.status).toBe('NO_EVIDENCE');
    expect(res.executedTools).toEqual([]);
    expect(res.missingExpectedTools).toEqual(['doctor', 'migrate']);
  });

  it('returns PARTIAL when only some expected tools succeeded and VERIFIED when all succeeded', () => {
    const logPath = path.join(tmpDir, 'reports', 'mcp-audit.jsonl');
    fs.writeFileSync(
      logPath,
      [
        JSON.stringify({ tool: 'doctor', success: true }),
        JSON.stringify({ tool: 'migrate', success: false }),
        'corrupt-line',
      ].join('\n') + '\n',
      'utf-8'
    );

    const partial = verifySkillExecutionEvidence(tmpDir, 'aisdlc-doctor-migrate');
    expect(partial.status).toBe('PARTIAL');
    expect(partial.executedTools).toEqual(['doctor']);
    expect(partial.missingExpectedTools).toEqual(['migrate']);

    fs.appendFileSync(logPath, JSON.stringify({ tool: 'migrate', success: true }) + '\n', 'utf-8');
    const verified = verifySkillExecutionEvidence(tmpDir, 'aisdlc-doctor-migrate');
    expect(verified.status).toBe('VERIFIED');
    expect(verified.missingExpectedTools).toEqual([]);
  });
});
