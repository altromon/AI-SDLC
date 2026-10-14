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

function parseTaskVerification(rawVerification: unknown): TaskItem['verification'] {
  const verification: TaskItem['verification'] = {};
  if (rawVerification && typeof rawVerification === 'object') {
    const v = rawVerification as Record<string, unknown>;
    if (typeof v['method'] === 'string') verification.method = v['method'];
    if (typeof v['command-or-criteria'] === 'string') verification.criteria = v['command-or-criteria'];
  }
  return verification;
}

function mapRawTaskItem(t: Record<string, unknown>): TaskItem {
  return {
    id: typeof t['id'] === 'string' ? t['id'] : String(t['id'] ?? ''),
    title: typeof t['title'] === 'string' ? t['title'] : undefined,
    complexity: typeof t['complexity'] === 'string' ? t['complexity'] : undefined,
    riskLevel: typeof t['risk-level'] === 'string' ? t['risk-level'] : undefined,
    autonomyMode: typeof t['autonomy-mode'] === 'string' ? t['autonomy-mode'] : undefined,
    assignedTo: typeof t['assigned-to'] === 'string' ? t['assigned-to'] : undefined,
    status: typeof t['status'] === 'string' ? t['status'] : undefined,
    blockingReason: typeof t['blocking-reason'] === 'string' ? t['blocking-reason'] : undefined,
    verification: parseTaskVerification(t['verification']),
  };
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
  const tasks: TaskItem[] = rawTasks.map(mapRawTaskItem);

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


const GOVERNANCE_GUIDELINES_MD = `## 3. Compliance Guidelines
1. No agent may start a task marked as \`HUMAN_REVIEW_PLAN\` without explicit human approval/comment in the issue/PR.
2. Tasks marked as \`AMBIGUOUS\` require a Q&A session or refinement of the SDD specification.
3. Every completed task must be accompanied by execution evidence of the specified verification command.`;

function formatAutonomyRow(
  mode: string,
  icon: string,
  count: number,
  totalTasks: number,
  aiRole: string,
  humanReq: string
): string {
  const pct = Math.round((count / (totalTasks || 1)) * 100);
  return `| **\`${mode}\`** | ${icon} | **${count}** | ${pct}% | ${aiRole} | ${humanReq} |`;
}

function buildAutonomyTable(modeCounts: Record<string, number>, totalTasks: number): string[] {
  return [
    `| Autonomy Mode | Status | Count | Percentage | AI Agent Role | Human Intervention Required |`,
    `| :--- | :---: | :---: | :---: | :--- | :--- |`,
    formatAutonomyRow('AUTONOMOUS', '🟢', modeCounts['AUTONOMOUS'] || 0, totalTasks, 'Autonomous planning and coding', 'Asynchronous final PR review'),
    formatAutonomyRow('HUMAN_REVIEW_PLAN', '🟡', modeCounts['HUMAN_REVIEW_PLAN'] || 0, totalTasks, 'Detailed plan elaboration', '**Explicit plan approval BEFORE coding**'),
    formatAutonomyRow('AMBIGUOUS', '🟠', modeCounts['AMBIGUOUS'] || 0, totalTasks, '**HALTED**: Coding prohibited', 'Refinement and clarification with Product Owner'),
    formatAutonomyRow('HIGH_RISK_MANUAL', '🔴', modeCounts['HIGH_RISK_MANUAL'] || 0, totalTasks, 'Pair-programming assistance only', '**Direct execution by human engineers**'),
  ];
}

function formatTaskSummaryRow(t: TaskSummary): string {
  const isConform = !t.riskAnomaly && t.hasVerification && t.validAutonomy;
  const icon = isConform ? '✅ OK' : '❌ GAP';
  const criteria = t.task.verification?.criteria || 'MISSING';
  const title = t.task.title || 'Untitled';
  const risk = t.task.riskLevel || 'MEDIUM';
  const mode = t.task.autonomyMode || 'UNKNOWN';
  const assigned = t.task.assignedTo || 'agent-developer';
  return `| **\`${t.task.id}\`** | \`${t.file}\` | ${title} | \`${risk}\` | \`${mode}\` | \`${criteria}\` | \`${assigned}\` | ${icon} |`;
}

const GOVERNANCE_TABLE_HEADER = [
  '| Task ID | Source File | Title | Risk | Autonomy | Concrete Verification Criterion | Assigned To | Status |',
  '| :--- | :--- | :--- | :---: | :---: | :--- | :--- | :---: |',
];

export function generateGovernanceReportMarkdown(
  summaries: TaskSummary[],
  violationsCount: number,
  modeCounts: Record<string, number>,
  totalTasks: number
): string {
  const verdict = violationsCount === 0
    ? 'COMPLIANT (0 Governance Violations)'
    : `NON-COMPLIANT (${violationsCount} Violations detected)`;

  const rows = summaries.map(formatTaskSummaryRow);
  const sections = [
    `# 📋 Task Governance and Human Autonomy Classification Report\n\n> **Audit Date:** ${new Date().toISOString()}\n> **Overall Verdict:** ${verdict}\n\n---`,
    `## 1. Project Autonomy Modes Distribution\n\n${buildAutonomyTable(modeCounts, totalTasks).join('\n')}\n\n---`,
    `## 2. Verifiable Tasks Detail and Acceptance Criteria\n\n${[...GOVERNANCE_TABLE_HEADER, ...rows].join('\n')}\n\n---`,
    GOVERNANCE_GUIDELINES_MD,
  ];
  return sections.join('\n\n');
}

function checkTaskSafetyViolation(t: TaskItem, isModeValid: boolean, hasVerification: boolean): string | null {
  if (
    t.autonomyMode === 'HIGH_RISK_MANUAL' &&
    t.assignedTo &&
    t.assignedTo.startsWith('agent-') &&
    t.assignedTo !== 'pair-human-agent'
  ) {
    return `[${t.id}] HIGH RISK task assigned to autonomous agent without human supervisor.`;
  }
  if (t.autonomyMode === 'AMBIGUOUS' && t.status === 'IN_PROGRESS') {
    return `[${t.id}] AMBIGUOUS task in progress: Must halt until clarification.`;
  }
  if (!hasVerification) {
    return `[${t.id}] Missing concrete verification criterion or command.`;
  }
  if (!isModeValid) {
    return `[${t.id}] Invalid autonomy mode: "${t.autonomyMode}".`;
  }
  return null;
}

function evaluateTaskItem(
  t: TaskItem,
  relPath: string
): { summary: TaskSummary; violation: string | null; unverified: boolean } {
  const isModeValid = VALID_AUTONOMY_MODES.includes(t.autonomyMode as AutonomyMode);
  const hasVerification = Boolean(
    t.verification && t.verification.criteria && t.verification.criteria.length > 3
  );
  const violation = checkTaskSafetyViolation(t, isModeValid, hasVerification);

  return {
    summary: {
      file: relPath,
      task: t,
      hasVerification,
      validAutonomy: isModeValid,
      riskAnomaly: Boolean(violation),
    },
    violation,
    unverified: !hasVerification,
  };
}

function updateGovernanceCounts(
  t: TaskItem,
  modeCounts: Record<string, number>,
  riskCounts: Record<string, number>
): void {
  if (t.autonomyMode && modeCounts[t.autonomyMode] !== undefined) {
    modeCounts[t.autonomyMode]++;
  }
  const risk = (t.riskLevel || 'MEDIUM').toUpperCase();
  if (riskCounts[risk] !== undefined) {
    riskCounts[risk]++;
  }
}

function parseTasksFromFile(file: string): TaskItem[] {
  if (!fs.existsSync(file)) return [];
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const { frontmatter } = parseTasksDoc(content);
    return frontmatter.tasks || [];
  } catch {
    return [];
  }
}

