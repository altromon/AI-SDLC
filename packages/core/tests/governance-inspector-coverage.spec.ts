import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  formatInspectResultMarkdown,
  initProject,
  inspectElement,
  parseTasksDoc,
  verifyTasksGovernance,
} from '../src/index.js';

describe('Governance & Inspector Branch Coverage Suite', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-gov-insp-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('parses malformed and valid tasks.md frontmatter via parseTasksDoc', () => {
    expect(parseTasksDoc('no frontmatter').frontmatter.tasks).toEqual([]);
    expect(parseTasksDoc('---\n: : [\n---\nbody').frontmatter.tasks).toEqual([]);
    expect(parseTasksDoc('---\n- item1\n---\nbody').frontmatter.tasks).toEqual([]);

    const valid = parseTasksDoc(
      '---\ntasks:\n  - id: 123\n    title: Numeric ID\n    implements-components: [CMP-1, ""]\n---\nBody text'
    );
    expect(valid.frontmatter.tasks).toHaveLength(1);
    expect(valid.frontmatter.tasks[0].id).toBe('123');
    expect(valid.frontmatter.tasks[0].implementsComponents).toEqual(['CMP-1']);
  });

  it('verifies all autonomy modes, safety violations, and design scope coverage', () => {
    const chgDir = path.join(tempDir, 'specs', 'changes', 'active', 'chg-gov');
    fs.mkdirSync(chgDir, { recursive: true });

    fs.writeFileSync(
      path.join(chgDir, 'design.md'),
      '---\narchitecture-component: CMP-MAIN\narchitecture-components: [CMP-SEC, CMP-UNASSIGNED]\n---\n# Design\n',
      'utf-8'
    );

    fs.writeFileSync(
      path.join(chgDir, 'tasks.md'),
      [
        '---',
        'tasks:',
        '  - id: TSK-001',
        '    title: High risk agent violation',
        '    risk-level: CRITICAL',
        '    autonomy-mode: HIGH_RISK_MANUAL',
        '    assigned-to: agent-developer',
        '    verification:',
        '      method: test',
        '      command-or-criteria: pnpm test',
        '    implements-components: [CMP-MAIN]',
        '  - id: TSK-002',
        '    title: High risk paired ok',
        '    risk-level: HIGH',
        '    autonomy-mode: HIGH_RISK_MANUAL',
        '    assigned-to: pair-human-agent',
        '    verification:',
        '      method: test',
        '      command-or-criteria: pnpm test',
        '  - id: TSK-003',
        '    title: Ambiguous in progress',
        '    risk-level: LOW',
        '    autonomy-mode: AMBIGUOUS',
        '    status: IN_PROGRESS',
        '    verification:',
        '      command-or-criteria: pnpm test',
        '  - id: TSK-004',
        '    title: Missing verification',
        '    autonomy-mode: HUMAN_REVIEW_PLAN',
        '    verification:',
        '      command-or-criteria: no',
        '  - id: TSK-005',
        '    title: Invalid mode',
        '    autonomy-mode: BOGUS_MODE',
        '    verification:',
        '      command-or-criteria: pnpm test',
        '  - id: TSK-006',
        '    title: Autonomous OK',
        '    risk-level: MEDIUM',
        '    autonomy-mode: AUTONOMOUS',
        '    verification:',
        '      command-or-criteria: pnpm test',
        '---',
        '# Tasks',
      ].join('\n'),
      'utf-8'
    );

    const res = verifyTasksGovernance({ rootDir: tempDir, enforceDesignCoverage: true });
    expect(res.success).toBe(false);
    expect(res.totalTasks).toBe(6);
    expect(res.violations.some((v) => v.includes('HIGH RISK task assigned to autonomous agent'))).toBe(true);
    expect(res.violations.some((v) => v.includes('AMBIGUOUS task in progress'))).toBe(true);
    expect(res.violations.some((v) => v.includes('Missing concrete verification criterion'))).toBe(true);
    expect(res.violations.some((v) => v.includes('Invalid autonomy mode'))).toBe(true);
    expect(res.unassignedDesignScope).toContain('CMP-UNASSIGNED');
    expect(res.reportMarkdown).toContain('NON-COMPLIANT');
  });

  it('inspects direct files, graph nodes, tasks, partial matches, and not-found queries', async () => {
    initProject({ targetDir: tempDir, agents: 'none', silent: true });

    fs.mkdirSync(path.join(tempDir, 'specs', 'product'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'specs', 'product', '01_req.md'),
      '---\nid: FR-501\ntitle: Auth Login\n---\n# FR-501: Auth Login\n\nImplements UC-501 and CMP-501.\n',
      'utf-8'
    );

    fs.mkdirSync(path.join(tempDir, 'specs', 'changes', 'active', 'chg-501'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'specs', 'changes', 'active', 'chg-501', 'tasks.md'),
      [
        '---',
        'change-id: CHG-501',
        'tasks:',
        '  - id: TSK-501',
        '    title: Implement Auth',
        '    autonomy-mode: AUTONOMOUS',
        '    satisfies-requirements: [FR-501]',
        '    implements-components: [CMP-501]',
        '    verification:',
        '      command-or-criteria: pnpm test',
        '---',
        '# Tasks',
      ].join('\n'),
      'utf-8'
    );

    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'src', 'auth.ts'),
      '// @FR-501 @TSK-501\nexport function login(): boolean { return true; }\n',
      'utf-8'
    );

    // 1. Direct markdown file
    const mdRes = await inspectElement('specs/product/01_req.md', { rootDir: tempDir });
    expect(mdRes.found).toBe(true);
    expect(formatInspectResultMarkdown(mdRes)).toContain('FR-501');

    // 2. Direct code file
    const codeRes = await inspectElement('src/auth.ts', { rootDir: tempDir });
    expect(codeRes.found).toBe(true);
    expect(formatInspectResultMarkdown(codeRes)).toContain('auth.ts');

    // 3. Graph node ID
    const nodeRes = await inspectElement('FR-501', { rootDir: tempDir });
    expect(nodeRes.found).toBe(true);
    expect(formatInspectResultMarkdown(nodeRes)).toContain('FR-501');

    // 4. Task ID
    const taskRes = await inspectElement('TSK-501', { rootDir: tempDir });
    expect(taskRes.found).toBe(true);
    expect(formatInspectResultMarkdown(taskRes)).toContain('TSK-501');

    // 5. Partial match / not found
    const partialRes = await inspectElement('FR-50', { rootDir: tempDir });
    expect(formatInspectResultMarkdown(partialRes)).toBeTypeOf('string');

    const missingRes = await inspectElement('DOES-NOT-EXIST-999', { rootDir: tempDir });
    expect(missingRes.found).toBe(false);
    expect(formatInspectResultMarkdown(missingRes)).toContain('Elemento no encontrado');
  });
});
