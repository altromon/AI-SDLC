/**
 * AI-SDLC: CI/CD Post-Merge Automated SDD Integration Script
 * Invoked by GitHub Actions workflow (.github/workflows/sdd-integrate-on-merge.yml)
 * to detect, validate, and integrate SDD increments into the canonical baseline.
 */

import * as fs from 'fs';
import pc from 'picocolors';
import {
  detectActiveChangeForIntegration,
  integrateSddChange,
} from '../packages/core/src/index.js';

function setGithubOutput(key: string, value: string): void {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile && fs.existsSync(outputFile)) {
    fs.appendFileSync(outputFile, `${key}=${value}\n`, 'utf-8');
  }
}

export function runCiIntegration(): number {
  console.log(
    pc.bold(
      pc.cyan('\n🚀 [AI-SDLC CI/CD] Ejecutando detección e integración canónica post-merge...')
    )
  );

  const manualChangeId = process.env.MANUAL_CHANGE_ID?.trim();
  const headRef = process.env.PR_HEAD_REF?.trim();
  const prTitle = process.env.PR_TITLE?.trim();
  const prBody = process.env.PR_BODY?.trim();

  let targetChangeId: string | undefined = manualChangeId || undefined;

  if (!targetChangeId) {
    const detection = detectActiveChangeForIntegration({
      rootDir: process.cwd(),
      headRef,
      prTitle,
      prBody,
    });

    if (!detection.detected || !detection.changeId) {
      console.log(
        pc.yellow('\nℹ [AI-SDLC CI/CD] No se detectó ningún cambio SDD activo asociado al PR.')
      );
      for (const r of detection.reasons) {
        console.log(`    - ${r}`);
      }
      console.log(
        pc.gray('ℹ Omitiendo integración canónica de forma segura (sin fallos).\n')
      );
      setGithubOutput('integrated', 'false');
      return 0;
    }

    if (!detection.allTasksCompleted) {
      console.error(
        pc.red(
          `\n✖ [AI-SDLC CI/CD] El cambio '${detection.changeId}' no puede integrarse porque tiene tareas incompletas (${detection.completedTasksCount}/${detection.totalTasksCount} completadas).`
        )
      );
      console.error(
        pc.red('✖ Todas las tareas en tasks.md deben estar en estado COMPLETED antes de consolidar en la especificación canónica.\n')
      );
      setGithubOutput('integrated', 'false');
      return 1;
    }

    targetChangeId = detection.changeId;
    console.log(
      pc.green(`✔ Cambio SDD detectado automáticamente: ${pc.bold(targetChangeId)} (vía ${detection.source})`)
    );
  } else {
    console.log(
      pc.cyan(`✔ Cambio SDD especificado manualmente: ${pc.bold(targetChangeId)}`)
    );
  }

  const result = integrateSddChange({
    rootDir: process.cwd(),
    changeId: targetChangeId,
    author: 'GitHub Actions CI (Automated SDD Integration)',
    autoArchive: true,
  });

  if (!result.success) {
    console.error(pc.red(`\n✖ Error integrando el cambio '${targetChangeId}':`));
    for (const err of result.errors) {
      console.error(`    ${pc.red('✖')} ${err}`);
    }
    console.error(pc.red('\n✖ Integración canónica fallida.\n'));
    setGithubOutput('integrated', 'false');
    return 1;
  }

  console.log(pc.green(`\n✔ Cambio '${targetChangeId}' integrado con éxito en la especificación canónica:`));
  console.log(`  - Requerimientos integrados:  ${pc.green(result.integratedRequirements.join(', ') || 'Ninguno')}`);
  console.log(`  - Artefactos actualizados:    ${pc.green(result.updatedProductArtifacts.join(', ') || 'Ninguno')}`);
  console.log(`  - Arquitectura actualizada:   ${pc.green(result.updatedArchitectureArtifacts.join(', ') || 'Ninguno')}`);
  if (result.archived) {
    console.log(`  - Archivado a:                ${pc.cyan(result.archivedPath || 'specs/changes/completed')}`);
  }
  console.log('');

  setGithubOutput('integrated', 'true');
  setGithubOutput('change_id', targetChangeId);
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('sdd-integrate-ci.ts')) {
  const code = runCiIntegration();
  process.exit(code);
}
