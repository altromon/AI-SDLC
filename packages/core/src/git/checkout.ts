/**
 * AI-SDLC: Automated Task Navigation & Cascading 4-Tier Git Branch Creation Engine
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { slugify } from '../adapters/sdd/scaffold.js';
import { classifyBranch } from './workflow.js';
import {
  ActiveTaskMatch,
  GitCheckoutTaskOptions,
  GitCheckoutTaskResult,
} from '../types/index.js';

interface RawTasksFrontmatter {
  id?: string;
  'change-id'?: string;
  changeId?: string;
  version?: string | number;
  'target-release'?: string;
  release?: string;
  tasks?: Array<{
    id: string;
    title?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface TaskLocateResult {
  found: boolean;
  match?: ActiveTaskMatch;
  availableTasks?: Array<{ id: string; title: string; changeId: string }>;
  error?: string;
}

function resolveVersionFromProposal(changeDir: string): string {
  const proposalFile = path.join(changeDir, 'proposal.md');
  if (!fs.existsSync(proposalFile)) return '1.0.0';
  const propContent = fs.readFileSync(proposalFile, 'utf-8');
  const propFm = propContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!propFm) return '1.0.0';
  const parsedProp = yaml.load(propFm[1]) as Record<string, unknown>;
  return parsedProp?.version ? String(parsedProp.version) : '1.0.0';
}

function resolveChangeVersion(fm: RawTasksFrontmatter, changeDir: string): string {
  if (fm.version) return String(fm.version);
  if (fm['target-release'] || fm.release) return String(fm['target-release'] || fm.release);
  return resolveVersionFromProposal(changeDir);
}

function isTaskMatchingId(currentId: string, cleanTaskId: string): boolean {
  const targetLower = cleanTaskId.toLowerCase();
  const currentLower = currentId.toLowerCase();
  return (
    currentLower === targetLower ||
    currentLower.startsWith(`${targetLower}-`) ||
    targetLower.startsWith(`${currentLower}-`)
  );
}

function parseTasksFrontmatter(tasksFile: string): RawTasksFrontmatter | null {
  if (!fs.existsSync(tasksFile)) return null;
  try {
    const content = fs.readFileSync(tasksFile, 'utf-8');
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) return null;
    const fm = yaml.load(fmMatch[1]) as RawTasksFrontmatter;
    return fm && Array.isArray(fm.tasks) ? fm : null;
  } catch {
    return null;
  }
}

function resolveRawChangeId(fm: RawTasksFrontmatter, entryName: string): string {
  return String(fm['change-id'] || fm.changeId || entryName.replace(/^(chg|CHG)-/i, 'CHG-').toUpperCase());
}

function buildTaskMatch(currentId: string, currentTitle: string, rawChangeId: string, changeDir: string, versionStr: string): ActiveTaskMatch {
  return {
    taskId: currentId,
    taskTitle: currentTitle,
    changeId: rawChangeId,
    changeDir,
    version: versionStr,
  };
}

function inspectChangeTasks(
  changeDir: string,
  entryName: string,
  cleanTaskId: string,
  availableTasks: Array<{ id: string; title: string; changeId: string }>
): ActiveTaskMatch | undefined {
  const fm = parseTasksFrontmatter(path.join(changeDir, 'tasks.md'));
  if (!fm || !fm.tasks) return undefined;

  const rawChangeId = resolveRawChangeId(fm, entryName);
  const versionStr = resolveChangeVersion(fm, changeDir);

  let match: ActiveTaskMatch | undefined;
  for (const t of fm.tasks) {
    if (!t?.id) continue;
    const currentId = String(t.id).trim();
    const currentTitle = String(t.title || '').trim();
    availableTasks.push({ id: currentId, title: currentTitle, changeId: rawChangeId });

    if (!match && isTaskMatchingId(currentId, cleanTaskId)) {
      match = buildTaskMatch(currentId, currentTitle, rawChangeId, changeDir, versionStr);
    }
  }
  return match;
}

/**
 * Locate which active SDD change (CHG-*) a task belongs to by inspecting
 * specs/changes/active/<change-dir>/tasks.md.
 */
