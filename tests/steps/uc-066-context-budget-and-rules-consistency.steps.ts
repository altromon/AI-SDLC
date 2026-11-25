// BDD STEP DEFINITIONS (tests/features/uc-066-context-budget-and-rules-consistency.feature)
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

export function registerSteps(registry: BddStepRegistry): void {
  let agentsMd = '';
  let antigravityRules = '';
  let agentTemplatesSource = '';
  let codeRules = '';
  let incrementSkill = '';
  let selectedTemplate = '';
  let invalidDetected = false;
  let syntheticSkill = '';
  let syntheticRules = '';

  registry.given(
    'the canonical rules in "AGENTS.md", ".agent/rules/ai-sdlc.md", and "packages/core/src/init/agent-templates.ts"',
    () => {
      agentsMd = readRepoFile('AGENTS.md');
      antigravityRules = readRepoFile('.agent/rules/ai-sdlc.md');
      agentTemplatesSource = readRepoFile('packages/core/src/init/agent-templates.ts');
      codeRules = readRepoFile('.agent/rules/ai-sdlc-code.md');
      incrementSkill = readRepoFile('.agent/skills/aisdlc-increment/SKILL.md');
    }
  );

  registry.when('the rules and skills files are inspected', () => {
    assert.ok(agentsMd.length > 0);
    assert.ok(antigravityRules.length > 0);
    assert.ok(agentTemplatesSource.length > 0);
  });

  registry.then(
    'the cross-IDE context budget rule mandates "get_task_context", "query_code_graph", and "search_specs" before bulk-reading "process/*.md"',
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
    'all agent links in ".agent/skills/*/SKILL.md" resolve to existing files in ".agent/agents/"',
    () => {
      const skillFiles = collectSkillFiles();
      assert.ok(skillFiles.length > 0);
      for (const skillFile of skillFiles) {
        const content = fs.readFileSync(skillFile, 'utf-8');
        assert.equal(/\.\.\/agent-/.test(content), false, `${skillFile} contains ../agent- link`);
        const links = [...content.matchAll(/\]\((\.\.\/\.\.\/agents\/agent-[a-z-]+\.md)\)/g)];
        for (const match of links) {
          const target = path.resolve(path.dirname(skillFile), match[1]);
          assert.equal(fs.existsSync(target), true, `Missing target ${match[1]}`);
        }
      }
    }
  );

  registry.then('the commandment count in headings matches the 6 listed commandments', () => {
    for (const relPath of ['AGENTS.md', '.agent/rules/ai-sdlc.md']) {
      const content = readRepoFile(relPath);
      assert.doesNotMatch(content, /5 Unbreakable Commandments|5 Mandamientos Inquebrantables/i);
      assert.match(content, /6 Unbreakable Commandments|6 Mandamientos Inquebrantables/i);
    }
  });

  registry.then('".agent/rules/ai-sdlc.md" has no duplicate "## 4." section numbering', () => {
    const headingNumbers = [...antigravityRules.matchAll(/^##\s+(\d+)\./gm)].map((m) =>
      Number(m[1])
    );
    const expected = headingNumbers.map((_, idx) => idx + 1);
    assert.deepEqual(headingNumbers, expected);
  });

  registry.then(
    '".agent/rules/ai-sdlc-code.md" and ".agent/skills/aisdlc-increment/SKILL.md" declare the same implementation order step count',
    () => {
      assert.match(codeRules, /5-Step Implementation Order/i);
      assert.match(incrementSkill, /5-Step Implementation Order/i);
    }
  );

  registry.given(
    /^the IDE ruleset template "([^"]+)" in "packages\/core\/src\/init\/agent-templates\.ts"$/,
    (templateName: string) => {
      const src = readRepoFile('packages/core/src/init/agent-templates.ts');
      const marker = `export const ${templateName} =`;
      const start = src.indexOf(marker);
      assert.ok(start >= 0, `Template export ${templateName} not found`);
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
    'it does not advertise "5 Unbreakable Commandments" when 6 commandments are defined',
    () => {
      assert.doesNotMatch(
        selectedTemplate,
        /5 Unbreakable Commandments|5 Mandamientos Inquebrantables/i
      );
      assert.match(selectedTemplate, /6 Unbreakable Commandments|6 Mandamientos Inquebrantables/i);
    }
  );

  registry.given(
    'a skill file referencing "../agent-product-analyst/SKILL.md" or a rules file with duplicate "## 4." headings',
    () => {
      syntheticSkill = '[analyst](../agent-product-analyst/SKILL.md)';
      syntheticRules = '## 4. A\n## 4. B\n';
    }
  );

  registry.when('consistency validation inspects the Markdown files', () => {
    const hasBrokenLink = /\.\.\/agent-[a-z-]+\/SKILL\.md/.test(syntheticSkill);
    const hasDupSection4 = (syntheticRules.match(/^##\s+4\./gm) ?? []).length > 1;
    invalidDetected = hasBrokenLink && hasDupSection4;
  });

  registry.then(
    'the broken relative target or duplicate section heading is flagged as a consistency violation',
    () => {
      assert.equal(invalidDetected, true);
    }
  );
}
