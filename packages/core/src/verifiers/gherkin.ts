/**
 * AI-SDLC: Automated Gherkin to Cucumber (.feature) Extraction Engine
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ExtractedFeature,
  GherkinExtractionOptions,
  GherkinExtractionResult,
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



export function extractGherkinFeatures(
  options: GherkinExtractionOptions = {}
): GherkinExtractionResult {
  const rootDir = options.rootDir || process.cwd();
  const features: ExtractedFeature[] = [];
  let totalScenarios = 0;

  const targetFiles: string[] = [];
  if (options.targetPath) {
    const fullTarget = path.isAbsolute(options.targetPath)
      ? options.targetPath
      : path.join(rootDir, options.targetPath);
    if (fs.existsSync(fullTarget)) {
      if (fs.statSync(fullTarget).isDirectory()) {
        targetFiles.push(...walkMdFiles(fullTarget));
      } else {
        targetFiles.push(fullTarget);
      }
    }
  } else {
    // Default search in product, security, and specs directories
    const searchDirs = [
      path.join(rootDir, 'examples', 'product'),
      path.join(rootDir, 'examples', 'security'),
      path.join(rootDir, 'examples', 'specs'),
      path.join(rootDir, 'specs'),
    ];
    for (const d of searchDirs) {
      if (fs.existsSync(d)) {
        targetFiles.push(...walkMdFiles(d));
      }
    }
  }

  for (const filePath of targetFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const { frontmatter, body } = parseMarkdownFrontmatter(content);
      const gherkinBlocks = extractGherkinBlock(body);

      if (gherkinBlocks.length === 0) continue;

      const id = frontmatter.id || path.basename(filePath, path.extname(filePath));
      let targetPath = frontmatter['cucumber-feature-file'];

      if (!targetPath) {
        const baseDir = path.join(rootDir, 'tests', 'features');
        targetPath = path.join(baseDir, `${id.toLowerCase()}.feature`);
      } else if (!path.isAbsolute(targetPath)) {
        targetPath = path.join(rootDir, targetPath);
      }

      fs.mkdirSync(path.dirname(targetPath), { recursive: true });

      const banner = [
        `# ==============================================================================`,
        `# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)`,
        `# Origen: ${path.relative(rootDir, filePath).replace(/\\/g, '/')}`,
        `# ID Requerimiento: ${id}`,
        `# Versión: ${frontmatter.version || '1.0.0'}`,
        `# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.`,
        `# ==============================================================================`,
        '',
        '',
      ].join('\n');

      const fullFeatureContent = banner + gherkinBlocks.join('\n\n') + '\n';
      fs.writeFileSync(targetPath, fullFeatureContent, 'utf-8');

      // Count scenarios
      let scenarioCount = 0;
      for (const block of gherkinBlocks) {
        const matches = block.match(/\b(Scenario|Escenario|Scenario Outline|Esquema del escenario):/g);
        if (matches) scenarioCount += matches.length;
      }
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

  return {
    success: true,
    features,
    totalScenarios,
  };
}
