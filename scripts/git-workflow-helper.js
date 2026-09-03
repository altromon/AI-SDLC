#!/usr/bin/env node
/**
 * ==============================================================================
 * AI-SDLC: Asistente y Validador del Modelo de Ramas Git (4-Tier Git Branching)
 * ==============================================================================
 * Valida y asiste en la creación de ramas según la jerarquía:
 *   1. main (Estable)
 *   2. release/vX.Y.Z (Versión abierta)
 *   3. feat/<ID>-<slug> | bug/<ID>-<slug> (A partir de la versión)
 *   4. task/<PARENT-ID>/<TSK-ID>-<slug> (A partir de la feature o bug)
 *
 * Uso:
 *   node scripts/git-workflow-helper.js validate <nombre-rama>
 *   node scripts/git-workflow-helper.js plan --version v1.1.0 --feature CHG-001-telemetry --tasks TSK-001,TSK-002
 * ==============================================================================
 */

const BRANCH_PATTERNS = {
  MAIN: /^main$/,
  RELEASE: /^release\/v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$/,
  FEATURE: /^(feat|feature)\/(?:v[0-9]+\.[0-9]+\.[0-9]+\/)?([a-zA-Z0-9]+-[a-zA-Z0-9-]+)$/,
  BUG: /^(bug|fix)\/(?:v[0-9]+\.[0-9]+\.[0-9]+\/)?([a-zA-Z0-9]+-[a-zA-Z0-9-]+)$/,
  TASK: /^task\/([a-zA-Z0-9]+-[a-zA-Z0-9-]+)\/([a-zA-Z0-9]+-[a-zA-Z0-9-]+)$/
};

function classifyBranch(branchName) {
  if (BRANCH_PATTERNS.MAIN.test(branchName)) {
    return {
      valid: true,
      tier: 1,
      tierName: 'Main (Producción)',
      parentRequirement: 'Ninguno (Rama Raíz)',
      targetMerge: 'Despliegue a Producción'
    };
  }

  if (BRANCH_PATTERNS.RELEASE.test(branchName)) {
    return {
      valid: true,
      tier: 2,
      tierName: 'Versión / Release',
      parentRequirement: 'Debe originarse desde main',
      targetMerge: 'main'
    };
  }

  const featMatch = branchName.match(BRANCH_PATTERNS.FEATURE);
  if (featMatch) {
    return {
      valid: true,
      tier: 3,
      tierName: 'Feature (Funcionalidad)',
      id: featMatch[2],
      parentRequirement: 'Debe originarse desde una rama release/vX.Y.Z activa',
      targetMerge: 'release/vX.Y.Z'
    };
  }

  const bugMatch = branchName.match(BRANCH_PATTERNS.BUG);
  if (bugMatch) {
    return {
      valid: true,
      tier: 3,
      tierName: 'Bug (Defecto)',
      id: bugMatch[2],
      parentRequirement: 'Debe originarse desde una rama release/vX.Y.Z activa',
      targetMerge: 'release/vX.Y.Z'
    };
  }

  const taskMatch = branchName.match(BRANCH_PATTERNS.TASK);
  if (taskMatch) {
    return {
      valid: true,
      tier: 4,
      tierName: 'Task (Tarea Atómica)',
      parentId: taskMatch[1],
      taskId: taskMatch[2],
      parentRequirement: `Debe originarse desde la rama de feature o bug: feat/${taskMatch[1]} o bug/${taskMatch[1]}`,
      targetMerge: `feat/${taskMatch[1]} o bug/${taskMatch[1]}`
    };
  }

  return {
    valid: false,
    tier: 0,
    tierName: 'Inválido',
    error: `El nombre '${branchName}' no cumple con los estándares del modelo de 4 tiers.`
  };
}

function printPlan(version, feature, tasksList) {
  const vBranch = `release/${version}`;
  const fBranch = `feat/${feature}`;

  console.log('================================================================');
  console.log('AI-SDLC: Plan de Ramificación Jerárquico');
  console.log('================================================================\n');

  console.log(`1. [TIER 1] Rama Base Estable:       main`);
  console.log(`2. [TIER 2] Rama de Versión Abierta:  ${vBranch} (originada de main)`);
  console.log(`3. [TIER 3] Rama de Feature:          ${fBranch} (originada de ${vBranch})\n`);

  console.log(`4. [TIER 4] Ramas de Tareas Atómicas (originadas de ${fBranch}):`);
  const tasks = tasksList.split(',').map(t => t.trim());
  for (const t of tasks) {
    const taskBranch = `task/${feature.split('-').slice(0, 2).join('-')}/${t.toLowerCase()}`;
    console.log(`   ├── ${taskBranch}`);
    console.log(`   │     Comando git: git checkout ${fBranch} && git checkout -b ${taskBranch}`);
  }

  console.log(`\nFlujo de Integración (Merges):`);
  console.log(`  task/* ➔ [PR Tarea] ➔ ${fBranch} ➔ [PR Feature + Quality Gate] ➔ ${vBranch} ➔ [PR Release] ➔ main\n`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    console.log(`Uso:`);
    console.log(`  node scripts/git-workflow-helper.js validate <nombre-rama>`);
    console.log(`  node scripts/git-workflow-helper.js plan --version <vX.Y.Z> --feature <feat-slug> --tasks <TSK-1,TSK-2>`);
    process.exit(0);
  }

  if (args[0] === 'validate') {
    const branch = args[1];
    if (!branch) {
      console.error('[ERROR] Debe especificar el nombre de la rama a validar.');
      process.exit(1);
    }

    const result = classifyBranch(branch);
    if (result.valid) {
      console.log(`[CONFORME] Rama válida en el modelo de 4 tiers:`);
      console.log(`  - Nivel (Tier):  Tier ${result.tier} (${result.tierName})`);
      console.log(`  - Origen Base:   ${result.parentRequirement}`);
      console.log(`  - Destino Merge: ${result.targetMerge}`);
      process.exit(0);
    } else {
      console.error(`[ERROR DE NOMENCLATURA] ${result.error}`);
      console.error(`\nPatrones permitidos:`);
      console.error(`  Tier 1: main`);
      console.error(`  Tier 2: release/vX.Y.Z`);
      console.error(`  Tier 3: feat/<FEAT-ID>-<slug>  o  bug/<BUG-ID>-<slug>`);
      console.error(`  Tier 4: task/<PARENT-ID>/<TSK-ID>-<slug>`);
      process.exit(1);
    }
  }

  if (args[0] === 'plan') {
    let version = 'v1.1.0';
    let feature = 'CHG-001-telemetry';
    let tasks = 'TSK-001-dto,TSK-002-gateway';

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--version' && args[i + 1]) version = args[++i];
      if (args[i] === '--feature' && args[i + 1]) feature = args[++i];
      if (args[i] === '--tasks' && args[i + 1]) tasks = args[++i];
    }

    printPlan(version, feature, tasks);
    process.exit(0);
  }
}

main();
