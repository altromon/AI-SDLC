// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-081-unify-yaml-frontmatter-citations-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "\"schemas/\" defines \"citations\" as a valid YAML frontmatter property"],
  ['given', "\"templates/\" emits YAML frontmatter \"citations:\" instead of prose \"> **Upstream Citation**:\" blockquotes"],
  ['given', "existing \"specs/product/FR-*\" and \"specs/architecture/CMP-*\" files are migrated to YAML frontmatter \"citations:\""],
  ['when', "\"pdac-graph.ts\" (\"extractCitations\" and \"updateCitationsInContent\") and \"aisdlc verify schemas\" run"],
  ['then', "\"pdac-graph.ts\" parses and synchronizes exclusively YAML frontmatter \"citations:\" blocks"],
  ['given', "all migrated specs pass schema and traceability verification without prose \"> **Upstream Citation**:\" blockquotes"],
  ['given', "a Markdown specification with \"<citation_state>\""],
  ['when', "\"extractCitations\" and \"updateCitationsInContent\" in \"pdac-graph.ts\" process the file"],
  ['then', "the outcome satisfies \"<expected_behavior>\""],
  ['given', "a Markdown specification with a YAML \"citations:\" entry pointing to a nonexistent upstream file or invalid digest format"],
  ['when', "\"pdac-graph.ts\" verifies PDaC traceability"],
  ['then', "verification reports a structured traceability error without crashing"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
