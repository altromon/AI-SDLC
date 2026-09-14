/**
 * AI-SDLC: Deterministic 360° Traceability Engine (RTM Validator)
 */

import * as fs from 'fs';
import {
  ArtifactFrontmatter,
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
}

interface ServiceEntry {
  id: string;
  satisfies: string[];
}

export function parseFrontmatter(content: string): { frontmatter: ArtifactFrontmatter; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const yamlLines = match[1].split('\n');
  const frontmatter: ArtifactFrontmatter = {};
  let currentKey: string | null = null;

  for (let line of yamlLines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('- ') && currentKey) {
      const item = line.substring(2).trim().replace(/^["']|["']$/g, '');
      const existing = frontmatter[currentKey];
      if (!Array.isArray(existing)) {
        frontmatter[currentKey] = [item];
      } else {
        (existing as string[]).push(item);
      }
    } else {
      const parts = line.split(':');
      if (parts.length >= 2) {
        currentKey = parts[0].trim();
        let val = parts.slice(1).join(':').trim();
        val = val.replace(/^["']|["']$/g, '');
        if (val === '' || val === '[]') {
          frontmatter[currentKey] = [];
        } else {
          frontmatter[currentKey] = val;
        }
      }
    }
  }

  return { frontmatter, body: content.substring(match[0].length) };
}

export function generateTraceabilityReportMarkdown(rows: TraceabilityRow[], errors: number): string {
  const reportLines: string[] = [
    '# Matriz de Trazabilidad de Requerimientos 360° (RTM)',
    '',
    `*Fecha de Verificación: ${new Date().toISOString()}*`,
    `*Estado General: ${errors === 0 ? '100% TRAZABLE (PASSED)' : `ERRORES DETECTADOS (${errors} brechas)`}*`,
    '',
    '## 1. Cobertura de Extremo a Extremo',
    '',
    '| ID Requerimiento | Título | Producto (Upstream) | Arquitectura (Midstream) | Pruebas (Downstream) | Estado Global |',
    '| :--- | :--- | :--- | :--- | :--- | :---: |',
  ];

  for (const r of rows) {
    const isOk = r.productStatus === 'CONFORME' && r.archStatus === 'CONFORME' && r.testStatus === 'CONFORME';
    reportLines.push(
      `| **\`${r.id}\`** | ${r.title} | \`${r.productTraces}\` | \`${r.archTraces}\` | \`${r.testTraces}\` | ${
        isOk ? '✅ CONFORME' : '❌ HUÉRFANO'
      } |`
    );
  }

  reportLines.push('');
  reportLines.push('## 2. Criterios de Validación Cumplidos');
  reportLines.push(
    '- **Producto**: Todo requerimiento nace de un Caso de Uso (`UC-*`), Regla (`BR-*`) o Caso de Abuso (`ABUSE-*`).'
  );
  reportLines.push(
    '- **Arquitectura**: Todo requerimiento está asignado a al menos un Servicio (`SRV-*`), Enclave (`SEC-ENC-*`) o Decisión (`ADR-*`).'
  );
  reportLines.push(
    '- **Pruebas**: Todo requerimiento cuenta con archivos `.feature` de Cucumber o suites de prueba automatizadas asociadas.'
  );

  return reportLines.join('\n');
}

export function verifyTraceability(options: TraceabilityOptions = {}): TraceabilityResult {
  const rootDir = options.rootDir || process.cwd();
  const allMdFiles = walkMdFiles(rootDir);

  const artifactMap = new Map<string, ArtifactEntry>();
  const servicesList: ServiceEntry[] = [];

  for (const file of allMdFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter } = parseFrontmatter(content);
      if (frontmatter.id) {
        artifactMap.set(frontmatter.id, {
          file,
          type: typeof frontmatter.type === 'string' ? frontmatter.type : undefined,
          title: typeof frontmatter.title === 'string' ? frontmatter.title : undefined,
          frontmatter,
        });

        if (frontmatter.type === 'service') {
          servicesList.push({
            id: frontmatter.id,
            satisfies: Array.isArray(frontmatter['satisfies-requirements'])
              ? (frontmatter['satisfies-requirements'] as string[])
              : [],
          });
        }
      }
    } catch {
      // Ignore unparseable files
    }
  }

  const requirements: ArtifactEntry[] = [];
  for (const [id, data] of artifactMap.entries()) {
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

    // Upstream (Product)
    const productTraces: string[] = [];
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

    const validProductTraces = productTraces.filter((id) => artifactMap.has(id));
    const productStatus = validProductTraces.length > 0 ? 'CONFORME' : 'HUÉRFANO';
    if (validProductTraces.length === 0) errorCount++;

    // Midstream (Architecture)
    const archTraces: string[] = [];
    if (Array.isArray(fm['implemented-by-services'])) {
      archTraces.push(...(fm['implemented-by-services'] as string[]));
    } else if (typeof fm['implemented-by-services'] === 'string') {
      archTraces.push(fm['implemented-by-services']);
    }

    for (const srv of servicesList) {
      if (srv.satisfies.includes(reqId)) {
        if (!archTraces.includes(srv.id)) archTraces.push(srv.id);
      }
    }

    if (typeof fm['enforced-in-enclave'] === 'string') {
      archTraces.push(fm['enforced-in-enclave']);
    }

    const archStatus = archTraces.length > 0 ? 'CONFORME' : 'HUÉRFANO';
    if (archTraces.length === 0) errorCount++;

    // Downstream (Tests)
    const testTraces: string[] = [];
    if (typeof fm['cucumber-feature-file'] === 'string') {
      testTraces.push(fm['cucumber-feature-file']);
    }
    if (Array.isArray(fm['verified-by-tests'])) {
      testTraces.push(...(fm['verified-by-tests'] as string[]));
    }

    const testStatus = testTraces.length > 0 ? 'CONFORME' : 'HUÉRFANO';
    if (testTraces.length === 0) errorCount++;

    const row: TraceabilityRow = {
      id: reqId,
      title: fm.title || 'Sin título',
      type: req.type,
      productTraces: validProductTraces.join(', ') || 'NINGUNO',
      productStatus,
      archTraces: archTraces.join(', ') || 'NINGUNO',
      archStatus,
      testTraces: testTraces.join(', ') || 'NINGUNO',
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
