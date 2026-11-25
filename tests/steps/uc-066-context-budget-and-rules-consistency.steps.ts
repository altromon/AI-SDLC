// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-066-context-budget-and-rules-consistency.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "the canonical rules in \"AGENTS.md\", \".agent/rules/ai-sdlc.md\", and \"packages/core/src/init/agent-templates.ts\""],
  ['when', "the rules and skills files are inspected"],
  ['then', "the cross-IDE context budget rule mandates \"get_task_context\", \"query_code_graph\", and \"search_specs\" before bulk-reading \"process/*.md\""],
  ['given', "all agent links in \".agent/skills/*/SKILL.md\" resolve to existing files in \".agent/agents/\""],
  ['given', "the commandment count in headings matches the 6 listed commandments"],
  ['given', "\".agent/rules/ai-sdlc.md\" has no duplicate \"## 4.\" section numbering"],
  ['given', "\".agent/rules/ai-sdlc-code.md\" and \".agent/skills/aisdlc-increment/SKILL.md\" declare the same implementation order step count"],
  ['given', "the IDE ruleset template \"<template_name>\" in \"packages/core/src/init/agent-templates.ts\""],
  ['when', "the template content is evaluated"],
  ['then', "it includes the context budget directive referencing \"get_task_context\" and \"process/*.md\" on-demand usage"],
  ['given', "it does not advertise \"5 Unbreakable Commandments\" when 6 commandments are defined"],
  ['given', "a skill file referencing \"../agent-product-analyst/SKILL.md\" or a rules file with duplicate \"## 4.\" headings"],
  ['when', "consistency validation inspects the Markdown files"],
  ['then', "the broken relative target or duplicate section heading is flagged as a consistency violation"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
