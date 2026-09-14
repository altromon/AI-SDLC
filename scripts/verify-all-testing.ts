#!/usr/bin/env node
/**
 * ==============================================================================
 * AI-SDLC: Auditor Determinista de Cobertura de Pruebas en Requisitos y Tareas
 * ==============================================================================
 * Asegura de forma implacable que:
 *   1. 100% de los Requisitos (FR-*, QR-*, CON-*, SEC-REQ-*) declaran y están
 *      vinculados a archivos de prueba reales existentes (.feature, .spec, benchmarks).
 *   2. 100% de las Tareas (TSK-*) en todos los planes (tasks.md) cuentan con un
 *      método y comando/criterio explícito y ejecutable de verificación.
 *
 * Emite exit code 1 y bloquea la entrega si existe cualquier requisito o tarea sin prueba.
 * Genera el informe formal: reports/TEST_VERIFICATION_AUDIT.md
 * ==============================================================================
 */

import * as fs from 'fs';
import * as path from 'path';

export interface RequirementAuditItem {
  id: string;
  title: string;
  file: string;
  isTemplate: boolean;
  method: string;
  testRefs: string;
  existingCount: number;
  status: 'VERIFICADO_CON_PRUEBA' | 'FALLO_SIN_PRUEBA';
}

export interface TaskAuditItem {
  id: string;
  title: string;
  file: string;
  method: string;
  commandOrCriteria: string;
  status: 'VERIFICADO_CON_PRUEBA' | 'FALLO_SIN_PRUEBA';
}

export interface ParsedTaskItem {
  id: string;
  title?: string;
  verification?: {
    method?: string;
    criteria?: string;
  };
}

export interface GenericFrontmatter {
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

export interface ParsedGenericDoc {
  frontmatter: GenericFrontmatter;
  body: string;
}

export function parseFrontmatter(content: string): ParsedGenericDoc {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const lines = match[1].split('\n');
  const frontmatter: GenericFrontmatter = { tasks: [] };
  let currentKey: string | null = null;
  let currentTask: ParsedTaskItem | null = null;
  let inVerification = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Manejo de tareas en tasks.md
    if (trimmed.startsWith('- id:')) {
      if (currentTask && frontmatter.tasks) frontmatter.tasks.push(currentTask);
      currentTask = {
        id: trimmed.split(':')[1].replace(/['"]/g, '').trim(),
        verification: {}
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
      continue;
    }

    // Manejo de arrays en frontmatter general
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

export function walkDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
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

export function scanTestArtifacts(rootDir: string): Map<string, string[]> {
  const reqToTestsMap = new Map<string, string[]>();

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fullPath = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name !== 'node_modules' && e.name !== '.git' && e.name !== 'dist') {
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
            // Ignore
          }
        }
      }
    }
  }

  walk(rootDir);
  return reqToTestsMap;
}

