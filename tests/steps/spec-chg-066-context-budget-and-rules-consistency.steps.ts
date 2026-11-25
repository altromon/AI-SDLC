// BDD STEP DEFINITIONS (tests/features/spec-chg-066-context-budget-and-rules-consistency.feature)
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BddStepRegistry } from '@aisdlc/core';

const ROOT_DIR = path.resolve(process.cwd());

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf-8');
}

function collectSkillFiles(): string[] {
  const skillsDir = path.join(ROOT_DIR, '.agent', 'skills');
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(skillsDir, entry.name, 'SKILL.md'))
    .filter((filePath) => fs.existsSync(filePath));
}

function auditMarkdownConsistency(skillContent: string, rulesContent: string): string[] {
  const violations: string[] = [];
  if (/\.\.\/agent-[a-z-]+\/SKILL\.md/.test(skillContent)) {
    violations.push('broken-relative-skill-link');
  }
  const headingNumbers = [...rulesContent.matchAll(/^##\s+(\d+)\./gm)].map((m) => Number(m[1]));
  if (headingNumbers.filter((n) => n === 4).length > 1) {
    violations.push('duplicate-section-4');
  }
  const headingMatch = rulesContent.match(/(\d+)\s+Unbreakable Commandments/i);
  const sectionMatch = rulesContent.match(
    /##\s+1\.\s+The\s+\d+\s+Unbreakable Commandments[\s\S]*?(?=\n##\s+2\.|\n---\n|$)/i
  );
  const itemCount = (sectionMatch?.[0] ?? '').match(/^\d+\.\s+\*\*/gm)?.length ?? 0;
  if (headingMatch && itemCount > 0 && Number(headingMatch[1]) !== itemCount) {
    violations.push('commandment-count-mismatch');
  }
  return violations;
}

export function registerSteps(registry: BddStepRegistry): void {
  let agentsMd = '';
  let antigravityRules = '';
  let agentTemplatesSource = '';
  let codeRules = '';
  let incrementSkill = '';
  let skillFiles: string[] = [];
  let selectedTemplate = '';
  let auditViolations: string[] = [];
  let syntheticSkill = '';
  let syntheticRules = '';

  registry.given(
    'the canonical rules and skills in "AGENTS.md", ".agent/rules/", ".agent/skills/", and "packages/core/src/init/agent-templates.ts"',
    () => {
      agentsMd = readRepoFile('AGENTS.md');
      antigravityRules = readRepoFile('.agent/rules/ai-sdlc.md');
      agentTemplatesSource = readRepoFile('packages/core/src/init/agent-templates.ts');
      codeRules = readRepoFile('.agent/rules/ai-sdlc-code.md');
      incrementSkill = readRepoFile('.agent/skills/aisdlc-increment/SKILL.md');
      skillFiles = collectSkillFiles();
    }
  );

  registry.when('the consistency checks inspect all rule, skill, and template files', () => {
    assert.ok(agentsMd.length > 0);
    assert.ok(antigravityRules.length > 0);
    assert.ok(agentTemplatesSource.length > 0);
  });

  registry.then(
    '"AGENTS.md", ".agent/rules/ai-sdlc.md", and "packages/core/src/init/agent-templates.ts" mandate "get_task_context", "query_code_graph", and "search_specs" first and treat "process/*.md" as on-demand reference only',
    () => {
      for (const [label, content] of [
        ['AGENTS.md', agentsMd],
        ['.agent/rules/ai-sdlc.md', antigravityRules],
        ['agent-templates.ts', agentTemplatesSource],
      ] as const) {
        assert.match(content, /get_task_context/, `${label} must mandate get_task_context`);
        assert.match(content, /query_code_graph/, `${label} must mandate query_code_graph`);
        assert.match(content, /search_specs/, `${label} must mandate search_specs`);
        assert.match(content, /process\/\*\.md/, `${label} must reference process/*.md`);
        assert.match(content, /on-demand|bajo demanda/i, `${label} must state on-demand usage`);
      }
    }
  );

  registry.then(
    'zero files in ".agent/skills/*/SKILL.md" contain "../agent-" links and every "../../agents/agent-*.md" target exists on disk',
    () => {
      assert.ok(skillFiles.length > 0, 'Expected skill files on disk');
      for (const skillFile of skillFiles) {
        const content = fs.readFileSync(skillFile, 'utf-8');
        assert.equal(
          /\.\.\/agent-/.test(content),
          false,
          `${path.relative(ROOT_DIR, skillFile)} still contains broken ../agent- link`
        );
        const links = [...content.matchAll(/\]\((\.\.\/\.\.\/agents\/agent-[a-z-]+\.md)\)/g)];
        for (const match of links) {
          const target = path.resolve(path.dirname(skillFile), match[1]);
          assert.equal(fs.existsSync(target), true, `Missing agent target ${match[1]}`);
        }
      }
    }
  );

  registry.then(
    'the commandments heading count matches the 6 listed commandments in "AGENTS.md", ".agent/rules/ai-sdlc.md", and synced IDE rulesets',
    () => {
      const filesToCheck = [
        'AGENTS.md',
        '.agent/rules/ai-sdlc.md',
        '.cursor/rules/ai-sdlc-core.mdc',
        'CLAUDE.md',
        '.github/copilot-instructions.md',
      ];
      for (const relPath of filesToCheck) {
        const content = readRepoFile(relPath);
        assert.doesNotMatch(
          content,
          /5 Unbreakable Commandments|5 Mandamientos Inquebrantables/i,
          `${relPath} must not say 5 Unbreakable Commandments`
        );
        assert.match(
          content,
          /6 Unbreakable Commandments|6 Mandamientos Inquebrantables/i,
          `${relPath} must say 6 Unbreakable Commandments`
        );
      }
    }
  );

  registry.then(
    '".agent/rules/ai-sdlc.md" contains unique sequential "## <N>." headings with no duplicate "## 4."',
    () => {
      const headingNumbers = [...antigravityRules.matchAll(/^##\s+(\d+)\./gm)].map((m) =>
        Number(m[1])
      );
      const expected = headingNumbers.map((_, idx) => idx + 1);
      assert.deepEqual(headingNumbers, expected);
    }
  );

  registry.then(
    '".agent/rules/ai-sdlc-code.md" and ".agent/skills/aisdlc-increment/SKILL.md" specify the exact same implementation order step count',
    () => {
      assert.match(codeRules, /5-Step Implementation Order/i);
      assert.match(incrementSkill, /5-Step Implementation Order/i);
    }
  );

  registry.given(
    /^the IDE ruleset template "([^"]+)" in "packages\/core\/src\/init\/agent-templates\.ts"$/,
    (templateExport: string) => {
      const src = readRepoFile('packages/core/src/init/agent-templates.ts');
      const marker = `export const ${templateExport} =`;
      const start = src.indexOf(marker);
      assert.ok(start >= 0, `Template export ${templateExport} not found`);
      const nextExport = src.indexOf('\nexport const ', start + marker.length);
      selectedTemplate = nextExport >= 0 ? src.slice(start, nextExport) : src.slice(start);
    }
  );

  registry.when('the template content is evaluated', () => {
    assert.ok(selectedTemplate.length > 0);
  });

  registry.then(
    'it includes the context budget directive referencing "get_task_context" and "process/*.md" on-demand usage',
    () => {
      assert.match(selectedTemplate, /get_task_context/);
      assert.match(selectedTemplate, /process\/\*\.md/);
      assert.match(selectedTemplate, /on-demand|bajo demanda/i);
    }
  );

  registry.then(
    'it contains no mismatch between the commandments heading count and the number of listed commandments',
    () => {
      assert.doesNotMatch(
        selectedTemplate,
        /5 Unbreakable Commandments|5 Mandamientos Inquebrantables/i
      );
      assert.match(
        selectedTemplate,
        /6 Unbreakable Commandments|6 Mandamientos Inquebrantables/i
      );
    }
  );

  registry.given(
    'a skill file with "../agent-developer/SKILL.md" or ".agent/rules/ai-sdlc.md" with two "## 4." headings or a "5 Unbreakable Commandments" heading with 6 items',
    () => {
      syntheticSkill = '[dev](../agent-developer/SKILL.md)';
      syntheticRules = [
        '## 1. The 5 Unbreakable Commandments of Agents',
        '1. **A**',
        '2. **B**',
        '3. **C**',
        '4. **D**',
        '5. **E**',
        '6. **F**',
        '## 4. First',
        '## 4. Duplicate',
      ].join('\n');
    }
  );

  registry.when('the consistency audit runs against the Markdown files', () => {
    auditViolations = auditMarkdownConsistency(syntheticSkill, syntheticRules);
  });

  registry.then(
    'each broken link, duplicate "## 4." heading, and commandment count mismatch is detected and reported as a failure',
    () => {
      assert.ok(auditViolations.includes('broken-relative-skill-link'));
      assert.ok(auditViolations.includes('duplicate-section-4'));
      assert.ok(auditViolations.includes('commandment-count-mismatch'));
    }
  );
}

if (process.env.VITEST) {
  const { describe, it } = await import('vitest');

  describe('BDD: SPEC-CHG-066 Context Budget Rule and Rules/Skills Consistency', () => {
    it('executes nominal scenario assertions (RED until TSK-066-02 & TSK-066-03)', () => {
      const registry = new BddStepRegistry();
      registerSteps(registry);
      const defs = registry.getDefinitions();
      const nominalSteps = defs.slice(0, 7);
      for (const step of nominalSteps) {
        step.handler();
      }
    });
  });
}
