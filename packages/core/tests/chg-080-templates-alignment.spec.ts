/**
 * Core Unit Tests for Agent Templates, Skill References & Testing Rules Alignment (RED Phase)
 * Cites: FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001, TSK-080-02
 * Tag: @FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001 @CHG-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  LIFECYCLE_SKILL_TEMPLATES,
  SKILL_REFERENCES,
  SPECIALIZED_AGENT_TEMPLATES,
  STARTER_ANTIGRAVITY_TESTING_RULES,
  STARTER_CURSOR_TESTING_RULES,
  STARTER_TESTS_AGENTS_MD,
} from '../src/index.js';

const ROOT_DIR = path.resolve(__dirname, '../../..');

describe('@FR-080-ALIGN-SKILLS-AGENT-TEMPLATES-PROSE-DIGESTS-001: Templates, skills & rules alignment', () => {
  it('agent-qa-engineer template documents optional [--lang <ts|py|go|rs|cs>] and --features-only', () => {
    const qaAgent = SPECIALIZED_AGENT_TEMPLATES.find((a) => a.id === 'agent-qa-engineer');
    expect(qaAgent).toBeDefined();
    const body = qaAgent!.body;
    expect(body).toMatch(/\[--lang\s*<(ts\|py\|go\|rs\|cs|lang)>\]/);
    expect(body).toContain('--features-only');
  });

  it('aisdlc-increment and aisdlc-bdd-gherkin skill templates document optional [--lang ...] and --features-only', () => {
    for (const skillId of ['aisdlc-increment', 'aisdlc-bdd-gherkin']) {
      const skill = LIFECYCLE_SKILL_TEMPLATES.find((s) => s.id === skillId);
      expect(skill, `Missing skill template ${skillId}`).toBeDefined();
      expect(skill!.body).toMatch(/\[--lang\s*<(ts\|py\|go\|rs\|cs|lang)>\]/);
      expect(skill!.body).toContain('--features-only');
    }
  });

  it('starter testing rules (Antigravity, Cursor, tests/AGENTS.md) document optional [--lang ...] and --features-only', () => {
    for (const [label, content] of [
      ['STARTER_ANTIGRAVITY_TESTING_RULES', STARTER_ANTIGRAVITY_TESTING_RULES],
      ['STARTER_CURSOR_TESTING_RULES', STARTER_CURSOR_TESTING_RULES],
      ['STARTER_TESTS_AGENTS_MD', STARTER_TESTS_AGENTS_MD],
    ] as const) {
      expect(content, `${label} must document optional [--lang ...]`).toMatch(/\[--lang\s*<(ts\|py\|go\|rs\|cs|lang)>\]/);
      expect(content, `${label} must document --features-only`).toContain('--features-only');
    }
  });

  it('skill-references.ts gherkin-polyglot-matrix.md documents optional [--lang <ts|py|go|rs|cs>]', () => {
    const refs = SKILL_REFERENCES['aisdlc-bdd-gherkin'] ?? [];
    const matrix = refs.find((r) => r.filename === 'gherkin-polyglot-matrix.md');
    expect(matrix).toBeDefined();
    expect(matrix!.content).toMatch(/\[--lang\s*<(ts\|py\|go\|rs\|cs|lang)>\]/);
  });

  it('.agent/rules/ai-sdlc-testing.md documents optional [--lang <ts|py|go|rs|cs>] and --features-only', () => {
    const testingRulePath = path.join(ROOT_DIR, '.agent', 'rules', 'ai-sdlc-testing.md');
    const content = fs.readFileSync(testingRulePath, 'utf-8');
    expect(content).toMatch(/\[--lang\s*<(ts\|py\|go\|rs\|cs|lang)>\]/);
    expect(content).toContain('--features-only');
  });
});
