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
import { escapeRegExp } from './gherkin-language-resolver.js';
import {
  POLYGLOT_LANGUAGE_REGISTRY,
  featurePascalStem,
  featureSnakeStem,
  featureStem,
  getSupportedScaffoldLanguages,
  normalizeScaffoldLanguage,
} from './polyglot-registry.js';

export { featurePascalStem, featureSnakeStem, featureStem };

const SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set(getSupportedScaffoldLanguages());

export const GHERKIN_GENERATOR_SPECS: Record<GherkinScaffoldLanguage, GherkinGeneratorSpec> =
  Object.fromEntries(
    getSupportedScaffoldLanguages().map((lang) => [lang, POLYGLOT_LANGUAGE_REGISTRY[lang].generatorSpec])
  ) as Record<GherkinScaffoldLanguage, GherkinGeneratorSpec>;

export function defaultExec(cmd: string, args: string[]): GherkinScaffoldExecResult {
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
    const normalized = normalizeScaffoldLanguage(item);
    if (!normalized || !SUPPORTED_LANGUAGES.has(normalized)) return { valid: false, langs: [] };
    if (!deduped.includes(normalized)) deduped.push(normalized);
  }
  return { valid: true, langs: deduped };
}

export function escapeDoubleQuotes(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function formatGoRawRegexLiteral(pattern: string): string {
  if (!pattern.includes('`')) {
    return `\`${pattern}\``;
  }
  return pattern
    .split('`')
    .map((part) => `\`${part}\``)
    .join(' + "`" + ');
}

export function mapStepKeyword(keyword: string): 'given' | 'when' | 'then' {
  const lower = keyword.toLowerCase();
  if (lower === 'when' || lower === 'cuando') return 'when';
  if (lower === 'then' || lower === 'entonces') return 'then';
  return 'given';
}

export function collectUniqueSteps(doc: ParsedFeatureDocument): ParsedStepItem[] {
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

export function renderTsFallback(relFeature: string, steps: ParsedStepItem[]): string {
  const entries = steps.map((st) => `  ['${mapStepKeyword(st.keyword)}', "${escapeDoubleQuotes(st.text)}"],`);
  return [
    `// AUTO-GENERATED RED BDD STEP DEFINITIONS (${relFeature})`,
    `import { BddStepRegistry } from '@aisdlc/core';`,
    ``,
    `const STEP_SPECS: ReadonlyArray<readonly ['given' | 'when' | 'then', string]> = [`,
    ...entries,
    `];`,
    ``,
    `export function registerSteps(registry: BddStepRegistry): void {`,
    `  for (const [method, text] of STEP_SPECS) {`,
    `    registry[method](text, () => {`,
    `      throw new Error(\`RED: Step not implemented: \${text}\`);`,
    `    });`,
    `  }`,
    `}`,
    ``,
  ].join('\n');
}

export function renderPyFallback(relFeature: string, steps: ParsedStepItem[]): string {
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

export function renderGoFallback(relFeature: string, steps: ParsedStepItem[]): string {
  const fnName = `Initialize${featurePascalStem(relFeature)}Scenario`;
  const lines = [
    `// AUTO-GENERATED RED BDD STEP DEFINITIONS (${relFeature})`,
    `package steps`,
    ``,
    `import "github.com/cucumber/godog"`,
    ``,
    `func ${fnName}(ctx *godog.ScenarioContext) {`,
  ];
  for (const st of steps) {
    const expr = formatGoRawRegexLiteral(`^${escapeRegExp(st.text)}$`);
    lines.push(`	ctx.Step(${expr}, func() error { return godog.ErrPending })`);
  }
  lines.push(`}`, ``);
  return lines.join('\n');
}

export function renderRsFallback(relFeature: string, steps: ParsedStepItem[]): string {
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
    lines.push(`    panic!("RED: Step not implemented: {}", "${escaped}");`, `}`, ``);
  });
  return lines.join('\n');
}

export function renderCsFallback(relFeature: string, steps: ParsedStepItem[]): string {
  const className = `${featurePascalStem(relFeature)}Steps`;
  const lines = [
    `// AUTO-GENERATED RED BDD STEP DEFINITIONS (${relFeature})`,
    `using Reqnroll;`,
    ``,
    `[Binding]`,
    `public class ${className}`,
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

export function escapeKotlinString(text: string): string {
  return escapeDoubleQuotes(text).replace(/\$/g, '\\$');
}

export function renderJavaFallback(relFeature: string, steps: ParsedStepItem[]): string {
  const className = `${featurePascalStem(relFeature)}Steps`;
  const lines = [
    `// AUTO-GENERATED RED BDD STEP DEFINITIONS (${relFeature})`,
    `import io.cucumber.java.en.Given;`,
    `import io.cucumber.java.en.When;`,
    `import io.cucumber.java.en.Then;`,
    ``,
    `public class ${className} {`,
  ];
  steps.forEach((st, idx) => {
    const kw = mapStepKeyword(st.keyword);
    const attr = kw === 'when' ? 'When' : kw === 'then' ? 'Then' : 'Given';
    const escaped = escapeDoubleQuotes(st.text);
    lines.push(`    @${attr}("${escaped}")`);
    lines.push(`    public void step${idx + 1}() {`);
    lines.push(`        throw new io.cucumber.java.PendingException("RED: Step not implemented: ${escaped}");`);
    lines.push(`    }`);
  });
  lines.push(`}`, ``);
  return lines.join('\n');
}

export function renderKtFallback(relFeature: string, steps: ParsedStepItem[]): string {
  const className = `${featurePascalStem(relFeature)}Steps`;
  const lines = [
    `// AUTO-GENERATED RED BDD STEP DEFINITIONS (${relFeature})`,
    `import io.cucumber.java.en.Given`,
    `import io.cucumber.java.en.When`,
    `import io.cucumber.java.en.Then`,
    ``,
    `class ${className} {`,
  ];
  steps.forEach((st, idx) => {
    const kw = mapStepKeyword(st.keyword);
    const attr = kw === 'when' ? 'When' : kw === 'then' ? 'Then' : 'Given';
    const escaped = escapeKotlinString(st.text);
    lines.push(`    @${attr}("${escaped}")`);
    lines.push(`    fun step${idx + 1}() {`);
    lines.push(`        TODO("RED: Step not implemented: ${escaped}")`);
    lines.push(`    }`);
  });
  lines.push(`}`, ``);
  return lines.join('\n');
}

export function renderCFallback(relFeature: string, steps: ParsedStepItem[]): string {
  const stem = featureSnakeStem(relFeature);
  const lines = [
    `// AUTO-GENERATED RED BDD STEP DEFINITIONS (${relFeature})`,
    `#include <stdio.h>`,
    `#include <stdlib.h>`,
    ``,
  ];
  steps.forEach((st, idx) => {
    const escaped = escapeDoubleQuotes(st.text);
    lines.push(`// ${st.keyword} ${st.text}`);
    lines.push(`void step_${stem}_${idx}(void) {`);
    lines.push(`    fprintf(stderr, "RED: Step not implemented: %s\\n", "${escaped}");`);
    lines.push(`    abort();`);
    lines.push(`}`, ``);
  });
  return lines.join('\n');
}

export function renderCppFallback(relFeature: string, steps: ParsedStepItem[]): string {
  const lines = [
    `// AUTO-GENERATED RED BDD STEP DEFINITIONS (${relFeature})`,
    `#include <catch2/catch_test_macros.hpp>`,
    ``,
    `SCENARIO("${escapeDoubleQuotes(relFeature)}", "[bdd]") {`,
  ];
  if (steps.length === 0) {
    lines.push(`    FAIL("RED: Step not implemented: ${escapeDoubleQuotes(relFeature)}");`);
  } else {
    for (const st of steps) {
      const escaped = escapeDoubleQuotes(st.text);
      lines.push(`    // ${st.keyword} ${st.text}`);
      lines.push(`    FAIL("RED: Step not implemented: ${escaped}");`);
    }
  }
  lines.push(`}`, ``);
  return lines.join('\n');
}

export function buildFallbackTemplate(
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
    java: () => renderJavaFallback(relFeature, steps),
    kt: () => renderKtFallback(relFeature, steps),
    c: () => renderCFallback(relFeature, steps),
    cpp: () => renderCppFallback(relFeature, steps),
  };
  return renderers[lang]();
}

export function resolveValidatedFeaturePath(rootDir: string, featurePath: string): string | null {
  if (!featurePath || featurePath.includes('\0') || featurePath.trim().startsWith('-')) {
    return null;
  }
  const absRoot = path.resolve(rootDir);
  const fullPath = path.isAbsolute(featurePath)
    ? path.resolve(featurePath)
    : path.resolve(absRoot, featurePath);

  const relFirst = path.relative(absRoot, fullPath).split(path.sep)[0];
  if (!path.isAbsolute(featurePath) && relFirst === '..') {
    return null;
  }
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return null;
  }
  return fullPath;
}

export function buildErrorResult(
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

export interface SingleLangContext {
  rootDir: string;
  fullFeaturePath: string;
  relFeature: string;
  doc: ParsedFeatureDocument;
  uniqueSteps: ParsedStepItem[];
  options: GherkinScaffoldOptions;
  execFn: (cmd: string, args: string[]) => GherkinScaffoldExecResult;
}

export function resolveTargetOutput(
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

export function writeScaffoldFile(outFile: string, content: string): void {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, content, 'utf-8');
}

export function checkAndPrepareBinary(
  spec: GherkinGeneratorSpec,
  ctx: SingleLangContext
): boolean {
  const verRes = ctx.execFn(spec.generatorBin, spec.versionArgs);
  if (verRes.status === 0 && !verRes.error) return true;
  if (!ctx.options.installMissing) return false;
  const instRes = ctx.execFn(spec.installCmd, spec.installArgs);
  return instRes.status === 0 && !instRes.error;
}

export function buildMissingGeneratorResult(
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

export function resolveFallbackReason(spec: GherkinGeneratorSpec): string {
  if (spec.emitsSourceStdout === false) {
    return `Native tool '${spec.generatorBin}' does not emit step-definition source code on stdout; used deterministic RED template.`;
  }
  return `Native generator '${spec.generatorBin}' not installed; used deterministic RED template.`;
}

export function buildCompletedResult(
  status: 'GENERATED_NATIVE' | 'GENERATED_FALLBACK',
  lang: GherkinScaffoldLanguage,
  spec: GherkinGeneratorSpec,
  ctx: SingleLangContext,
  nativeCmdStr: string,
  relOut: string,
  content: string
): GherkinScaffoldResult {
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
    fallbackReason: status === 'GENERATED_FALLBACK' ? resolveFallbackReason(spec) : undefined,
    content,
    scenariosCount: ctx.doc.scenarios.length,
    stepsCount: ctx.uniqueSteps.length,
  };
}

export function resolveNativeCommandString(spec: GherkinGeneratorSpec, lang: GherkinScaffoldLanguage): string {
  const nativeArgs = spec
    .scaffoldArgs('<feature>')
    .filter((a) => a !== '--no-install' && !(lang === 'ts' && a === '<feature>'));
  return `${spec.generatorBin} ${nativeArgs.join(' ')}`;
}

export function generateLanguageStepContent(
  binaryReady: boolean,
  spec: GherkinGeneratorSpec,
  ctx: SingleLangContext,
  fallbackContent: string
): { status: 'GENERATED_NATIVE' | 'GENERATED_FALLBACK'; content: string } {
  if (!binaryReady || spec.emitsSourceStdout === false) {
    return { status: 'GENERATED_FALLBACK', content: fallbackContent };
  }
  const genRes = ctx.execFn(spec.generatorBin, spec.scaffoldArgs(ctx.fullFeaturePath));
  const content = genRes.status === 0 && genRes.stdout.trim() ? genRes.stdout : fallbackContent;
  return { status: 'GENERATED_NATIVE', content };
}

export function scaffoldSingleLanguage(
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

export function resolveMultiStatus(
  missingCount: number,
  results: GherkinScaffoldResult[]
): 'GENERATOR_MISSING' | 'GENERATED_NATIVE' | 'GENERATED_FALLBACK' {
  if (missingCount > 0) return 'GENERATOR_MISSING';
  return results.every((r) => r.status === 'GENERATED_NATIVE') ? 'GENERATED_NATIVE' : 'GENERATED_FALLBACK';
}

export function aggregateMultiResults(
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

export function createSingleLangContext(
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
