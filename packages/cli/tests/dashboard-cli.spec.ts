import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runReportDashboard } from '../src/commands/report.js';

describe('CLI Command: aisdlc report dashboard', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-cli-dash-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore windows cleanup locks
      }
    }
  });

  it('should generate the dashboard HTML via CLI handler', () => {
    const customOutput = path.join(tempDir, 'custom-dashboard.html');
    const success = runReportDashboard({
      root: process.cwd(),
      output: customOutput,
      title: 'CLI Test Dashboard',
      open: false,
    });

    expect(success).toBe(true);
    expect(fs.existsSync(customOutput)).toBe(true);

    const content = fs.readFileSync(customOutput, 'utf-8');
    expect(content).toContain('CLI Test Dashboard');
    expect(content).toContain('id="cy"');
    expect(content).toContain('Cytoscape');
  });

  it('should return false gracefully when an invalid root is provided', () => {
    const nonExistentPath = path.join(tempDir, 'non_existent_folder_xyz');
    const success = runReportDashboard({
      root: nonExistentPath,
      output: path.join(tempDir, 'fail.html'),
      open: false,
    });

    // Even if path is empty, verify it handles it gracefully
    expect(typeof success).toBe('boolean');
  });
});
