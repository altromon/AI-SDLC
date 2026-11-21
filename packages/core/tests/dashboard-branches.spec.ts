import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateDashboardReport } from '../src/reporters/dashboard.js';

describe('Dashboard Reporter Composite Branches (Happy / Sad / Boundary)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-dash-br-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates dashboard with custom outputPath, custom title, active changes, and quality/coverage metrics', () => {
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'app.ts'), 'export const ok = true;\n', 'utf-8');
    fs.writeFileSync(
      path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001', 'tasks.md'),
      '---\ntasks:\n  - id: TSK-1\n    title: Task 1\n    status: completed\n---\n- [x] TSK-1\n',
      'utf-8'
    );

    const outPath = path.join(tmpDir, 'custom', 'dash.html');
    const res = generateDashboardReport({
      rootDir: tmpDir,
      outputPath: outPath,
      title: 'Custom Audit Dashboard',
    });

    expect(res.outputPath).toBe(outPath);
    expect(fs.existsSync(outPath)).toBe(true);
    const html = fs.readFileSync(outPath, 'utf-8');
    expect(html).toContain('Custom Audit Dashboard');
  });
});
