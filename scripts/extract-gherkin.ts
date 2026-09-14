#!/usr/bin/env node
/**
 * ==============================================================================
 * AI-SDLC: Extractor Automatizado de Gherkin a Cucumber (.feature)
 * ==============================================================================
 * Extrae bloques ```gherkin``` de artefactos Markdown de requerimientos (FR/QR/SEC)
 * y genera archivos .feature listos para su ejecución con Cucumber.js o Cucumber JVM.
 *
 * Uso:
 *   npx tsx scripts/extract-gherkin.ts <archivo.md o directorio>
 *   npx tsx scripts/extract-gherkin.ts examples/product/FR-TELEMETRY-STREAM-001.md
 *   npx tsx scripts/extract-gherkin.ts --all
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

export interface MarkdownFrontmatter {
  id?: string;
  version?: string;
  'cucumber-feature-file'?: string;
  [key: string]: string | undefined;
}

export interface ParsedMarkdown {
  frontmatter: MarkdownFrontmatter;
  body: string;
}

export function parseFrontmatter(content: string): ParsedMarkdown {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const yamlLines = match[1].split('\n');
  const frontmatter: MarkdownFrontmatter = {};

  for (const line of yamlLines) {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let val = parts.slice(1).join(':').trim();
      // Eliminar comillas envolventes si existen
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

export function processFile(filePath: string, outDir: string | null = null): boolean {
  if (!fs.existsSync(filePath)) {
    console.error(`[ERROR] Archivo no encontrado: ${filePath}`);
    return false;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const { frontmatter, body } = parseFrontmatter(content);
  const gherkinBlocks = extractGherkinBlock(body);

  if (gherkinBlocks.length === 0) {
    return false;
  }

  const id = frontmatter.id || path.basename(filePath, path.extname(filePath));
  let targetPath = frontmatter['cucumber-feature-file'];

  if (!targetPath) {
    const baseDir = outDir || path.join(process.cwd(), 'tests', 'features');
    const candidateSecurity = path.join(baseDir, 'security', `${id.toLowerCase()}.feature`);
    const candidateRoot = path.join(baseDir, `${id.toLowerCase()}.feature`);
    if (fs.existsSync(candidateSecurity)) {
      targetPath = candidateSecurity;
    } else if (fs.existsSync(candidateRoot)) {
      targetPath = candidateRoot;
    } else {
      const subDir = filePath.includes('security') ? 'security' : '';
      targetPath = path.join(baseDir, subDir, `${id.toLowerCase()}.feature`);
    }
  } else if (!path.isAbsolute(targetPath)) {
    targetPath = path.join(process.cwd(), targetPath);
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });

  const banner = [
    `# ==============================================================================`,
    `# AUTO-GENERADO POR AI-SDLC (Cucumber Integration)`,
    `# Origen: ${path.relative(process.cwd(), filePath)}`,
    `# ID Requerimiento: ${id}`,
    `# Versión: ${frontmatter.version || '1.0.0'}`,
    `# NO EDITAR MANUALMENTE: Cualquier cambio debe realizarse en el Markdown origen.`,
    `# ==============================================================================`,
    '',
    ''
  ].join('\n');

  const fullFeatureContent = banner + gherkinBlocks.join('\n\n') + '\n';
  fs.writeFileSync(targetPath, fullFeatureContent, 'utf-8');

  console.log(`[OK] Extraído: ${id} ➔ ${path.relative(process.cwd(), targetPath)}`);
  return true;
}

export function walkDir(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walkDir(fullPath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

export function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log(`Uso: npx tsx scripts/extract-gherkin.ts <ruta-archivo.md | directorio | --all>`);
    process.exit(0);
  }

  let count = 0;

  if (args[0] === '--all') {
    const scanDirs = [
      path.join(process.cwd(), 'docs'),
      path.join(process.cwd(), 'examples')
    ];
    for (const d of scanDirs) {
      if (fs.existsSync(d)) {
        const mdFiles = walkDir(d);
        for (const file of mdFiles) {
          if (processFile(file)) count++;
        }
      }
    }
  } else {
    const target = path.resolve(process.cwd(), args[0]);
    if (fs.statSync(target).isDirectory()) {
      const mdFiles = walkDir(target);
      for (const file of mdFiles) {
        if (processFile(file)) count++;
      }
    } else {
      if (processFile(target)) count++;
    }
  }

  console.log(`\nProceso finalizado: ${count} archivo(s) .feature de Cucumber generados.`);
}

if (require.main === module) {
  main();
}
