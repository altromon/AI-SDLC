/**
 * AI-SDLC: Automated Gherkin to Cucumber (.feature) Extraction Engine
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ExtractedFeature,
  GherkinExtractionOptions,
  GherkinExtractionResult,
  GherkinSyncCheckResult,
} from '../types/index.js';
import { walkMdFiles } from '../utils/fs.js';

interface MarkdownFrontmatter {
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
    path.join(rootDir, 'specs'),
    path.join(rootDir, 'examples', 'product'),
    path.join(rootDir, 'examples', 'security'),
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
  const candidateRoot = path.join(baseDir, `${id.toLowerCase()}.feature`);
  if (fs.existsSync(candidateSecurity)) return candidateSecurity;
  if (fs.existsSync(candidateRoot)) return candidateRoot;
  const subDir = filePath.includes('security') ? 'security' : '';
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

function countScenarios(gherkinBlocks: string[]): number {
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

export function checkGherkinInSync(
  options: GherkinExtractionOptions = {}
): GherkinSyncCheckResult {
  const rootDir = options.rootDir || process.cwd();
  const targetFiles = resolveTargetFiles(rootDir, options.targetPath);
  const outOfSyncFiles: string[] = [];
  const missingFiles: string[] = [];
  let totalFeatures = 0;

  for (const filePath of targetFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const { frontmatter, body } = parseMarkdownFrontmatter(content);
      const gherkinBlocks = extractGherkinBlock(body);
      if (gherkinBlocks.length === 0) continue;

      totalFeatures++;
      const id = frontmatter.id || path.basename(filePath, path.extname(filePath));
      const targetPath = resolveFeatureFilePath(rootDir, filePath, id, frontmatter['cucumber-feature-file']);
      const relTarget = path.relative(rootDir, targetPath).replace(/\\/g, '/');

      if (!fs.existsSync(targetPath)) {
        missingFiles.push(relTarget);
        continue;
      }

      const expectedContent = buildFeatureFileContent(rootDir, filePath, id, frontmatter.version, gherkinBlocks);
      const actualContent = fs.readFileSync(targetPath, 'utf-8');
      if (actualContent.replace(/\r\n/g, '\n') !== expectedContent.replace(/\r\n/g, '\n')) {
        outOfSyncFiles.push(relTarget);
      }
    } catch {
      // Ignore unparseable files
    }
  }

  return {
    inSync: missingFiles.length === 0 && outOfSyncFiles.length === 0,
    outOfSyncFiles,
    missingFiles,
    totalFeatures,
  };
}
