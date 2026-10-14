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

function classifyTier1And2(branchName: string): BranchClassificationResult | null {
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
  return null;
}

const TIER_3_CONFIGS = [
  { regex: BRANCH_PATTERNS.FEATURE, tierName: 'Feature (Funcionalidad)', parentReq: 'Debe originarse desde una rama release/vX.Y.Z activa', merge: 'release/vX.Y.Z' },
  { regex: BRANCH_PATTERNS.BUG, tierName: 'Bug (Defecto)', parentReq: 'Debe originarse desde una rama release/vX.Y.Z activa', merge: 'release/vX.Y.Z' },
  { regex: BRANCH_PATTERNS.PATCH, tierName: 'Patch (Parche Rápido)', parentReq: 'Debe originarse desde una rama release/vX.Y.Z activa o main según criticidad', merge: 'release/vX.Y.Z o main' },
];

function classifyTier3(branchName: string): BranchClassificationResult | null {
  for (const cfg of TIER_3_CONFIGS) {
    const m = branchName.match(cfg.regex);
    if (m) {
      return {
        valid: true,
        tier: 3,
        tierName: cfg.tierName,
        id: m[2],
        parentRequirement: cfg.parentReq,
        targetMerge: cfg.merge,
      };
    }
  }
  return null;
}

function classifyTier4(branchName: string): BranchClassificationResult | null {
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
  return null;
}

export function classifyBranch(branchName: string): BranchClassificationResult {
  return (
    classifyTier1And2(branchName) ||
    classifyTier3(branchName) ||
    classifyTier4(branchName) || {
      valid: false,
      tier: 0,
      tierName: 'Inválido',
      error: `El nombre '${branchName}' no cumple con los estándares del modelo de 4 tiers.`,
    }
  );
}

function buildTaskBranchLines(feature: string, tasks: string[], fBranch: string): string[] {
  const lines: string[] = [];
  const parentSlug = feature.split('-').slice(0, 2).join('-');
  for (const t of tasks) {
    const taskBranch = `task/${parentSlug}/${t.toLowerCase()}`;
    lines.push(`   ├── ${taskBranch}`);
    lines.push(`   │     Comando git: git checkout ${fBranch} && git checkout -b ${taskBranch}`);
  }
  return lines;
}

const PLAN_BANNER = '================================================================';

function buildPlanHeader(vBranch: string, fBranch: string): string[] {
  return [
    PLAN_BANNER,
    'AI-SDLC: Plan de Ramificación Jerárquico',
    `${PLAN_BANNER}\n`,
    `1. [TIER 1] Rama Base Estable:       main`,
    `2. [TIER 2] Rama de Versión Abierta:  ${vBranch} (originada de main)`,
    `3. [TIER 3] Rama de Feature:          ${fBranch} (originada de ${vBranch})\n`,
    `4. [TIER 4] Ramas de Tareas Atómicas (originadas de ${fBranch}):`,
  ];
}

export function generateBranchHierarchyPlan(
  version: string,
  feature: string,
  tasks: string[]
): BranchHierarchyPlan {
  const vBranch = `release/${version}`;
  const fBranch = `feat/${feature}`;

  const header = buildPlanHeader(vBranch, fBranch);
  const taskLines = buildTaskBranchLines(feature, tasks, fBranch);
  const footer = [
    `\nFlujo de Integración (Merges):`,
    `  task/* ➔ [PR Tarea] ➔ ${fBranch} ➔ [PR Feature + Quality Gate] ➔ ${vBranch} ➔ [PR Release] ➔ main\n`,
  ];

  return {
    version,
    feature,
    tasks,
    planText: [...header, ...taskLines, ...footer].join('\n'),
  };
}
