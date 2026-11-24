// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/spec-chg-065-code-graph-task-context.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a repository with TypeScript and Python source files and an active task \"TSK-065001\""],
  ['when', "\"query_code_graph\" is called with depth 1 and \"get_task_context\" is called for \"TSK-065001\""],
  ['then', "\".aisdlc/cache/code-graph.json\" is written atomically with per-file hashes and mtimes"],
  ['given', "\"get_task_context\" returns the minimal spec subgraph for cited artifacts and the 1-hop code subgraph"],
  ['given', "full source file bodies and uncited specifications are excluded"],
  ['given', "an existing \".aisdlc/cache/code-graph.json\" and a modified Java file or missing native Go CLI"],
  ['when', "\"query_code_graph\" is invoked with depth 0"],
  ['then', "unchanged files are reused from cache without re-parsing"],
  ['given', "the unavailable toolchain falls back automatically to \"polyglot-scanner\""],
  ['given', "only the target node symbol signatures are returned for depth 0"],
  ['given', "an indexed repository"],
  ['when', "\"query_code_graph\" or \"get_task_context\" is invoked with \"<invalid_input>\""],
  ['then', "the engine returns a structured validation or not-found error \"<error_code>\""],
  ['given', "no partial or corrupted cache is written to \".aisdlc/cache/code-graph.json\""],
  ['given', "a malicious target \"../etc/passwd\" or a \".aisdlc/cache/code-graph.json\" containing \"__proto__\""],
  ['when', "the Code Graph engine resolves paths or loads the cache"],
  ['then', "traversal and symlink escapes are rejected with \"ERR_PATH_TRAVERSAL_DETECTED\" or \"ERR_SYMLINK_ESCAPE_DETECTED\""],
  ['given', "poisoned cache entries are discarded without polluting Object.prototype"],
  ['given', "a Rust repository with \".cargo/config.toml\" or an untrusted \"compile_commands.json\""],
  ['when', "the Code Graph indexer processes the repository"],
  ['then', "\"cargo metadata\" is skipped in favor of \"polyglot-scanner\""],
  ['given', "\"compile_commands.json\" commands are never executed as OS processes"],
  ['given', "source files with \"@author dev@example.com\" JSDoc comments and \".env\" files inside host \"repoRoot\""],
  ['when', "\"query_code_graph\" and \"get_task_context\" return payloads and update the cache"],
  ['then', "\".env\" files, function bodies, incidental emails, and absolute host paths are excluded or redacted"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
