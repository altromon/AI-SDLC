#!/usr/bin/env node
/**
 * ==============================================================================
 * AI-SDLC: Exportador de Requerimientos Activos por Tipo
 * ==============================================================================
 * Escanea la especificación canónica y genera un documento consolidado en Markdown
 * con todos los requerimientos activos clasificados en:
 *   1. Requerimientos Funcionales (FR-*)
 *   2. Requerimientos de Seguridad (SEC-REQ-*)
 *   3. Requerimientos y Componentes de Arquitectura (QR-*, CON-*, CMP-*, ADR-*)
 *
 * Uso:
 *   npx tsx scripts/export-active-requirements.ts [--out <ruta>]
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';

interface ArtifactFrontmatter {
  id: string;
  type?: string;
  title?: string;
  status?: string;
  version?: string;
  category?: string;
  'derives-from'?: string | string[];
  'verifiable-by'?: string;
  'acceptance-format'?: string;
  'cucumber-tags'?: string[];
  'security-domain'?: string;
  'mitigates-abuse-case'?: string | string[];
  'enforced-in-enclave'?: string;
  'compliance-references'?: string[];
  'satisfies-requirements'?: string[];
  'implements-use-cases'?: string[];
  level?: number;
  'implementation-type'?: string;
  supersedes?: string | null;
  'superseded-by'?: string | null;
  [key: string]: any;
}

interface ParsedArtifact {
  file: string;
  frontmatter: ArtifactFrontmatter;
  body: string;
}

function parseMarkdownFile(filePath: string): ParsedArtifact | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---([\s\S]*)$/);
    if (!match) return null;

    const frontmatter = yaml.load(match[1]) as ArtifactFrontmatter;
    if (!frontmatter || !frontmatter.id) return null;

    return {
      file: filePath,
      frontmatter,
      body: match[2].trim(),
    };
  } catch {
    return null;
  }
}

function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        ![
          'node_modules',
          '.git',
          'dist',
          '.changeset',
          'scratch',
          'test-scaffold',
          'fixtures',
          'templates',
        ].includes(entry.name) &&
        !fullPath.includes(path.join('specs', 'changes'))
      ) {
        walkDir(fullPath, fileList);
      }
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      if (!entry.name.includes('.template.')) {
        fileList.push(fullPath);
      }
    }
  }

  return fileList;
}

function extractNormativeText(body: string): string {
  const secMatch = body.match(/##\s+1\.\s+([^\n]+)\r?\n([\s\S]*?)(?=\r?\n---|\r?\n##|$)/);
  if (secMatch) {
    return secMatch[2].trim();
  }
  const paragraphs = body
    .split(/\r?\n\r?\n/)
    .filter((p) => !p.startsWith('#') && p.trim().length > 0);
  return paragraphs[0] || 'Sin descripción detallada.';
}

export function generateActiveRequirementsDocument(rootDir: string = process.cwd()): {
  content: string;
  functional: ParsedArtifact[];
  security: ParsedArtifact[];
  architecture: ParsedArtifact[];
} {
  const allFiles = walkDir(rootDir);
  const artifacts: ParsedArtifact[] = [];

  for (const file of allFiles) {
    const parsed = parseMarkdownFile(file);
    if (parsed) {
      artifacts.push(parsed);
    }
  }

  const functional: ParsedArtifact[] = [];
  const security: ParsedArtifact[] = [];
  const architecture: ParsedArtifact[] = [];

  for (const art of artifacts) {
    const fm = art.frontmatter;
    const status = (fm.status || '').toLowerCase();
    const id = fm.id;

    const isActive = status === 'active' || status === 'accepted';
    if (!isActive) continue;

    // 1. Functional Requirements
    if (
      (fm.category === 'functional' || id.startsWith('FR-')) &&
      !id.startsWith('SEC-REQ-')
    ) {
      functional.push(art);
    }
    // 2. Security Requirements
    else if (
      fm.type === 'security-requirement' ||
      fm.category === 'security' ||
      id.startsWith('SEC-REQ-')
    ) {
      security.push(art);
    }
    // 3. Architecture (Quality Requirements, Constraints, Architecture Components & ADRs)
    else if (
      fm.category === 'quality' ||
      fm.category === 'constraint' ||
      id.startsWith('QR-') ||
      id.startsWith('CON-') ||
      id.startsWith('ACON-') ||
      id.startsWith('CMP-') ||
      id.startsWith('ADR-')
    ) {
      architecture.push(art);
    }
  }

  functional.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
  security.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
  architecture.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));

  const timestamp = new Date().toISOString().split('T')[0];

  let doc = `# Catálogo Consolidado de Requerimientos Activos (AI-SDLC)\n\n`;
  doc += `> **Línea Base Canónica Generada el:** ${timestamp}  \n`;
  doc += `> **Estado de Requerimientos:** \`active\` / \`accepted\`  \n`;
  doc += `> **Total Requerimientos Activos:** ${functional.length + security.length + architecture.length}\n\n`;

  doc += `## Resumen Ejecutivo de Requerimientos en Producción\n\n`;
  doc += `| Tipo de Requerimiento | Cantidad | Prefijos Canónicos | Marco Metodológico |\n`;
  doc += `| :--- | :---: | :--- | :--- |\n`;
  doc += `| **Funcionales** | ${functional.length} | \`FR-*\` | Product Definition as Code (PDaC) |\n`;
  doc += `| **Ciberseguridad** | ${security.length} | \`SEC-REQ-*\` | Security-by-Design & Zero Trust |\n`;
  doc += `| **Arquitectura y Calidad** | ${architecture.length} | \`QR-*\`, \`CON-*\`, \`CMP-*\`, \`ADR-*\` | arc42 / NAF v4 Building Blocks |\n\n`;
  doc += `---\n\n`;

  // =========================================================================
  // SECCIÓN 1: REQUERIMIENTOS FUNCIONALES
  // =========================================================================
  doc += `## 1. Requerimientos Funcionales (Functional Requirements)\n\n`;
  doc += `Representan las capacidades y comportamientos del software derivados de los Casos de Uso (\`UC-*\`).\n\n`;

  if (functional.length === 0) {
    doc += `*No hay requerimientos funcionales en estado activo.*\n\n`;
  } else {
    doc += `| ID Requerimiento | Título | Versión | Deriva de (UC) | Método Verificación | Etiquetas BDD |\n`;
    doc += `| :--- | :--- | :---: | :--- | :--- | :--- |\n`;
    for (const f of functional) {
      const fm = f.frontmatter;
      const derives = Array.isArray(fm['derives-from'])
        ? fm['derives-from'].join(', ')
        : fm['derives-from'] || 'N/A';
      const tags = Array.isArray(fm['cucumber-tags'])
        ? fm['cucumber-tags'].join(' ')
        : 'N/A';
      doc += `| **\`${fm.id}\`** | ${fm.title || 'Sin título'} | \`${fm.version || '1.0.0'}\` | \`${derives}\` | \`${fm['verifiable-by'] || 'automatizado'}\` | \`${tags}\` |\n`;
    }
    doc += `\n### Detalle Normativo de Requerimientos Funcionales\n\n`;

    for (const f of functional) {
      const fm = f.frontmatter;
      const relPath = path.relative(rootDir, f.file).replace(/\\/g, '/');
      const normative = extractNormativeText(f.body);

      doc += `#### [${fm.id}] ${fm.title}\n`;
      doc += `- **Archivo Canónico:** [\`${relPath}\`](file:///${f.file.replace(/\\/g, '/')})\n`;
      doc += `- **Versión SemVer:** \`${fm.version || '1.0.0'}\` | **Estado:** \`${fm.status}\`\n`;
      doc += `- **Enunciado Normativo:**\n`;
      doc += `  > ${normative.replace(/\n/g, '\n  > ')}\n\n`;
    }
  }

  doc += `---\n\n`;

  // =========================================================================
  // SECCIÓN 2: REQUERIMIENTOS DE CIBERSEGURIDAD
  // =========================================================================
  doc += `## 2. Requerimientos de Ciberseguridad (Security Requirements)\n\n`;
  doc += `Representan los controles técnicos y mitigaciones formales frente a Casos de Abuso (\`ABUSE-*\`) y actores de amenaza (\`ACT-THREAT-*\`).\n\n`;

  if (security.length === 0) {
    doc += `*No hay requerimientos de seguridad en estado activo.*\n\n`;
  } else {
    doc += `| ID Requerimiento | Título | Dominio de Seguridad | Mitiga Caso Abuso | Enclave Asignado | Estándar / Cumplimiento |\n`;
    doc += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const s of security) {
      const fm = s.frontmatter;
      const mitigates = Array.isArray(fm['mitigates-abuse-case'])
        ? fm['mitigates-abuse-case'].join(', ')
        : fm['mitigates-abuse-case'] || 'N/A';
      const compl = Array.isArray(fm['compliance-references'])
        ? fm['compliance-references'].join(', ')
        : 'N/A';
      doc += `| **\`${fm.id}\`** | ${fm.title || 'Sin título'} | \`${fm['security-domain'] || 'general'}\` | \`${mitigates}\` | \`${fm['enforced-in-enclave'] || 'N/A'}\` | \`${compl}\` |\n`;
    }
    doc += `\n### Detalle de Controles Técnicos de Seguridad\n\n`;

    for (const s of security) {
      const fm = s.frontmatter;
      const relPath = path.relative(rootDir, s.file).replace(/\\/g, '/');
      const normative = extractNormativeText(s.body);

      doc += `#### [${fm.id}] ${fm.title}\n`;
      doc += `- **Archivo Canónico:** [\`${relPath}\`](file:///${s.file.replace(/\\/g, '/')})\n`;
      doc += `- **Dominio:** \`${fm['security-domain'] || 'seguridad'}\` | **Enclave:** \`${fm['enforced-in-enclave'] || 'Global'}\`\n`;
      doc += `- **Control Técnico:**\n`;
      doc += `  > ${normative.replace(/\n/g, '\n  > ')}\n\n`;
    }
  }

  doc += `---\n\n`;

  // =========================================================================
  // SECCIÓN 3: REQUERIMIENTOS Y ESPECIFICACIONES DE ARQUITECTURA
  // =========================================================================
  doc += `## 3. Requerimientos y Componentes de Arquitectura (Architecture arc42 / NAF v4)\n\n`;
  doc += `Comprende requerimientos de calidad (\`QR-*\`), restricciones técnicas (\`CON-*\`), componentes aceptados (\`CMP-*\`) y decisiones arquitectónicas (\`ADR-*\`).\n\n`;

  if (architecture.length === 0) {
    doc += `*No hay requerimientos ni componentes arquitectónicos activos.*\n\n`;
  } else {
    doc += `| ID Artefacto | Tipo | Título | Nivel / Categoría | Satisface Requerimientos | Interfaces / Decisión |\n`;
    doc += `| :--- | :--- | :--- | :---: | :--- | :--- |\n`;
    for (const a of architecture) {
      const fm = a.frontmatter;
      const typeLabel = fm.id.startsWith('QR-')
        ? 'Requisito de Calidad'
        : fm.id.startsWith('CON-')
        ? 'Restricción'
        : fm.id.startsWith('ADR-')
        ? 'Decisión (ADR)'
        : 'Componente arc42';

      const satisfies = Array.isArray(fm['satisfies-requirements'])
        ? fm['satisfies-requirements'].join(', ')
        : 'N/A';

      const level = fm.level ? `Nivel ${fm.level}` : (fm.category || 'N/A');

      let extra = 'N/A';
      if (Array.isArray(fm.interfaces) && fm.interfaces.length > 0) {
        extra = fm.interfaces.map((i: any) => `${i.name} (${i.protocol})`).join('; ');
      } else if (fm.id.startsWith('ADR-')) {
        extra = `Status: ${fm.status}`;
      }

      doc += `| **\`${fm.id}\`** | ${typeLabel} | ${fm.title || 'Sin título'} | \`${level}\` | \`${satisfies}\` | ${extra} |\n`;
    }

    doc += `\n### Detalle Normativo de Arquitectura y Calidad\n\n`;

    for (const a of architecture) {
      const fm = a.frontmatter;
      const relPath = path.relative(rootDir, a.file).replace(/\\/g, '/');
      const normative = extractNormativeText(a.body);

      doc += `#### [${fm.id}] ${fm.title}\n`;
      doc += `- **Archivo Canónico:** [\`${relPath}\`](file:///${a.file.replace(/\\/g, '/')})\n`;
      doc += `- **Tipo:** \`${fm.type || 'architecture'}\` | **Versión:** \`${fm.version || '1.0.0'}\` | **Estado:** \`${fm.status}\`\n`;
      if (Array.isArray(fm['satisfies-requirements']) && fm['satisfies-requirements'].length > 0) {
        doc += `- **Satisface Requerimientos:** \`${fm['satisfies-requirements'].join(', ')}\`\n`;
      }
      doc += `- **Definición / Límite Arquitectónico:**\n`;
      doc += `  > ${normative.replace(/\n/g, '\n  > ')}\n\n`;
    }
  }

  doc += `---\n\n`;
  doc += `*Documento autogenerado por el motor de consolidación determinista \`scripts/export-active-requirements.ts\` del framework AI-SDLC.*\n`;

  return {
    content: doc,
    functional,
    security,
    architecture,
  };
}

export function main(): void {
  const args = process.argv.slice(2);
  let outPath = path.join(process.cwd(), 'reports', 'ACTIVE_REQUIREMENTS.md');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) {
      outPath = path.resolve(process.cwd(), args[i + 1]);
      i++;
    }
  }

  console.log('================================================================');
  console.log('AI-SDLC: Extractor de Requerimientos Activos por Tipo');
  console.log('================================================================\n');

  const rootDir = process.cwd();
  const { content, functional, security, architecture } = generateActiveRequirementsDocument(rootDir);

  const reportsDir = path.dirname(outPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(outPath, content, 'utf-8');

  console.log(`[OK] Requerimientos Funcionales identificados:   ${functional.length}`);
  console.log(`[OK] Requerimientos de Seguridad identificados: ${security.length}`);
  console.log(`[OK] Requerimientos de Arquitectura ident.:     ${architecture.length}`);
  console.log(`\n[ÉXITO] Documento consolidado generado exitosamente en:`);
  console.log(`  👉 ${path.relative(rootDir, outPath)}\n`);
}

main();
