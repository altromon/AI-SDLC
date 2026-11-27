/**
 * AI-SDLC: Automated Gherkin to Cucumber (.feature) Extraction Engine
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ExtractedFeature,
  GherkinExtractionOptions,
  GherkinExtractionResult,
  GherkinScaffoldLanguage,
  GherkinStepLanguageMismatch,
  GherkinSyncCheckResult,
} from '../types/index.js';
import { canonicalSort, walkMdFiles } from '../utils/fs.js';
import { resolveFeatureTargetLanguages } from './gherkin-language-resolver.js';
import { GHERKIN_GENERATOR_SPECS } from './gherkin-scaffold.js';

export interface MarkdownFrontmatter {
  id?: string;
  version?: string;
  'cucumber-feature-file'?: string;
  [key: string]: string | undefined;
}

export function parseMarkdownFrontmatter(content: string): {
  frontmatter: MarkdownFrontmatter;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const yamlLines = match[1].split('\n');
  const frontmatter: MarkdownFrontmatter = {};

  for (const line of yamlLines) {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let val = parts.slice(1).join(':').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      frontmatter[key] = val;
    }
  }

  const body = content.substring(match[0].length);
  return { frontmatter, body };
}

export function extractGherkinBlock(body: string): string[] {
  const gherkinRegex = /```gherkin\r?\n([\s\S]*?)\r?\n```/g;
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = gherkinRegex.exec(body)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

export function resolveTargetFiles(rootDir: string, targetPath?: string): string[] {
  if (targetPath) {
    const fullTarget = path.isAbsolute(targetPath) ? targetPath : path.join(rootDir, targetPath);
    if (!fs.existsSync(fullTarget)) return [];
    return fs.statSync(fullTarget).isDirectory() ? walkMdFiles(fullTarget) : [fullTarget];
  }
  const searchDirs = [
    path.join(rootDir, 'product'),
    path.join(rootDir, 'security'),
    path.join(rootDir, 'privacy'),
    path.join(rootDir, 'specs'),
    path.join(rootDir, 'examples', 'product'),
    path.join(rootDir, 'examples', 'security'),
    path.join(rootDir, 'examples', 'privacy'),
    path.join(rootDir, 'examples', 'specs'),
  ];
  return searchDirs.filter((d) => fs.existsSync(d)).flatMap((d) => walkMdFiles(d));
}

export function resolveFeatureFilePath(
  rootDir: string,
  filePath: string,
  id: string,
  customTarget?: string
): string {
  if (customTarget) {
    return path.isAbsolute(customTarget) ? customTarget : path.join(rootDir, customTarget);
  }
  const baseDir = path.join(rootDir, 'tests', 'features');
  const candidateSecurity = path.join(baseDir, 'security', `${id.toLowerCase()}.feature`);
  const candidatePrivacy = path.join(baseDir, 'privacy', `${id.toLowerCase()}.feature`);
  const candidateRoot = path.join(baseDir, `${id.toLowerCase()}.feature`);
  if (fs.existsSync(candidateSecurity)) return candidateSecurity;
  if (fs.existsSync(candidatePrivacy)) return candidatePrivacy;
  if (fs.existsSync(candidateRoot)) return candidateRoot;
  const relCandidate = path.relative(path.resolve(rootDir), path.resolve(filePath)).replace(/\\/g, '/');
  const relPath = relCandidate.startsWith('..') ? filePath.replace(/\\/g, '/') : relCandidate;
  const subDir = relPath.includes('security') ? 'security' : relPath.includes('privacy') ? 'privacy' : '';
  return path.join(baseDir, subDir, `${id.toLowerCase()}.feature`);
}

export function buildFeatureFileContent(
  rootDir: string,
  filePath: string,
  id: string,
  version: string | undefined,
  gherkinBlocks: string[]
): string {
  const banner = [
    `# ==============================================================================`,
    `# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)`,
    `# Origen: ${path.relative(rootDir, filePath).replace(/\\/g, '/')}`,
    `# ID Requerimiento: ${id}`,
    `# Versión: ${version || '1.0.0'}`,
    `# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.`,
    `# ==============================================================================`,
    '',
    '',
  ].join('\n');
  return banner + gherkinBlocks.join('\n\n') + '\n';
}

export function countScenarios(gherkinBlocks: string[]): number {
  let count = 0;
  for (const block of gherkinBlocks) {
    const matches = block.match(/\b(Scenario|Escenario|Scenario Outline|Esquema del escenario):/g);
    if (matches) count += matches.length;
  }
  return count;
}

export function extractGherkinFeatures(
  options: GherkinExtractionOptions = {}
): GherkinExtractionResult {
  const rootDir = options.rootDir || process.cwd();
  const features: ExtractedFeature[] = [];
  let totalScenarios = 0;
  const targetFiles = resolveTargetFiles(rootDir, options.targetPath);

  for (const filePath of targetFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const { frontmatter, body } = parseMarkdownFrontmatter(content);
      const gherkinBlocks = extractGherkinBlock(body);
      if (gherkinBlocks.length === 0) continue;

      const id = frontmatter.id || path.basename(filePath, path.extname(filePath));
      const targetPath = resolveFeatureFilePath(rootDir, filePath, id, frontmatter['cucumber-feature-file']);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });

      const fullContent = buildFeatureFileContent(rootDir, filePath, id, frontmatter.version, gherkinBlocks);
      fs.writeFileSync(targetPath, fullContent, 'utf-8');

      const scenarioCount = countScenarios(gherkinBlocks);
      totalScenarios += scenarioCount;
      features.push({
        sourceFile: path.relative(rootDir, filePath).replace(/\\/g, '/'),
        outputFile: path.relative(rootDir, targetPath).replace(/\\/g, '/'),
        featureName: id,
        scenarioCount,
      });
    } catch {
      // Ignore unparseable files
    }
  }

  return { success: true, features, totalScenarios };
}

export function walkFeatureFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  for (const entry of fs.readdirSync(dir).sort(canonicalSort)) {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      walkFeatureFiles(fullPath, fileList);
    } else if (entry.endsWith('.feature')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export function getPresentStepLanguages(
  rootDir: string,
  featureFullPath: string
): GherkinScaffoldLanguage[] {
  const present: GherkinScaffoldLanguage[] = [];
  for (const spec of Object.values(GHERKIN_GENERATOR_SPECS)) {
    const stepPath = spec.resolveOutputPath(rootDir, featureFullPath);
    if (fs.existsSync(stepPath) && fs.statSync(stepPath).size > 0) {
      present.push(spec.lang);
    }
  }
  return present.sort(canonicalSort) as GherkinScaffoldLanguage[];
}

export function hasDeterministicStepFile(rootDir: string, featureFullPath: string): boolean {
  return getPresentStepLanguages(rootDir, featureFullPath).length > 0;
}

export function findOrphanFeatureFiles(rootDir: string, expectedRelPaths: Set<string>): string[] {
  const featuresDir = path.join(rootDir, 'tests', 'features');
  const orphans: string[] = [];
  for (const fp of walkFeatureFiles(featuresDir)) {
    const rel = path.relative(rootDir, fp).replace(/\\/g, '/');
    if (!expectedRelPaths.has(rel)) {
      orphans.push(rel);
    }
  }
  return orphans;
}

export interface SyncCheckState {
  outOfSyncFiles: string[];
  missingFiles: string[];
  missingStepFiles: string[];
  stepLanguageMismatches: GherkinStepLanguageMismatch[];
  expectedRelPaths: Set<string>;
  totalFeatures: number;
  featuresOnly: boolean;
}

export function checkFeatureStepLanguageParity(
  rootDir: string,
  targetPath: string,
  relTarget: string,
  state: SyncCheckState
): void {
  const presentLangs = getPresentStepLanguages(rootDir, targetPath);
  const expectedLangs = resolveFeatureTargetLanguages(rootDir, targetPath);

  if (expectedLangs.length === 0) {
    if (presentLangs.length === 0) {
      state.missingStepFiles.push(relTarget);
    }
    return;
  }

  const missingLangs = expectedLangs.filter((lang) => !presentLangs.includes(lang));
  if (missingLangs.length === 0) return;

  if (presentLangs.length > 0) {
    state.stepLanguageMismatches.push({
      featureFile: relTarget,
      expectedLanguages: expectedLangs,
      foundLanguages: presentLangs,
      missingLanguages: missingLangs,
    });
  } else {
    state.missingStepFiles.push(relTarget);
  }
}

export function verifyExistingFeatureFile(
  rootDir: string,
  targetPath: string,
  expectedContent: string,
  relTarget: string,
  state: SyncCheckState
): void {
  const actualContent = fs.readFileSync(targetPath, 'utf-8');
  if (actualContent.replace(/\r\n/g, '\n') !== expectedContent.replace(/\r\n/g, '\n')) {
    state.outOfSyncFiles.push(relTarget);
  }
  if (!state.featuresOnly) {
    checkFeatureStepLanguageParity(rootDir, targetPath, relTarget, state);
  }
}

export function checkSingleMarkdownFeatureSync(rootDir: string, filePath: string, state: SyncCheckState): void {
  const { frontmatter, body } = parseMarkdownFrontmatter(fs.readFileSync(filePath, 'utf-8'));
  const gherkinBlocks = extractGherkinBlock(body);
  if (gherkinBlocks.length === 0) return;

  state.totalFeatures++;
  const id = frontmatter.id || path.basename(filePath, path.extname(filePath));
  const targetPath = resolveFeatureFilePath(rootDir, filePath, id, frontmatter['cucumber-feature-file']);
  const relTarget = path.relative(rootDir, targetPath).replace(/\\/g, '/');
  state.expectedRelPaths.add(relTarget);

  if (!fs.existsSync(targetPath)) {
    state.missingFiles.push(relTarget);
    return;
  }
  const expectedContent = buildFeatureFileContent(rootDir, filePath, id, frontmatter.version, gherkinBlocks);
  verifyExistingFeatureFile(rootDir, targetPath, expectedContent, relTarget, state);
}

export function checkGherkinInSync(
  options: GherkinExtractionOptions = {}
): GherkinSyncCheckResult {
  const rootDir = options.rootDir || process.cwd();
  const targetFiles = resolveTargetFiles(rootDir, options.targetPath);
  const state: SyncCheckState = {
    outOfSyncFiles: [],
    missingFiles: [],
    missingStepFiles: [],
    stepLanguageMismatches: [],
    expectedRelPaths: new Set<string>(),
    totalFeatures: 0,
    featuresOnly: Boolean(options.featuresOnly),
  };

  for (const filePath of targetFiles) {
    try {
      checkSingleMarkdownFeatureSync(rootDir, filePath, state);
    } catch {
      // Ignore unparseable files
    }
  }

  const orphanFeatureFiles = options.targetPath ? [] : findOrphanFeatureFiles(rootDir, state.expectedRelPaths);
  const inSync =
    state.missingFiles.length === 0 &&
    state.outOfSyncFiles.length === 0 &&
    orphanFeatureFiles.length === 0 &&
    state.missingStepFiles.length === 0 &&
    state.stepLanguageMismatches.length === 0;

  return {
    inSync,
    outOfSyncFiles: state.outOfSyncFiles,
    missingFiles: state.missingFiles,
    orphanFeatureFiles,
    missingStepFiles: state.missingStepFiles,
    stepLanguageMismatches: state.stepLanguageMismatches,
    totalFeatures: state.totalFeatures,
  };
}

export * from './gherkin-language-resolver.js';
export * from './gherkin-scaffold.js';
export * from './gherkin-auto-scaffold.js';

