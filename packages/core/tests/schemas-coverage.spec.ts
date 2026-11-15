import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initProject, verifyArtifactsSchemas } from '../src/index.js';

describe('Artifact Schema Verifier Branch Coverage Suite', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-schemas-cov-'));
    initProject({ targetDir: tempDir, agents: 'none', silent: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('exercises AJV keyword formatters, targetPath resolution, and parse failures', () => {
    const prodDir = path.join(tempDir, 'specs', 'product');
    fs.mkdirSync(prodDir, { recursive: true });

    // Violates required, additionalProperties, enum, pattern, minLength, uniqueItems
    const badReq = path.join(prodDir, 'bad-req.md');
    fs.writeFileSync(
      badReq,
      [
        '---',
        'id: BAD_ID',
        'type: requirement',
        'title: x',
        'status: INVALID_STATUS',
        'extra_field: disallowed',
        'tags: [dup, dup]',
        '---',
        '# Bad Req',
      ].join('\n'),
      'utf-8'
    );

    // Malformed YAML frontmatter
    const corruptReq = path.join(prodDir, 'corrupt-req.md');
    fs.writeFileSync(corruptReq, '---\n: : [\n---\n# Corrupt', 'utf-8');

    // Valid-looking artifact with unknown type (skipped)
    const unknownType = path.join(prodDir, 'unknown.md');
    fs.writeFileSync(unknownType, '---\nid: UNK-1\ntype: unknown-custom-type\n---\n# Unknown', 'utf-8');

    // Invalid handoff.yaml (array/missing required fields) and invalid tasks.md
    const chgDir = path.join(tempDir, 'specs', 'changes', 'active', 'chg-schema');
    fs.mkdirSync(chgDir, { recursive: true });
    fs.writeFileSync(path.join(chgDir, 'handoff.yaml'), 'id: HOF-BAD\ntype: handoff\n', 'utf-8');
    fs.writeFileSync(
      path.join(chgDir, 'tasks.md'),
      '---\nid: TSK-LIST\ntype: tasks\ntasks:\n  - id: 123\n    extra: bad\n---\n# Tasks\n',
      'utf-8'
    );

    // 1. Single file targetPath
    const singleRes = verifyArtifactsSchemas({ rootDir: tempDir, targetPath: 'specs/product/bad-req.md' });
    expect(singleRes.success).toBe(false);
    expect(singleRes.violations.length).toBeGreaterThan(0);

    // 2. Directory targetPath
    const dirRes = verifyArtifactsSchemas({ rootDir: tempDir, targetPath: 'specs/product' });
    expect(dirRes.success).toBe(false);

    // 3. Non-existent targetPath
    const missingRes = verifyArtifactsSchemas({ rootDir: tempDir, targetPath: 'specs/does-not-exist' });
    expect(missingRes.totalEvaluated).toBe(0);

    // 4. Full workspace scan including handoff.yaml and tasks.md
    const fullRes = verifyArtifactsSchemas({ rootDir: tempDir });
    expect(fullRes.success).toBe(false);
    expect(fullRes.invalidCount).toBeGreaterThan(0);
  });
});
