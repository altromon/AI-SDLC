import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  detectActiveChangeForIntegration,
  integrateSddChange,
} from '../src/adapters/sdd/integration.js';
import { scaffoldSddChange } from '../src/adapters/sdd/scaffold.js';

describe('SDD Scaffold & Integration Remaining Composite Branches (Happy / Sad / Boundary)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-inc29-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('scaffoldSddChange: auto-creates missing draft requirements for FR-*, UC-*, SEC-REQ-*, PRIV-REQ-*, CMP-* citations', () => {
    const res = scaffoldSddChange({
      rootDir: tmpDir,
      name: 'Multi-citation feature',
      profile: 'minor',
      citations: ['FR-100', 'UC-100', 'SEC-REQ-100', 'PRIV-REQ-100', 'CMP-100'],
      scaffoldMissingSpecs: true,
    } as never);

    expect(res.success).toBe(true);
    expect(fs.existsSync(res.changeDir)).toBe(true);
  });

  it('detectActiveChangeForIntegration & integrateSddChange: covers unmatched active changes and proposal.md requirement extraction', () => {
    const dirA = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-201-alpha');
    const dirB = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-202-beta');
    fs.mkdirSync(dirA, { recursive: true });
    fs.mkdirSync(dirB, { recursive: true });

    // Unmatched when 2 active changes exist and branchName/prTitle don't match either
    const unmatched = detectActiveChangeForIntegration({
      rootDir: tmpDir,
      branchName: 'feat/unrelated-999',
      prTitle: 'unrelated',
    });
    expect(unmatched.detected).toBe(false);
    expect(unmatched.reasons.length).toBeGreaterThan(0);

    // Proposal.md-only handoff fallback with FR-*, UC-*, SEC-REQ-*
    fs.writeFileSync(
      path.join(dirA, 'proposal.md'),
      '# Proposal\nImplements `FR-201`, `UC-201`, `SEC-REQ-201`, `CMP-201`.\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(dirA, 'tasks.md'),
      '---\ntasks:\n  - id: TSK-201\n    title: Done\n    status: completed\n---\n- [x] TSK-201\n',
      'utf-8'
    );

    const intRes = integrateSddChange({
      rootDir: tmpDir,
      changeId: 'chg-201-alpha',
      autoArchive: false,
    });
    expect(intRes.success).toBe(true);
  });
});
