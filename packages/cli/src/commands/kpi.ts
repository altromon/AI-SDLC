/**
 * CLI Handlers: aisdlc kpi pr & aisdlc kpi release
 */

import * as fs from 'fs';
import pc from 'picocolors';
import {
  aggregatePrKpis,
  formatPrKpiMarkdown,
  injectKpisIntoPrBody,
  aggregateReleaseKpis,
  resolveReleaseBaseBranch,
  writeReleaseKpiReport,
} from '@aisdlc/core';

export interface KpiPrCliOptions {
  base?: string;
  head?: string;
  updateFile?: string;
  json?: boolean;
  root?: string;
}

export interface KpiReleaseCliOptions {
  release: string;
  base?: string;
  output?: string;
  json?: boolean;
  root?: string;
}

function applyKpiPrOutput(options: KpiPrCliOptions, markdown: string): boolean {
  if (options.updateFile) {
    if (!fs.existsSync(options.updateFile)) {
      console.error(pc.red(`\n✖ [ERROR] Target file '${options.updateFile}' does not exist.\n`));
      return false;
    }
    const original = fs.readFileSync(options.updateFile, 'utf-8');
    const updated = injectKpisIntoPrBody(original, markdown);
    fs.writeFileSync(options.updateFile, updated, 'utf-8');
    console.log(pc.green(`✔ [UPDATED] KPI summary injected into '${options.updateFile}'.`));
  } else {
    console.log('\n' + markdown + '\n');
  }
  return true;
}

export function runKpiPr(options: KpiPrCliOptions): boolean {
  const baseRef = options.base || 'main';
  const headRef = options.head || 'HEAD';
  const rootDir = options.root || process.cwd();

  try {
    const kpi = aggregatePrKpis(baseRef, headRef, { cwd: rootDir });

    if (options.json) {
      console.log(JSON.stringify(kpi, null, 2));
      return true;
    }

    const markdown = formatPrKpiMarkdown(kpi);
    return applyKpiPrOutput(options, markdown);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(pc.red(`\n✖ [ERROR] Failed to calculate PR KPIs: ${msg}\n`));
    return false;
  }
}

function printReleaseKpiSummary(report: ReturnType<typeof aggregateReleaseKpis>, markdownPath: string, jsonPath: string): void {
  console.log(pc.green(`✔ [COMPLIANT] Consolidated report successfully generated:`));
  console.log(`  - Markdown: ${pc.bold(markdownPath)}`);
  console.log(`  - JSON:     ${pc.bold(jsonPath)}`);
  console.log(`  - KLoC:     ${report.totalKloc} (${report.totalCommits} commits)`);
  console.log(`  - Bugs:     ${report.totalBugs} (Density: ${report.globalDefectDensity} bugs/KLoC)`);
  console.log(`  - Rework:   ${report.reworkTimePercent}% time | ${report.reworkTokensPercent}% tokens\n`);
}

function printKpiReleaseError(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(pc.red(`\n✖ [ERROR] Failed to calculate Release KPIs: ${msg}\n`));
}

function executeKpiReleaseReport(
  release: string,
  baseBranch: string,
  rootDir: string,
  outputDir?: string
): void {
  const report = aggregateReleaseKpis(release, baseBranch, { cwd: rootDir });
  const { markdownPath, jsonPath } = writeReleaseKpiReport(report, {
    outputDir,
    rootDir,
  });
  if (report.totalCommits === 0) {
    console.warn(pc.yellow(`\n⚠ [WARNING] No commits found between '${report.baseBranch}' and '${report.releaseBranch}'.`));
  }
  printReleaseKpiSummary(report, markdownPath, jsonPath);
}

export function runKpiRelease(options: KpiReleaseCliOptions): boolean {
  if (!options.release) {
    console.error(pc.red('\n✖ [ERROR] Release branch must be specified (--release <branch>).\n'));
    return false;
  }

  const rootDir = options.root || process.cwd();
  const baseBranch = resolveReleaseBaseBranch(options.release, options.base, { cwd: rootDir });

  try {
    console.log(pc.cyan(`\n📊 [AI-SDLC Release KPI] Consolidating metrics for '${pc.bold(options.release)}' (baseline: '${pc.bold(baseBranch)}')...`));
    if (options.json) {
      const report = aggregateReleaseKpis(options.release, baseBranch, { cwd: rootDir });
      console.log(JSON.stringify(report, null, 2));
      return true;
    }
    executeKpiReleaseReport(options.release, baseBranch, rootDir, options.output);
    return true;
  } catch (err: unknown) {
    printKpiReleaseError(err);
    return false;
  }
}
