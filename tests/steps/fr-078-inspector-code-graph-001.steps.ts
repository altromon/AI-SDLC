// AUTO-GENERATED RED BDD STEP DEFINITIONS (tests/features/fr-078-inspector-code-graph-001.feature)
import { BddStepRegistry } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a repository with TypeScript source files where \"src/a.ts\" imports \"src/b.ts\" and \"src/c.ts\" imports \"src/a.ts\""],
  ['when', "MCP \"inspect_element\" or CLI \"aisdlc inspect\" awaits \"inspectElement\" for \"src/a.ts\""],
  ['then', "\"InspectResult\" includes outbound and inbound code dependencies (\"import\", \"re-export\", \"include\")"],
  ['given', "\"InspectResult\" includes cached AST \"SymbolSignature\" metadata for \"src/a.ts\""],
  ['given', "a repository state with \"<condition>\""],
  ['when', "\"inspectElement\" is awaited for \"<target>\""],
  ['then', "\"inspectElement\" resolves without error with \"<expected_behavior>\""],
  ['given', "a repository with source files and an existing or absent code-graph cache"],
  ['when', "\"inspectElement\" is awaited for an unknown target \"src/does-not-exist.ts\""],
  ['then', "\"inspectElement\" resolves cleanly without crashing or writing corrupt cache entries"],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      throw new Error(`RED: Step not implemented: ${text}`);
    });
  }
}
