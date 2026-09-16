import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  detectActiveChangeForIntegration,
  integrateSddChange,
} from '../src/adapters/sdd/integration.js';

describe('CI/CD Automated SDD Integration & Change Detection Engine', () => {
  let tempDir: string;
  let activeParent: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-ci-detect-test-'));
    activeParent = path.join(tempDir, 'specs', 'changes', 'active');
    fs.mkdirSync(activeParent, { recursive: true });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  function createMockChange(
    changeId: string,
    tasks: Array<{ id: string; status: string; title: string }> = []
  ): string {
    const changeDir = path.join(activeParent, changeId);
    fs.mkdirSync(changeDir, { recursive: true });

    const tasksContent = `---
id: "TASKS-${changeId.toUpperCase()}"
change-id: "${changeId}"
version: "1.0.0"
tasks:
${tasks
  .map(
    (t) => `  - id: "${t.id}"
    title: "${t.title}"
    status: "${t.status}"`
  )
  .join('\n')}
---

# Tasks
`;
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), tasksContent, 'utf-8');

    const proposalContent = `---
id: "PROP-${changeId.toUpperCase()}"
type: "change-proposal"
status: "draft"
citations:
  - id: "FR-001"
---
# Proposal
`;
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), proposalContent, 'utf-8');

    return changeDir;
  }

  it('should return detected: false when specs/changes/active has no change directories', () => {
    const result = detectActiveChangeForIntegration({ rootDir: tempDir });
    expect(result.detected).toBe(false);
    expect(result.reasons[0]).toContain('No se encontraron carpetas de cambios activos');
  });

  it('should detect change by headRef (feature branch)', () => {
    createMockChange('chg-001-telemetry-ingestion', [
      { id: 'TSK-001', status: 'COMPLETED', title: 'DTOs' },
    ]);

    const result = detectActiveChangeForIntegration({
      rootDir: tempDir,
      headRef: 'feat/CHG-001-telemetry-ingestion',
    });

    expect(result.detected).toBe(true);
    expect(result.changeId).toBe('chg-001-telemetry-ingestion');
    expect(result.source).toBe('branch');
    expect(result.allTasksCompleted).toBe(true);
  });

  it('should detect change by headRef (task branch)', () => {
    createMockChange('chg-002-collision-detection', [
      { id: 'TSK-001', status: 'COMPLETED', title: 'Algo' },
    ]);

    const result = detectActiveChangeForIntegration({
      rootDir: tempDir,
      headRef: 'task/CHG-002/TSK-001-collision',
    });

    expect(result.detected).toBe(true);
    expect(result.changeId).toBe('chg-002-collision-detection');
    expect(result.source).toBe('branch');
  });

  it('should detect change by PR title or body', () => {
    createMockChange('chg-003-data-export', [
      { id: 'TSK-001', status: 'COMPLETED', title: 'Export' },
    ]);

    const resultTitle = detectActiveChangeForIntegration({
      rootDir: tempDir,
      prTitle: 'feat(export): implements chg-003-data-export',
    });
    expect(resultTitle.detected).toBe(true);
    expect(resultTitle.changeId).toBe('chg-003-data-export');
    expect(resultTitle.source).toBe('title');

    const resultBody = detectActiveChangeForIntegration({
      rootDir: tempDir,
      prBody: 'Closes #18. Delivery folder: specs/changes/active/chg-003-data-export',
    });
    expect(resultBody.detected).toBe(true);
    expect(resultBody.changeId).toBe('chg-003-data-export');
    expect(resultBody.source).toBe('body');
  });

  it('should detect change by changedFiles list', () => {
    createMockChange('chg-004-secure-comm', [
      { id: 'TSK-001', status: 'COMPLETED', title: 'Crypto' },
    ]);

    const result = detectActiveChangeForIntegration({
      rootDir: tempDir,
      changedFiles: [
        'packages/core/src/index.ts',
        'specs/changes/active/chg-004-secure-comm/tasks.md',
      ],
    });

    expect(result.detected).toBe(true);
    expect(result.changeId).toBe('chg-004-secure-comm');
    expect(result.source).toBe('files');
  });

  it('should fallback to single active directory when only one exists', () => {
    createMockChange('chg-005-single-candidate', [
      { id: 'TSK-001', status: 'COMPLETED', title: 'Single' },
    ]);

    const result = detectActiveChangeForIntegration({
      rootDir: tempDir,
    });

    expect(result.detected).toBe(true);
    expect(result.changeId).toBe('chg-005-single-candidate');
    expect(result.source).toBe('single_active_completed');
  });

  it('should report allTasksCompleted: false when any task is not completed', () => {
    createMockChange('chg-006-pending-tasks', [
      { id: 'TSK-001', status: 'COMPLETED', title: 'Done' },
      { id: 'TSK-002', status: 'PENDING', title: 'Still working' },
    ]);

    const result = detectActiveChangeForIntegration({
      rootDir: tempDir,
      headRef: 'feat/CHG-006-pending-tasks',
    });

    expect(result.detected).toBe(true);
    expect(result.allTasksCompleted).toBe(false);
    expect(result.completedTasksCount).toBe(1);
    expect(result.totalTasksCount).toBe(2);
  });
});
