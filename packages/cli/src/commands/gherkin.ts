/**
 * CLI Handler: aisdlc gherkin
 */

import * as readline from 'readline';
import pc from 'picocolors';
import {
  extractGherkinFeatures,
  GherkinScaffoldExecFn,
  GherkinScaffoldResult,
  scaffoldGherkinSteps,
} from '@aisdlc/core';
import { isJsonOutput } from './verify.js';

export interface GherkinExtractCliOptions {
  root?: string;
  path?: string;
  all?: boolean;
  silent?: boolean;
  json?: boolean;
  format?: string;
}

export interface GherkinScaffoldCliOptions {
  root?: string;
  lang: string | string[];
  output?: string;
  install?: boolean;
  fallback?: boolean;
  json?: boolean;
  format?: string;
  silent?: boolean;
  promptFn?: (question: string) => Promise<boolean>;
  execFn?: GherkinScaffoldExecFn;
}

function printGherkinResult(result: ReturnType<typeof extractGherkinFeatures>): void {
  console.log(`  Generated .feature files:    ${pc.bold(String(result.features.length))}`);
  console.log(`  Total scenarios:             ${pc.bold(String(result.totalScenarios))}`);

  for (const f of result.features) {
    console.log(`    ${pc.green('✔')} ${pc.bold(f.featureName)} ➔ ${f.outputFile} (${f.scenarioCount} scenarios)`);
  }

  console.log(pc.green('\n✔ BDD synchronization completed successfully.\n'));
}

function emitGherkinJson(result: ReturnType<typeof extractGherkinFeatures>): void {
  const payload = {
    command: 'gherkin:extract',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    totalScenarios: result.totalScenarios,
    features: result.features,
  };
  console.log(JSON.stringify(payload, null, 2));
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
    printGherkinResult(result);
  }

  if (useJson) {
    emitGherkinJson(result);
  }

  return result.success;
}

function defaultConfirmInstall(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();
      resolve(normalized === 'y' || normalized === 'yes');
    });
  });
}

function printScaffoldText(result: GherkinScaffoldResult): void {
  if (result.status === 'ERROR') {
    console.error(pc.red(`\n✖ [Gherkin Scaffold] Error (${result.errorCode}): ${result.featureFile}\n`));
    return;
  }
  if (result.status === 'GENERATOR_MISSING') {
    console.log(
      pc.yellow(
        `\n⚠ Native generator (${result.generatorBin}) missing. Run: ${pc.bold(result.installCommand || '')} (License: ${result.license})\n`
      )
    );
    return;
  }
  const files = result.outputFiles?.length ? result.outputFiles : [result.outputFile];
  for (const out of files.filter(Boolean)) {
    console.log(`  ${pc.green('✔')} [${result.status}] ➔ ${pc.bold(String(out))}`);
  }
}

async function handleInteractiveMissing(
  initialResult: GherkinScaffoldResult,
  featurePath: string,
  options: GherkinScaffoldCliOptions,
  rootDir: string
): Promise<GherkinScaffoldResult> {
  const ask = options.promptFn || defaultConfirmInstall;
  const confirmed = await ask(
    `Native BDD generator is not installed (${initialResult.installCommand}, license: ${initialResult.license}). Install now? [y/N]: `
  );
  return scaffoldGherkinSteps({
    rootDir,
    featurePath,
    lang: options.lang,
    outputPath: options.output,
    installMissing: confirmed,
    allowFallback: !confirmed,
    execFn: options.execFn,
  });
}

function emitScaffoldOutput(
  result: GherkinScaffoldResult,
  options: GherkinScaffoldCliOptions,
  useJson: boolean
): void {
  if (useJson) {
    console.log(JSON.stringify(result, null, 2));
  } else if (!options.silent) {
    printScaffoldText(result);
  }
}

export async function runGherkinScaffold(
  featurePath: string,
  options: GherkinScaffoldCliOptions
): Promise<boolean> {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY && !useJson && !options.silent);

  let result = scaffoldGherkinSteps({
    rootDir,
    featurePath,
    lang: options.lang,
    outputPath: options.output,
    installMissing: options.install,
    allowFallback: options.fallback,
    execFn: options.execFn,
  });

  if (result.status === 'GENERATOR_MISSING' && (isInteractive || options.promptFn)) {
    result = await handleInteractiveMissing(result, featurePath, options, rootDir);
  }

  emitScaffoldOutput(result, options, useJson);
  return result.success;
}


