// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-064-reasoning-effort-trailer.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "an agent commit with trailers \"AI-Model: claude-3-7-sonnet\" and \"AI-Reasoning-Effort: high\""],
  ['when', "\"parseCommitTrailers\" and \"formatCommitTrailers\" execute"],
  ['then', "\"trailers.reasoningEffort\" is \"high\""],
  ['given', "the formatted trailer block contains \"AI-Reasoning-Effort: high\""],
  ['when', "the dashboard HTML is generated from the aggregated PR KPIs"],
  ['then', "the model telemetry table displays the reasoning effort \"high\" for \"claude-3-7-sonnet\""],
  ['given', "\"AI_REASONING_EFFORT\" is set to \"<input_value>\" in an agent environment"],
  ['when', "\"detectAuthorIdentity\" resolves the author identity"],
  ['then', "\"identity.reasoningEffort\" is \"<expected_level>\""],
  ['given', "\"parseCommitTrailers\" normalizes \"AI-Reasoning-Effort: <input_value>\" to \"<expected_level>\""],
  ['given', "a commit message with \"AI-Reasoning-Effort: extreme\" and a human commit without \"AI-Reasoning-Effort\""],
  ['when', "\"parseCommitTrailers\" parses both messages"],
  ['then', "\"trailers.reasoningEffort\" is undefined for both commits"],
  ['given', "\"formatCommitTrailers\" omits the \"AI-Reasoning-Effort\" line when \"reasoningEffort\" is undefined"],
  ['given', "the generated dashboard HTML renders missing effort levels gracefully as \"unspecified\" or \"—\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
