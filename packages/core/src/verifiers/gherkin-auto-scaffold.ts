/**
 * AI-SDLC: Polyglot Gherkin Auto-Scaffolding & Default Language Detection
 * Cites: FR-051-GHERKIN-POLYGLOT-SCAFFOLD-001, FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001, FR-076-GHERKIN-RESOLVER-MCP-PARITY-001
 */

import * as fs from 'fs';
import * as path from 'path';
import { GherkinScaffoldLanguage } from '../types/index.js';
import { checkGherkinInSync } from './gherkin.js';
import { resolveFeatureTargetLanguages } from './gherkin-language-resolver.js';
import { scaffoldGherkinSteps } from './gherkin-scaffold.js';
import {
  POLYGLOT_EXCLUDED_DIR_SET,
  POLYGLOT_LANGUAGE_REGISTRY,
  normalizeScaffoldLanguage,
} from './polyglot-registry.js';

const SKIP_MANIFEST_DIRS = POLYGLOT_EXCLUDED_DIR_SET;

/** Checks whether a directory contains .NET project or solution files. */
export function hasDotnetProjectFiles(rootDir: string): boolean {
  if (!fs.existsSync(rootDir)) return false;
  try {
    return fs.readdirSync(rootDir).some((f) => f.endsWith('.csproj') || f.endsWith('.sln') || f.endsWith('.slnx'));
  } catch {
    return false;
  }
}

