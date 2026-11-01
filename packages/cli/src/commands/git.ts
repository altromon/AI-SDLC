/**
 * CLI Handler: aisdlc git
 */

import pc from 'picocolors';
import {
  classifyBranch,
  generateBranchHierarchyPlan,
  checkoutTaskBranch,
  installGitHooks,
  detectAuthorIdentity,
} from '@aisdlc/core';

function printInvalidBranchError(error?: string): void {
  console.error(pc.red(`\n✖ [NAMING ERROR] ${error || 'Invalid pattern'}`));
  console.error(pc.yellow('\nAllowed patterns:'));
  console.error('  Tier 1: main');
  console.error('  Tier 2: release/vX.Y.Z');
  console.error('  Tier 3: feat/<FEAT-ID>-<slug>  or  bug/<BUG-ID>-<slug>');
  console.error('  Tier 4: task/<PARENT-ID>/<TSK-ID>-<slug>\n');
}

export function runGitValidate(branchName: string): boolean {
  if (!branchName) {
    console.error(pc.red('\n[ERROR] Branch name to validate must be specified.\n'));
    return false;
  }

  const result = classifyBranch(branchName);
  if (result.valid) {
    console.log(pc.green(`\n✔ [COMPLIANT] Valid branch in 4-tier model:`));
    console.log(`  - Level (Tier):  ${pc.bold(`Tier ${result.tier} (${result.tierName})`)}`);
    console.log(`  - Base Origin:   ${result.parentRequirement}`);
    console.log(`  - Target Merge:  ${result.targetMerge}\n`);
    return true;
  }
  printInvalidBranchError(result.error);
  return false;
}

export function runGitPlan(options: { version?: string; feature?: string; tasks?: string }): boolean {
  const version = options.version || 'v1.1.0';
  const feature = options.feature || 'CHG-001-telemetry';
  const rawTasks = options.tasks || 'TSK-001-dto,TSK-002-gateway';
  const tasks = rawTasks.split(',').map((t) => t.trim());

  const plan = generateBranchHierarchyPlan(version, feature, tasks);
  console.log(pc.cyan('\n' + plan.planText));
  return true;
}

function printCheckoutFailure(result: ReturnType<typeof checkoutTaskBranch>): void {
  console.error(pc.red(`\n✖ [ERROR] ${result.error}`));
  if (result.availableTasks && result.availableTasks.length > 0) {
    console.log(pc.yellow('\nAvailable tasks in active changes:'));
    for (const t of result.availableTasks) {
      console.log(`  - [${pc.cyan(t.changeId)}] ${pc.bold(t.id)}${t.title ? `: ${t.title}` : ''}`);
    }
  }
  console.log();
}

function printCheckoutSuccess(result: ReturnType<typeof checkoutTaskBranch>): void {
  console.log(`  - Detected change:   ${pc.bold(result.changeId || 'N/A')}`);
  console.log(`  - Release Branch:    ${pc.green(result.releaseBranch || '')} (Tier 2)`);
  console.log(`  - Feature Branch:    ${pc.green(result.featureBranch || '')} (Tier 3)`);
  console.log(`  - Task Branch:       ${pc.green(result.taskBranch || '')} (Tier 4)`);

  if (result.createdBranches && result.createdBranches.length > 0) {
    console.log(pc.green(`\n✔ Cascading branches created:`));
    for (const b of result.createdBranches) {
      console.log(`  ├── ${pc.bold(b)}`);
    }
  }

  const switched = result.switchedBranch || result.taskBranch || '';
  console.log(pc.green(`\n✔ [CHECKOUT] Successfully switched to working branch:`));
  console.log(`  👉 ${pc.bold(pc.cyan(switched))}\n`);
}

export function runGitCheckout(taskId: string, options: { root?: string; silent?: boolean } = {}): boolean {
  if (!taskId) {
    if (!options.silent) {
      console.error(pc.red('\n[ERROR] Task identifier to navigate must be specified (e.g. TSK-001).\n'));
    }
    return false;
  }

  const rootDir = options.root || process.cwd();
  if (!options.silent) {
    console.log(pc.cyan(`\n🚀 [AI-SDLC Git] Navigating and preparing branches for task '${pc.bold(taskId)}'...`));
  }

  const result = checkoutTaskBranch(taskId, { rootDir });

  if (!result.success) {
    if (!options.silent) printCheckoutFailure(result);
    return false;
  }

  if (!options.silent) printCheckoutSuccess(result);
  return true;
}

export function runGitHookInstall(options: { root?: string } = {}): boolean {
  const rootDir = options.root || process.cwd();
  console.log(pc.cyan(`\n🔧 [AI-SDLC Git] Installing deterministic Git hooks (pre-commit & prepare-commit-msg)...`));
  const result = installGitHooks(rootDir);
  if (result.success) {
    console.log(pc.green(`✔ [COMPLIANT] Git Hooks successfully installed:`));
    const hooks = result.installedHooks || [result.hookPath || '.git/hooks/prepare-commit-msg'];
    for (const h of hooks) {
      console.log(`  👉 ${pc.bold(h)}`);
    }
    console.log();
    return true;
  } else {
    console.error(pc.red(`\n✖ [ERROR] ${result.error}\n`));
    return false;
  }
}

export function runGitDetectAuthor(options: { root?: string; json?: boolean } = {}): boolean {
  const rootDir = options.root || process.cwd();
  const identity = detectAuthorIdentity({ cwd: rootDir });
  if (options.json) {
    console.log(JSON.stringify(identity, null, 2));
  } else {
    console.log(`${identity.authorType}|${identity.model}|${identity.promptTokens}|${identity.completionTokens}|${identity.activeTimeSeconds}`);
  }
  return true;
}

