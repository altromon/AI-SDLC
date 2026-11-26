// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-074-polyglot-linter-verify-all.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a repository containing supported stacks among \"typescript\", \"javascript\", \"angular\", \"python\", \"dotnet\", \"java\", \"kotlin\", \"rust\", \"go\", \"c\", and \"cpp\""],
  ['given', "each required native tool is installed and resolved via \"ensureToolAvailable\""],
  ['when', "\"aisdlc verify all\" executes the polyglot linter gate"],
  ['then', "every detected stack runs its native strict linter or compiler with exit code 0"],
  ['given', "\"aisdlc verify all\" passes with zero violations"],
  ['given', "a repository with a detected stack whose native tool or precondition is \"<condition>\""],
  ['given', "the execution environment has mode \"<env_mode>\" and user install response \"<user_choice>\""],
  ['when', "\"aisdlc verify all\" executes \"runPolyglotLinters\""],
  ['then', "the stack check is \"<outcome>\""],
  ['given', "a repository with a detected stack whose native linter or compiler is installed"],
  ['given', "running the native tool returns a non-zero exit code due to lint or compiler errors"],
  ['then', "\"aisdlc verify all\" fails and reports the violations with redacted diagnostics"],
  ['given', "a repository with an untrusted \".\" or workspace-local PATH entry and diagnostic output containing sensitive tokens"],
  ['when', "\"runPolyglotLinters\" resolves and executes native tools via \"tool-installer.ts\""],
  ['then', "untrusted PATH entries are ignored per CWE-426, tools execute with \"shell: false\", and sensitive diagnostics are redacted"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
