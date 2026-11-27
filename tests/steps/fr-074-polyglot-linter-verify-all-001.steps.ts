// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-074-polyglot-linter-verify-all-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a repository with detected stacks among \"typescript\", \"javascript\", \"angular\", \"python\", \"dotnet\", \"java\", \"kotlin\", \"rust\", \"go\", \"c\", and \"cpp\""],
  ['given', "each required native tool is resolved via \"ensureToolAvailable\" with CWE-426 safe PATH resolution"],
  ['when', "\"aisdlc verify all\" runs the native linters and compilers"],
  ['then', "every detected stack executes its strict linter or compiler and passes with exit code 0"],
  ['given', "a repository with a detected stack whose native tool is not installed"],
  ['given', "the environment is \"<mode>\" with install prompt decision \"<decision>\""],
  ['when', "\"aisdlc verify all\" checks tool availability using \"ensureToolAvailable\" and \"TOOL_INSTALL_ALLOWLIST\""],
  ['then', "the missing tool check is <result>"],
  ['given', "a repository with a detected stack whose native tool is installed"],
  ['given', "running the native strict linter or compiler returns a non-zero exit code"],
  ['when', "\"aisdlc verify all\" executes the polyglot verification step"],
  ['then', "\"aisdlc verify all\" fails and reports the lint or compiler violations with redacted diagnostics"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
