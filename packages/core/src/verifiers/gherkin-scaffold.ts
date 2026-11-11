/**
 * AI-SDLC: Polyglot Gherkin Step Definition Scaffolding Engine
 * Cites: FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001, CHG-051-GHERKIN-POLYGLOT-SCAFFOLD
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  GherkinGeneratorSpec,
  GherkinScaffoldExecResult,
  GherkinScaffoldLanguage,
  GherkinScaffoldOptions,
  GherkinScaffoldResult,
} from '../types/index.js';
import { ParsedFeatureDocument, ParsedStepItem, parseFeatureDocument } from './bdd-runner.js';

const SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set(['ts', 'py', 'go', 'rs', 'cs']);

function featureStem(featurePath: string): string {
  return path
    .basename(featurePath, path.extname(featurePath))
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

export const GHERKIN_GENERATOR_SPECS: Record<GherkinScaffoldLanguage, GherkinGeneratorSpec> = {
  ts: {
    lang: 'ts',
    generatorBin: 'npx',
    versionArgs: ['--no-install', 'cucumber-js', '--version'],
    scaffoldArgs: (fp) => ['--no-install', 'cucumber-js', fp, '--dry-run', '--format', 'snippets'],
    installCommand: 'pnpm add -D @cucumber/cucumber',
    installCmd: 'pnpm',
    installArgs: ['add', '-D', '@cucumber/cucumber'],
    license: 'MIT',
    resolveOutputPath: (rootDir, fp) =>
      path.join(rootDir, 'tests', 'steps', `${featureStem(fp)}.steps.ts`),
  },
  py: {
    lang: 'py',
    generatorBin: 'pytest-bdd',
    versionArgs: ['--version'],
    scaffoldArgs: (fp) => ['generate', fp],
    installCommand: 'pip install pytest-bdd',
    installCmd: 'pip',
    installArgs: ['install', 'pytest-bdd'],
    license: 'MIT',
    resolveOutputPath: (rootDir, fp) =>
      path.join(rootDir, 'tests', 'steps', `test_${featureStem(fp).replace(/-/g, '_')}_steps.py`),
  },
  go: {
    lang: 'go',
    generatorBin: 'godog',
    versionArgs: ['version'],
    scaffoldArgs: (fp) => [fp],
    installCommand: 'go install github.com/cucumber/godog/cmd/godog@latest',
    installCmd: 'go',
    installArgs: ['install', 'github.com/cucumber/godog/cmd/godog@latest'],
    license: 'MIT',
    resolveOutputPath: (rootDir, fp) =>
      path.join(rootDir, 'tests', 'steps', `${featureStem(fp).replace(/-/g, '_')}_steps_test.go`),
  },
  rs: {
    lang: 'rs',
    generatorBin: 'cargo',
    versionArgs: ['--version'],
    scaffoldArgs: () => ['test', '--test', 'cucumber'],
    installCommand: 'cargo add --dev cucumber',
    installCmd: 'cargo',
    installArgs: ['add', '--dev', 'cucumber'],
    license: 'MIT OR Apache-2.0',
    resolveOutputPath: (rootDir, fp) =>
      path.join(rootDir, 'tests', 'steps', `${featureStem(fp).replace(/-/g, '_')}_steps.rs`),
  },
  cs: {
    lang: 'cs',
    generatorBin: 'dotnet',
    versionArgs: ['--version'],
    scaffoldArgs: () => ['build'],
    installCommand: 'dotnet add package Reqnroll',
    installCmd: 'dotnet',
    installArgs: ['add', 'package', 'Reqnroll'],
    license: 'BSD-3-Clause',
    resolveOutputPath: (rootDir, fp) =>
      path.join(rootDir, 'tests', 'steps', `${featureStem(fp)}Steps.cs`),
  },
};

function defaultExec(cmd: string, args: string[]): GherkinScaffoldExecResult {
  const res = spawnSync(cmd, args, { encoding: 'utf-8', timeout: 15000, shell: false });
  return {
    status: res.status ?? null,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    error: res.error,
  };
}

export function normalizeScaffoldLanguages(raw: string | string[]): {
  valid: boolean;
  langs: GherkinScaffoldLanguage[];
} {
  const items = (Array.isArray(raw) ? raw : [raw])
    .flatMap((entry) => String(entry).split(','))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (items.length === 0) return { valid: false, langs: [] };
  const deduped: GherkinScaffoldLanguage[] = [];
  for (const item of items) {
    if (!SUPPORTED_LANGUAGES.has(item)) return { valid: false, langs: [] };
    const typed = item as GherkinScaffoldLanguage;
    if (!deduped.includes(typed)) deduped.push(typed);
  }
  return { valid: true, langs: deduped };
}

function escapeDoubleQuotes(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function mapStepKeyword(keyword: string): 'given' | 'when' | 'then' {
  const lower = keyword.toLowerCase();
  if (lower === 'when' || lower === 'cuando') return 'when';
  if (lower === 'then' || lower === 'entonces') return 'then';
  return 'given';
}

function collectUniqueSteps(doc: ParsedFeatureDocument): ParsedStepItem[] {
  const seen = new Set<string>();
  const unique: ParsedStepItem[] = [];
  const allSteps = [...doc.backgroundSteps, ...doc.scenarios.flatMap((s) => s.steps)];
  for (const step of allSteps) {
    const key = `${mapStepKeyword(step.keyword)}:${step.text}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(step);
    }
  }
  return unique;
}

function renderTsFallback(relFeature: string, steps: ParsedStepItem[]): string {
  const lines = [
    `// AUTO-GENERATED RED BDD STEP DEFINITIONS (${relFeature})`,
    `import { BddStepRegistry } from '@aisdlc/core';`,
    ``,
    `export function registerSteps(registry: BddStepRegistry): void {`,
  ];
  for (const st of steps) {
    const method = mapStepKeyword(st.keyword);
    const escaped = escapeDoubleQuotes(st.text);
    lines.push(`  registry.${method}("${escaped}", () => {`);
    lines.push(`    throw new Error("RED: Step not implemented: ${escaped}");`);
    lines.push(`  });`);
  }
  lines.push(`}`, ``);
  return lines.join('\n');
}

function renderPyFallback(relFeature: string, steps: ParsedStepItem[]): string {
  const lines = [
    `# AUTO-GENERATED RED BDD STEP DEFINITIONS (${relFeature})`,
    `from pytest_bdd import given, when, then, scenarios`,
    ``,
    `scenarios("${escapeDoubleQuotes(relFeature)}")`,
    ``,
  ];
  steps.forEach((st, idx) => {
    const decorator = mapStepKeyword(st.keyword);
    const escaped = escapeDoubleQuotes(st.text);
    lines.push(`@${decorator}("${escaped}")`, `def step_${idx + 1}():`);
    lines.push(`    raise NotImplementedError("RED: Step not implemented: ${escaped}")`, ``);
  });
  return lines.join('\n');
}

function renderGoFallback(relFeature: string, steps: ParsedStepItem[]): string {
  const lines = [
    `// AUTO-GENERATED RED BDD STEP DEFINITIONS (${relFeature})`,
    `package steps`,
    ``,
    `import "github.com/cucumber/godog"`,
    ``,
    `func InitializeScenario(ctx *godog.ScenarioContext) {`,
  ];
  for (const st of steps) {
    const escaped = escapeDoubleQuotes(st.text);
    lines.push(`	ctx.Step(\`^${escaped}$\`, func() error { return godog.ErrPending })`);
  }
  lines.push(`}`, ``);
  return lines.join('\n');
}

function renderRsFallback(relFeature: string, steps: ParsedStepItem[]): string {
  const lines = [
    `// AUTO-GENERATED RED BDD STEP DEFINITIONS (${relFeature})`,
    `use cucumber::{given, when, then, World};`,
    ``,
    `#[derive(Debug, Default, World)]`,
    `pub struct FeatureWorld;`,
    ``,
  ];
  steps.forEach((st, idx) => {
    const macro = mapStepKeyword(st.keyword);
    const escaped = escapeDoubleQuotes(st.text);
    lines.push(`#[${macro}(expr = "${escaped}")]`);
    lines.push(`fn step_${idx + 1}(_world: &mut FeatureWorld) {`);
    lines.push(`    todo!("RED: Step not implemented: ${escaped}");`, `}`, ``);
  });
  return lines.join('\n');
}

function renderCsFallback(relFeature: string, steps: ParsedStepItem[]): string {
  const lines = [
    `// AUTO-GENERATED RED BDD STEP DEFINITIONS (${relFeature})`,
    `using Reqnroll;`,
    ``,
    `[Binding]`,
    `public class GeneratedSteps`,
    `{`,
  ];
  steps.forEach((st, idx) => {
    const attr =
      mapStepKeyword(st.keyword) === 'when'
        ? 'When'
        : mapStepKeyword(st.keyword) === 'then'
          ? 'Then'
          : 'Given';
    const escaped = escapeDoubleQuotes(st.text);
    lines.push(`    [${attr}(@"${st.text.replace(/"/g, '""')}")]`);
    lines.push(`    public void Step${idx + 1}() => throw new PendingStepException("${escaped}");`);
  });
  lines.push(`}`, ``);
  return lines.join('\n');
}

function buildFallbackTemplate(
  lang: GherkinScaffoldLanguage,
  relFeature: string,
  steps: ParsedStepItem[]
): string {
  const renderers: Record<GherkinScaffoldLanguage, () => string> = {
    ts: () => renderTsFallback(relFeature, steps),
    py: () => renderPyFallback(relFeature, steps),
    go: () => renderGoFallback(relFeature, steps),
    rs: () => renderRsFallback(relFeature, steps),
    cs: () => renderCsFallback(relFeature, steps),
  };
  return renderers[lang]();
}

function resolveValidatedFeaturePath(rootDir: string, featurePath: string): string | null {
  if (!featurePath || featurePath.includes('\0') || featurePath.trim().startsWith('-')) {
    return null;
  }
  const absRoot = path.resolve(rootDir);
  const fullPath = path.isAbsolute(featurePath)
    ? path.resolve(featurePath)
    : path.resolve(absRoot, featurePath);

  if (!path.isAbsolute(featurePath) && !fullPath.startsWith(absRoot)) {
    return null;
  }
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return null;
  }
  return fullPath;
}

function buildErrorResult(
  lang: string,
  featureFile: string,
  errorCode: 'ERR_FEATURE_NOT_FOUND' | 'ERR_UNSUPPORTED_LANGUAGE' | 'ERR_INSTALL_FAILED'
): GherkinScaffoldResult {
  return {
    success: false,
    status: 'ERROR',
    errorCode,
    lang,
    featureFile,
    scenariosCount: 0,
    stepsCount: 0,
  };
}

interface SingleLangContext {
  rootDir: string;
  fullFeaturePath: string;
  relFeature: string;
  doc: ParsedFeatureDocument;
  uniqueSteps: ParsedStepItem[];
  options: GherkinScaffoldOptions;
  execFn: (cmd: string, args: string[]) => GherkinScaffoldExecResult;
}

function resolveTargetOutput(
  ctx: SingleLangContext,
  spec: GherkinGeneratorSpec,
  isMulti: boolean
): string {
  if (ctx.options.outputPath && !isMulti) {
    return path.isAbsolute(ctx.options.outputPath)
      ? ctx.options.outputPath
      : path.join(ctx.rootDir, ctx.options.outputPath);
  }
  return spec.resolveOutputPath(ctx.rootDir, ctx.fullFeaturePath);
}

function writeScaffoldFile(outFile: string, content: string): void {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, content, 'utf-8');
}

function checkAndPrepareBinary(
  spec: GherkinGeneratorSpec,
  ctx: SingleLangContext
): boolean {
  const verRes = ctx.execFn(spec.generatorBin, spec.versionArgs);
  if (verRes.status === 0 && !verRes.error) return true;
  if (!ctx.options.installMissing) return false;
  const instRes = ctx.execFn(spec.installCmd, spec.installArgs);
  return instRes.status === 0 && !instRes.error;
}

function buildMissingGeneratorResult(
  lang: GherkinScaffoldLanguage,
  spec: GherkinGeneratorSpec,
  ctx: SingleLangContext,
  nativeCmdStr: string
): GherkinScaffoldResult {
  return {
    success: false,
    status: 'GENERATOR_MISSING',
    lang,
    featureFile: ctx.relFeature,
    generatorBin: spec.generatorBin,
    nativeCommand: nativeCmdStr,
    installCommand: spec.installCommand,
    license: spec.license,
    scenariosCount: ctx.doc.scenarios.length,
    stepsCount: ctx.uniqueSteps.length,
  };
}

function buildCompletedResult(
  status: 'GENERATED_NATIVE' | 'GENERATED_FALLBACK',
  lang: GherkinScaffoldLanguage,
  spec: GherkinGeneratorSpec,
  ctx: SingleLangContext,
  nativeCmdStr: string,
  relOut: string,
  content: string
): GherkinScaffoldResult {
  const isFallback = status === 'GENERATED_FALLBACK';
  return {
    success: true,
    status,
    lang,
    featureFile: ctx.relFeature,
    outputFile: relOut,
    generatorBin: spec.generatorBin,
    nativeCommand: nativeCmdStr,
    installCommand: spec.installCommand,
    license: spec.license,
    fallbackReason: isFallback ? `Native generator '${spec.generatorBin}' not installed; used deterministic RED template.` : undefined,
    content,
    scenariosCount: ctx.doc.scenarios.length,
    stepsCount: ctx.uniqueSteps.length,
  };
}

function resolveNativeCommandString(spec: GherkinGeneratorSpec, lang: GherkinScaffoldLanguage): string {
  const nativeArgs = spec
    .scaffoldArgs('<feature>')
    .filter((a) => a !== '--no-install' && !(lang === 'ts' && a === '<feature>'));
  return `${spec.generatorBin} ${nativeArgs.join(' ')}`;
}

function generateLanguageStepContent(
  binaryReady: boolean,
  spec: GherkinGeneratorSpec,
  ctx: SingleLangContext,
  fallbackContent: string
): { status: 'GENERATED_NATIVE' | 'GENERATED_FALLBACK'; content: string } {
  if (!binaryReady) {
    return { status: 'GENERATED_FALLBACK', content: fallbackContent };
  }
  const genRes = ctx.execFn(spec.generatorBin, spec.scaffoldArgs(ctx.fullFeaturePath));
  const content = genRes.status === 0 && genRes.stdout.trim() ? genRes.stdout : fallbackContent;
  return { status: 'GENERATED_NATIVE', content };
}

function scaffoldSingleLanguage(
  lang: GherkinScaffoldLanguage,
  ctx: SingleLangContext,
  isMulti: boolean
): GherkinScaffoldResult {
  const spec = GHERKIN_GENERATOR_SPECS[lang];
  const nativeCmdStr = resolveNativeCommandString(spec, lang);
  const binaryReady = checkAndPrepareBinary(spec, ctx);

  if (!binaryReady && !ctx.options.allowFallback) {
    return buildMissingGeneratorResult(lang, spec, ctx, nativeCmdStr);
  }

  const outFile = resolveTargetOutput(ctx, spec, isMulti);
  const relOut = path.relative(ctx.rootDir, outFile).replace(/\\/g, '/');
  const fallback = buildFallbackTemplate(lang, ctx.relFeature, ctx.uniqueSteps);
  const { status, content } = generateLanguageStepContent(binaryReady, spec, ctx, fallback);

  writeScaffoldFile(outFile, content);
  return buildCompletedResult(status, lang, spec, ctx, nativeCmdStr, relOut, content);
}

function resolveMultiStatus(
  missingCount: number,
  results: GherkinScaffoldResult[]
): 'GENERATOR_MISSING' | 'GENERATED_NATIVE' | 'GENERATED_FALLBACK' {
  if (missingCount > 0) return 'GENERATOR_MISSING';
  return results.every((r) => r.status === 'GENERATED_NATIVE') ? 'GENERATED_NATIVE' : 'GENERATED_FALLBACK';
}

function aggregateMultiResults(
  langs: GherkinScaffoldLanguage[],
  results: GherkinScaffoldResult[]
): GherkinScaffoldResult {
  const first = results[0];
  if (langs.length === 1) {
    return { ...first, langs, outputFiles: first.outputFile ? [first.outputFile] : [], results };
  }
  const missing = results.filter((r) => r.status === 'GENERATOR_MISSING');
  const status = resolveMultiStatus(missing.length, results);
  const targetList = missing.length > 0 ? missing : results;
  const installCmds = Array.from(new Set(targetList.map((r) => r.installCommand).filter(Boolean)));

  return {
    ...first,
    success: results.every((r) => r.success),
    status,
    lang: langs.join(','),
    langs,
    outputFiles: results.map((r) => r.outputFile).filter((f): f is string => Boolean(f)),
    installCommand: installCmds.join(' && '),
    results,
  };
}

function createSingleLangContext(
  rootDir: string,
  fullFeaturePath: string,
  options: GherkinScaffoldOptions
): SingleLangContext {
  const doc = parseFeatureDocument(fs.readFileSync(fullFeaturePath, 'utf-8'));
  return {
    rootDir,
    fullFeaturePath,
    relFeature: path.relative(rootDir, fullFeaturePath).replace(/\\/g, '/'),
    doc,
    uniqueSteps: collectUniqueSteps(doc),
    options,
    execFn: options.execFn || defaultExec,
  };
}

export function scaffoldGherkinSteps(options: GherkinScaffoldOptions): GherkinScaffoldResult {
  const rootDir = options.rootDir || process.cwd();
  const rawLang = Array.isArray(options.lang) ? options.lang.join(',') : String(options.lang);
  const { valid, langs } = normalizeScaffoldLanguages(options.lang);
  if (!valid) {
    return buildErrorResult(rawLang, options.featurePath, 'ERR_UNSUPPORTED_LANGUAGE');
  }

  const fullFeaturePath = resolveValidatedFeaturePath(rootDir, options.featurePath);
  if (!fullFeaturePath) {
    return buildErrorResult(rawLang, options.featurePath, 'ERR_FEATURE_NOT_FOUND');
  }

  const ctx = createSingleLangContext(rootDir, fullFeaturePath, options);
  const results = langs.map((l) => scaffoldSingleLanguage(l, ctx, langs.length > 1));
  return aggregateMultiResults(langs, results);
}
