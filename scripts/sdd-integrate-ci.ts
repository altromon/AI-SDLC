/**
 * AI-SDLC: CI/CD Post-Merge Automated SDD Integration Script
 * Multi-provider support for GitHub Actions, GitLab CI, Azure DevOps and Bitbucket Pipelines.
 * Detects, validates, and integrates SDD increments into the canonical baseline.
 */

import pc from 'picocolors';
import {
  detectActiveChangeForIntegration,
  integrateSddChange,
  resolveCiEnvironment,
  emitCiOutput,
  type CiProvider,
  type ResolvedCiEnv,
} from '../packages/core/src/index.js';

export { resolveCiEnvironment, emitCiOutput, type CiProvider, type ResolvedCiEnv };

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