export function locateTaskInActiveChanges(
  taskId: string,
  rootDir: string = process.cwd()
): TaskLocateResult {
  const cleanTaskId = (taskId || '').trim();
  if (!cleanTaskId) {
    return { found: false, error: 'Debe especificar un identificador de tarea válido (ej. TSK-001).' };
  }

  const activeChangesDir = path.join(rootDir, 'specs', 'changes', 'active');
  if (!fs.existsSync(activeChangesDir)) {
    return { found: false, error: `No se encontró el directorio de cambios activos en '${activeChangesDir}'.` };
  }

  const availableTasks: Array<{ id: string; title: string; changeId: string }> = [];
  const candidateDirs = fs.readdirSync(activeChangesDir, { withFileTypes: true });

  let matchedTask: ActiveTaskMatch | undefined;
  for (const entry of candidateDirs) {
    if (!entry.isDirectory()) continue;
    const changeDir = path.join(activeChangesDir, entry.name);
    const m = inspectChangeTasks(changeDir, entry.name, cleanTaskId, availableTasks);
    if (m && !matchedTask) {
      matchedTask = m;
    }
  }

  if (matchedTask) {
    return { found: true, match: matchedTask, availableTasks };
  }

  return {
    found: false,
    availableTasks,
    error: `No se encontró la tarea '${cleanTaskId}' en ningún cambio activo bajo 'specs/changes/active/'.`,
  };
}

