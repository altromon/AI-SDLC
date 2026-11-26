/**
 * CLI Handler: aisdlc gherkin
 */

import * as readline from 'readline';
import pc from 'picocolors';
import {
  extractGherkinFeatures,
  GherkinScaffoldExecFn,
  GherkinScaffoldResult,
  resolveFeatureTargetLanguages,
  scaffoldGherkinSteps,
} from '@aisdlc/core';
import { detectDefaultScaffoldLanguage } from './check.js';
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
  lang?: string | string[];
  output?: string;
  install?: boolean;
  fallback?: boolean;
  json?: boolean;
  format?: string;
  silent?: boolean;
  promptFn?: (question: string) => Promise<boolean>;
  execFn?: GherkinScaffoldExecFn;
}

export function printGherkinResult(result: ReturnType<typeof extractGherkinFeatures>): void {
  console.log(`  Generated .feature files:    ${pc.bold(String(result.features.length))}`);
  console.log(`  Total scenarios:             ${pc.bold(String(result.totalScenarios))}`);

  for (const f of result.features) {
    console.log(`    ${pc.green('✔')} ${pc.bold(f.featureName)} ➔ ${f.outputFile} (${f.scenarioCount} scenarios)`);
  }

  if (result.success) {
    console.log(pc.green('\n✔ BDD synchronization completed successfully.\n'));
  } else {
    console.error(pc.red('\n✖ BDD synchronization completed with errors.\n'));
  }
}

export function emitGherkinJson(result: ReturnType<typeof extractGherkinFeatures>): void {
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

export function defaultConfirmInstall(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let settled = false;
    rl.on('close', () => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    });
    rl.question(question, (answer) => {
      if (!settled) {
        settled = true;
        const normalized = answer.trim().toLowerCase();
        resolve(normalized === 'y' || normalized === 'yes');
      }
      rl.close();
    });
  });
}

export function printScaffoldText(result: GherkinScaffoldResult): void {
  if (result.status === 'GENERATOR_MISSING') {
    console.log(
      pc.yellow(
        `\n⚠ Native generator (${result.generatorBin}) missing. Run: ${pc.bold(result.installCommand ?? '')} (License: ${result.license})\n`
      )
    );
    return;
  }
  if (result.status === 'ERROR' || !result.success) {
    const code = result.errorCode ?? result.status;
    const detail = result.fallbackReason ? ` - ${result.fallbackReason}` : '';
    console.error(pc.red(`\n✖ [Gherkin Scaffold] Error (${code}): ${result.featureFile}${detail}\n`));
    return;
  }
  const files = result.outputFiles?.length ? result.outputFiles : [result.outputFile];
  for (const out of files.filter(Boolean)) {
    console.log(`  ${pc.green('✔')} [${result.status}] ➔ ${pc.bold(String(out))}`);
  }
}

export async function handleInteractiveMissing(
  initialResult: GherkinScaffoldResult,
  featurePath: string,
  options: GherkinScaffoldCliOptions,
  rootDir: string,
  resolvedLang?: string | string[]
): Promise<GherkinScaffoldResult> {
  const ask = options.promptFn || defaultConfirmInstall;
  const confirmed = await ask(
    `Native BDD generator is not installed (${initialResult.installCommand}, license: ${initialResult.license}). Install now? [y/N]: `
  );
  const lang = resolvedLang ?? resolveScaffoldLang(rootDir, featurePath, options.lang);
  return scaffoldGherkinSteps({
    rootDir,
    featurePath,
    lang,
    outputPath: options.output,
    installMissing: confirmed,
    allowFallback: !confirmed,
    execFn: options.execFn,
  });
}

export function emitScaffoldOutput(
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

export function resolveScaffoldLang(
  rootDir: string,
  featurePath: string,
  rawLang?: string | string[]
): string | string[] {
  if (typeof rawLang === 'string' && rawLang.trim().length > 0) return rawLang;
  if (Array.isArray(rawLang) && rawLang.some((item) => item.trim().length > 0)) return rawLang;
  const inferred = resolveFeatureTargetLanguages(rootDir, featurePath);
  return inferred.length > 0 ? inferred : (detectDefaultScaffoldLanguage(rootDir) ?? '');
}

export async function runGherkinScaffold(
  featurePath: string,
  options: GherkinScaffoldCliOptions
): Promise<boolean> {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY && !useJson && !options.silent);
  const resolvedLang = resolveScaffoldLang(rootDir, featurePath, options.lang);

  let result = scaffoldGherkinSteps({
    rootDir,
    featurePath,
    lang: resolvedLang,
    outputPath: options.output,
    installMissing: options.install,
    allowFallback: options.fallback,
    execFn: options.execFn,
  });

  if (result.status === 'GENERATOR_MISSING' && (isInteractive || options.promptFn)) {
    result = await handleInteractiveMissing(result, featurePath, options, rootDir, resolvedLang);
  }

  emitScaffoldOutput(result, options, useJson);
  return result.success;
}


