// BDD STEP DEFINITIONS (tests/features/spec-chg-078-inspector-code-graph.feature)
// Traceability: @CHG-078-INSPECTOR-CODE-GRAPH @FR-078-INSPECTOR-CODE-GRAPH-001 @TSK-003
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BddStepRegistry, inspectElement, type InspectResult } from '@aisdlc/core';
import { registerSteps as registerFr078Steps } from './fr-078-inspector-code-graph-001.steps.js';

export function registerSteps(registry: BddStepRegistry): void {
  registerFr078Steps(registry);

  let secRoot = '';
  let secParent = '';
  let secResult: InspectResult | undefined;

  registry.given('a repository guarded by CodeGraphService FS-jail and DLP redaction', () => {
    secParent = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-chg078-sec-'));
    secRoot = path.join(secParent, 'workspace', 'repo');
    fs.mkdirSync(path.join(secRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(secRoot, 'src', 'app.ts'), 'export const app = 1;\n', 'utf-8');
    fs.mkdirSync(path.join(secParent, 'etc'), { recursive: true });
    fs.writeFileSync(path.join(secParent, 'etc', 'passwd'), 'root:x:0:0:TOP_SECRET_HOST_LEAK:/root:/bin/bash\n', 'utf-8');
  });

  registry.when('"inspectElement" is awaited for a path traversal target "../../etc/passwd"', async () => {
    const pending = inspectElement('../../etc/passwd', { rootDir: secRoot });
    assert.ok(pending instanceof Promise, 'RED: inspectElement must return a Promise');
    secResult = await pending;
  });

  registry.then('the code graph query is confined to the repository root without escaping or leaking host paths or secrets', () => {
    assert.ok(secResult);
    assert.equal(secResult.found, false, 'RED: Path traversal target must resolve to found=false');
    assert.equal(JSON.stringify(secResult).includes('TOP_SECRET_HOST_LEAK'), false, 'RED: Host file content leaked');
    fs.rmSync(secParent, { recursive: true, force: true });
  });
}
