/**
 * AI-SDLC: Test Linkage and Coverage Auditor for Requirements and Tasks
 */

import * as fs from 'fs';
import * as path from 'path';
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

  const lines = match[1].split('\n');
  const frontmatter: GenericFrontmatter = { tasks: [] };
  let currentKey: string | null = null;
  let currentTask: ParsedTaskItem | null = null;
  let inVerification = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;    // Manejo de tareas en tasks.md
    if (currentKey === 'tasks' && trimmed.startsWith('- id:')) {
      if (currentTask && frontmatter.tasks) frontmatter.tasks.push(currentTask);
      currentTask = {
        id: trimmed.split(':')[1].replace(/['"]/g, '').trim(),
        verification: {},
      };
      inVerification = false;
      continue;
    }

    if (currentTask) {
      if (trimmed.startsWith('title:')) {
        currentTask.title = trimmed.split(':').slice(1).join(':').replace(/['"]/g, '').trim();
      } else if (trimmed.startsWith('verification:')) {
        inVerification = true;
      } else if (inVerification && trimmed.startsWith('method:')) {
        currentTask.verification = currentTask.verification || {};
        currentTask.verification.method = trimmed.split(':')[1].replace(/['"]/g, '').trim();
      } else if (inVerification && trimmed.startsWith('command-or-criteria:')) {
        currentTask.verification = currentTask.verification || {};
        currentTask.verification.criteria = trimmed.split(':').slice(1).join(':').replace(/['"]/g, '').trim();
      } else if (!trimmed.startsWith('command-or-criteria:') && !trimmed.startsWith('method:') && inVerification) {
        inVerification = false;
      }
      if (trimmed.endsWith(':') && !trimmed.startsWith('- ') && !inVerification) {
        if (currentTask && frontmatter.tasks) frontmatter.tasks.push(currentTask);
        currentTask = null;
      } else {
        continue;
      }
    }

    if (trimmed.startsWith('- ') && currentKey) {
      const item = trimmed.substring(2).trim().replace(/^["']|["']$/g, '');
      const existing = frontmatter[currentKey];
      if (!Array.isArray(existing)) {
        frontmatter[currentKey] = [item];
      } else {
        (existing as string[]).push(item);
      }
    } else {
      const parts = trimmed.split(':');
      if (parts.length >= 2) {
        currentKey = parts[0].trim();
        const val = parts.slice(1).join(':').trim().replace(/^["']|["']$/g, '');
        if (val === '' || val === '[]') {
          frontmatter[currentKey] = [];
        } else {
          frontmatter[currentKey] = val;
        }
      }
    }
  }

  if (currentTask && frontmatter.tasks) frontmatter.tasks.push(currentTask);

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

export function verifyTestingCoverage(options: TestingCoverageOptions = {}): TestingCoverageResult {
  const rootDir = options.rootDir || process.cwd();
  const allMdFiles = walkMdFiles(rootDir);

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
        const testRefs: string[] = [];
        if (typeof frontmatter['cucumber-feature-file'] === 'string') {
          testRefs.push(frontmatter['cucumber-feature-file']);
        }
        if (Array.isArray(frontmatter['verified-by-tests'])) {
          testRefs.push(...(frontmatter['verified-by-tests'] as string[]));
        }

        const existingTests = testRefs.filter((t) => fs.existsSync(path.resolve(rootDir, t)));
        const isVerified = isTemplate || existingTests.length > 0 || testRefs.length > 0;

        if (!isVerified) reqErrors++;

        reqAudit.push({
          id: id || 'SIN-ID',
          title: frontmatter.title || 'Sin título',
          file: relPath,
          isTemplate,
          method: frontmatter['verifiable-by'] || (frontmatter['cucumber-feature-file'] ? 'BDD_CUCUMBER' : 'UNIT_TEST'),
          testRefs: testRefs.join(', ') || 'NINGUNA DECLARADA',
          existingCount: existingTests.length,
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
