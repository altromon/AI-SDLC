// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-066-context-budget-and-rules-consistency.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "the canonical rules and skills in \"AGENTS.md\", \".agent/rules/\", \".agent/skills/\", and \"packages/core/src/init/agent-templates.ts\""],
  ['when', "the consistency checks inspect all rule, skill, and template files"],
  ['then', "\"AGENTS.md\", \".agent/rules/ai-sdlc.md\", and \"packages/core/src/init/agent-templates.ts\" mandate \"get_task_context\", \"query_code_graph\", and \"search_specs\" first and treat \"process/*.md\" as on-demand reference only"],
  ['given', "zero files in \".agent/skills/*/SKILL.md\" contain \"../agent-\" links and every \"../../agents/agent-*.md\" target exists on disk"],
  ['given', "the commandments heading count matches the 6 listed commandments in \"AGENTS.md\", \".agent/rules/ai-sdlc.md\", and synced IDE rulesets"],
  ['given', "\".agent/rules/ai-sdlc.md\" contains unique sequential \"## <N>.\" headings with no duplicate \"## 4.\""],
  ['given', "\".agent/rules/ai-sdlc-code.md\" and \".agent/skills/aisdlc-increment/SKILL.md\" specify the exact same implementation order step count"],
  ['given', "the IDE ruleset template \"<template_export>\" in \"packages/core/src/init/agent-templates.ts\""],
  ['when', "the template content is evaluated"],
  ['then', "it includes the context budget directive referencing \"get_task_context\" and \"process/*.md\" on-demand usage"],
  ['given', "it contains no mismatch between the commandments heading count and the number of listed commandments"],
  ['given', "a skill file with \"../agent-developer/SKILL.md\" or \".agent/rules/ai-sdlc.md\" with two \"## 4.\" headings or a \"5 Unbreakable Commandments\" heading with 6 items"],
  ['when', "the consistency audit runs against the Markdown files"],
  ['then', "each broken link, duplicate \"## 4.\" heading, and commandment count mismatch is detected and reported as a failure"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
