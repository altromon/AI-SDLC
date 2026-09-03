#!/usr/bin/env node
/**
 * ==============================================================================
 * AI-SDLC: Extractor Automatizado de Gherkin a Cucumber (.feature)
 * ==============================================================================
 * Extrae bloques ```gherkin``` de artefactos Markdown de requerimientos (FR/QR/SEC)
 * y genera archivos .feature listos para su ejecución con Cucumber.js o Cucumber JVM.
 *
 * Uso:
 *   node scripts/extract-gherkin.js <archivo.md o directorio>
 *   node scripts/extract-gherkin.js examples/product/FR-TELEMETRY-STREAM-001.md
 *   node scripts/extract-gherkin.js --all
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const yamlLines = match[1].split('\n');
  const frontmatter = {};

  for (const line of yamlLines) {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let val = parts.slice(1).join(':').trim();
      // Remove quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      frontmatter[key] = val;
    }
  }

  const body = content.substring(match[0].length);
  return { frontmatter, body };
}

function extractGherkinBlock(body) {
  const gherkinRegex = /```gherkin\r?\n([\s\S]*?)\r?\n```/g;
  const blocks = [];
  let match;
  while ((match = gherkinRegex.exec(body)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

function processFile(filePath, outDir = null) {
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
    targetPath = path.join(baseDir, `${id.toLowerCase()}.feature`);
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

function walkDir(dir, fileList = []) {
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

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log(`Uso: node scripts/extract-gherkin.js <ruta-archivo.md | directorio | --all>`);
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

main();
