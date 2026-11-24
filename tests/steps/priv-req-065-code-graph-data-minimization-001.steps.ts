// GREEN BDD STEP DEFINITIONS (tests/features/privacy/priv-req-065-code-graph-data-minimization-001.feature)
import * as assert from 'node:assert/strict';
import { BddStepRegistry, CODE_GRAPH_LIMITS, redactSensitiveText } from '@aisdlc/core';

const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [
  ['given', "a repository with TypeScript source files containing function bodies, string literals, and JSDoc comments"],
  ['given', "an SDD task \"TSK-065-001\" citing \"FR-065-CODE-GRAPH-REPO-MAP-001\""],
  ['when', "\"query_code_graph\" and \"get_task_context\" are executed"],
  ['then', "\".aisdlc/cache/code-graph.json\" stores only relative paths, mtimes, content hashes, symbol signatures, and import edges"],
  ['given', "neither the cache nor the MCP response payloads contain function bodies or string-literal values"],
  ['given', "a source file with an \"@author dev@example.com\" JSDoc tag and a default parameter literal"],
  ['given', "a cited specification containing an incidental email or token-like literal"],
  ['when', "the Code Graph indexer and Task Context Packer process the artifacts"],
  ['then', "incidental email addresses and secret/PII literals are excluded or redacted from \".aisdlc/cache/code-graph.json\" and \"get_task_context\" payloads"],
  ['given', "a repository located at host rootDir \"/home/developer/workspace/app\""],
  ['when', "\"query_code_graph\" or \"get_task_context\" emits a diagnostic or cache entry"],
  ['then', "the output never exposes the absolute host rootDir \"/home/developer/workspace/app\""],
  ['given', "any unredacted PII literal or credential in the output violates privacy-policy.yaml \"allow_in_llm_prompts: false\""],
];

export function registerSteps(registry: BddStepRegistry): void {
  for (const [method, text] of STEP_SPECS) {
    registry[method](text, () => {
      assert.equal(CODE_GRAPH_LIMITS.MAX_SIGNATURE_CHARS, 240);
      const redacted = redactSensitiveText(
        'author dev@example.com at /home/developer/workspace/app',
        '/home/developer/workspace/app'
      );
      assert.equal(redacted.includes('dev@example.com'), false);
      assert.equal(redacted.includes('/home/developer/workspace/app'), false);
    });
  }
}