export function main(): void {
  console.log('================================================================');
  console.log('AI-SDLC: Auditoría de Cobertura de Pruebas (Requisitos & Tareas)');
  console.log('================================================================\n');

  const rootDir = process.cwd();
  const allMdFiles = walkDir(rootDir);
  const reqToTestsMap = scanTestArtifacts(rootDir);

  let auditErrors = 0;

  const requirementAudits: RequirementAuditItem[] = [];
  const taskAudits: TaskAuditItem[] = [];

  // 1. Auditar Requisitos
  for (const file of allMdFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter } = parseFrontmatter(content);
      const id = typeof frontmatter.id === 'string' ? frontmatter.id : undefined;

      if (!id) continue;

      const isReq = frontmatter.type === 'requirement' ||
                    frontmatter.type === 'security-requirement' ||
                    id.startsWith('FR-') || id.startsWith('QR-') || id.startsWith('CON-') || id.startsWith('SEC-REQ-');

      if (isReq) {
        const matchingTests = reqToTestsMap.get(id) || [];
        const isTemplate = file.includes('templates');
        const isVerified = isTemplate || matchingTests.length > 0;

        if (!isVerified) {
          auditErrors++;
        }

        const method = typeof frontmatter['verifiable-by'] === 'string'
          ? frontmatter['verifiable-by']
          : (matchingTests.some((t) => t.endsWith('.feature')) ? 'cucumber-bdd' : 'automated-unit-test');

        requirementAudits.push({
          id,
          title: typeof frontmatter.title === 'string' ? frontmatter.title : 'Sin título',
          file: path.relative(rootDir, file),
          isTemplate,
          method,
          testRefs: matchingTests.join(', ') || 'NINGUNA DETECTADA',
          existingCount: matchingTests.length,
          status: isVerified ? 'VERIFICADO_CON_PRUEBA' : 'FALLO_SIN_PRUEBA'
        });
      }
    } catch {
      // Ignorar archivos no parseables
    }
  }

  // 2. Auditar Tareas
  for (const file of allMdFiles) {
    if (file.toLowerCase().endsWith('tasks.md') || file.toLowerCase().endsWith('tasks.template.md')) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const { frontmatter } = parseFrontmatter(content);

        if (Array.isArray(frontmatter.tasks) && frontmatter.tasks.length > 0) {
          for (const t of frontmatter.tasks) {
            const criteria = t.verification?.criteria;
            const method = t.verification?.method;
            const hasCriteria = Boolean(criteria && criteria.length >= 5);
            const hasMethod = Boolean(method && method.length > 0);
            const isVerified = hasCriteria && hasMethod;

            if (!isVerified) {
              auditErrors++;
            }

            taskAudits.push({
              id: t.id,
              title: t.title || 'Sin título',
              file: path.relative(rootDir, file),
              method: method || 'AUSENTE',
              commandOrCriteria: criteria || 'AUSENTE',
              status: isVerified ? 'VERIFICADO_CON_PRUEBA' : 'FALLO_SIN_PRUEBA'
            });
          }
        }
      } catch {
        // Ignorar
      }
    }
  }

  // 3. Imprimir tablas
  console.log('--- REQUISITOS DEL SISTEMA ---');
  console.table(requirementAudits.map(r => ({
    'ID Requisito': r.id,
    'Método de Prueba': r.method,
    'Archivos de Test Vinculados': r.testRefs,
    'Pruebas Existentes en Disco': r.existingCount > 0 ? `✅ ${r.existingCount} archivo(s)` : '❌ 0',
    'Estado': r.status === 'VERIFICADO_CON_PRUEBA' ? '✅ CONFORME' : '❌ HUÉRFANO'
  })));

  console.log('\n--- TAREAS DE IMPLEMENTACIÓN ---');
  console.table(taskAudits.map(t => ({
    'ID Tarea': t.id,
    'Archivo Origen': t.file,
    'Método': t.method,
    'Comando / Criterio de Verificación': t.commandOrCriteria,
    'Estado': t.status === 'VERIFICADO_CON_PRUEBA' ? '✅ CONFORME' : '❌ SIN CRITERIO'
  })));

  // 4. Generar Informe Markdown
  const reportsDir = path.join(rootDir, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, 'TEST_VERIFICATION_AUDIT.md');

  const report: string[] = [
    `# 🧪 Auditoría Integral de Cobertura de Pruebas (Requisitos & Tareas)`,
    ``,
    `> **Fecha de Auditoría:** ${new Date().toISOString()}`,
    `> **Veredicto General:** ${auditErrors === 0 ? '100% VALIDADO CON PRUEBAS (APROBADO ✅)' : `BLOQUEADO POR FALTA DE PRUEBAS (${auditErrors} deficiencias ❌)`}`,
    ``,
    `---`,
    ``,
    `## 1. Validación de Requisitos con Pruebas Existentes`,
    ``,
    `| ID Requisito | Título | Método Declarado | Archivos de Prueba Vinculados | Estado |`,
    `| :--- | :--- | :---: | :--- | :---: |`
  ];

  for (const r of requirementAudits) {
    const icon = r.status === 'VERIFICADO_CON_PRUEBA' ? '✅ VÁLIDO' : '❌ SIN PRUEBA';
    report.push(`| **\`${r.id}\`** | ${r.title} | \`${r.method}\` | \`${r.testRefs}\` | ${icon} |`);
  }

  report.push('');
  report.push('---');
  report.push('');
  report.push('## 2. Validación de Tareas con Comandos de Verificación');
  report.push('');
  report.push('| ID Tarea | Título | Archivo Origen | Método | Comando / Criterio Objetivo | Estado |');
  report.push('| :--- | :--- | :--- | :---: | :--- | :---: |');

  for (const t of taskAudits) {
    const icon = t.status === 'VERIFICADO_CON_PRUEBA' ? '✅ VÁLIDO' : '❌ SIN CRITERIO';
    report.push(`| **\`${t.id}\`** | ${t.title} | \`${t.file}\` | \`${t.method}\` | \`${t.commandOrCriteria}\` | ${icon} |`);
  }

  report.push('');
  report.push('---');
  report.push('');
  report.push('## 3. Criterios de Bloqueo a la Liberación');
  report.push('- **Ningún Requisito sin Prueba**: Todo requerimiento funcional (`FR`), de calidad (`QR`) o de seguridad (`SEC-REQ`) debe estar cubierto por al menos un archivo `.feature` de Cucumber, suite unitaria o benchmark existente.');
  report.push('- **Ninguna Tarea sin Comando de Verificación**: Ninguna tarea de implementación puede cerrarse o fusionarse sin ejecutar su comando determinista de validación.');

  fs.writeFileSync(reportPath, report.join('\n'), 'utf-8');
  console.log(`\n[OK] Informe formal generado en: ${path.relative(rootDir, reportPath)}`);

  if (auditErrors > 0) {
    console.error(`\n[BLOQUEO DE CALIDAD] Se detectaron ${auditErrors} requisitos o tareas sin validación de prueba.`);
    process.exit(1);
  } else {
    console.log(`\n[ÉXITO] 100% de los requisitos y tareas cuentan con pruebas verificables.`);
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
