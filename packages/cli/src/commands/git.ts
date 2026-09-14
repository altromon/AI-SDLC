/**
 * CLI Handler: aisdlc git
 */

import pc from 'picocolors';
import { classifyBranch, generateBranchHierarchyPlan } from '@ai-sdlc/core';

export function runGitValidate(branchName: string): boolean {
  if (!branchName) {
    console.error(pc.red('\n[ERROR] Debe especificar el nombre de la rama a validar.\n'));
    return false;
  }

  const result = classifyBranch(branchName);
  if (result.valid) {
    console.log(pc.green(`\n✔ [CONFORME] Rama válida en el modelo de 4 tiers:`));
    console.log(`  - Nivel (Tier):  ${pc.bold(`Tier ${result.tier} (${result.tierName})`)}`);
    console.log(`  - Origen Base:   ${result.parentRequirement}`);
    console.log(`  - Destino Merge: ${result.targetMerge}\n`);
    return true;
  } else {
    console.error(pc.red(`\n✖ [ERROR DE NOMENCLATURA] ${result.error}`));
    console.error(pc.yellow('\nPatrones permitidos:'));
    console.error('  Tier 1: main');
    console.error('  Tier 2: release/vX.Y.Z');
    console.error('  Tier 3: feat/<FEAT-ID>-<slug>  o  bug/<BUG-ID>-<slug>');
    console.error('  Tier 4: task/<PARENT-ID>/<TSK-ID>-<slug>\n');
    return false;
  }
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