/** Reads configured scaffold language from `.aisdlc.json` if present. */
export function readJsonConfigLanguage(rootDir: string): GherkinScaffoldLanguage | null {
  const jsonPath = path.join(rootDir, '.aisdlc.json');
  if (!fs.existsSync(jsonPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as {
      testing?: { language?: unknown };
      stack?: { language?: unknown };
    };
    return normalizeScaffoldLanguage(parsed?.testing?.language ?? parsed?.stack?.language);
  } catch {
    return null;
  }
}

/** Reads configured scaffold language from `quality-policy.yaml` if present. */
export function readYamlPolicyLanguage(rootDir: string): GherkinScaffoldLanguage | null {
  const yamlPath = path.join(rootDir, 'quality-policy.yaml');
  if (!fs.existsSync(yamlPath)) return null;
  try {
    const lines = fs.readFileSync(yamlPath, 'utf-8').split(/\r?\n/);
    let section = '';
    for (const line of lines) {
      const top = /^([a-zA-Z0-9_-]+)\s*:/.exec(line);
      if (top) {
        section = top[1];
        continue;
      }
      if (section === 'testing' || section === 'stack') {
        const match = /^\s+language\s*:\s*['"]?([a-zA-Z0-9_-]+)['"]?/.exec(line);
        if (match) return normalizeScaffoldLanguage(match[1]);
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Reads explicitly configured scaffold language from `.aisdlc.json` or `quality-policy.yaml`. */
export function readConfiguredScaffoldLanguage(rootDir: string): GherkinScaffoldLanguage | null {
  return readJsonConfigLanguage(rootDir) ?? readYamlPolicyLanguage(rootDir);
}

/** Enqueues non-excluded child directories for bounded BFS manifest scanning. */
export function enqueueChildDirs(dir: string, nextDepth: number, queue: Array<{ dir: string; depth: number }>): void {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || SKIP_MANIFEST_DIRS.has(entry.name)) continue;
      queue.push({ dir: path.join(dir, entry.name), depth: nextDepth });
    }
  } catch {
    // Ignore unreadable directories during bounded scan
  }
}

/** Collects candidate directories up to `maxDepth` for manifest detection. */
export function collectManifestDirs(rootDir: string, maxDepth = 3): string[] {
  if (!fs.existsSync(rootDir)) return [];
  const dirs: string[] = [];
  const queue: Array<{ dir: string; depth: number }> = [{ dir: rootDir, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift()!;
    dirs.push(current.dir);
    if (current.depth < maxDepth) {
      enqueueChildDirs(current.dir, current.depth + 1, queue);
    }
  }
  return dirs;
}

/** Checks if any of the given filenames exists directly inside `dir`. */
export function hasAnyFile(dir: string, files: readonly string[]): boolean {
  return files.some((file) => fs.existsSync(path.join(dir, file)));
}

/** Evaluates a directory entry for matching source file extensions within depth limits. */
export function matchesSubtreeEntry(
  dir: string,
  entry: fs.Dirent,
  exts: readonly string[],
  excludedFiles: readonly string[],
  depth: number
): boolean {
  if (entry.isSymbolicLink()) return false;
  if (entry.isFile()) {
    return !excludedFiles.includes(entry.name) && exts.some((ext) => entry.name.endsWith(ext));
  }
  if (entry.isDirectory() && !SKIP_MANIFEST_DIRS.has(entry.name)) {
    return hasSubtreeExtension(path.join(dir, entry.name), exts, excludedFiles, depth + 1);
  }
  return false;
}

/** Recursively checks whether a subtree contains files with any of the given extensions. */
export function hasSubtreeExtension(
  dir: string,
  exts: readonly string[],
  excludedFiles: readonly string[] = [],
  depth = 0
): boolean {
  if (depth > 3) return false;
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .some((entry) => matchesSubtreeEntry(dir, entry, exts, excludedFiles, depth));
  } catch {
    return false;
  }
}

/** Disambiguates `build.gradle.kts` projects between Kotlin and Java. */
export function disambiguateGradleKts(dir: string): GherkinScaffoldLanguage {
  const hasKt = hasSubtreeExtension(dir, POLYGLOT_LANGUAGE_REGISTRY.kt.sourceExtensions, [
    'build.gradle.kts',
    'settings.gradle.kts',
  ]);
  if (hasKt) return 'kt';
  if (hasSubtreeExtension(dir, POLYGLOT_LANGUAGE_REGISTRY.java.sourceExtensions)) return 'java';
  return 'kt';
}

/** Disambiguates `CMakeLists.txt` projects between C++ and C. */
export function disambiguateCMake(dir: string): GherkinScaffoldLanguage {
  if (hasSubtreeExtension(dir, POLYGLOT_LANGUAGE_REGISTRY.cpp.sourceExtensions)) return 'cpp';
  if (hasSubtreeExtension(dir, ['.c'])) return 'c';
  return 'cpp';
}

/** Detects a primary polyglot language from manifests in `dir`. */
export function detectPrimaryLanguageInDir(dir: string): GherkinScaffoldLanguage | null {
  if (hasAnyFile(dir, POLYGLOT_LANGUAGE_REGISTRY.py.primaryManifests)) return 'py';
  if (hasAnyFile(dir, POLYGLOT_LANGUAGE_REGISTRY.go.primaryManifests)) return 'go';
  if (hasAnyFile(dir, POLYGLOT_LANGUAGE_REGISTRY.rs.primaryManifests)) return 'rs';
  if (hasDotnetProjectFiles(dir)) return 'cs';
  if (hasAnyFile(dir, POLYGLOT_LANGUAGE_REGISTRY.java.primaryManifests)) return 'java';
  if (hasAnyFile(dir, POLYGLOT_LANGUAGE_REGISTRY.kt.primaryManifests)) return disambiguateGradleKts(dir);
  if (hasAnyFile(dir, POLYGLOT_LANGUAGE_REGISTRY.c.primaryManifests)) return disambiguateCMake(dir);
  if (hasAnyFile(dir, POLYGLOT_LANGUAGE_REGISTRY.ts.primaryManifests)) return 'ts';
  return null;
}

/** Detects an auxiliary polyglot language (e.g. `requirements.txt`) in `dir`. */
export function detectAuxiliaryLanguageInDir(dir: string): GherkinScaffoldLanguage | null {
  if (hasAnyFile(dir, POLYGLOT_LANGUAGE_REGISTRY.py.auxiliaryManifests)) return 'py';
  return null;
}

/** Detects either primary or auxiliary polyglot language in `dir`. */
export function detectLanguageInDir(dir: string): GherkinScaffoldLanguage | null {
  return detectPrimaryLanguageInDir(dir) ?? detectAuxiliaryLanguageInDir(dir);
}

/** Detects the default BDD step scaffold language for `rootDir`. */
export function detectDefaultScaffoldLanguage(rootDir: string): GherkinScaffoldLanguage | null {
  const configured = readConfiguredScaffoldLanguage(rootDir);
  if (configured) return configured;
  const dirs = collectManifestDirs(rootDir, 3);
  for (const dir of dirs) {
    const primary = detectPrimaryLanguageInDir(dir);
    if (primary) return primary;
  }
  for (const dir of dirs) {
    const aux = detectAuxiliaryLanguageInDir(dir);
    if (aux) return aux;
  }
  return null;
}

/** Scaffolds missing BDD step files for features that lack step definitions. */
export function scaffoldMissingStepFiles(
  rootDir: string,
  missing: string[],
  fallbackLang: GherkinScaffoldLanguage | null
): number {
  let count = 0;
  for (const fp of missing) {
    const resolved = resolveFeatureTargetLanguages(rootDir, fp);
    const lang = resolved.length > 0 ? resolved : fallbackLang;
    if (!lang) continue;
    if (scaffoldGherkinSteps({ rootDir, featurePath: fp, lang, allowFallback: true }).success) {
      count++;
    }
  }
  return count;
}

/** Scaffolds missing language-specific step files for detected language mismatches. */
export function scaffoldLanguageMismatches(
  rootDir: string,
  mismatches: Array<{ featureFile: string; missingLanguages: GherkinScaffoldLanguage[] }>
): number {
  let count = 0;
  for (const mismatch of mismatches) {
    if (mismatch.missingLanguages.length === 0) continue;
    const res = scaffoldGherkinSteps({
      rootDir,
      featurePath: mismatch.featureFile,
      lang: mismatch.missingLanguages,
      allowFallback: true,
    });
    if (res.success) count++;
  }
  return count;
}

/**
 * Automatically scaffolds missing BDD step definition files and resolves
 * step language mismatches for all `.feature` files under `rootDir`.
 */
export function autoScaffoldMissingSteps(rootDir: string): number {
  const sync = checkGherkinInSync({ rootDir });
  const missing = sync.missingStepFiles ?? [];
  const mismatches = sync.stepLanguageMismatches ?? [];
  if (missing.length === 0 && mismatches.length === 0) return 0;

  const fallbackLang = detectDefaultScaffoldLanguage(rootDir);
  return (
    scaffoldMissingStepFiles(rootDir, missing, fallbackLang) +
    scaffoldLanguageMismatches(rootDir, mismatches)
  );
}
