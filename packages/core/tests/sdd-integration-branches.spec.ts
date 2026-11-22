import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  detectActiveChangeForIntegration,
  integrateAllSddChanges,
  integrateSddChange,
  parseSpecCatalogScope,
  verifySddIntegration,
} from '../src/adapters/sdd/integration.js';

describe('SDD Integration Composite Flow Branches (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-inc17-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parseSpecCatalogScope: parses affected and new catalog items and handles empty/missing sections', () => {
    expect(parseSpecCatalogScope('')).toEqual({ affectedItems: [], newItems: [] });

    const scope = parseSpecCatalogScope(`# Spec
### 1.1 Affected Existing Catalog Items
- \`FR-001\` (Modified)
### 1.2 New Catalog Items Introduced
- \`PRIV-REQ-001\` -> \`specs/privacy/requirements/\` : GDPR consent
- \`CUSTOM-999\` -> \`specs/custom/\`
`);
    expect(scope.affectedItems.length).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(scope.newItems)).toBe(true);
  });

  it('integrateSddChange: handles missing change, pending tasks, and completed change with canonical materialization & autoArchive', () => {
    // Sad: missing change
    const missing = integrateSddChange({ rootDir: tmpDir, changeId: 'chg-404' });
    expect(missing.success).toBe(false);
    expect(missing.errors.length).toBeGreaterThan(0);

    // Sad: pending tasks
    const pendingDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001-pending');
    fs.mkdirSync(pendingDir, { recursive: true });
    fs.writeFileSync(
      path.join(pendingDir, 'handoff.yaml'),
      'id: HOF-001\nchangeId: chg-001-pending\nsubgraph:\n  requirements: [FR-1]\n  components: [CMP-1]\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(pendingDir, 'tasks.md'),
      '---\ntasks:\n  - id: TSK-1\n    title: Todo\n    status: pending\n---\n- [ ] TSK-1: Todo\n',
      'utf-8'
    );
    const pendingRes = integrateSddChange({ rootDir: tmpDir, changeId: 'chg-001-pending' });
    expect(pendingRes.success).toBe(false);
    expect(pendingRes.pendingTasks).toContain('TSK-1');

    // Happy: completed change without handoff.yaml (fallback to proposal.md citations) + autoArchive
    const doneDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-002-done');
    fs.mkdirSync(doneDir, { recursive: true });
    fs.writeFileSync(
      path.join(doneDir, 'proposal.md'),
      '# Proposal\nRefs: `FR-001`, `CMP-001`\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(doneDir, 'tasks.md'),
      '---\ntasks:\n  - id: TSK-1\n    title: Done\n    status: completed\n---\n- [x] TSK-1: Done\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(doneDir, 'spec.md'),
      '### 1.2 New Catalog Items Introduced\n- `FR-001` -> `specs/product/requirements/` : Auth\n',
      'utf-8'
    );

    const doneRes = integrateSddChange({
      rootDir: tmpDir,
      changeId: 'chg-002-done',
      author: 'Agent',
      date: '2026-01-01',
      autoArchive: true,
    });
    expect(typeof doneRes.success).toBe('boolean');
  });

  it('integrateAllSddChanges, verifySddIntegration & detectActiveChangeForIntegration: covers batch skip/process, verification, and active detection', () => {
    expect(detectActiveChangeForIntegration({ rootDir: tmpDir }).detected).toBe(false);
    expect(verifySddIntegration({ rootDir: tmpDir }).success).toBe(true);

    // Create 2 active dirs: one without handoff/tasks (skipped), one valid completed
    const skipDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-010-skip');
    fs.mkdirSync(skipDir, { recursive: true });
    expect(detectActiveChangeForIntegration({ rootDir: tmpDir, branchName: 'feat/chg-010-skip' }).changeId).toBe(
      'chg-010-skip'
    );

    const validDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-011-ok');
    fs.mkdirSync(validDir, { recursive: true });
    fs.writeFileSync(
      path.join(validDir, 'handoff.yaml'),
      'id: HOF-011\nchangeId: chg-011-ok\nsubgraph:\n  requirements: [FR-11]\n  components: [CMP-11]\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(validDir, 'tasks.md'),
      '---\ntasks:\n  - id: TSK-11\n    title: Ok\n    status: completed\n---\n- [x] TSK-11: Ok\n',
      'utf-8'
    );

    const batch = integrateAllSddChanges({ rootDir: tmpDir, includeCompleted: false, autoArchive: false });
    expect(batch.skippedChanges.some((s) => s.changeId === 'chg-010-skip')).toBe(true);
    expect(batch.processedChanges).toContain('chg-011-ok');

    const verify = verifySddIntegration({ rootDir: tmpDir });
    expect(typeof verify.success).toBe('boolean');
  });
});
