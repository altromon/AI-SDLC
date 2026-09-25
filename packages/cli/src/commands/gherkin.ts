/**
 * CLI Handler: aisdlc gherkin
 */

import pc from 'picocolors';
import { extractGherkinFeatures } from '@ai-sdlc/core';
import { isJsonOutput } from './verify.js';

export interface GherkinExtractCliOptions {
  root?: string;
  path?: string;
  all?: boolean;
  silent?: boolean;
  json?: boolean;
  format?: string;
}

export function runGherkinExtract(options: GherkinExtractCliOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  if (!isSilent) {
    console.log(pc.bold(pc.cyan('\n🥒 [AI-SDLC] Extracting Gherkin scenarios to .feature files...')));
  }

  const result = extractGherkinFeatures({
    rootDir,
    targetPath: options.path,
    all: options.all,
  });

  if (!isSilent) {
    console.log(`  Generated .feature files:    ${pc.bold(String(result.features.length))}`);
    console.log(`  Total scenarios:             ${pc.bold(String(result.totalScenarios))}`);

    for (const f of result.features) {
      console.log(`    ${pc.green('✔')} ${pc.bold(f.featureName)} ➔ ${f.outputFile} (${f.scenarioCount} scenarios)`);
    }

    console.log(pc.green('\n✔ BDD synchronization completed successfully.\n'));
  }

  if (useJson) {
    const payload = {
      command: 'gherkin:extract',
      success: result.success,
      exitCode: result.success ? 0 : 1,
      totalScenarios: result.totalScenarios,
      features: result.features,
    };
    console.log(JSON.stringify(payload, null, 2));
  }

  return result.success;
}

