/**
 * AI-SDLC: Automated 360° Traceability Engine (RTM Validator)
 * Verifies complete coverage across:
 *   1. PDaC Handoff (HOF-*) & Product Subgraph (Upstream: UC-*, BR-*, ABUSE-*)
 *   2. arc42 / NAF v4 Architecture Views (Midstream: SRV-*, SYS-*, ADR-*, SEC-ENC-*)
 *   3. BDD / Gherkin Executable Tests (Downstream: .feature files & scenario tags)
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { scanAllProductHandoffs } from '../adapters/sdd/index.js';
import {
  ArtifactFrontmatter,
  ProductHandoff,
  TraceabilityOptions,
  TraceabilityResult,
  TraceabilityRow,
} from '../types/index.js';
import { walkMdFiles } from '../utils/fs.js';

interface ArtifactEntry {
  file: string;
  type?: string;
  title?: string;
  frontmatter: ArtifactFrontmatter;
  rawBody: string;
}

interface ServiceEntry {
  id: string;
  satisfies: string[];
}

export function parseFrontmatter(content: string): { frontmatter: ArtifactFrontmatter; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };

  try {
    const parsed = yaml.load(match[1]);
    const frontmatter = parsed && typeof parsed === 'object' ? (parsed as ArtifactFrontmatter) : {};
    return { frontmatter, body: content.substring(match[0].length) };
  } catch {
    return { frontmatter: {}, body: content.substring(match[0].length) };
  }
}

export function extractFeatureTags(featureContent: string): string[] {
  const tags: string[] = [];
  const lines = featureContent.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('@')) {
      const lineTags = line.split(/\s+/).filter((t) => t.startsWith('@'));
      for (const t of lineTags) {
        tags.push(t.substring(1)); // strip '@'
      }
    }
  }
  return Array.from(new Set(tags));
}

export function generateTraceabilityReportMarkdown(rows: TraceabilityRow[], errors: number): string {
  const isOk = errors === 0;
  const reportLines: string[] = [
    '# Matriz de Trazabilidad de Requerimientos 360° (RTM)',
    '',
    `*Fecha de Verificación: ${new Date().toISOString()}*`,
    `*Estado General: ${isOk ? '100% TRAZABLE (PASSED)' : `ERRORES DETECTADOS (${errors} brechas)`}*`,
    '',
    '## 1. Cobertura de Extremo a Extremo (PDaC Handoff ➔ arc42/NAF v4 ➔ BDD/Gherkin)',
    '',
    '| ID Requerimiento | Handoff PDaC | Título | Producto (Upstream) | Arquitectura (Midstream) | Pruebas (Downstream) | Estado Global |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :---: |',
  ];

  for (const r of rows) {
    const ok = r.productStatus === 'CONFORME' && r.archStatus === 'CONFORME' && r.testStatus === 'CONFORME';
    reportLines.push(
      `| **\`${r.id}\`** | \`${r.hofId || 'N/A'}\` | ${r.title} | \`${r.productTraces}\` | \`${r.archTraces}\` | \`${r.testTraces}\` | ${
        ok ? '✅ CONFORME' : '❌ HUÉRFANO'
      } |`
    );
  }

  reportLines.push('');
  reportLines.push('## 2. Criterios de Validación Determinista');
  reportLines.push(
    '- **Producto (Upstream)**: El requerimiento está emitido en un Handoff formal de PDaC (`HOF-*`) y deriva de un Caso de Uso (`UC-*`), Regla de Negocio (`BR-*`) o Caso de Abuso (`ABUSE-*`).'
  );
  reportLines.push(
    '- **Arquitectura (Midstream)**: El requerimiento está asignado a al menos un Servicio (`SRV-*`), Enclave (`SEC-ENC-*`), Decisión (`ADR-*`) o Vista de Ejecución arc42/NAF v4.'
  );
  reportLines.push(
    '- **Pruebas (Downstream)**: El requerimiento cuenta con escenarios ejecutables en suites BDD/Gherkin (`.feature`) con etiquetas correspondientes o tests automatizados verificados.'
  );

  return reportLines.join('\n');
}

export function verifyTraceability(options: TraceabilityOptions = {}): TraceabilityResult {
  const rootDir = options.rootDir || process.cwd();
  const allMdFiles = walkMdFiles(rootDir);

  // 1. Index all markdown artifacts
  const artifactMap = new Map<string, ArtifactEntry>();
  const servicesList: ServiceEntry[] = [];
  const architectureViews: { file: string; content: string }[] = [];

  for (const file of allMdFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      const relFile = path.relative(rootDir, file).replace(/\\/g, '/');

      if (frontmatter.id) {
        artifactMap.set(frontmatter.id, {
          file: relFile,
          type: typeof frontmatter.type === 'string' ? frontmatter.type : undefined,
          title: typeof frontmatter.title === 'string' ? frontmatter.title : undefined,
          frontmatter,
          rawBody: body,
        });

        if (frontmatter.type === 'service' || String(frontmatter.id).startsWith('SRV-')) {
          const satisfies: string[] = [];
          if (Array.isArray(frontmatter['satisfies-requirements'])) {
            satisfies.push(...(frontmatter['satisfies-requirements'] as string[]));
          }
          if (Array.isArray(frontmatter['satisfies'])) {
            satisfies.push(...(frontmatter['satisfies'] as string[]));
          }
          servicesList.push({ id: String(frontmatter.id), satisfies });
        }
      }

      // Collect arc42 / NAF v4 architecture views
      if (
        relFile.includes('architecture/') ||
        relFile.includes('06_runtime_view') ||
        relFile.includes('08_security_concept') ||
        relFile.includes('09_decisions')
      ) {
        architectureViews.push({ file: relFile, content });
      }
    } catch {
      // Ignore unparseable files
    }
  }

  // 2. Scan PDaC Handoffs (HOF-*)
  const handoffsMap = scanAllProductHandoffs(rootDir);
  const handoffList: ProductHandoff[] = Array.from(handoffsMap.values()).map((v) => v.handoff);

  // Also collect any handoffs declared in artifactMap (e.g. from markdown files with id: HOF-*)
  for (const [id, entry] of artifactMap.entries()) {
    if (id.startsWith('HOF-') && !handoffsMap.has(id)) {
      const fm = entry.frontmatter;
      const subgraph = (fm.subgraph as any) || {
        requirements: Array.isArray(fm.requirements) ? (fm.requirements as string[]) : [],
      };
      handoffList.push({
        id,
        type: 'handoff',
        title: entry.title,
        changeId: String(fm['change-id'] || fm.changeId || id),
        subgraph,
      });
    }
  }

  // Index requirement to handoff
  const reqToHandoffMap = new Map<string, ProductHandoff>();
  for (const hof of handoffList) {
    if (hof.subgraph && Array.isArray(hof.subgraph.requirements)) {
      for (const reqId of hof.subgraph.requirements) {
        reqToHandoffMap.set(reqId, hof);
      }
    }
    if (hof.subgraph && Array.isArray(hof.subgraph.securityRequirements)) {
      for (const reqId of hof.subgraph.securityRequirements) {
        reqToHandoffMap.set(reqId, hof);
      }
    }
  }

  // 3. Scan BDD / Gherkin feature files
  const featureTagMap = new Map<string, string[]>(); // reqId -> featureFiles[]

  function scanFeatureFiles(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules' && e.name !== '.git') {
          scanFeatureFiles(fullPath);
        }
      } else if (e.name.endsWith('.feature')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const tags = extractFeatureTags(content);
          const relFeature = path.relative(rootDir, fullPath).replace(/\\/g, '/');
          for (const tag of tags) {
            const existing = featureTagMap.get(tag) || [];
            if (!existing.includes(relFeature)) existing.push(relFeature);
            featureTagMap.set(tag, existing);
          }
        } catch {
          // Ignore read error
        }
      }
    }
  }

  scanFeatureFiles(rootDir);

  // 4. Identify all requirements to verify (excluding templates and process docs)
  const requirements: ArtifactEntry[] = [];
  for (const [id, data] of artifactMap.entries()) {
    if (data.file.includes('templates/') || data.file.includes('.template.') || data.file.includes('process/')) {
      continue;
    }

    if (
      data.type === 'requirement' ||
      data.type === 'security-requirement' ||
      id.startsWith('FR-') ||
      id.startsWith('QR-') ||
      id.startsWith('CON-') ||
      id.startsWith('SEC-REQ-')
    ) {
      requirements.push(data);
    }
  }

  let errorCount = 0;
  const matrixRows: TraceabilityRow[] = [];
  const orphans: TraceabilityRow[] = [];

  for (const req of requirements) {
    const fm = req.frontmatter;
    const reqId = fm.id || '';
    const associatedHandoff = reqToHandoffMap.get(reqId);

    // --- A. UPSTREAM: PRODUCT TRACEABILITY (PDaC Handoff & Subgraph) ---
    const productTraces: string[] = [];

    // From frontmatter
    if (Array.isArray(fm['derives-from'])) {
      productTraces.push(...(fm['derives-from'] as string[]));
    } else if (typeof fm['derives-from'] === 'string') {
      productTraces.push(fm['derives-from']);
    }

    if (Array.isArray(fm['mitigates-abuse-case'])) {
      productTraces.push(...(fm['mitigates-abuse-case'] as string[]));
    } else if (typeof fm['mitigates-abuse-case'] === 'string') {
      productTraces.push(fm['mitigates-abuse-case']);
    }

    // From PDaC Handoff subgraph
    if (associatedHandoff) {
      if (associatedHandoff.subgraph?.useCases) {
        productTraces.push(...associatedHandoff.subgraph.useCases);
      }
      if (associatedHandoff.subgraph?.businessRules) {
        productTraces.push(...associatedHandoff.subgraph.businessRules);
      }
      if (associatedHandoff.subgraph?.abuseCases) {
        productTraces.push(...associatedHandoff.subgraph.abuseCases);
      }
    }

    // Keep unique valid traces that exist in the artifact base
    const validProductTraces = Array.from(
      new Set(productTraces.filter((id) => artifactMap.has(id)))
    );

    const isProductConforme =
      validProductTraces.length > 0 || (associatedHandoff !== undefined && (associatedHandoff.subgraph?.requirements?.includes(reqId) ?? false));

    const productStatus: 'CONFORME' | 'HUÉRFANO' = isProductConforme ? 'CONFORME' : 'HUÉRFANO';
    if (!isProductConforme) errorCount++;

    // --- B. MIDSTREAM: ARCHITECTURE TRACEABILITY (arc42 / NAF v4) ---
    const archTraces: string[] = [];

    if (Array.isArray(fm['implemented-by-services'])) {
      archTraces.push(...(fm['implemented-by-services'] as string[]));
    } else if (typeof fm['implemented-by-services'] === 'string') {
      archTraces.push(fm['implemented-by-services']);
    }

    // Service reverse mapping
    for (const srv of servicesList) {
      if (srv.satisfies.includes(reqId)) {
        if (!archTraces.includes(srv.id)) archTraces.push(srv.id);
      }
    }

    if (typeof fm['enforced-in-enclave'] === 'string') {
      archTraces.push(fm['enforced-in-enclave']);
    }

    // Check arc42 / NAF v4 views for direct citations
    for (const view of architectureViews) {
      if (view.content.includes(reqId)) {
        const viewName = path.basename(view.file);
        if (!archTraces.includes(viewName)) archTraces.push(viewName);
      }
    }

    const uniqueArchTraces = Array.from(new Set(archTraces));
    const archStatus: 'CONFORME' | 'HUÉRFANO' = uniqueArchTraces.length > 0 ? 'CONFORME' : 'HUÉRFANO';
    if (uniqueArchTraces.length === 0) errorCount++;

    // --- C. DOWNSTREAM: TEST TRACEABILITY (BDD / Gherkin .feature) ---
    const testTraces: string[] = [];

    // Tagged .feature files
    const matchingFeatures = featureTagMap.get(reqId) || [];
    testTraces.push(...matchingFeatures);

    if (associatedHandoff) {
      const handoffFeatures = featureTagMap.get(associatedHandoff.id) || [];
      testTraces.push(...handoffFeatures);
    }

    // Frontmatter feature and test file references
    if (typeof fm['cucumber-feature-file'] === 'string') {
      const featPath = fm['cucumber-feature-file'];
      if (fs.existsSync(path.resolve(rootDir, featPath))) {
        if (!testTraces.includes(featPath)) testTraces.push(featPath);
      }
    }

    if (Array.isArray(fm['verified-by-tests'])) {
      for (const t of fm['verified-by-tests'] as string[]) {
        if (fs.existsSync(path.resolve(rootDir, t))) {
          if (!testTraces.includes(t)) testTraces.push(t);
        }
      }
    }

    const uniqueTestTraces = Array.from(new Set(testTraces));
    const testStatus: 'CONFORME' | 'HUÉRFANO' = uniqueTestTraces.length > 0 ? 'CONFORME' : 'HUÉRFANO';
    if (uniqueTestTraces.length === 0) errorCount++;

    const row: TraceabilityRow = {
      id: reqId,
      title: (fm.title as string) || 'Sin título',
      type: req.type,
      hofId: associatedHandoff?.id,
      productTraces: validProductTraces.join(', ') || (associatedHandoff ? associatedHandoff.id : 'NINGUNO'),
      productStatus,
      archTraces: uniqueArchTraces.join(', ') || 'NINGUNO',
      archStatus,
      testTraces: uniqueTestTraces.join(', ') || 'NINGUNO',
      testStatus,
    };

    matrixRows.push(row);
    if (productStatus === 'HUÉRFANO' || archStatus === 'HUÉRFANO' || testStatus === 'HUÉRFANO') {
      orphans.push(row);
    }
  }

  const reportMarkdown = generateTraceabilityReportMarkdown(matrixRows, errorCount);

  return {
    success: errorCount === 0,
    rows: matrixRows,
    orphans,
    orphanCount: orphans.length,
    totalRequirements: requirements.length,
    reportMarkdown,
  };
}
