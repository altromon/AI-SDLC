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

export function walkTaskFiles(
  dir: string,
  fileList: string[] = [],
  excludeDirs: string[] = [
    'node_modules',
    '.git',
    'dist',
    '.changeset',
    'scratch',
    'test-scaffold',
    'fixtures',
    'templates',
    'examples',
  ]
): string[] {
  try {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        if (fs.statSync(fullPath).isDirectory()) {
          if (!excludeDirs.includes(file)) {
            walkTaskFiles(fullPath, fileList, excludeDirs);
          }
        } else if (
          (file.toLowerCase() === 'tasks.md' || file.endsWith('.tasks.md')) &&
          !file.includes('.template.')
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
    `# 📋 Task Governance and Human Autonomy Classification Report`,
    ``,
    `> **Audit Date:** ${new Date().toISOString()}`,
    `> **Overall Verdict:** ${
      violationsCount === 0
        ? 'COMPLIANT (0 Governance Violations)'
        : `NON-COMPLIANT (${violationsCount} Violations detected)`
    }`,
    ``,
    `---`,
    ``,
    `## 1. Project Autonomy Modes Distribution`,
    ``,
    `| Autonomy Mode | Status | Count | Percentage | AI Agent Role | Human Intervention Required |`,
    `| :--- | :---: | :---: | :---: | :--- | :--- |`,
    `| **\`AUTONOMOUS\`** | 🟢 | **${countAutonomous}** | ${
      Math.round((countAutonomous / (totalTasks || 1)) * 100)
    }% | Autonomous planning and coding | Asynchronous final PR review |`,
    `| **\`HUMAN_REVIEW_PLAN\`** | 🟡 | **${countHumanReviewPlan}** | ${
      Math.round((countHumanReviewPlan / (totalTasks || 1)) * 100)
    }% | Detailed plan elaboration | **Explicit plan approval BEFORE coding** |`,
    `| **\`AMBIGUOUS\`** | 🟠 | **${countAmbiguous}** | ${
      Math.round((countAmbiguous / (totalTasks || 1)) * 100)
    }% | **HALTED**: Coding prohibited | Refinement and clarification with Product Owner |`,
    `| **\`HIGH_RISK_MANUAL\`** | 🔴 | **${countHighRiskManual}** | ${
      Math.round((countHighRiskManual / (totalTasks || 1)) * 100)
    }% | Pair-programming assistance only | **Direct execution by human engineers** |`,
    ``,
    `---`,
    ``,
    `## 2. Verifiable Tasks Detail and Acceptance Criteria`,
    ``,
    `| Task ID | Source File | Title | Risk | Autonomy | Concrete Verification Criterion | Assigned To | Status |`,
    `| :--- | :--- | :--- | :---: | :---: | :--- | :--- | :---: |`,
  ];

  for (const t of summaries) {
    const isConform = !t.riskAnomaly && t.hasVerification && t.validAutonomy;
    const icon = isConform ? '✅ OK' : '❌ GAP';
    const criteria = t.task.verification?.criteria || 'MISSING';
    reportContent.push(
      `| **\`${t.task.id}\`** | \`${t.file}\` | ${t.task.title || 'Untitled'} | \`${
        t.task.riskLevel || 'MEDIUM'
      }\` | \`${t.task.autonomyMode || 'UNKNOWN'}\` | \`${criteria}\` | \`${
        t.task.assignedTo || 'agent-developer'
      }\` | ${icon} |`
    );
  }

  reportContent.push('');
  reportContent.push('---');
  reportContent.push('');
  reportContent.push('## 3. Compliance Guidelines');
  reportContent.push(
    '1. No agent may start a task marked as `HUMAN_REVIEW_PLAN` without explicit human approval/comment in the issue/PR.'
  );
  reportContent.push(
    '2. Tasks marked as `AMBIGUOUS` require a Q&A session or refinement of the SDD specification.'
  );
  reportContent.push(
    '3. Every completed task must be accompanied by execution evidence of the specified verification command.'
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
        safetyViolation = `[${t.id}] HIGH RISK task assigned to autonomous agent without human supervisor.`;
      }
      if (t.autonomyMode === 'AMBIGUOUS' && t.status === 'IN_PROGRESS') {
        safetyViolation = `[${t.id}] AMBIGUOUS task in progress: Must halt until clarification.`;
      }
      if (!hasVerification) {
        safetyViolation = `[${t.id}] Missing concrete verification criterion or command.`;
        unverifiedCount++;
      }
      if (!isModeValid) {
        safetyViolation = `[${t.id}] Invalid autonomy mode: "${t.autonomyMode}".`;
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