function processTasksFile(
  file: string,
  rootDir: string,
  modeCounts: Record<string, number>,
  riskCounts: Record<string, number>,
  taskSummaries: TaskSummary[],
  violationsList: string[]
): { tasksCount: number; unverifiedDelta: number } {
  const tasks = parseTasksFromFile(file);
  const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
  let unverifiedDelta = 0;

  for (const t of tasks) {
    const { summary, violation, unverified } = evaluateTaskItem(t, relPath);
    if (violation) violationsList.push(violation);
    if (unverified) unverifiedDelta++;
    updateGovernanceCounts(t, modeCounts, riskCounts);
    taskSummaries.push(summary);
  }

  return { tasksCount: tasks.length, unverifiedDelta };
}

function createInitialModeCounts(): Record<string, number> {
  return {
    AUTONOMOUS: 0,
    HUMAN_REVIEW_PLAN: 0,
    AMBIGUOUS: 0,
    HIGH_RISK_MANUAL: 0,
  };
}

function createInitialRiskCounts(): Record<string, number> {
  return {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };
}

function assembleGovernanceResult(
  totalTasks: number,
  unverifiedCount: number,
  riskCounts: Record<string, number>,
  modeCounts: Record<string, number>,
  taskSummaries: TaskSummary[],
  violationsList: string[],
  reportMarkdown: string
): GovernanceResult {
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

interface GovernanceAccumulator {
  totalTasks: number;
  unverifiedCount: number;
  taskSummaries: TaskSummary[];
  violationsList: string[];
  modeCounts: Record<string, number>;
  riskCounts: Record<string, number>;
}

function collectAllTasksData(taskFiles: string[], rootDir: string): GovernanceAccumulator {
  const acc: GovernanceAccumulator = {
    totalTasks: 0,
    unverifiedCount: 0,
    taskSummaries: [],
    violationsList: [],
    modeCounts: createInitialModeCounts(),
    riskCounts: createInitialRiskCounts(),
  };
  for (const file of taskFiles) {
    const delta = processTasksFile(file, rootDir, acc.modeCounts, acc.riskCounts, acc.taskSummaries, acc.violationsList);
    acc.totalTasks += delta.tasksCount;
    acc.unverifiedCount += delta.unverifiedDelta;
  }
  return acc;
}

export function verifyTasksGovernance(options: GovernanceOptions = {}): GovernanceResult {
  const rootDir = options.rootDir || process.cwd();
  const searchDir = options.specsDir || rootDir;
  const data = collectAllTasksData(walkTaskFiles(searchDir), rootDir);

  const reportMarkdown = generateGovernanceReportMarkdown(
    data.taskSummaries,
    data.violationsList.length,
    data.modeCounts,
    data.totalTasks
  );

  return assembleGovernanceResult(
    data.totalTasks,
    data.unverifiedCount,
    data.riskCounts,
    data.modeCounts,
    data.taskSummaries,
    data.violationsList,
    reportMarkdown
  );
}
