// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/uc-074-polyglot-linter-verify-all.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a repository containing supported stacks from \"typescript\", \"javascript\", \"angular\", \"python\", \"dotnet\", \"java\", \"kotlin\", \"rust\", \"go\", \"c\", and \"cpp\""],
  ['given', "all required native linters and compilers are installed and resolved via \"ensureToolAvailable\""],
  ['when', "\"aisdlc verify all\" executes"],
  ['then', "native strict linters and compilers run for every detected stack"],
  ['given', "\"aisdlc verify all\" passes with zero violations"],
  ['given', "a repository with a detected stack whose native tool is missing"],
  ['given', "the execution environment has mode \"<env_mode>\" and user install response \"<user_choice>\""],
  ['when', "\"aisdlc verify all\" invokes \"ensureToolAvailable\" with \"TOOL_INSTALL_ALLOWLIST\""],
  ['then', "\"aisdlc verify all\" <outcome>"],
  ['given', "a repository with a detected stack whose native linter or compiler is installed"],
  ['given', "the source code contains strict lint or compiler errors causing a non-zero exit code"],
  ['when', "\"aisdlc verify all\" executes the native tool"],
  ['then', "\"aisdlc verify all\" fails and reports the violations with redacted diagnostics"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
