/**
 * CLI Handler: aisdlc gherkin
 */

import pc from 'picocolors';
import { extractGherkinFeatures } from '@ai-sdlc/core';

export function runGherkinExtract(options: { root?: string; path?: string; all?: boolean }): boolean {
  const rootDir = options.root || process.cwd();
  console.log(pc.bold(pc.cyan('\n🥒 [AI-SDLC] Extrayendo escenarios Gherkin a archivos .feature...')));

  const result = extractGherkinFeatures({
    rootDir,
    targetPath: options.path,
    all: options.all,
  });

  console.log(`  Archivos .feature generados: ${pc.bold(String(result.features.length))}`);
  console.log(`  Escenarios totales:          ${pc.bold(String(result.totalScenarios))}`);

  for (const f of result.features) {
    console.log(`    ${pc.green('✔')} ${pc.bold(f.featureName)} ➔ ${f.outputFile} (${f.scenarioCount} escenarios)`);
  }

  console.log(pc.green('\n✔ Sincronización BDD completada exitosamente.\n'));
  return true;
}
