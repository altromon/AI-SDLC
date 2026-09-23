/**
 * AI-SDLC: Test Linkage and Coverage Auditor for Requirements and Tasks
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  RequirementAuditItem,
  TaskAuditItem,
  TestingCoverageOptions,
  TestingCoverageResult,
} from '../types/index.js';
import { walkMdFiles } from '../utils/fs.js';

interface ParsedTaskItem {
  id: string;
  title?: string;
  verification?: {
    method?: string;
    criteria?: string;
  };
}

interface GenericFrontmatter {
  id?: string;
  title?: string;
  type?: string;
  'cucumber-feature-file'?: string;
  'verified-by-tests'?: string[];
  'verifiable-by'?: string;
  'acceptance-format'?: string;
  tasks?: ParsedTaskItem[];
  [key: string]: unknown;
}

export function parseGenericDoc(content: string): { frontmatter: GenericFrontmatter; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };

  let parsed: unknown;
  try {
    parsed = yaml.load(match[1]);
  } catch {
    return { frontmatter: {}, body: content };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { frontmatter: {}, body: content };
  }

  const raw = parsed as Record<string, unknown>;

  const rawTasks = Array.isArray(raw['tasks']) ? (raw['tasks'] as Record<string, unknown>[]) : [];
  const tasks: ParsedTaskItem[] = rawTasks.map((t) => {
    const verification: ParsedTaskItem['verification'] = {};
    if (t['verification'] && typeof t['verification'] === 'object') {
      const v = t['verification'] as Record<string, unknown>;
      if (typeof v['method'] === 'string') verification.method = v['method'];
      if (typeof v['command-or-criteria'] === 'string') verification.criteria = v['command-or-criteria'];
    }
    return {
      id: typeof t['id'] === 'string' ? t['id'] : String(t['id'] ?? ''),
      title: typeof t['title'] === 'string' ? t['title'] : undefined,
      verification,
    };
  });

  const verifiedBy = raw['verified-by-tests'];
  const frontmatter: GenericFrontmatter = {
    ...raw,
    tasks,
    'verified-by-tests': Array.isArray(verifiedBy)
      ? (verifiedBy as unknown[]).map(String)
      : typeof verifiedBy === 'string'
        ? [verifiedBy]
        : undefined,
  };

  return { frontmatter, body: content.substring(match[0].length) };
}



export function generateTestingCoverageReportMarkdown(
  reqAudit: RequirementAuditItem[],
  taskAudit: TaskAuditItem[],
  reqErrors: number,
  taskErrors: number
): string {
  const totalErrors = reqErrors + taskErrors;
  const reportLines: string[] = [
    `# 🧪 Auditoría Determinista de Cobertura de Pruebas en Requisitos y Tareas`,
    ``,
    `> **Fecha de Auditoría:** ${new Date().toISOString()}`,
    `> **Veredicto General:** ${
      totalErrors === 0
        ? '100% VERIFICADO CON PRUEBAS (PASSED)'
        : `BLOQUEADO: Se detectaron ${totalErrors} elementos sin pruebas (${reqErrors} Requisitos, ${taskErrors} Tareas)`
    }`,
    ``,
    `---`,
    ``,
    `## 1. Auditoría de Requisitos (Producto, Calidad y Seguridad)`,
    ``,
    `| ID Requerimiento | Título | Archivo Origen | Método Declarado | Archivos de Prueba Vinculados | Estado |`,
    `| :--- | :--- | :--- | :---: | :--- | :---: |`,
  ];

  for (const r of reqAudit) {
    const icon = r.status === 'VERIFICADO_CON_PRUEBA' ? '✅ VERIFICADO' : '❌ SIN PRUEBA';
    reportLines.push(
      `| **\`${r.id}\`** | ${r.title} | \`${r.file}\` | \`${r.method}\` | \`${r.testRefs}\` | ${icon} |`
    );
  }

  reportLines.push('');
  reportLines.push('---');
  reportLines.push('');
  reportLines.push('## 2. Auditoría de Tareas (Ingeniería de Entrega SDD)');
  reportLines.push('');
  reportLines.push(
    '| ID Tarea | Título | Archivo tasks.md | Método | Comando / Criterio de Verificación | Estado |'
  );
  reportLines.push('| :--- | :--- | :--- | :---: | :--- | :---: |');

  for (const t of taskAudit) {
    const icon = t.status === 'VERIFICADO_CON_PRUEBA' ? '✅ VERIFICADO' : '❌ SIN PRUEBA';
    reportLines.push(
      `| **\`${t.id}\`** | ${t.title} | \`${t.file}\` | \`${t.method}\` | \`${t.commandOrCriteria}\` | ${icon} |`
    );
  }

  return reportLines.join('\n');
}

export function scanAllTestArtifacts(rootDir: string): Map<string, string[]> {
  const reqToTestsMap = new Map<string, string[]>();

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules' && e.name !== '.git' && e.name !== 'dist' && e.name !== 'scratch' && e.name !== 'fixtures') {
          walk(fullPath);
        }
      } else {
        const isFeature = e.name.endsWith('.feature');
        const isCodeTest =
          e.name.endsWith('.spec.ts') ||
          e.name.endsWith('.spec.js') ||
          e.name.endsWith('.test.ts') ||
          e.name.endsWith('.test.js') ||
          e.name.endsWith('_test.py') ||
          e.name.endsWith('_test.go');

        if (isFeature || isCodeTest) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const relTest = path.relative(rootDir, fullPath).replace(/\\/g, '/');

            if (isFeature) {
              const lines = content.split('\n');
              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('@')) {
                  const tags = trimmed.split(/\s+/).filter((t) => t.startsWith('@'));
                  for (const t of tags) {
                    const reqId = t.substring(1);
                    const existing = reqToTestsMap.get(reqId) || [];
                    if (!existing.includes(relTest)) existing.push(relTest);
                    reqToTestsMap.set(reqId, existing);
                  }
                }
              }
            }

            const idMatches = content.match(/\b(FR|QR|CON|SEC-REQ)-[A-Z0-9]+(-[A-Z0-9]+)*\b/g);
            if (idMatches) {
              for (const reqId of idMatches) {
                const existing = reqToTestsMap.get(reqId) || [];
                if (!existing.includes(relTest)) existing.push(relTest);
                reqToTestsMap.set(reqId, existing);
              }
            }
          } catch {
            // Ignore read errors
          }
        }
      }
    }
  }

  walk(rootDir);
  return reqToTestsMap;
}

export function verifyTestingCoverage(options: TestingCoverageOptions = {}): TestingCoverageResult {
  const rootDir = options.rootDir || process.cwd();
  const allMdFiles = walkMdFiles(rootDir);
  const reqToTestsMap = scanAllTestArtifacts(rootDir);

  const reqAudit: RequirementAuditItem[] = [];
  const taskAudit: TaskAuditItem[] = [];

  let reqErrors = 0;
  let taskErrors = 0;

  for (const file of allMdFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter } = parseGenericDoc(content);
      const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
      const isTemplate = relPath.includes('templates/');

      const id = frontmatter.id || '';
      const isRequirement =
        frontmatter.type === 'requirement' ||
        frontmatter.type === 'security-requirement' ||
        id.startsWith('FR-') ||
        id.startsWith('QR-') ||
        id.startsWith('CON-') ||
        id.startsWith('SEC-REQ-');

      if (isRequirement) {
        const matchingTests = reqToTestsMap.get(id) || [];
        const isVerified = isTemplate || matchingTests.length > 0;

        if (!isVerified) reqErrors++;

        reqAudit.push({
          id: id || 'SIN-ID',
          title: frontmatter.title || 'Sin título',
          file: relPath,
          isTemplate,
          method:
            (frontmatter['verifiable-by'] as string) ||
            (matchingTests.some((t) => t.endsWith('.feature')) ? 'BDD_CUCUMBER' : 'TEST_EXECUTION'),
          testRefs: matchingTests.join(', ') || 'NINGUNA DETECTADA',
          existingCount: matchingTests.length,
          status: isVerified ? 'VERIFICADO_CON_PRUEBA' : 'FALLO_SIN_PRUEBA',
        });
      }

      if (Array.isArray(frontmatter.tasks) && frontmatter.tasks.length > 0) {
        for (const t of frontmatter.tasks) {
          const crit = t.verification?.criteria || '';
          const meth = t.verification?.method || 'TEST_EXECUTION';
          const hasProof = isTemplate || (crit.length > 4 && !crit.includes('TODO') && !crit.includes('TBD'));

          if (!hasProof) taskErrors++;

          taskAudit.push({
            id: t.id,
            title: t.title || 'Sin título',
            file: relPath,
            method: meth,
            commandOrCriteria: crit || 'AUSENTE',
            status: hasProof ? 'VERIFICADO_CON_PRUEBA' : 'FALLO_SIN_PRUEBA',
          });
        }
      }
    } catch {
      // Ignore unparseable files
    }
  }

  const reportMarkdown = generateTestingCoverageReportMarkdown(reqAudit, taskAudit, reqErrors, taskErrors);

  return {
    success: reqErrors === 0 && taskErrors === 0,
    totalRequirements: reqAudit.length,
    passedRequirements: reqAudit.length - reqErrors,
    failedRequirements: reqErrors,
    totalTasks: taskAudit.length,
    passedTasks: taskAudit.length - taskErrors,
    failedTasks: taskErrors,
    requirements: reqAudit,
    tasks: taskAudit,
    reportMarkdown,
  };
}
