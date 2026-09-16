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
    return {
      found: false,
      error: 'Debe especificar un identificador de tarea válido (ej. TSK-001).',
    };
  }

  const activeChangesDir = path.join(rootDir, 'specs', 'changes', 'active');
  if (!fs.existsSync(activeChangesDir)) {
    return {
      found: false,
      error: `No se encontró el directorio de cambios activos en '${activeChangesDir}'.`,
    };
  }

  const availableTasks: Array<{ id: string; title: string; changeId: string }> = [];
  const candidateDirs = fs.readdirSync(activeChangesDir, { withFileTypes: true });

  let matchedTask: ActiveTaskMatch | undefined;

  for (const entry of candidateDirs) {
    if (!entry.isDirectory()) continue;
    const changeDir = path.join(activeChangesDir, entry.name);
    const tasksFile = path.join(changeDir, 'tasks.md');

    if (!fs.existsSync(tasksFile)) continue;

    try {
      const content = fs.readFileSync(tasksFile, 'utf-8');
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fmMatch) continue;

      const fm = yaml.load(fmMatch[1]) as RawTasksFrontmatter;
      if (!fm || !Array.isArray(fm.tasks)) continue;

      const rawChangeId =
        fm['change-id'] ||
        fm.changeId ||
        entry.name.replace(/^(chg|CHG)-/i, 'CHG-').toUpperCase();

      // Resolve version from tasks.md frontmatter, or fallback to proposal.md / package.json
      let versionStr = '1.0.0';
      if (fm.version) {
        versionStr = String(fm.version);
      } else if (fm['target-release'] || fm.release) {
        versionStr = String(fm['target-release'] || fm.release);
      } else {
        const proposalFile = path.join(changeDir, 'proposal.md');
        if (fs.existsSync(proposalFile)) {
          const propContent = fs.readFileSync(proposalFile, 'utf-8');
          const propFm = propContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
          if (propFm) {
            const parsedProp = yaml.load(propFm[1]) as Record<string, unknown>;
            if (parsedProp?.version) versionStr = String(parsedProp.version);
          }
        }
      }

      for (const t of fm.tasks) {
        if (!t || !t.id) continue;
        const currentId = String(t.id).trim();
        const currentTitle = String(t.title || '').trim();

        availableTasks.push({
          id: currentId,
          title: currentTitle,
          changeId: String(rawChangeId),
        });

        const targetLower = cleanTaskId.toLowerCase();
        const currentLower = currentId.toLowerCase();

        // Exact match or prefix match (e.g. TSK-001 matches TSK-001-dto or vice versa)
        const isMatch =
          currentLower === targetLower ||
          currentLower.startsWith(`${targetLower}-`) ||
          targetLower.startsWith(`${currentLower}-`);

        if (isMatch && !matchedTask) {
          matchedTask = {
            taskId: currentId,
            taskTitle: currentTitle,
            changeId: String(rawChangeId),
            changeDir,
            version: versionStr,
          };
        }
      }
    } catch {
      // Ignore unparseable change files
    }
  }

  if (matchedTask) {
    return {
      found: true,
      match: matchedTask,
      availableTasks,
    };
  }

  return {
    found: false,
    availableTasks,
    error: `No se encontró la tarea '${cleanTaskId}' en ningún cambio activo bajo 'specs/changes/active/'.`,
  };
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
  // Tier 1: Base branch
  const baseBranch = 'main';

  // Tier 2: Release branch
  // Check if an existing release branch exists locally or remotely
  let existingReleaseBranch: string | undefined;
  try {
    const branchesOutput = execFileSync('git', ['branch', '-a'], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const releaseMatches = branchesOutput.match(/(?:remotes\/origin\/)?(release\/v[0-9]+\.[0-9]+\.[0-9]+[^\s]*)/g);
    if (releaseMatches && releaseMatches.length > 0) {
      existingReleaseBranch = releaseMatches[0].replace(/^remotes\/origin\//, '');
    }
  } catch {
    // Git command failure fallback
  }

  const cleanVersion = (match.version || '1.0.0').replace(/^v/, '');
  const candidateReleaseBranch = `release/v${cleanVersion}`;
  const releaseBranch =
    existingReleaseBranch && classifyBranch(existingReleaseBranch).valid
      ? existingReleaseBranch
      : candidateReleaseBranch;

  // Tier 3: Feature branch
  // Normalize change ID into feat/<CHG-XXX-slug>
  const dirName = path.basename(match.changeDir);
  const changeSlug = dirName.replace(/^(chg|CHG)-/i, (m) => m.toUpperCase());

  // Check if a branch for this change already exists in git
  let existingFeatureBranch: string | undefined;
  try {
    const branchesOutput = execFileSync('git', ['branch', '-a'], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const lines = branchesOutput.split('\n');
    for (const line of lines) {
      const cleanLine = line.trim().replace(/^[*+]\s+/, '').replace(/^remotes\/origin\//, '');
      if (
        cleanLine.startsWith('feat/') &&
        (cleanLine.toLowerCase().includes(dirName.toLowerCase()) ||
          cleanLine.toLowerCase().includes(match.changeId.toLowerCase()))
      ) {
        existingFeatureBranch = cleanLine;
        break;
      }
    }
  } catch {
    // Git command failure fallback
  }

  let featureBranch: string;
  if (existingFeatureBranch && classifyBranch(existingFeatureBranch).valid) {
    featureBranch = existingFeatureBranch;
  } else {
    // Construct standardized feature branch
    const normalizedName = slugify(changeSlug).replace(/^(chg|bug|feat)-(\d+)/i, (_, p, n) => `${p.toUpperCase()}-${n}`);
    featureBranch = `feat/${normalizedName}`;
  }

  // Tier 4: Task branch: task/<PARENT-ID>/<TSK-ID>-<slug>
  const parentIdMatch = featureBranch.replace(/^(feat|feature)\//i, '').match(/^[a-zA-Z0-9]+-[a-zA-Z0-9]+/);
  const parentId = parentIdMatch ? parentIdMatch[0] : match.changeId.split('-').slice(0, 2).join('-');

  let existingTaskBranch: string | undefined;
  try {
    const branchesOutput = execFileSync('git', ['branch', '-a'], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const lines = branchesOutput.split('\n');
    for (const line of lines) {
      const cleanLine = line.trim().replace(/^[*+]\s+/, '').replace(/^remotes\/origin\//, '');
      if (
        cleanLine.startsWith(`task/${parentId}/`) &&
        cleanLine.toLowerCase().includes(match.taskId.toLowerCase())
      ) {
        existingTaskBranch = cleanLine;
        break;
      }
    }
  } catch {
    // Git command failure fallback
  }

  let taskBranch: string;
  if (existingTaskBranch && classifyBranch(existingTaskBranch).valid) {
    taskBranch = existingTaskBranch;
  } else {
    let taskSuffix = match.taskId.toLowerCase();
    const hasSlug = taskSuffix.includes('-') && taskSuffix.split('-').length > 2;
    if (!hasSlug && match.taskTitle) {
      const titleSlug = slugify(match.taskTitle).split('-').slice(0, 4).join('-');
      if (titleSlug) {
        taskSuffix = `${taskSuffix}-${titleSlug}`;
      }
    }
    taskBranch = `task/${parentId}/${taskSuffix}`;
  }

  return {
    baseBranch,
    releaseBranch,
    featureBranch,
    taskBranch,
  };
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

  const runGit = (args: string[]) => {
    return execFileSync('git', args, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  };

  const branchExistsLocally = (branch: string): boolean => {
    try {
      runGit(['show-ref', '--verify', '--quiet', `refs/heads/${branch}`]);
      return true;
    } catch {
      return false;
    }
  };

  const branchExistsRemotely = (branch: string): boolean => {
    try {
      runGit(['show-ref', '--verify', '--quiet', `refs/remotes/origin/${branch}`]);
      return true;
    } catch {
      return false;
    }
  };

  try {
    // 1. Ensure Tier 2 (release) branch exists
    if (!branchExistsLocally(releaseBranch)) {
      if (branchExistsRemotely(releaseBranch)) {
        runGit(['branch', '--track', releaseBranch, `origin/${releaseBranch}`]);
      } else {
        runGit(['branch', releaseBranch, baseBranch]);
      }
      createdBranches.push(releaseBranch);
    }

    // 2. Ensure Tier 3 (feature) branch exists
    if (!branchExistsLocally(featureBranch)) {
      if (branchExistsRemotely(featureBranch)) {
        runGit(['branch', '--track', featureBranch, `origin/${featureBranch}`]);
      } else {
        runGit(['branch', featureBranch, releaseBranch]);
      }
      createdBranches.push(featureBranch);
    }

    // 3. Ensure Tier 4 (task) branch exists
    if (!branchExistsLocally(taskBranch)) {
      if (branchExistsRemotely(taskBranch)) {
        runGit(['branch', '--track', taskBranch, `origin/${taskBranch}`]);
      } else {
        runGit(['branch', taskBranch, featureBranch]);
      }
      createdBranches.push(taskBranch);
    }

    // 4. Perform checkout to Tier 4 task branch
    runGit(['checkout', taskBranch]);

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
