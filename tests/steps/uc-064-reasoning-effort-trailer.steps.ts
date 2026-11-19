// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-064-reasoning-effort-trailer.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "an agent environment with \"AI_MODEL=claude-3-7-sonnet\" and \"AI_REASONING_EFFORT=high\""],
  ['when', "\"detectAuthorIdentity\" and \"formatCommitTrailers\" process the commit metadata"],
  ['then', "the formatted trailers include \"AI-Reasoning-Effort: high\""],
  ['given', "\"dashboard-html\" renders the model telemetry breakdown with reasoning effort \"high\""],
  ['given', "a commit message containing trailer \"AI-Reasoning-Effort: <raw_effort>\""],
  ['when', "\"parseCommitTrailers\" parses the commit message"],
  ['then', "\"trailers.reasoningEffort\" equals \"<normalized_effort>\""],
  ['given', "a commit message with trailer \"AI-Reasoning-Effort: ultra\" and a commit without the trailer"],
  ['when', "\"parseCommitTrailers\" and \"dashboard-html\" process both commits"],
  ['then', "\"trailers.reasoningEffort\" is undefined for both commits"],
  ['given', "the dashboard renders them gracefully as \"unspecified\" or \"—\" without failing"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
