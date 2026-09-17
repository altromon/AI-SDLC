/**
 * AI-SDLC: CI/CD Post-Merge Automated SDD Integration Script
 * Multi-provider support for GitHub Actions, GitLab CI, Azure DevOps and Bitbucket Pipelines.
 * Detects, validates, and integrates SDD increments into the canonical baseline.
 */

import * as fs from 'fs';
import pc from 'picocolors';
import {
  detectActiveChangeForIntegration,
  integrateSddChange,
} from '../packages/core/src/index.js';

export type CiProvider = 'github' | 'gitlab' | 'azure' | 'bitbucket' | 'generic';

export interface ResolvedCiEnv {
  provider: CiProvider;
  headRef?: string;
  prTitle?: string;
  prBody?: string;
  prId?: string;
  manualChangeId?: string;
  author: string;
}

export function resolveCiEnvironment(env: NodeJS.ProcessEnv = process.env): ResolvedCiEnv {
  const manualChangeId = env.MANUAL_CHANGE_ID?.trim() || env.CHANGE_ID?.trim() || undefined;

  let provider: CiProvider = 'generic';
  if (env.GITLAB_CI === 'true') {
    provider = 'gitlab';
  } else if (env.TF_BUILD === 'true') {
    provider = 'azure';
  } else if (env.BITBUCKET_COMMIT !== undefined || env.BITBUCKET_BRANCH !== undefined) {
    provider = 'bitbucket';
  } else if (env.GITHUB_ACTIONS === 'true') {
    provider = 'github';
  }

  // Branch / Ref extraction
  let headRef: string | undefined = env.PR_HEAD_REF?.trim() || undefined;
  if (!headRef) {
    if (provider === 'gitlab') {
      headRef =
        env.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME?.trim() ||
        env.CI_COMMIT_REF_NAME?.trim() ||
        env.CI_COMMIT_BRANCH?.trim() ||
        undefined;
    } else if (provider === 'azure') {
      const azureBranch =
        env.SYSTEM_PULLREQUEST_SOURCEBRANCH?.trim() ||
        env.BUILD_SOURCEBRANCH?.trim() ||
        env.BUILD_SOURCEBRANCHNAME?.trim();
      if (azureBranch) {
        headRef = azureBranch.replace(/^refs\/heads\//, '');
      }
    } else if (provider === 'bitbucket') {
      headRef =
        env.BITBUCKET_BRANCH?.trim() ||
        env.BITBUCKET_PR_DESTINATION_BRANCH?.trim() ||
        undefined;
    } else if (provider === 'github') {
      headRef =
        env.GITHUB_HEAD_REF?.trim() ||
        env.GITHUB_REF_NAME?.trim() ||
        undefined;
    }
  }

  // PR / MR Title
  const prTitle: string | undefined =
    env.PR_TITLE?.trim() ||
    env.CI_MERGE_REQUEST_TITLE?.trim() ||
    env.SYSTEM_PULLREQUEST_PULLREQUESTTITLE?.trim() ||
    undefined;

  // PR / MR Body / Description
  const prBody: string | undefined =
    env.PR_BODY?.trim() ||
    env.CI_MERGE_REQUEST_DESCRIPTION?.trim() ||
    undefined;

  // PR / MR ID
  const prId: string | undefined =
    env.PR_NUMBER?.trim() ||
    env.CI_MERGE_REQUEST_IID?.trim() ||
    env.SYSTEM_PULLREQUEST_PULLREQUESTID?.trim() ||
    env.BITBUCKET_PR_ID?.trim() ||
    undefined;

  // Provider author attribution
  let author = 'CI/CD Automated SDD Integration';
  if (provider === 'github') {
    author = 'GitHub Actions CI (Automated SDD Integration)';
  } else if (provider === 'gitlab') {
    author = 'GitLab CI (Automated SDD Integration)';
  } else if (provider === 'azure') {
    author = 'Azure DevOps CI (Automated SDD Integration)';
  } else if (provider === 'bitbucket') {
    author = 'Bitbucket Pipelines (Automated SDD Integration)';
  }

  return {
    provider,
    headRef,
    prTitle,
    prBody,
    prId,
    manualChangeId,
    author,
  };
}

export function emitCiOutput(
  key: string,
  value: string,
  env: NodeJS.ProcessEnv = process.env
): void {
  // 1. GitHub Actions output
  const outputFile = env.GITHUB_OUTPUT;
  if (outputFile && fs.existsSync(outputFile)) {
    fs.appendFileSync(outputFile, `${key}=${value}\n`, 'utf-8');
  }

  // 2. Azure DevOps Logging Command
  if (env.TF_BUILD === 'true') {
    console.log(`##vso[task.setvariable variable=${key};isOutput=true]${value}`);
  }

  // 3. Dotenv output file (GitLab CI, Bitbucket, or explicit CI_OUTPUT_FILE)
  const envOutputFile =
    env.CI_OUTPUT_FILE ||
    env.GITLAB_ENV ||
    (env.GITLAB_CI === 'true' || env.BITBUCKET_COMMIT !== undefined
      ? 'sdd-integrate.env'
      : undefined);

  if (envOutputFile) {
    const uppercaseKey = key.toUpperCase();
    fs.appendFileSync(envOutputFile, `${uppercaseKey}=${value}\n`, 'utf-8');
  }
}

export function runCiIntegration(
  options: { rootDir?: string; env?: NodeJS.ProcessEnv } = {}
): number {
  const env = options.env || process.env;
  const rootDir = options.rootDir || process.cwd();

  const ciEnv = resolveCiEnvironment(env);

  console.log(
    pc.bold(
      pc.cyan(
        `\n🚀 [AI-SDLC CI/CD] Ejecutando detección e integración canónica post-merge [${ciEnv.provider.toUpperCase()}]...`
      )
    )
  );

  let targetChangeId: string | undefined = ciEnv.manualChangeId;

  if (!targetChangeId) {
    const detection = detectActiveChangeForIntegration({
      rootDir,
      headRef: ciEnv.headRef,
      prTitle: ciEnv.prTitle,
      prBody: ciEnv.prBody,
    });

    if (!detection.detected || !detection.changeId) {
      console.log(
        pc.yellow('\nℹ [AI-SDLC CI/CD] No se detectó ningún cambio SDD activo asociado al PR/MR.')
      );
      for (const r of detection.reasons) {
        console.log(`    - ${r}`);
      }
      console.log(
        pc.gray('ℹ Omitiendo integración canónica de forma segura (sin fallos).\n')
      );
      emitCiOutput('integrated', 'false', env);
      return 0;
    }

    if (!detection.allTasksCompleted) {
      console.error(
        pc.red(
          `\n✖ [AI-SDLC CI/CD] El cambio '${detection.changeId}' no puede integrarse porque tiene tareas incompletas (${detection.completedTasksCount}/${detection.totalTasksCount} completadas).`
        )
      );
      console.error(
        pc.red(
          '✖ Todas las tareas en tasks.md deben estar en estado COMPLETED antes de consolidar en la especificación canónica.\n'
        )
      );
      emitCiOutput('integrated', 'false', env);
      return 1;
    }

    targetChangeId = detection.changeId;
    console.log(
      pc.green(
        `✔ Cambio SDD detectado automáticamente: ${pc.bold(targetChangeId)} (vía ${detection.source})`
      )
    );
  } else {
    console.log(
      pc.cyan(`✔ Cambio SDD especificado manualmente: ${pc.bold(targetChangeId)}`)
    );
  }

  const result = integrateSddChange({
    rootDir,
    changeId: targetChangeId,
    author: ciEnv.author,
    autoArchive: true,
  });

  if (!result.success) {
    console.error(pc.red(`\n✖ Error integrando el cambio '${targetChangeId}':`));
    for (const err of result.errors) {
      console.error(`    ${pc.red('✖')} ${err}`);
    }
    console.error(pc.red('\n✖ Integración canónica fallida.\n'));
    emitCiOutput('integrated', 'false', env);
    return 1;
  }

  console.log(
    pc.green(`\n✔ Cambio '${targetChangeId}' integrado con éxito en la especificación canónica:`)
  );
  console.log(
    `  - Requerimientos integrados:  ${pc.green(result.integratedRequirements.join(', ') || 'Ninguno')}`
  );
  console.log(
    `  - Artefactos actualizados:    ${pc.green(result.updatedProductArtifacts.join(', ') || 'Ninguno')}`
  );
  console.log(
    `  - Arquitectura actualizada:   ${pc.green(result.updatedArchitectureArtifacts.join(', ') || 'Ninguno')}`
  );
  if (result.archived) {
    console.log(
      `  - Archivado a:                ${pc.cyan(result.archivedPath || 'specs/changes/completed')}`
    );
  }
  console.log('');

  emitCiOutput('integrated', 'true', env);
  emitCiOutput('change_id', targetChangeId, env);
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('sdd-integrate-ci.ts')) {
  const code = runCiIntegration();
  process.exit(code);
}
