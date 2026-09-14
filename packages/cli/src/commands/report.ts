/**
 * CLI Handler: aisdlc report
 */

import * as path from 'path';
import pc from 'picocolors';
import { generateQualityReport } from '@ai-sdlc/core';

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
  console.log(pc.bold(pc.cyan('\n📊 Generando Informe Formal de Calidad...')));

  const thresholds = {
    max_cyclomatic: options.maxCyclomatic !== undefined ? Number(options.maxCyclomatic) : undefined,
    max_cognitive: options.maxCognitive !== undefined ? Number(options.maxCognitive) : undefined,
    min_maintainability: options.minMaintainability !== undefined ? Number(options.minMaintainability) : undefined,
    max_function_lines: options.maxLines !== undefined ? Number(options.maxLines) : undefined,
    enforce_mode: options.enforceMode,
  };

  const result = generateQualityReport({ rootDir, policyPath: options.policy, thresholds });

  console.log(`  Archivos analizados:        ${pc.bold(String(result.totalFiles))}`);
  console.log(`  Funciones evaluadas:        ${pc.bold(String(result.totalFunctions))}`);
  console.log(`  Mantenibilidad promedio:    ${pc.green(String(result.avgMaintainability) + ' / 100')}`);
  console.log(`  Complejidad promedio (CC):  ${pc.bold(String(result.avgCyclomatic))}`);
  console.log(`  Veredicto Release Gate:     ${result.verdict === 'PASS' ? pc.green('PASS') : pc.red('FAIL')}`);

  const reportRelPath = path.relative(rootDir, path.join(rootDir, 'reports', 'QUALITY_REPORT.md'));
  console.log(pc.green(`\n✔ Informe generado exitosamente en: ${pc.bold(reportRelPath)}\n`));

  return result.verdict === 'PASS';
}
