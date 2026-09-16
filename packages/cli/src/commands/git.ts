/**
 * CLI Handler: aisdlc git
 */

import pc from 'picocolors';
import {
  classifyBranch,
  generateBranchHierarchyPlan,
  checkoutTaskBranch,
} from '@ai-sdlc/core';

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

export function runGitCheckout(taskId: string, options: { root?: string } = {}): boolean {
  if (!taskId) {
    console.error(pc.red('\n[ERROR] Debe especificar el identificador de la tarea a navegar (ej. TSK-001).\n'));
    return false;
  }

  const rootDir = options.root || process.cwd();
  console.log(pc.cyan(`\n🚀 [AI-SDLC Git] Navegando y preparando ramas para la tarea '${pc.bold(taskId)}'...`));

  const result = checkoutTaskBranch(taskId, { rootDir });

  if (!result.success) {
    console.error(pc.red(`\n✖ [ERROR] ${result.error}`));
    if (result.availableTasks && result.availableTasks.length > 0) {
      console.log(pc.yellow('\nTareas disponibles en cambios activos:'));
      for (const t of result.availableTasks) {
        console.log(`  - [${pc.cyan(t.changeId)}] ${pc.bold(t.id)}${t.title ? `: ${t.title}` : ''}`);
      }
    }
    console.log();
    return false;
  }

  console.log(`  - Cambio detectado:  ${pc.bold(result.changeId || 'N/A')}`);
  console.log(`  - Rama Release:      ${pc.green(result.releaseBranch || '')} (Tier 2)`);
  console.log(`  - Rama Feature:      ${pc.green(result.featureBranch || '')} (Tier 3)`);
  console.log(`  - Rama Task:         ${pc.green(result.taskBranch || '')} (Tier 4)`);

  if (result.createdBranches && result.createdBranches.length > 0) {
    console.log(pc.green(`\n✔ Ramas creadas en cascada:`));
    for (const b of result.createdBranches) {
      console.log(`  ├── ${pc.bold(b)}`);
    }
  }

  console.log(pc.green(`\n✔ [CHECKOUT] Cambio a la rama de trabajo exitoso:`));
  console.log(`  👉 ${pc.bold(pc.cyan(result.switchedBranch || result.taskBranch || ''))}\n`);
  return true;
}

