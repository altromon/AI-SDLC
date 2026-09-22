/**
 * AI-SDLC: Tasks Governance and Autonomy Classification Verifier
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  AutonomyMode,
  GovernanceOptions,
  GovernanceResult,
  TaskItem,
  TaskSummary,
  VALID_AUTONOMY_MODES,
} from '../types/index.js';

interface TasksFrontmatter {
  tasks: TaskItem[];
  [key: string]: unknown;
}

export function parseTasksDoc(content: string): { frontmatter: TasksFrontmatter; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: { tasks: [] }, body: content };

  let parsed: unknown;
  try {
    parsed = yaml.load(match[1]);
  } catch {
    return { frontmatter: { tasks: [] }, body: content };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { frontmatter: { tasks: [] }, body: content };
  }

  const raw = parsed as Record<string, unknown>;
  const rawTasks = Array.isArray(raw['tasks']) ? (raw['tasks'] as Record<string, unknown>[]) : [];

  const tasks: TaskItem[] = rawTasks.map((t) => {
    const verification: TaskItem['verification'] = {};
    if (t['verification'] && typeof t['verification'] === 'object') {
      const v = t['verification'] as Record<string, unknown>;
      if (typeof v['method'] === 'string') verification.method = v['method'];
      if (typeof v['command-or-criteria'] === 'string') verification.criteria = v['command-or-criteria'];
    }
    return {
      id: typeof t['id'] === 'string' ? t['id'] : String(t['id'] ?? ''),
      title: typeof t['title'] === 'string' ? t['title'] : undefined,
      complexity: typeof t['complexity'] === 'string' ? t['complexity'] : undefined,
      riskLevel: typeof t['risk-level'] === 'string' ? t['risk-level'] : undefined,
      autonomyMode: typeof t['autonomy-mode'] === 'string' ? t['autonomy-mode'] : undefined,
      assignedTo: typeof t['assigned-to'] === 'string' ? t['assigned-to'] : undefined,
      status: typeof t['status'] === 'string' ? t['status'] : undefined,
      blockingReason: typeof t['blocking-reason'] === 'string' ? t['blocking-reason'] : undefined,
      verification,
    };
  });

  const frontmatter: TasksFrontmatter = { ...raw, tasks };
  return { frontmatter, body: content.substring(match[0].length) };
}

export function walkTaskFiles(dir: string, fileList: string[] = []): string[] {
  try {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        if (fs.statSync(fullPath).isDirectory()) {
          if (!['node_modules', '.git', 'dist', '.changeset', 'scratch', 'test-scaffold'].includes(file)) {
            walkTaskFiles(fullPath, fileList);
          }
        } else if (
          file.toLowerCase() === 'tasks.md' ||
          file.endsWith('.tasks.md') ||
          file.toLowerCase() === 'tasks.template.md'
        ) {
          fileList.push(fullPath);
        }
      } catch {
        // Ignore files unlinked concurrently
      }
    }
  } catch {
    // Ignore directories removed concurrently
  }
  return fileList;
}


export function generateGovernanceReportMarkdown(
  summaries: TaskSummary[],
  violationsCount: number,
  modeCounts: Record<string, number>,
  totalTasks: number
): string {
  const countAutonomous = modeCounts['AUTONOMOUS'] || 0;
  const countHumanReviewPlan = modeCounts['HUMAN_REVIEW_PLAN'] || 0;
  const countAmbiguous = modeCounts['AMBIGUOUS'] || 0;
  const countHighRiskManual = modeCounts['HIGH_RISK_MANUAL'] || 0;

  const reportContent: string[] = [
    `# 📋 Informe de Gobierno de Tareas y Clasificación de Autonomía Humana`,
    ``,
    `> **Fecha de Auditoría:** ${new Date().toISOString()}`,
    `> **Veredicto General:** ${
      violationsCount === 0
        ? 'CONFORME (0 Violaciones de Gobierno)'
        : `NO CONFORME (${violationsCount} Infracciones detectadas)`
    }`,
    ``,
    `---`,
    ``,
    `## 1. Distribución de Modos de Autonomía del Proyecto`,
    ``,
    `| Modo de Autonomía | Semáforo | Cantidad | Porcentaje | Rol del Agente de IA | Intervención Humana Requerida |`,
    `| :--- | :---: | :---: | :---: | :--- | :--- |`,
    `| **\`AUTONOMOUS\`** | 🟢 | **${countAutonomous}** | ${
      Math.round((countAutonomous / (totalTasks || 1)) * 100)
    }% | Planificación y codificación autónoma | Revisión asíncrona del PR final |`,
    `| **\`HUMAN_REVIEW_PLAN\`** | 🟡 | **${countHumanReviewPlan}** | ${
      Math.round((countHumanReviewPlan / (totalTasks || 1)) * 100)
    }% | Elaboración del plan detallado | **Aprobación explícita del plan ANTES de codificar** |`,
    `| **\`AMBIGUOUS\`** | 🟠 | **${countAmbiguous}** | ${
      Math.round((countAmbiguous / (totalTasks || 1)) * 100)
    }% | **DETENIDO**: Prohibido codificar | Refinamiento y aclaración con el Product Owner |`,
    `| **\`HIGH_RISK_MANUAL\`** | 🔴 | **${countHighRiskManual}** | ${
      Math.round((countHighRiskManual / (totalTasks || 1)) * 100)
    }% | Solo asistencia o soporte en pair-programming | **Ejecución directa por ingenieros humanos** |`,
    ``,
    `---`,
    ``,
    `## 2. Detalle de Tareas Verificables y Criterios de Aceptación`,
    ``,
    `| ID Tarea | Archivo Origen | Título | Riesgo | Autonomía | Criterio de Verificación Concreto | Asignado a | Estado |`,
    `| :--- | :--- | :--- | :---: | :---: | :--- | :--- | :---: |`,
  ];

  for (const t of summaries) {
    const isConform = !t.riskAnomaly && t.hasVerification && t.validAutonomy;
    const icon = isConform ? '✅ OK' : '❌ BRECHA';
    const criteria = t.task.verification?.criteria || 'AUSENTE';
    reportContent.push(
      `| **\`${t.task.id}\`** | \`${t.file}\` | ${t.task.title || 'Sin título'} | \`${
        t.task.riskLevel || 'MEDIUM'
      }\` | \`${t.task.autonomyMode || 'DESCONOCIDO'}\` | \`${criteria}\` | \`${
        t.task.assignedTo || 'agent-developer'
      }\` | ${icon} |`
    );
  }

  reportContent.push('');
  reportContent.push('---');
  reportContent.push('');
  reportContent.push('## 3. Directrices de Cumplimiento');
  reportContent.push(
    '1. Ningún agente puede iniciar una tarea marcada como `HUMAN_REVIEW_PLAN` sin un comentario o aprobación explícita humana en el issue/PR.'
  );
  reportContent.push(
    '2. Las tareas marcadas como `AMBIGUOUS` requieren una sesión de preguntas/respuestas o refinamiento de la especificación SDD.'
  );
  reportContent.push(
    '3. Toda tarea completada debe acompañarse de la evidencia de ejecución del comando de verificación especificado.'
  );

  return reportContent.join('\n');
}

export function verifyTasksGovernance(options: GovernanceOptions = {}): GovernanceResult {
  const rootDir = options.rootDir || process.cwd();
  const searchDir = options.specsDir || rootDir;
  const taskFiles = walkTaskFiles(searchDir);

  let totalTasks = 0;
  let unverifiedCount = 0;
  const taskSummaries: TaskSummary[] = [];
  const violationsList: string[] = [];

  const modeCounts: Record<string, number> = {
    AUTONOMOUS: 0,
    HUMAN_REVIEW_PLAN: 0,
    AMBIGUOUS: 0,
    HIGH_RISK_MANUAL: 0,
  };
  const riskCounts: Record<string, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };

  for (const file of taskFiles) {
    if (!fs.existsSync(file)) continue;
    let content: string;
    try {
      content = fs.readFileSync(file, 'utf-8');
    } catch {
      continue;
    }
    const { frontmatter } = parseTasksDoc(content);

    if (!frontmatter.tasks || frontmatter.tasks.length === 0) {
      continue;
    }

    const relPath = path.relative(rootDir, file).replace(/\\/g, '/');

    for (const t of frontmatter.tasks) {
      totalTasks++;

      const isModeValid = VALID_AUTONOMY_MODES.includes(t.autonomyMode as AutonomyMode);
      const hasVerification = Boolean(
        t.verification && t.verification.criteria && t.verification.criteria.length > 3
      );

      let safetyViolation: string | null = null;
      if (
        t.autonomyMode === 'HIGH_RISK_MANUAL' &&
        t.assignedTo &&
        t.assignedTo.startsWith('agent-') &&
        t.assignedTo !== 'pair-human-agent'
      ) {
        safetyViolation = `[${t.id}] Tarea de ALTO RIESGO asignada a agente autónomo sin supervisor humano.`;
      }
      if (t.autonomyMode === 'AMBIGUOUS' && t.status === 'IN_PROGRESS') {
        safetyViolation = `[${t.id}] Tarea AMBIGUA en ejecución: Debe detenerse hasta clarificación.`;
      }
      if (!hasVerification) {
        safetyViolation = `[${t.id}] Falta criterio o comando concreto de verificación.`;
        unverifiedCount++;
      }
      if (!isModeValid) {
        safetyViolation = `[${t.id}] Modo de autonomía inválido: "${t.autonomyMode}".`;
      }

      if (safetyViolation) {
        violationsList.push(safetyViolation);
      }

      if (t.autonomyMode && modeCounts[t.autonomyMode] !== undefined) {
        modeCounts[t.autonomyMode]++;
      }
      const risk = (t.riskLevel || 'MEDIUM').toUpperCase();
      if (riskCounts[risk] !== undefined) {
        riskCounts[risk]++;
      }

      taskSummaries.push({
        file: relPath,
        task: t,
        hasVerification,
        validAutonomy: isModeValid,
        riskAnomaly: Boolean(safetyViolation),
      });
    }
  }

  const reportMarkdown = generateGovernanceReportMarkdown(
    taskSummaries,
    violationsList.length,
    modeCounts,
    totalTasks
  );

  return {
    success: violationsList.length === 0,
    totalTasks,
    verifiedCount: totalTasks - unverifiedCount,
    unverifiedCount,
    riskCounts,
    modeCounts,
    tasks: taskSummaries,
    violations: violationsList,
    reportMarkdown,
  };
}
