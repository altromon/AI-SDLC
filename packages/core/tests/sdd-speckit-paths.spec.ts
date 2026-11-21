import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SpecKitAdapter } from '../src/adapters/sdd/speckit.js';
import type { ProductHandoff } from '../src/types/index.js';

describe('SpecKitAdapter Paths (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;
  const adapter = new SpecKitAdapter();

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-speckit-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('getChangeWorkspaceDir: resolves active, completed, standard, and fallback paths (happy/boundary)', () => {
    const activeDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-act');
    const completedDir = path.join(tmpDir, 'specs', 'changes', 'completed', 'chg-done');
    fs.mkdirSync(activeDir, { recursive: true });
    fs.mkdirSync(completedDir, { recursive: true });

    expect(adapter.getChangeWorkspaceDir(tmpDir, 'chg-act')).toBe(activeDir);
    expect(adapter.getChangeWorkspaceDir(tmpDir, 'chg-done')).toBe(completedDir);
    expect(adapter.getChangeWorkspaceDir(tmpDir, 'chg-new')).toBe(path.join(tmpDir, 'specs', 'chg-new'));
  });

  it('depositSidecar & loadSidecar: normalizes HOF- prefix, supports JSON, mirrors .specify, and ignores malformed sidecars (happy/malformed)', () => {
    fs.mkdirSync(path.join(tmpDir, '.specify'), { recursive: true });
    const handoff: ProductHandoff = {
      id: '001',
      changeId: '',
      createdAt: '',
      subgraph: { requirements: ['FR-1'], components: ['CMP-1'] },
    } as unknown as ProductHandoff;

    const jsonPath = adapter.depositSidecar({ rootDir: tmpDir, changeId: 'chg-001', handoff, format: 'json' });
    expect(jsonPath.endsWith('handoff.json')).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.specify', 'memory', 'chg-001.handoff.yaml'))).toBe(true);

    const loaded = adapter.loadSidecar(path.dirname(jsonPath));
    expect(loaded?.id).toBe('HOF-001');
    expect(loaded?.changeId).toBe('chg-001');

    const badDir = path.join(tmpDir, 'bad-sidecar');
    fs.mkdirSync(badDir, { recursive: true });
    fs.writeFileSync(path.join(badDir, 'handoff.json'), '{not-valid-json', 'utf-8');
    fs.writeFileSync(path.join(badDir, 'handoff.yaml'), 'id: NO-HOF-PREFIX\n', 'utf-8');
    expect(adapter.loadSidecar(badDir)).toBeNull();
    expect(adapter.loadSidecar(path.join(tmpDir, 'missing-dir'))).toBeNull();
  });

  it('validateWorkspace: handles missing dir, missing files, invalid acceptance-format, missing gherkin block, and patch profile (sad/boundary/malformed)', () => {
    expect(adapter.validateWorkspace(path.join(tmpDir, 'missing')).valid).toBe(false);

    const wsDir = path.join(tmpDir, 'specs', 'chg-val');
    fs.mkdirSync(wsDir, { recursive: true });
    fs.writeFileSync(
      path.join(wsDir, 'spec.md'),
      '---\nprofile: standard\nacceptance-format: markdown\n---\n# Spec\n',
      'utf-8'
    );
    const resInvalidFmt = adapter.validateWorkspace(wsDir);
    expect(resInvalidFmt.valid).toBe(false);
    expect(resInvalidFmt.errors.some((e) => e.includes('acceptance-format'))).toBe(true);
    expect(resInvalidFmt.errors.some((e) => e.includes('tasks.md'))).toBe(true);
    expect(resInvalidFmt.errors.some((e) => e.includes('handoff.yaml'))).toBe(true);
    expect(resInvalidFmt.warnings.some((w) => w.includes('plan.md'))).toBe(true);

    fs.writeFileSync(
      path.join(wsDir, 'spec.md'),
      '---\nprofile: patch\nacceptance-format: gherkin\n---\n# No gherkin block here\n',
      'utf-8'
    );
    const resPatch = adapter.validateWorkspace(wsDir);
    expect(resPatch.valid).toBe(false);
    expect(resPatch.errors.some((e) => e.includes('bloque de especificación ejecutable'))).toBe(true);
  });
});
