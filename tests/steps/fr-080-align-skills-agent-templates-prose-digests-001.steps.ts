// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-080-align-skills-agent-templates-prose-digests-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "agent templates, skill references, \".agent/rules/ai-sdlc-testing.md\", IDE mirrors, and CLI verify/check remediation builders are updated"],
  ['given', "\"pdac-graph.ts\" detects, verifies, and synchronizes Markdown prose \"> **Upstream Citation**:\" SHA-256 digests"],
  ['when', "\"npx aisdlc sync\", CLI Gherkin remediation builders, and \"pdac-graph.ts\" citation verification/sync run"],
  ['then', "templates, skills, rules, IDE mirrors, and CLI messages document optional \"[--lang <ts|py|go|rs|cs>]\" (or \"[--lang <lang>]\") and \"--features-only\""],
  ['given', "prose citations in \"FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001.md\" and \"FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001.md\" have synchronized Unix LF SHA-256 digests"],
  ['given', "\"TSK-070-01\" and \"TSK-070-02\" are marked \"COMPLETED\" and \"CHG-070\" is integrated without committing global \"reports/*\" files"],
  ['given', "a Markdown specification containing \"<citation_state>\""],
  ['when', "\"extractCitations\" and \"updateCitationsInContent\" in \"pdac-graph.ts\" run on the specification"],
  ['then', "the outcome satisfies \"<expected_behavior>\""],
  ['given', "a Markdown specification with a prose \"> **Upstream Citation**:\" referencing a nonexistent upstream file or invalid digest"],
  ['when', "\"pdac-graph.ts\" runs traceability verification"],
  ['then', "verification reports a structured traceability violation without throwing an unhandled exception"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
