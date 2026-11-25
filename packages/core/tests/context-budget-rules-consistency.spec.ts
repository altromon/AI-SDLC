/**
 * Cites: FR-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY-001, SPEC-CHG-066-CONTEXT-BUDGET-AND-RULES-CONSISTENCY
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  STARTER_ANTIGRAVITY_RULES,
  STARTER_CURSOR_CORE_RULES,
  STARTER_CLAUDE_RULES,
  STARTER_COPILOT_RULES,
} from '../src/init/agent-templates.js';

const ROOT_DIR = path.resolve(__dirname, '../../..');

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf-8');
}

function assertContextBudgetRule(content: string, label: string): void {
  expect(
    content,
    `${label} must mandate get_task_context / aisdlc context pack`
  ).toMatch(/get_task_context|aisdlc context pack/);
  expect(content, `${label} must mandate query_code_graph`).toContain('query_code_graph');
  expect(content, `${label} must mandate search_specs`).toContain('search_specs');
  expect(
    content,
    `${label} must treat process/*.md as on-demand reference only`
  ).toMatch(/process\/\*\.md/);
  expect(
    content,
    `${label} must specify on-demand usage for process/*.md`
  ).toMatch(/on-demand|bajo demanda/i);
}

function assertSixCommandmentsReconciled(content: string, label: string): void {
  expect(
    content,
    `${label} must not advertise 5 Unbreakable Commandments when 6 are listed`
  ).not.toMatch(/5 Unbreakable Commandments|5 Mandamientos Inquebrantables/i);
  expect(
    content,
    `${label} must declare 6 Unbreakable Commandments`
  ).toMatch(/6 Unbreakable Commandments|6 Mandamientos Inquebrantables/i);

  const sectionMatch = content.match(
    /##\s+1\.\s+The 6 Unbreakable Commandments[\s\S]*?(?=\n##\s+2\.|\n---\n|$)/i
  );
  expect(sectionMatch, `${label} must contain the commandments section`).not.toBeNull();
  const items = (sectionMatch?.[0] ?? '').match(/^\d+\.\s+\*\*/gm) ?? [];
  expect(items.length, `${label} must list exactly 6 commandments`).toBe(6);
}

function collectSkillFiles(): string[] {
  const skillsDir = path.join(ROOT_DIR, '.agent/skills');
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(skillsDir, entry.name, 'SKILL.md'))
    .filter((filePath) => fs.existsSync(filePath));
}

function extractStepNumbers(content: string): number[] {
  const line = content
    .split(/\r?\n/)
    .find((l) => /Implementation Order|Orden de Implementaci/i.test(l));
  if (!line) return [];
  const startIdx = content.indexOf(line);
  const snippet = content.slice(startIdx, startIdx + 600);
  const matches = [...snippet.matchAll(/\((\d)\)/g)].map((m) => Number(m[1]));
  return [...new Set(matches)].sort((a, b) => a - b);
}

describe('Context Budget Rule & Rules/Skills Consistency (CHG-066)', () => {
  const starterTemplates: ReadonlyArray<[string, string]> = [
    ['STARTER_ANTIGRAVITY_RULES', STARTER_ANTIGRAVITY_RULES],
    ['STARTER_CURSOR_CORE_RULES', STARTER_CURSOR_CORE_RULES],
    ['STARTER_CLAUDE_RULES', STARTER_CLAUDE_RULES],
    ['STARTER_COPILOT_RULES', STARTER_COPILOT_RULES],
  ];

  const diskRulesets: ReadonlyArray<string> = [
    'AGENTS.md',
    '.agent/rules/ai-sdlc.md',
    '.cursor/rules/ai-sdlc-core.mdc',
    'CLAUDE.md',
    '.github/copilot-instructions.md',
  ];

  it.each(starterTemplates)(
    'starter template %s enforces the Context Budget Rule',
    (name, content) => {
      assertContextBudgetRule(content, name);
    }
  );

  it.each(diskRulesets)(
    'disk ruleset %s enforces the Context Budget Rule',
    (relPath) => {
      assertContextBudgetRule(readRepoFile(relPath), relPath);
    }
  );

  it('has zero broken ../agent-*/SKILL.md links and resolves all ../../agents/agent-*.md targets in .agent/skills/*/SKILL.md', () => {
    const skillFiles = collectSkillFiles();
    expect(skillFiles.length).toBeGreaterThan(0);

    for (const skillFile of skillFiles) {
      const content = fs.readFileSync(skillFile, 'utf-8');
      const relSkill = path.relative(ROOT_DIR, skillFile);

      expect(
        content,
        `${relSkill} must not contain broken ../agent-* links`
      ).not.toMatch(/\.\.\/agent-[a-z-]+\/SKILL\.md/);

      const agentLinks = [...content.matchAll(/\]\((\.\.\/\.\.\/agents\/agent-[a-z-]+\.md)\)/g)];
      for (const match of agentLinks) {
        const targetPath = path.resolve(path.dirname(skillFile), match[1]);
        expect(
          fs.existsSync(targetPath),
          `${relSkill} references missing agent file ${match[1]}`
        ).toBe(true);
      }
    }
  });

  it.each(starterTemplates)(
    'starter template %s reconciles heading count with 6 Unbreakable Commandments',
    (name, content) => {
      assertSixCommandmentsReconciled(content, name);
    }
  );

  it.each(diskRulesets)(
    'disk ruleset %s reconciles heading count with 6 Unbreakable Commandments',
    (relPath) => {
      assertSixCommandmentsReconciled(readRepoFile(relPath), relPath);
    }
  );

  it('.agent/rules/ai-sdlc.md has sequential ## <N>. headings with no duplicate ## 4.', () => {
    const content = readRepoFile('.agent/rules/ai-sdlc.md');
    const headingNumbers = [...content.matchAll(/^##\s+(\d+)\./gm)].map((m) => Number(m[1]));

    expect(headingNumbers.length).toBeGreaterThanOrEqual(5);
    const expected = headingNumbers.map((_, idx) => idx + 1);
    expect(headingNumbers).toEqual(expected);
  });

  it('.agent/rules/ai-sdlc-code.md and .agent/skills/aisdlc-increment/SKILL.md align on the 5-step implementation order', () => {
    const codeRules = readRepoFile('.agent/rules/ai-sdlc-code.md');
    const incrementSkill = readRepoFile('.agent/skills/aisdlc-increment/SKILL.md');

    expect(codeRules).toMatch(/5-Step Implementation Order/i);
    expect(incrementSkill).toMatch(/5-Step Implementation Order/i);
    expect(incrementSkill).not.toMatch(/4-Step Implementation Order/i);

    expect(extractStepNumbers(codeRules)).toEqual([1, 2, 3, 4, 5]);
    expect(extractStepNumbers(incrementSkill)).toEqual([1, 2, 3, 4, 5]);
  });
});
