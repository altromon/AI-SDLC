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

const fs = require('fs');
const path = require('path');

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const lines = match[1].split('\n');
  const frontmatter = { tasks: [] };
  let currentKey = null;
  let currentTask = null;
  let inVerification = false;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Manejo de tareas en tasks.md
    if (trimmed.startsWith('- id:')) {
      if (currentTask) frontmatter.tasks.push(currentTask);
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
        currentTask.verification.method = trimmed.split(':')[1].replace(/['"]/g, '').trim();
      } else if (inVerification && trimmed.startsWith('command-or-criteria:')) {
        currentTask.verification.criteria = trimmed.split(':').slice(1).join(':').replace(/['"]/g, '').trim();
      } else if (!trimmed.startsWith('command-or-criteria:') && !trimmed.startsWith('method:') && inVerification) {
        inVerification = false;
      }
      continue;
    }

    // Manejo de arrays en frontmatter general
    if (trimmed.startsWith('- ') && currentKey) {
      const item = trimmed.substring(2).trim().replace(/^["']|["']$/g, '');
      if (!Array.isArray(frontmatter[currentKey])) {
        frontmatter[currentKey] = [];
      }
      frontmatter[currentKey].push(item);
    } else {
      const parts = trimmed.split(':');
      if (parts.length >= 2) {
        currentKey = parts[0].trim();
        let val = parts.slice(1).join(':').trim().replace(/^["']|["']$/g, '');
        if (val === '' || val === '[]') {
          frontmatter[currentKey] = [];
        } else {
          frontmatter[currentKey] = val;
        }
      }
    }
  }

  if (currentTask) frontmatter.tasks.push(currentTask);

  return { frontmatter, body: content.substring(match[0].length) };
}

function walkDir(dir, fileList = []) {
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

function main() {
  console.log('================================================================');
  console.log('AI-SDLC: Auditoría de Cobertura de Pruebas (Requisitos & Tareas)');
  console.log('================================================================\n');

  const rootDir = process.cwd();
  const allMdFiles = walkDir(rootDir);

  let auditErrors = 0;

  const requirementAudits = [];
  const taskAudits = [];

  // 1. Auditar Requisitos
  for (const file of allMdFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter } = parseFrontmatter(content);
      const id = frontmatter.id;

      if (!id) continue;

      const isReq = frontmatter.type === 'requirement' ||
                    frontmatter.type === 'security-requirement' ||
                    id.startsWith('FR-') || id.startsWith('QR-') || id.startsWith('CON-') || id.startsWith('SEC-REQ-');

      if (isReq) {
        const testRefs = [];
        if (frontmatter['cucumber-feature-file']) {
          testRefs.push(frontmatter['cucumber-feature-file']);
        }
        if (Array.isArray(frontmatter['verified-by-tests'])) {
          testRefs.push(...frontmatter['verified-by-tests']);
        }

        // Si es plantilla, comprobar que declara tests; si es instancia real, comprobar que existen en disco
        const isTemplate = file.includes('templates');
        const existingFiles = testRefs.filter(t => fs.existsSync(path.resolve(rootDir, t)));
        const isVerified = isTemplate ? (testRefs.length > 0) : (testRefs.length > 0 && existingFiles.length > 0);

        if (!isVerified) {
          auditErrors++;
        }

        requirementAudits.push({
          id,
          title: frontmatter.title || 'Sin título',
          file: path.relative(rootDir, file),
          isTemplate,
          method: frontmatter['verifiable-by'] || (frontmatter['acceptance-format'] === 'gherkin' ? 'cucumber-bdd' : 'no-definido'),
          testRefs: testRefs.join(', ') || 'NINGUNA',
          existingCount: existingFiles.length,
          status: isVerified ? 'VERIFICADO_CON_PRUEBA' : 'FALLO_SIN_PRUEBA'
        });
      }
    } catch (e) {
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
            const hasCriteria = t.verification && t.verification.criteria && t.verification.criteria.length >= 5;
            const hasMethod = t.verification && t.verification.method && t.verification.method.length > 0;
            const isVerified = hasCriteria && hasMethod;

            if (!isVerified) {
              auditErrors++;
            }

            taskAudits.push({
              id: t.id,
              title: t.title || 'Sin título',
              file: path.relative(rootDir, file),
              method: (t.verification && t.verification.method) || 'AUSENTE',
              commandOrCriteria: (t.verification && t.verification.criteria) || 'AUSENTE',
              status: isVerified ? 'VERIFICADO_CON_PRUEBA' : 'FALLO_SIN_PRUEBA'
            });
          }
        }
      } catch (e) {
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

  const report = [
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

main();
