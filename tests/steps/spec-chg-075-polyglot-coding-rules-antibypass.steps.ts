// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-075-polyglot-coding-rules-antibypass.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a repository with active strict coding rules across supported stacks in \"VALID_CODING_RULE_STACKS\""],
  ['given', "all project configuration files preserve strict compiler and linter rules"],
  ['given', "a \"patch\" change modifies only non-protected application files"],
  ['when', "\"aisdlc verify friction\" executes"],
  ['then', "\"collectCodingRulesBypassViolations\" reports zero \"[CODING-RULES-BYPASS]\" violations"],
  ['given', "\"aisdlc verify friction\" passes as \"COMPLIANT\""],
  ['given', "a repository with active strict coding rules"],
  ['given', "a \"<entry_type>\" named \"<entry_name>\" containing a weakening config file"],
  ['when', "\"collectCodingRulesBypassViolations\" scans the repository"],
  ['then', "the scanner skips \"<entry_name>\" without reporting a bypass violation"],
  ['given', "a repository with active strict coding rules for stack \"<stack>\""],
  ['given', "file \"<file_path>\" contains weakening configuration \"<weakening>\""],
  ['then', "a \"[CODING-RULES-BYPASS]\" violation is reported for \"<file_path>\""],
  ['given', "an active change with profile \"patch\""],
  ['given', "the change modifies protected path \"<protected_path>\""],
  ['then', "an \"[ANTI-PATCH-BYPASS]\" violation is reported for \"<protected_path>\""],
  ['given', "\"aisdlc verify friction\" fails as \"BLOCKED\""],
  ['given', "a symbolic link pointing outside the repository root"],
  ['when', "\"collectCodingRulesBypassViolations\" traverses the workspace"],
  ['then', "the symbolic link is skipped without reading external targets or looping"],
  ['given', "the change modifies \"specs/privacy/PRIV-REQ-001.md\" or \"eslint.config.mjs\""],
  ['then', "the verifier emits \"[ANTI-PATCH-BYPASS]\" and blocks the change"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
