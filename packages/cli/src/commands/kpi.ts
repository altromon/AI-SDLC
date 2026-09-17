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
  writeReleaseKpiReport,
} from '@ai-sdlc/core';

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

    if (options.updateFile) {
      if (!fs.existsSync(options.updateFile)) {
        console.error(pc.red(`\n✖ [ERROR] El archivo objetivo '${options.updateFile}' no existe.\n`));
        return false;
      }
      const original = fs.readFileSync(options.updateFile, 'utf-8');
      const updated = injectKpisIntoPrBody(original, markdown);
      fs.writeFileSync(options.updateFile, updated, 'utf-8');
      console.log(pc.green(`✔ [ACTUALIZADO] Resumen de KPIs inyectado en '${options.updateFile}'.`));
    } else {
      console.log('\n' + markdown + '\n');
    }

    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(pc.red(`\n✖ [ERROR] Fallo al calcular KPIs de PR: ${msg}\n`));
    return false;
  }
}

export function runKpiRelease(options: KpiReleaseCliOptions): boolean {
  if (!options.release) {
    console.error(pc.red('\n✖ [ERROR] Debe especificar la rama de la release (--release <rama>).\n'));
    return false;
  }

  const baseBranch = options.base || 'main';
  const rootDir = options.root || process.cwd();

  try {
    console.log(pc.cyan(`\n📊 [AI-SDLC Release KPI] Consolidando métricas para '${pc.bold(options.release)}'...`));
    const report = aggregateReleaseKpis(options.release, baseBranch, { cwd: rootDir });

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return true;
    }

    const { markdownPath, jsonPath } = writeReleaseKpiReport(report, { outputDir: options.output });
    console.log(pc.green(`✔ [CONFORME] Informe consolidado generado exitosamente:`));
    console.log(`  - Markdown: ${pc.bold(markdownPath)}`);
    console.log(`  - JSON:     ${pc.bold(jsonPath)}`);
    console.log(`  - KLoC:     ${report.totalKloc} (${report.totalCommits} commits)`);
    console.log(`  - Bugs:     ${report.totalBugs} (Densidad: ${report.globalDefectDensity} bugs/KLoC)`);
    console.log(`  - Rework:   ${report.reworkTimePercent}% tiempo | ${report.reworkTokensPercent}% tokens\n`);

    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(pc.red(`\n✖ [ERROR] Fallo al calcular KPIs de Release: ${msg}\n`));
    return false;
  }
}
