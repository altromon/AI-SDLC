// BDD STEP DEFINITIONS (tests/features/fr-066-context-budget-and-rules-consistency-001.feature)
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BddStepRegistry } from '@aisdlc/core';
import { registerSteps as registerSpecSteps } from './spec-chg-066-context-budget-and-rules-consistency.js';

const ROOT_DIR = path.resolve(process.cwd());

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT_DIR, relPath), 'utf-8');
}

export function registerSteps(registry: BddStepRegistry): void {
  registerSpecSteps(registry);

  let selectedTemplate = '';
  let agentsMd = '';
  let antigravityRules = '';
  let agentTemplatesSource = '';

  registry.given(
    'the repository rules and skills files in "AGENTS.md", ".agent/rules/", ".agent/skills/", and "packages/core/src/init/agent-templates.ts"',
    () => {
      agentsMd = readRepoFile('AGENTS.md');
      antigravityRules = readRepoFile('.agent/rules/ai-sdlc.md');
      agentTemplatesSource = readRepoFile('packages/core/src/init/agent-templates.ts');
      assert.ok(agentsMd.length > 0);
      assert.ok(antigravityRules.length > 0);
      assert.ok(agentTemplatesSource.length > 0);
    }
  );

  registry.given(
    /^the template "([^"]+)" in "packages\/core\/src\/init\/agent-templates\.ts"$/,
    (templateExport: string) => {
      const src = readRepoFile('packages/core/src/init/agent-templates.ts');
      const marker = `export const ${templateExport} =`;
      const start = src.indexOf(marker);
      assert.ok(start >= 0, `Template export ${templateExport} not found`);
      const nextExport = src.indexOf('\nexport const ', start + marker.length);
      selectedTemplate = nextExport >= 0 ? src.slice(start, nextExport) : src.slice(start);
    }
  );

  registry.when('the template is rendered by "aisdlc sync"', () => {
    assert.ok(selectedTemplate.length > 0);
  });

  registry.then(
    'the output contains "get_task_context" and "process/*.md" on-demand guidance',
    () => {
      assert.match(selectedTemplate, /get_task_context/);
      assert.match(selectedTemplate, /process\/\*\.md/);
      assert.match(selectedTemplate, /on-demand|bajo demanda/i);
    }
  );

  registry.then(
    'the output contains no mismatch between the commandments heading count and the number of listed commandments',
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
}
