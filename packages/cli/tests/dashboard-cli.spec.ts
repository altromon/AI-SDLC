/**
 * Cites: FR-046-NATIVE-SDK-CLI-AST-001
 * Tag: @FR-046-NATIVE-SDK-CLI-AST-001
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { runReportDashboard } from '../src/commands/report.js';

describe('CLI Command: aisdlc report dashboard', () => {
  let tempDir: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-cli-dash-'));
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
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
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Self-contained HTML dashboard successfully generated'));

    const content = fs.readFileSync(customOutput, 'utf-8');
    expect(content).toContain('CLI Test Dashboard');
    expect(content).toContain('id="cy"');
    expect(content).toContain('Cytoscape');
  });

  it('should generate an empty dashboard for missing root and return false gracefully when output path is unwritable', () => {
    const nonExistentPath = path.join(tempDir, 'non_existent_folder_xyz');
    const outFile = path.join(tempDir, 'empty-dash.html');
    const emptyOk = runReportDashboard({
      root: nonExistentPath,
      output: outFile,
      open: false,
    });
    expect(emptyOk).toBe(true);
    expect(fs.existsSync(outFile)).toBe(true);

    const failOk = runReportDashboard({
      root: tempDir,
      output: tempDir,
      open: false,
    });
    expect(failOk).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to generate web dashboard'));
  });
});
