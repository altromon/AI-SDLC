#!/usr/bin/env node
/**
 * ==============================================================================
 * AI-SDLC: Generador de Documento Único Consolidado de Documentación y Manuales
 * ==============================================================================
 * Concatena el archivo README.md, todos los módulos normativos de process/*.md
 * y los manuales As-Code de examples/manuals/*.md en un único documento maestro,
 * estructurado por partes con una Tabla de Contenidos (TOC) interactiva con anclas.
 *
 * Uso:
 *   npx tsx scripts/bundle-documentation.ts [--out <ruta>]
 *   pnpm report:docs
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SectionEntry {
  title: string;
  anchor: string;
  group: string;
  sourceFile: string;
  subsections: Array<{ title: string; anchor: string }>;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina tildes y diacríticos
    .replace(/[^a-z0-9\-_ ]/g, '')     // Remueve caracteres especiales
    .trim()
    .replace(/\s+/g, '-');
}

export function extractHeadings(content: string, filePrefix: string): {
  title: string;
  subsections: Array<{ title: string; anchor: string }>;
} {
  const lines = content.split(/\r?\n/);
  let mainTitle = '';
  const subsections: Array<{ title: string; anchor: string }> = [];

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)$/);
    if (h1Match && !mainTitle) {
      mainTitle = h1Match[1].trim();
      continue;
    }

    const h2Match = line.match(/^##\s+(.+)$/);
    if (h2Match) {
      const subTitle = h2Match[1].trim();
      const subAnchor = `${filePrefix}-${slugify(subTitle)}`;
      subsections.push({ title: subTitle, anchor: subAnchor });
    }
  }

  if (!mainTitle) {
    mainTitle = filePrefix;
  }

  return { title: mainTitle, subsections };
}

export function buildConsolidatedDocument(rootDir: string): {
  content: string;
  fileCount: number;
} {
  interface FileQueueItem {
    relPath: string;
    prefix: string;
    group: string;
  }

  const filesToInclude: FileQueueItem[] = [];

  // 1. Parte I: README.md principal
  const readmePath = 'README.md';
  if (fs.existsSync(path.join(rootDir, readmePath))) {
    filesToInclude.push({
      relPath: readmePath,
      prefix: 'doc-readme',
      group: 'Parte I: Introducción y Arquitectura del Framework',
    });
  }

  // 2. Parte II: Módulos de process/*.md ordenados numérica y alfabéticamente
  const processDir = path.join(rootDir, 'process');
  if (fs.existsSync(processDir)) {
    const processFiles = fs
      .readdirSync(processDir)
      .filter((file) => file.endsWith('.md'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    for (const pFile of processFiles) {
      const prefix = `cap-${path.basename(pFile, '.md').replace(/_/g, '-')}`;
      filesToInclude.push({
        relPath: path.join('process', pFile),
        prefix,
        group: 'Parte II: Especificación Normativa del Framework',
      });
    }
  }

  // 3. Parte III: Manuales As-Code (examples/manuals/*.md)
  const manualsDir = path.join(rootDir, 'examples', 'manuals');
  if (fs.existsSync(manualsDir)) {
    const manualFiles = fs
      .readdirSync(manualsDir)
      .filter((file) => file.endsWith('.md'))
      // Priorizar MAN-USER antes que MAN-PROD para coherencia de lectura
      .sort((a, b) => {
        if (a.includes('USER') && !b.includes('USER')) return -1;
        if (!a.includes('USER') && b.includes('USER')) return 1;
        return a.localeCompare(b);
      });

    for (const mFile of manualFiles) {
      const prefix = path.basename(mFile, '.md').toLowerCase().replace(/_/g, '-');
      filesToInclude.push({
        relPath: path.join('examples', 'manuals', mFile),
        prefix,
        group: 'Parte III: Manuales As-Code del Sistema',
      });
    }
  }

  const sections: SectionEntry[] = [];
  const processedBodies: Array<{
    meta: SectionEntry;
    body: string;
    originalLines: number;
  }> = [];

  for (const item of filesToInclude) {
    const fullPath = path.join(rootDir, item.relPath);
    const rawContent = fs.readFileSync(fullPath, 'utf-8');
    const { title, subsections } = extractHeadings(rawContent, item.prefix);

    const mainAnchor = item.prefix;
    const entry: SectionEntry = {
      title,
      anchor: mainAnchor,
      group: item.group,
      sourceFile: item.relPath.replace(/\\/g, '/'),
      subsections,
    };
    sections.push(entry);

    // Inyectar anclas HTML en los H2 para navegación 100% determinista
    const lines = rawContent.split(/\r?\n/);
    const transformedLines: string[] = [];

    for (const line of lines) {
      const h2Match = line.match(/^##\s+(.+)$/);
      if (h2Match) {
        const subTitle = h2Match[1].trim();
        const subAnchor = `${item.prefix}-${slugify(subTitle)}`;
        transformedLines.push(`<a id="${subAnchor}"></a>\n\n${line}`);
      } else {
        transformedLines.push(line);
      }
    }

    processedBodies.push({
      meta: entry,
      body: transformedLines.join('\n'),
      originalLines: lines.length,
    });
  }

  // Ensamblar cabecera y metadatos
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  let out = '';
  out += `# AI-SDLC: Especificación Normativa, Metodología y Manuales As-Code\n\n`;
  out += `> **Dossier y Documento Maestro Consolidado de AI-SDLC**  \n`;
  out += `> Framework de Desarrollo Híbrido para Personas y Agentes de IA  \n`;
  out += `> *Fecha de Compilación:* \`${timestamp}\` | *Módulos y Manuales Integrados:* \`${filesToInclude.length}\`  \n\n`;
  out += `---\n\n`;

  // Ensamblar Índice General (Table of Contents) agrupado por partes
  out += `## 📑 Índice General\n\n`;
  let currentGroup = '';
  for (const s of sections) {
    if (s.group !== currentGroup) {
      currentGroup = s.group;
      const groupIcon = currentGroup.includes('Parte I:')
        ? '🏛️'
        : currentGroup.includes('Parte II:')
          ? '📘'
          : '📖';
      out += `### ${groupIcon} ${currentGroup}\n\n`;
    }
    out += `- [**${s.title}**](#${s.anchor}) *(Fuente: \`${s.sourceFile}\`)*\n`;
    if (s.subsections.length > 0) {
      for (const sub of s.subsections) {
        out += `  - [${sub.title}](#${sub.anchor})\n`;
      }
    }
    out += `\n`;
  }
  out += `---\n\n`;

  // Ensamblar contenidos de cada módulo
  for (let i = 0; i < processedBodies.length; i++) {
    const { meta, body } = processedBodies[i];
    out += `<a id="${meta.anchor}"></a>\n\n`;
    out += `> 📂 **Módulo ${i + 1} de ${processedBodies.length} [${meta.group}]:** \`${meta.sourceFile}\`\n\n`;
    out += `${body.trim()}\n\n`;
    out += `---\n\n`;
  }

  out += `*Documento autogenerado por el motor de consolidación determinista \`scripts/bundle-documentation.ts\` del framework AI-SDLC.*\n`;

  return {
    content: out,
    fileCount: filesToInclude.length,
  };
}

export function main(): void {
  const args = process.argv.slice(2);
  let outPath = path.join(process.cwd(), 'reports', 'AI_SDLC_SPECIFICATION_FULL.md');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) {
      outPath = path.resolve(process.cwd(), args[i + 1]);
      i++;
    }
  }

  console.log('================================================================');
  console.log('AI-SDLC: Compilador de Documentación Integral y Manuales As-Code');
  console.log('================================================================\n');

  const rootDir = process.cwd();
  const { content, fileCount } = buildConsolidatedDocument(rootDir);

  const reportsDir = path.dirname(outPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(outPath, content, 'utf-8');

  const sizeKb = (Buffer.byteLength(content, 'utf-8') / 1024).toFixed(1);

  console.log(`[OK] Archivos procesados e indexados: ${fileCount}`);
  console.log(`[OK] Tamaño total del documento:     ${sizeKb} KB`);
  console.log(`\n[ÉXITO] Documento consolidado generado exitosamente en:`);
  console.log(`  👉 ${path.relative(rootDir, outPath)}\n`);
}

// Ejecución directa si se invoca como script
if (process.argv[1] && process.argv[1].includes('bundle-documentation')) {
  main();
}
