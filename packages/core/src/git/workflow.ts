/**
 * AI-SDLC: 4-Tier Git Branching Model & Hierarchy Planner
 */

import {
  BranchClassificationResult,
  BranchHierarchyPlan,
} from '../types/index.js';

export const BRANCH_PATTERNS = {
  MAIN: /^main$/,
  RELEASE: /^release\/v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$/,
  FEATURE: /^(feat|feature)\/(?:v[0-9]+\.[0-9]+\.[0-9]+\/)?([a-zA-Z0-9]+-[a-zA-Z0-9-]+)$/,
  BUG: /^(bug|fix)\/(?:v[0-9]+\.[0-9]+\.[0-9]+\/)?([a-zA-Z0-9]+-[a-zA-Z0-9-]+)$/,
  PATCH: /^(patch)\/(?:v[0-9]+\.[0-9]+\.[0-9]+\/)?([a-zA-Z0-9]+-[a-zA-Z0-9-]+)$/,
  TASK: /^task\/([a-zA-Z0-9]+-[a-zA-Z0-9-]+)\/([a-zA-Z0-9]+-[a-zA-Z0-9-]+)$/,
} as const;

export function classifyBranch(branchName: string): BranchClassificationResult {
  if (BRANCH_PATTERNS.MAIN.test(branchName)) {
    return {
      valid: true,
      tier: 1,
      tierName: 'Main (Producción)',
      parentRequirement: 'Ninguno (Rama Raíz)',
      targetMerge: 'Despliegue a Producción',
    };
  }

  if (BRANCH_PATTERNS.RELEASE.test(branchName)) {
    return {
      valid: true,
      tier: 2,
      tierName: 'Versión / Release',
      parentRequirement: 'Debe originarse desde main',
      targetMerge: 'main',
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
      targetMerge: 'release/vX.Y.Z',
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
      targetMerge: 'release/vX.Y.Z',
    };
  }

  const patchMatch = branchName.match(BRANCH_PATTERNS.PATCH);
  if (patchMatch) {
    return {
      valid: true,
      tier: 3,
      tierName: 'Patch (Parche Rápido)',
      id: patchMatch[2],
      parentRequirement: 'Debe originarse desde una rama release/vX.Y.Z activa o main según criticidad',
      targetMerge: 'release/vX.Y.Z o main',
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
      parentRequirement: `Debe originarse desde la rama de feature, bug o patch: feat/${taskMatch[1]}, bug/${taskMatch[1]} o patch/${taskMatch[1]}`,
      targetMerge: `feat/${taskMatch[1]}, bug/${taskMatch[1]} o patch/${taskMatch[1]}`,
    };
  }

  return {
    valid: false,
    tier: 0,
    tierName: 'Inválido',
    error: `El nombre '${branchName}' no cumple con los estándares del modelo de 4 tiers.`,
  };
}

export function generateBranchHierarchyPlan(
  version: string,
  feature: string,
  tasks: string[]
): BranchHierarchyPlan {
  const vBranch = `release/${version}`;
  const fBranch = `feat/${feature}`;

  const lines: string[] = [
    '================================================================',
    'AI-SDLC: Plan de Ramificación Jerárquico',
    '================================================================\n',
    `1. [TIER 1] Rama Base Estable:       main`,
    `2. [TIER 2] Rama de Versión Abierta:  ${vBranch} (originada de main)`,
    `3. [TIER 3] Rama de Feature:          ${fBranch} (originada de ${vBranch})\n`,
    `4. [TIER 4] Ramas de Tareas Atómicas (originadas de ${fBranch}):`,
  ];

  for (const t of tasks) {
    const parentSlug = feature.split('-').slice(0, 2).join('-');
    const taskBranch = `task/${parentSlug}/${t.toLowerCase()}`;
    lines.push(`   ├── ${taskBranch}`);
    lines.push(`   │     Comando git: git checkout ${fBranch} && git checkout -b ${taskBranch}`);
  }

  lines.push(`\nFlujo de Integración (Merges):`);
  lines.push(`  task/* ➔ [PR Tarea] ➔ ${fBranch} ➔ [PR Feature + Quality Gate] ➔ ${vBranch} ➔ [PR Release] ➔ main\n`);

  return {
    version,
    feature,
    tasks,
    planText: lines.join('\n'),
  };
}
