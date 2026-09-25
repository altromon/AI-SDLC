/**
 * CLI Handler: aisdlc report
 */

import * as path from 'path';
import { spawn } from 'child_process';
import pc from 'picocolors';
import { generateDashboardReport, generateQualityReport } from '@ai-sdlc/core';

function openInBrowser(filePath: string): void {
  const resolved = path.resolve(filePath);
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', '', resolved], { detached: true, stdio: 'ignore' });
    } else if (platform === 'darwin') {
      spawn('open', [resolved], { detached: true, stdio: 'ignore' });
    } else {
      spawn('xdg-open', [resolved], { detached: true, stdio: 'ignore' });
    }
  } catch {
    // Graceful fallback if desktop launcher is unavailable
  }
}


export function runReportDashboard(options: {
  root?: string;
  output?: string;
  title?: string;
  open?: boolean;
} = {}): boolean {
  const rootDir = options.root || process.cwd();
  console.log(pc.bold(pc.cyan('\n🌐 [AI-SDLC] Generating Interactive Web Dashboard and PDaC / RTM Graph...')));

  try {
    const result = generateDashboardReport({
      rootDir,
      outputPath: options.output,
      title: options.title,
    });

    console.log(`  Compiled nodes:        ${pc.bold(String(result.totalNodes))}`);
    console.log(`  Connections (edges):   ${pc.bold(String(result.totalEdges))}`);
    console.log(`  Compliant nodes:       ${pc.green(String(result.conformingCount))}`);
    console.log(`  Nodes with issues:     ${result.issueCount > 0 ? pc.red(String(result.issueCount)) : pc.green('0')}`);
    console.log(`  Global traceability:   ${pc.green(String(result.metrics.traceabilityRatio) + '%')}`);
    console.log(`  Maintainability:       ${pc.bold(String(result.metrics.avgMaintainability) + ' / 100')}`);
    console.log(`  Gate verdict:          ${result.metrics.qualityVerdict === 'PASS' ? pc.green('PASS') : pc.red('FAIL')}`);

    const relPath = path.relative(rootDir, result.outputPath);
    console.log(pc.green(`\n✔ Self-contained HTML dashboard successfully generated at: ${pc.bold(relPath)}\n`));

    if (options.open) {
      openInBrowser(result.outputPath);
    }

    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(pc.red(`\n✖ [ERROR] Failed to generate web dashboard: ${msg}\n`));
    return false;
  }
}

export function runReportQuality(options: {
  root?: string;
  policy?: string;
  maxCyclomatic?: number | string;
  maxCognitive?: number | string;
  minMaintainability?: number | string;
  maxLines?: number | string;
  enforceMode?: 'STRICT' | 'PERMISSIVE' | string;
} = {}): boolean {
  const rootDir = options.root || process.cwd();
  console.log(pc.bold(pc.cyan('\n📊 Generating Formal Quality Report...')));

  const thresholds = {
    max_cyclomatic: options.maxCyclomatic !== undefined ? Number(options.maxCyclomatic) : undefined,
    max_cognitive: options.maxCognitive !== undefined ? Number(options.maxCognitive) : undefined,
    min_maintainability: options.minMaintainability !== undefined ? Number(options.minMaintainability) : undefined,
    max_function_lines: options.maxLines !== undefined ? Number(options.maxLines) : undefined,
    enforce_mode: options.enforceMode,
  };

  const result = generateQualityReport({ rootDir, policyPath: options.policy, thresholds });

  console.log(`  Analyzed files:             ${pc.bold(String(result.totalFiles))}`);
  console.log(`  Evaluated functions:        ${pc.bold(String(result.totalFunctions))}`);
  console.log(`  Average maintainability:    ${pc.green(String(result.avgMaintainability) + ' / 100')}`);
  console.log(`  Average complexity (CC):    ${pc.bold(String(result.avgCyclomatic))}`);
  console.log(`  Release Gate verdict:       ${result.verdict === 'PASS' ? pc.green('PASS') : pc.red('FAIL')}`);

  const reportRelPath = path.relative(rootDir, path.join(rootDir, 'reports', 'QUALITY_REPORT.md'));
  console.log(pc.green(`\n✔ Report successfully generated at: ${pc.bold(reportRelPath)}\n`));

  return result.verdict === 'PASS';
}

