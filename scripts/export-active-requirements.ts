#!/usr/bin/env node
/**
 * ==============================================================================
 * AI-SDLC: Exportador de Requerimientos Activos por Capas Extensibles
 * ==============================================================================
 * Escanea la especificación canónica y genera un documento consolidado en Markdown
 * con todos los requerimientos activos gobernados por un registro de capas extensible:
 *   1. Requerimientos Funcionales (FR-*)
 *   2. Requerimientos de Ciberseguridad (SEC-REQ-*)
 *   3. Requerimientos de Seguridad Operacional / Safety (SAF-REQ-*)
 *   4. Requerimientos y Componentes de Arquitectura (QR-*, CON-*, CMP-*, ADR-*)
 *   5. Capas adicionales registrables mediante RequirementLayerRegistry
 *
 * Uso:
 *   npx tsx scripts/export-active-requirements.ts [--out <ruta>]
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';

export interface ArtifactFrontmatter {
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
  'safety-domain'?: string;
  'safety-integrity-level'?: string;
  'mitigates-hazard'?: string | string[];
  'fail-safe-action'?: string;
  'fault-tolerance-time-ms'?: number | string;
  'satisfies-requirements'?: string[];
  'implements-use-cases'?: string[];
  level?: number;
  'implementation-type'?: string;
  interfaces?: Array<{ name: string; protocol: string }>;
  supersedes?: string | null;
  'superseded-by'?: string | null;
  [key: string]: any;
}

export interface ParsedArtifact {
  file: string;
  frontmatter: ArtifactFrontmatter;
  body: string;
}

export interface RequirementLayer {
  id: string;
  name: string;
  heading: string;
  description: string;
  methodology: string;
  canonicalPrefixes: string[];
  matches: (fm: ArtifactFrontmatter) => boolean;
  renderSummaryHeaders: string[];
  renderSummaryRow: (art: ParsedArtifact) => string;
  renderDetail: (art: ParsedArtifact, normativeText: string, relPath: string) => string;
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

export class RequirementLayerRegistry {
  private layers: RequirementLayer[] = [];

  constructor() {
    this.registerDefaultLayers();
  }

  public registerLayer(layer: RequirementLayer): void {
    const existingIndex = this.layers.findIndex((l) => l.id === layer.id);
    if (existingIndex >= 0) {
      this.layers[existingIndex] = layer;
    } else {
      this.layers.push(layer);
    }
  }

  public getLayers(): RequirementLayer[] {
    return [...this.layers];
  }

  public classify(art: ParsedArtifact): RequirementLayer | null {
    for (const layer of this.layers) {
      if (layer.matches(art.frontmatter)) {
        return layer;
      }
    }
    return null;
  }

  private registerDefaultLayers(): void {
    // 1. Capa Funcional
    this.registerLayer({
      id: 'functional',
      name: 'Funcionales',
      heading: 'Requerimientos Funcionales (Functional Requirements)',
      description: 'Representan las capacidades y comportamientos del software derivados de los Casos de Uso (`UC-*`).',
      methodology: 'Product Definition as Code (PDaC)',
      canonicalPrefixes: ['`FR-*`'],
      matches: (fm) => {
        const id = fm.id || '';
        const cat = (fm.category || '').toLowerCase();
        const type = (fm.type || '').toLowerCase();
        return (
          (cat === 'functional' || id.startsWith('FR-')) &&
          !id.startsWith('SEC-REQ-') &&
          !id.startsWith('SAF-REQ-') &&
          cat !== 'security' &&
          cat !== 'safety' &&
          type !== 'security-requirement' &&
          type !== 'safety-requirement'
        );
      },
      renderSummaryHeaders: [
        'ID Requerimiento',
        'Título',
        'Versión',
        'Deriva de (UC)',
        'Método Verificación',
        'Etiquetas BDD',
      ],
      renderSummaryRow: (art) => {
        const fm = art.frontmatter;
        const derives = Array.isArray(fm['derives-from'])
          ? fm['derives-from'].join(', ')
          : fm['derives-from'] || 'N/A';
        const tags = Array.isArray(fm['cucumber-tags'])
          ? fm['cucumber-tags'].join(' ')
          : 'N/A';
        return `| **\`${fm.id}\`** | ${fm.title || 'Sin título'} | \`${fm.version || '1.0.0'}\` | \`${derives}\` | \`${fm['verifiable-by'] || 'automatizado'}\` | \`${tags}\` |`;
      },
      renderDetail: (art, normative, relPath) => {
        const fm = art.frontmatter;
        return `#### [${fm.id}] ${fm.title}\n- **Archivo Canónico:** [\`${relPath}\`](file:///${art.file.replace(/\\/g, '/')})\n- **Versión SemVer:** \`${fm.version || '1.0.0'}\` | **Estado:** \`${fm.status}\`\n- **Enunciado Normativo:**\n  > ${normative.replace(/\n/g, '\n  > ')}\n\n`;
      },
    });

    // 2. Capa de Ciberseguridad (Security)
    this.registerLayer({
      id: 'security',
      name: 'Ciberseguridad',
      heading: 'Requerimientos de Ciberseguridad (Security Requirements)',
      description: 'Representan los controles técnicos y defensas frente a Casos de Abuso (`ABUSE-*`) y actores maliciosos (`ACT-THREAT-*`).',
      methodology: 'Security-by-Design & Zero Trust',
      canonicalPrefixes: ['`SEC-REQ-*`'],
      matches: (fm) => {
        const id = fm.id || '';
        const cat = (fm.category || '').toLowerCase();
        const type = (fm.type || '').toLowerCase();
        return (
          type === 'security-requirement' ||
          cat === 'security' ||
          id.startsWith('SEC-REQ-')
        );
      },
      renderSummaryHeaders: [
        'ID Requerimiento',
        'Título',
        'Dominio de Seguridad',
        'Mitiga Caso Abuso',
        'Enclave Asignado',
        'Estándar / Cumplimiento',
      ],
      renderSummaryRow: (art) => {
        const fm = art.frontmatter;
        const mitigates = Array.isArray(fm['mitigates-abuse-case'])
          ? fm['mitigates-abuse-case'].join(', ')
          : fm['mitigates-abuse-case'] || 'N/A';
        const compl = Array.isArray(fm['compliance-references'])
          ? fm['compliance-references'].join(', ')
          : 'N/A';
        return `| **\`${fm.id}\`** | ${fm.title || 'Sin título'} | \`${fm['security-domain'] || 'general'}\` | \`${mitigates}\` | \`${fm['enforced-in-enclave'] || 'N/A'}\` | \`${compl}\` |`;
      },
      renderDetail: (art, normative, relPath) => {
        const fm = art.frontmatter;
        return `#### [${fm.id}] ${fm.title}\n- **Archivo Canónico:** [\`${relPath}\`](file:///${art.file.replace(/\\/g, '/')})\n- **Dominio:** \`${fm['security-domain'] || 'seguridad'}\` | **Enclave:** \`${fm['enforced-in-enclave'] || 'Global'}\`\n- **Control Técnico:**\n  > ${normative.replace(/\n/g, '\n  > ')}\n\n`;
      },
    });

    // 3. Capa de Seguridad Operacional y Funcional (Safety)
    this.registerLayer({
      id: 'safety',
      name: 'Seguridad Operacional (Safety)',
      heading: 'Requerimientos de Seguridad Operacional y Funcional (Safety Requirements)',
      description: 'Mitigan peligros y accidentes operacionales no intencionados (`HAZ-*`) garantizando estados seguros (Fail-Safe) bajo estándares como DO-178C, IEC 61508 o ISO 26262.',
      methodology: 'Functional Safety & Hazard Analysis (STPA / FMEA)',
      canonicalPrefixes: ['`SAF-REQ-*`', '`SAF-*`'],
      matches: (fm) => {
        const id = fm.id || '';
        const cat = (fm.category || '').toLowerCase();
        const type = (fm.type || '').toLowerCase();
        return (
          type === 'safety-requirement' ||
          cat === 'safety' ||
          id.startsWith('SAF-REQ-') ||
          id.startsWith('SAF-')
        );
      },
      renderSummaryHeaders: [
        'ID Requerimiento',
        'Título',
        'Nivel (ASIL/DAL)',
        'Mitiga Peligro (Hazard)',
        'Acción Fail-Safe',
        'Tolerancia Fallo (FTTI)',
      ],
      renderSummaryRow: (art) => {
        const fm = art.frontmatter;
        const mitigates = Array.isArray(fm['mitigates-hazard'])
          ? fm['mitigates-hazard'].join(', ')
          : fm['mitigates-hazard'] || 'N/A';
        const ftti = fm['fault-tolerance-time-ms']
          ? `${fm['fault-tolerance-time-ms']} ms`
          : 'N/A';
        const level = fm['safety-integrity-level'] || 'N/A';
        const failsafe = fm['fail-safe-action'] || 'FAIL_SAFE';
        return `| **\`${fm.id}\`** | ${fm.title || 'Sin título'} | \`${level}\` | \`${mitigates}\` | \`${failsafe}\` | \`${ftti}\` |`;
      },
      renderDetail: (art, normative, relPath) => {
        const fm = art.frontmatter;
        return `#### [${fm.id}] ${fm.title}\n- **Archivo Canónico:** [\`${relPath}\`](file:///${art.file.replace(/\\/g, '/')})\n- **Nivel de Integridad:** \`${fm['safety-integrity-level'] || 'N/A'}\` | **Acción Fail-Safe:** \`${fm['fail-safe-action'] || 'SAFE_STATE'}\`\n- **Peligros Mitigados:** \`${Array.isArray(fm['mitigates-hazard']) ? fm['mitigates-hazard'].join(', ') : fm['mitigates-hazard'] || 'N/A'}\`\n- **Enunciado de Mitigación Operativa (Safety):**\n  > ${normative.replace(/\n/g, '\n  > ')}\n\n`;
      },
    });

    // 4. Capa de Arquitectura y Calidad (Architecture)
    this.registerLayer({
      id: 'architecture',
      name: 'Arquitectura y Calidad',
      heading: 'Requerimientos y Componentes de Arquitectura (Architecture arc42 / NAF v4)',
      description: 'Comprende requerimientos de calidad (`QR-*`), restricciones técnicas (`CON-*`), componentes aceptados (`CMP-*`) y decisiones arquitectónicas (`ADR-*`).',
      methodology: 'arc42 / NAF v4 Building Blocks',
      canonicalPrefixes: ['`QR-*`', '`CON-*`', '`CMP-*`', '`ADR-*`'],
      matches: (fm) => {
        const id = fm.id || '';
        const cat = (fm.category || '').toLowerCase();
        return (
          cat === 'quality' ||
          cat === 'constraint' ||
          id.startsWith('QR-') ||
          id.startsWith('CON-') ||
          id.startsWith('ACON-') ||
          id.startsWith('CMP-') ||
          id.startsWith('ADR-')
        );
      },
      renderSummaryHeaders: [
        'ID Artefacto',
        'Tipo',
        'Título',
        'Nivel / Categoría',
        'Satisface Requerimientos',
        'Interfaces / Decisión',
      ],
      renderSummaryRow: (art) => {
        const fm = art.frontmatter;
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

        const level = fm.level ? `Nivel ${fm.level}` : fm.category || 'N/A';

        let extra = 'N/A';
        if (Array.isArray(fm.interfaces) && fm.interfaces.length > 0) {
          extra = fm.interfaces.map((i: any) => `${i.name} (${i.protocol})`).join('; ');
        } else if (fm.id.startsWith('ADR-')) {
          extra = `Status: ${fm.status}`;
        }

        return `| **\`${fm.id}\`** | ${typeLabel} | ${fm.title || 'Sin título'} | \`${level}\` | \`${satisfies}\` | ${extra} |`;
      },
      renderDetail: (art, normative, relPath) => {
        const fm = art.frontmatter;
        let detail = `#### [${fm.id}] ${fm.title}\n- **Archivo Canónico:** [\`${relPath}\`](file:///${art.file.replace(/\\/g, '/')})\n- **Tipo:** \`${fm.type || 'architecture'}\` | **Versión:** \`${fm.version || '1.0.0'}\` | **Estado:** \`${fm.status}\`\n`;
        if (Array.isArray(fm['satisfies-requirements']) && fm['satisfies-requirements'].length > 0) {
          detail += `- **Satisface Requerimientos:** \`${fm['satisfies-requirements'].join(', ')}\`\n`;
        }
        detail += `- **Definición / Límite Arquitectónico:**\n  > ${normative.replace(/\n/g, '\n  > ')}\n\n`;
        return detail;
      },
    });
  }
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

export function generateActiveRequirementsDocument(
  rootDir: string = process.cwd(),
  registry: RequirementLayerRegistry = new RequirementLayerRegistry()
): {
  content: string;
  layerArtifacts: Map<string, ParsedArtifact[]>;
  totalActive: number;
} {
  const allFiles = walkDir(rootDir);
  const artifacts: ParsedArtifact[] = [];

  for (const file of allFiles) {
    const parsed = parseMarkdownFile(file);
    if (parsed) {
      artifacts.push(parsed);
    }
  }

  const layerArtifacts = new Map<string, ParsedArtifact[]>();
  const unclassified: ParsedArtifact[] = [];

  for (const layer of registry.getLayers()) {
    layerArtifacts.set(layer.id, []);
  }

  const NON_REQUIREMENT_TYPES = [
    'actor',
    'threat-actor',
    'use-case',
    'journey',
    'business-rule',
    'domain-term',
    'bounded-context',
    'abuse-case',
    'security-enclave',
    'user-manual',
    'production-manual',
    'spec-change-proposal',
    'handoff',
  ];

  for (const art of artifacts) {
    const fm = art.frontmatter;
    const status = (fm.status || '').toLowerCase();
    const type = (fm.type || '').toLowerCase();
    const isActive = status === 'active' || status === 'accepted';
    if (!isActive) continue;

    // Skip foundational product/security graph nodes that are not requirements
    if (NON_REQUIREMENT_TYPES.includes(type)) continue;

    const matchedLayer = registry.classify(art);
    if (matchedLayer) {
      layerArtifacts.get(matchedLayer.id)!.push(art);
    } else {
      // Zero Silent Loss: unclassified active requirements are gathered rather than lost
      unclassified.push(art);
    }
  }

  // Sort artifacts by ID in each layer
  for (const [, list] of layerArtifacts.entries()) {
    list.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
  }
  unclassified.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));

  let totalActive = 0;
  for (const [, list] of layerArtifacts.entries()) {
    totalActive += list.length;
  }
  totalActive += unclassified.length;

  const timestamp = new Date().toISOString().split('T')[0];

  let doc = `# Catálogo Consolidado de Requerimientos Activos (AI-SDLC)\n\n`;
  doc += `> **Línea Base Canónica Generada el:** ${timestamp}  \n`;
  doc += `> **Estado de Requerimientos:** \`active\` / \`accepted\`  \n`;
  doc += `> **Total Requerimientos Activos:** ${totalActive}\n\n`;

  // Resumen Ejecutivo
  doc += `## Resumen Ejecutivo de Requerimientos en Producción\n\n`;
  doc += `| Capa / Tipo de Requerimiento | Cantidad | Prefijos Canónicos | Marco Metodológico |\n`;
  doc += `| :--- | :---: | :--- | :--- |\n`;

  for (const layer of registry.getLayers()) {
    const count = layerArtifacts.get(layer.id)?.length || 0;
    doc += `| **${layer.name}** | ${count} | ${layer.canonicalPrefixes.join(', ')} | ${layer.methodology} |\n`;
  }

  if (unclassified.length > 0) {
    doc += `| **Otras Especificaciones Normativas** | ${unclassified.length} | Desconocido / Personalizado | Extensión Libre |\n`;
  }

  doc += `\n---\n\n`;

  // Secciones detalladas por capa
  let sectionIdx = 1;
  for (const layer of registry.getLayers()) {
    const list = layerArtifacts.get(layer.id) || [];
    doc += `## ${sectionIdx}. ${layer.heading}\n\n`;
    doc += `${layer.description}\n\n`;

    if (list.length === 0) {
      doc += `*No hay requerimientos en esta capa con estado activo.*\n\n`;
    } else {
      // Summary Table
      doc += `| ${layer.renderSummaryHeaders.join(' | ')} |\n`;
      doc += `| ${layer.renderSummaryHeaders.map(() => ':---').join(' | ')} |\n`;
      for (const art of list) {
        doc += `${layer.renderSummaryRow(art)}\n`;
      }
      doc += `\n### Detalle Normativo\n\n`;

      for (const art of list) {
        const relPath = path.relative(rootDir, art.file).replace(/\\/g, '/');
        const normative = extractNormativeText(art.body);
        doc += layer.renderDetail(art, normative, relPath);
      }
    }

    doc += `---\n\n`;
    sectionIdx++;
  }

  // Fallback Section for unclassified active items
  if (unclassified.length > 0) {
    doc += `## ${sectionIdx}. Otras Especificaciones Normativas Activas\n\n`;
    doc += `Artefactos activos detectados sin capa específica registrada en el modelo de capas.\n\n`;
    doc += `| ID Artefacto | Título | Tipo | Estado |\n`;
    doc += `| :--- | :--- | :--- | :---: |\n`;
    for (const art of unclassified) {
      const fm = art.frontmatter;
      doc += `| **\`${fm.id}\`** | ${fm.title || 'Sin título'} | \`${fm.type || 'desconocido'}\` | \`${fm.status}\` |\n`;
    }
    doc += `\n---\n\n`;
  }

  doc += `*Documento autogenerado por el motor de consolidación determinista \`scripts/export-active-requirements.ts\` del framework AI-SDLC.*\n`;

  return {
    content: doc,
    layerArtifacts,
    totalActive,
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
  console.log('AI-SDLC: Extractor Extensible de Requerimientos Activos');
  console.log('================================================================\n');

  const rootDir = process.cwd();
  const registry = new RequirementLayerRegistry();
  const { content, layerArtifacts, totalActive } = generateActiveRequirementsDocument(rootDir, registry);

  const reportsDir = path.dirname(outPath);
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(outPath, content, 'utf-8');

  for (const layer of registry.getLayers()) {
    const count = layerArtifacts.get(layer.id)?.length || 0;
    console.log(`[OK] Requerimientos ${layer.name.padEnd(32)}: ${count}`);
  }
  console.log(`----------------------------------------------------------------`);
  console.log(`[TOTAL] Requerimientos activos identificados: ${totalActive}`);
  console.log(`\n[ÉXITO] Documento consolidado generado exitosamente en:`);
  console.log(`  👉 ${path.relative(rootDir, outPath)}\n`);
}

main();