function getGitBranchList(rootDir: string): string[] {
  try {
    const out = execFileSync('git', ['branch', '-a'], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return out.split('\n').map((l) => l.trim().replace(/^[*+]\s+/, '').replace(/^remotes\/origin\//, ''));
  } catch {
    return [];
  }
}

function detectExistingReleaseBranch(branches: string[], cleanVersion: string): string {
  const candidate = `release/v${cleanVersion}`;
  const existing = branches.find((b) => b.startsWith('release/v') && classifyBranch(b).valid);
  return existing || candidate;
}

function detectExistingFeatureBranch(branches: string[], dirName: string, changeId: string, changeSlug: string): string {
  const existing = branches.find(
    (b) =>
      b.startsWith('feat/') &&
      (b.toLowerCase().includes(dirName.toLowerCase()) || b.toLowerCase().includes(changeId.toLowerCase())) &&
      classifyBranch(b).valid
  );
  if (existing) return existing;
  const normalizedName = slugify(changeSlug).replace(/^(chg|bug|feat)-(\d+)/i, (_, p, n) => `${p.toUpperCase()}-${n}`);
  return `feat/${normalizedName}`;
}

function buildDefaultTaskSuffix(taskId: string, taskTitle?: string): string {
  let taskSuffix = taskId.toLowerCase();
  const hasSlug = taskSuffix.includes('-') && taskSuffix.split('-').length > 2;
  if (!hasSlug && taskTitle) {
    const titleSlug = slugify(taskTitle).split('-').slice(0, 4).join('-');
    if (titleSlug) {
      taskSuffix = `${taskSuffix}-${titleSlug}`;
    }
  }
  return taskSuffix;
}

function detectExistingTaskBranch(branches: string[], parentId: string, taskId: string, taskTitle?: string): string {
  const prefix = `task/${parentId}/`;
  const existing = branches.find(
    (b) => b.startsWith(prefix) && b.toLowerCase().includes(taskId.toLowerCase()) && classifyBranch(b).valid
  );
  if (existing) return existing;
  return `task/${parentId}/${buildDefaultTaskSuffix(taskId, taskTitle)}`;
}

/**
 * Resolves the 4-tier branch hierarchy for a matched task:
 * Tier 1: main
 * Tier 2: release/vX.Y.Z
 * Tier 3: feat/<FEAT-ID>-<slug>
 * Tier 4: task/<PARENT-ID>/<TSK-ID>-<slug>
 */
export function resolveBranchHierarchy(
  match: ActiveTaskMatch,
  rootDir: string = process.cwd()
): {
  baseBranch: string;
  releaseBranch: string;
  featureBranch: string;
  taskBranch: string;
} {
  const baseBranch = 'main';
  const branches = getGitBranchList(rootDir);
  const cleanVersion = (match.version || '1.0.0').replace(/^v/, '');
  const releaseBranch = detectExistingReleaseBranch(branches, cleanVersion);

  const dirName = path.basename(match.changeDir);
  const changeSlug = dirName.replace(/^(chg|CHG)-/i, (m) => m.toUpperCase());
  const featureBranch = detectExistingFeatureBranch(branches, dirName, match.changeId, changeSlug);

  const parentIdMatch = featureBranch.replace(/^(feat|feature)\//i, '').match(/^[a-zA-Z0-9]+-[a-zA-Z0-9]+/);
  const parentId = parentIdMatch ? parentIdMatch[0] : match.changeId.split('-').slice(0, 2).join('-');
  const taskBranch = detectExistingTaskBranch(branches, parentId, match.taskId, match.taskTitle);

  return { baseBranch, releaseBranch, featureBranch, taskBranch };
}

function branchExistsLocally(branch: string, rootDir: string): boolean {
  try {
    execFileSync('git', ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`], {
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

function branchExistsRemotely(branch: string, rootDir: string): boolean {
  try {
    execFileSync('git', ['show-ref', '--verify', '--quiet', `refs/remotes/origin/${branch}`], {
      cwd: rootDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

function ensureBranchInCascade(branch: string, parentBranch: string, rootDir: string): boolean {
  if (branchExistsLocally(branch, rootDir)) return false;
  if (branchExistsRemotely(branch, rootDir)) {
    execFileSync('git', ['branch', '--track', branch, `origin/${branch}`], { cwd: rootDir, stdio: ['pipe', 'pipe', 'pipe'] });
  } else {
    execFileSync('git', ['branch', branch, parentBranch], { cwd: rootDir, stdio: ['pipe', 'pipe', 'pipe'] });
  }
  return true;
}

/**
 * Creates missing branches in cascade (Tier 1 -> Tier 2 -> Tier 3 -> Tier 4)
 * and switches to the Tier 4 task branch automatically.
 */
export function checkoutTaskBranch(
  taskId: string,
  options: GitCheckoutTaskOptions = {}
): GitCheckoutTaskResult {
  const rootDir = options.rootDir || process.cwd();
  const locateRes = locateTaskInActiveChanges(taskId, rootDir);
  if (!locateRes.found || !locateRes.match) {
    return {
      success: false,
      taskId,
      createdBranches: [],
      error: locateRes.error,
      availableTasks: locateRes.availableTasks,
    };
  }

  const match = locateRes.match;
  const { baseBranch, releaseBranch, featureBranch, taskBranch } = resolveBranchHierarchy(match, rootDir);
  const createdBranches: string[] = [];

  try {
    if (ensureBranchInCascade(releaseBranch, baseBranch, rootDir)) createdBranches.push(releaseBranch);
    if (ensureBranchInCascade(featureBranch, releaseBranch, rootDir)) createdBranches.push(featureBranch);
    if (ensureBranchInCascade(taskBranch, featureBranch, rootDir)) createdBranches.push(taskBranch);

    execFileSync('git', ['checkout', taskBranch], { cwd: rootDir, stdio: ['pipe', 'pipe', 'pipe'] });

    return {
      success: true,
      taskId: match.taskId,
      changeId: match.changeId,
      releaseBranch,
      featureBranch,
      taskBranch,
      createdBranches,
      switchedBranch: taskBranch,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      taskId: match.taskId,
      changeId: match.changeId,
      releaseBranch,
      featureBranch,
      taskBranch,
      createdBranches,
      error: `Error durante la creación o checkout de ramas Git: ${message}`,
    };
  }
}
