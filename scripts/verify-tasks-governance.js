#!/usr/bin/env node
/**
 * ==============================================================================
 * AI-SDLC: Verificador de Gobierno de Tareas y Modos de Autonomía Humana
 * ==============================================================================
 * Inspecciona los planes de tareas (tasks.md) para verificar que:
 *   1. Toda tarea sea verificable mediante un comando o criterio objetivo.
 *   2. Toda tarea tenga un nivel de riesgo (LOW, MEDIUM, HIGH, CRITICAL)
 *      y un modo de autonomía humana válido:
 *      - AUTONOMOUS (Plan + Ejecución autónoma)
 *      - HUMAN_REVIEW_PLAN (Revisión humana del plan previa a codificar)
 *      - AMBIGUOUS (Bloqueada para implementación por ambigüedad)
 *      - HIGH_RISK_MANUAL (Operación crítica reservada a ejecución humana)
 *
 * Emite exit code 1 si hay tareas sin verificación o con asignaciones de riesgo no autorizadas.
 * Genera el informe formal: reports/TASKS_GOVERNANCE_REPORT.md
 * ==============================================================================
 */

const fs = require('fs');
const path = require('path');

function parseSimpleYaml(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const yamlContent = match[1];
  const lines = yamlContent.split('\n');
  const frontmatter = { tasks: [] };

  let currentTask = null;
  let inVerification = false;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('- id:')) {
      if (currentTask) frontmatter.tasks.push(currentTask);
      currentTask = {
        id: trimmed.split(':')[1].replace(/['"]/g, '').trim(),
        verification: {}
      };
      inVerification = false;
    } else if (currentTask) {
      if (trimmed.startsWith('title:')) {
        currentTask.title = trimmed.split(':').slice(1).join(':').replace(/['"]/g, '').trim();
      } else if (trimmed.startsWith('complexity:')) {
        currentTask.complexity = trimmed.split(':')[1].replace(/['"]/g, '').trim();
      } else if (trimmed.startsWith('risk-level:')) {
        currentTask.riskLevel = trimmed.split(':')[1].replace(/['"]/g, '').trim();
      } else if (trimmed.startsWith('autonomy-mode:')) {
        currentTask.autonomyMode = trimmed.split(':')[1].replace(/['"]/g, '').trim();
      } else if (trimmed.startsWith('assigned-to:')) {
        currentTask.assignedTo = trimmed.split(':')[1].replace(/['"]/g, '').trim();
      } else if (trimmed.startsWith('status:')) {
        currentTask.status = trimmed.split(':')[1].replace(/['"]/g, '').trim();
      } else if (trimmed.startsWith('blocking-reason:')) {
        currentTask.blockingReason = trimmed.split(':').slice(1).join(':').replace(/['"]/g, '').trim();
      } else if (trimmed.startsWith('verification:')) {
        inVerification = true;
      } else if (inVerification && trimmed.startsWith('method:')) {
        currentTask.verification.method = trimmed.split(':')[1].replace(/['"]/g, '').trim();
      } else if (inVerification && trimmed.startsWith('command-or-criteria:')) {
        currentTask.verification.criteria = trimmed.split(':').slice(1).join(':').replace(/['"]/g, '').trim();
      }
    } else {
      const parts = trimmed.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        if (key !== 'tasks') {
          const val = parts.slice(1).join(':').replace(/['"]/g, '').trim();
          frontmatter[key] = val;
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
    } else if (file.toLowerCase() === 'tasks.md' || file.endsWith('.tasks.md') || file.toLowerCase() === 'tasks.template.md') {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function main() {
  console.log('================================================================');
  console.log('AI-SDLC: Verificación de Desglose de Tareas y Modos de Autonomía');
  console.log('================================================================\n');

  const rootDir = process.cwd();
  const taskFiles = walkDir(rootDir);

  if (taskFiles.length === 0) {
    console.log('[WARN] No se encontraron archivos tasks.md para auditar.');
    process.exit(0);
  }

  let totalTasks = 0;
  let violations = 0;
  const taskSummaries = [];

  let countAutonomous = 0;
  let countHumanReviewPlan = 0;
  let countAmbiguous = 0;
  let countHighRiskManual = 0;

  for (const file of taskFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const { frontmatter } = parseSimpleYaml(content);

    if (!frontmatter.tasks || frontmatter.tasks.length === 0) {
      continue;
    }

    const relPath = path.relative(rootDir, file);

    for (const t of frontmatter.tasks) {
      totalTasks++;

      const validModes = ['AUTONOMOUS', 'HUMAN_REVIEW_PLAN', 'AMBIGUOUS', 'HIGH_RISK_MANUAL'];
      const isModeValid = validModes.includes(t.autonomyMode);

      const hasVerification = t.verification && t.verification.criteria && t.verification.criteria.length > 3;

      let safetyViolation = null;
      if (t.autonomyMode === 'HIGH_RISK_MANUAL' && t.assignedTo && t.assignedTo.startsWith('agent-') && t.assignedTo !== 'pair-human-agent') {
        safetyViolation = 'Tarea de ALTO RIESGO asignada a agente autónomo sin supervisor humano.';
      }
      if (t.autonomyMode === 'AMBIGUOUS' && t.status === 'IN_PROGRESS') {
        safetyViolation = 'Tarea AMBIGUA en ejecución: Debe detenerse hasta clarificación con el usuario.';
      }
      if (!hasVerification) {
        safetyViolation = 'Falta criterio o comando concreto de verificación.';
      }

      if (!isModeValid || safetyViolation) {
        violations++;
      }

      if (t.autonomyMode === 'AUTONOMOUS') countAutonomous++;
      if (t.autonomyMode === 'HUMAN_REVIEW_PLAN') countHumanReviewPlan++;
      if (t.autonomyMode === 'AMBIGUOUS') countAmbiguous++;
      if (t.autonomyMode === 'HIGH_RISK_MANUAL') countHighRiskManual++;

      taskSummaries.push({
        file: relPath,
        id: t.id,
        title: t.title || 'Sin título',
        complexity: t.complexity || 'MEDIUM',
        risk: t.riskLevel || 'MEDIUM',
        autonomyMode: t.autonomyMode || 'DESCONOCIDO',
        verification: t.verification.criteria || 'AUSENTE',
        assignedTo: t.assignedTo || 'agent-developer',
        status: t.status || 'PENDING',
        isConform: !safetyViolation && isModeValid,
        violation: safetyViolation
      });
    }
  }

  // Imprimir resumen en consola
  console.table(taskSummaries.map(t => ({
    'ID Tarea': t.id,
    'Título': t.title,
    'Riesgo / Compl.': `${t.risk} / ${t.complexity}`,
    'Modo de Autonomía': t.autonomyMode,
    'Criterio Verificación': t.verification,
    'Asignado a': t.assignedTo,
    'Estado': t.isConform ? '✅ CONFORME' : '❌ VIOLACIÓN'
  })));

  console.log(`\nDistribución de Gobierno y Autonomía:`);
  console.log(`  🟢 AUTONOMOUS (Plan + Ejecución):       ${countAutonomous} (${Math.round((countAutonomous/totalTasks)*100 || 0)}%)`);
  console.log(`  🟡 HUMAN_REVIEW_PLAN (Revisión Previa): ${countHumanReviewPlan} (${Math.round((countHumanReviewPlan/totalTasks)*100 || 0)}%)`);
  console.log(`  🟠 AMBIGUOUS (Bloqueadas x Clarificar): ${countAmbiguous} (${Math.round((countAmbiguous/totalTasks)*100 || 0)}%)`);
  console.log(`  🔴 HIGH_RISK_MANUAL (Ejecución Humana): ${countHighRiskManual} (${Math.round((countHighRiskManual/totalTasks)*100 || 0)}%)`);

  const reportsDir = path.join(rootDir, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, 'TASKS_GOVERNANCE_REPORT.md');

  const reportContent = [
    `# 📋 Informe de Gobierno de Tareas y Clasificación de Autonomía Humana`,
    ``,
    `> **Fecha de Auditoría:** ${new Date().toISOString()}`,
    `> **Veredicto General:** ${violations === 0 ? 'CONFORME (0 Violaciones de Gobierno)' : `NO CONFORME (${violations} Infracciones detectadas)`}`,
    ``,
    `---`,
    ``,
    `## 1. Distribución de Modos de Autonomía del Proyecto`,
    ``,
    `| Modo de Autonomía | Semáforo | Cantidad | Porcentaje | Rol del Agente de IA | Intervención Humana Requerida |`,
    `| :--- | :---: | :---: | :---: | :--- | :--- |`,
    `| **\`AUTONOMOUS\`** | 🟢 | **${countAutonomous}** | ${Math.round((countAutonomous/totalTasks)*100 || 0)}% | Planificación y codificación autónoma | Revisión asíncrona del PR final |`,
    `| **\`HUMAN_REVIEW_PLAN\`** | 🟡 | **${countHumanReviewPlan}** | ${Math.round((countHumanReviewPlan/totalTasks)*100 || 0)}% | Elaboración del plan detallado | **Aprobación explícita del plan ANTES de codificar** |`,
    `| **\`AMBIGUOUS\`** | 🟠 | **${countAmbiguous}** | ${Math.round((countAmbiguous/totalTasks)*100 || 0)}% | **DETENIDO**: Prohibido codificar | Refinamiento y aclaración con el Product Owner |`,
    `| **\`HIGH_RISK_MANUAL\`** | 🔴 | **${countHighRiskManual}** | ${Math.round((countHighRiskManual/totalTasks)*100 || 0)}% | Solo asistencia o soporte en pair-programming | **Ejecución directa por ingenieros humanos** |`,
    ``,
    `---`,
    ``,
    `## 2. Detalle de Tareas Verificables y Criterios de Aceptación`,
    ``,
    `| ID Tarea | Archivo Origen | Título | Riesgo | Autonomía | Criterio de Verificación Concreto | Asignado a | Estado |`,
    `| :--- | :--- | :--- | :---: | :---: | :--- | :--- | :---: |`
  ];

  for (const t of taskSummaries) {
    const icon = t.isConform ? '✅ OK' : '❌ BRECHA';
    reportContent.push(`| **\`${t.id}\`** | \`${t.file}\` | ${t.title} | \`${t.risk}\` | \`${t.autonomyMode}\` | \`${t.verification}\` | \`${t.assignedTo}\` | ${icon} |`);
  }

  reportContent.push('');
  reportContent.push('---');
  reportContent.push('');
  reportContent.push('## 3. Directrices de Cumplimiento');
  reportContent.push('1. Ningún agente puede iniciar una tarea marcada como `HUMAN_REVIEW_PLAN` sin un comentario o aprobación explícita humana en el issue/PR.');
  reportContent.push('2. Las tareas marcadas como `AMBIGUOUS` requieren una sesión de preguntas/respuestas o refinamiento de la especificación SDD.');
  reportContent.push('3. Toda tarea completada debe acompañarse de la evidencia de ejecución del comando de verificación especificado.');

  fs.writeFileSync(reportPath, reportContent.join('\n'), 'utf-8');
  console.log(`\n[OK] Informe formal generado en: ${path.relative(rootDir, reportPath)}`);

  if (violations > 0) {
    console.error(`\n[BLOQUEO DE GOBIERNO] Se detectaron ${violations} infracciones en las tareas.`);
    process.exit(1);
  } else {
    console.log(`\n[ÉXITO] 100% de las tareas cumplen con los contratos de verificabilidad y autonomía.`);
    process.exit(0);
  }
}

main();
