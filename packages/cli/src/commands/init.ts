import * as readline from 'node:readline/promises';
import { initProject } from '@ai-sdlc/core';
import pc from 'picocolors';
import { isJsonOutput } from './verify.js';

export interface InitCliOptions {
  dryRun?: boolean;
  ci?: string;
  agents?: string | boolean;
  architecture?: string;
  silent?: boolean;
  json?: boolean;
  format?: string;
}

export async function promptForArchitecture(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(pc.bold(pc.cyan('\n🏛️  [AI-SDLC] Nivel de Granularidad de Arquitectura:')));
  console.log('  1) ' + pc.green('Mínimo / Baseline') + ' (Solo Componentes CMP-* y Decisiones ADR-*) ' + pc.yellow('[Recomendado para microservicios y CLI]'));
  console.log('  2) ' + pc.cyan('Completo / arc42 + NAF v4') + ' (12 secciones completas de arquitectura)');
  console.log('  3) ' + pc.gray('Ninguno') + ' (Sin plantillas de arquitectura)');

  try {
    const answer = await rl.question(
      pc.bold('\n¿Qué nivel de granularidad de arquitectura deseas configurar? [1-3] (por defecto 1): ')
    );
    const trimmed = answer.trim().toLowerCase();
    if (!trimmed || trimmed === '1' || trimmed === 'minimal') return 'minimal';
    if (trimmed === '2' || trimmed === 'full' || trimmed === 'complete') return 'full';
    if (trimmed === '3' || trimmed === 'none') return 'none';
    return trimmed;
  } finally {
    rl.close();
  }
}

export async function promptForAgents(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(pc.bold(pc.cyan('\n🤖 [AI-SDLC] Configuración de Agentes de IA en el Proyecto:')));
  console.log('  1) ' + pc.green('Todos') + ' (Cursor, Claude Code, Antigravity, Copilot, MCP) ' + pc.yellow('[Recomendado]'));
  console.log('  2) Cursor (.cursor/rules y .cursor/mcp.json)');
  console.log('  3) Claude Code (CLAUDE.md)');
  console.log('  4) Google Antigravity / Gemini CLI (.agent/rules y antigravity.mcp.json)');
  console.log('  5) GitHub Copilot (.github/copilot-instructions.md)');
  console.log('  6) Solo conectores MCP (.cursor/mcp.json, antigravity.mcp.json, .vscode/mcp.json)');
  console.log('  7) Ninguno (únicamente políticas inquebrantables y plantillas base)');

  try {
    const answer = await rl.question(
      pc.bold('\n¿Qué agentes deseas desplegar? [1-7 o lista separada por comas] (por defecto 1): ')
    );
    const trimmed = answer.trim();
    if (!trimmed || trimmed === '1') return 'all';
    if (trimmed === '2') return 'cursor';
    if (trimmed === '3') return 'claude';
    if (trimmed === '4') return 'antigravity';
    if (trimmed === '5') return 'copilot';
    if (trimmed === '6') return 'mcp';
    if (trimmed === '7') return 'none';
    return trimmed;
  } finally {
    rl.close();
  }
}

export function runInit(
  targetDir: string = '.',
  options: InitCliOptions = {}
): boolean {
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  const result = initProject({
    rootDir: process.cwd(),
    targetDir,
    ci: options.ci,
    agents: options.agents === 'none' ? false : options.agents,
    architecture: options.architecture,
    dryRun: options.dryRun,
  });

  if (!result.success) {
    if (!isSilent) {
      console.error(pc.red(`\n✖ [ERROR] ${result.error || 'Error al inicializar el proyecto.'}\n`));
    }
    if (useJson) {
      const payload = {
        command: 'init',
        success: false,
        exitCode: 1,
        targetDir: result.targetDir,
        directoriesCreated: result.directoriesCreated,
        filesCreated: result.filesCreated,
        ciProvider: result.ciProvider,
        agentsConfigured: result.agentsConfigured,
        gitHookInstalled: result.gitHookInstalled,
        dryRun: Boolean(options.dryRun),
        error: result.error || 'Error al inicializar el proyecto.',
      };
      console.log(JSON.stringify(payload, null, 2));
    }
    return false;
  }

  if (!isSilent) {
    console.log(pc.bold(pc.cyan(`\n🚀 [AI-SDLC] Inicializando estructura de gobernanza en: ${result.targetDir}\n`)));

    for (const d of result.directoriesCreated) {
      if (options.dryRun) {
        console.log(`  ${pc.blue('DRY-RUN')} Crear directorio: ${d}`);
      } else {
        console.log(`  ${pc.green('✔')} Directorio creado: ${d}`);
      }
    }

    for (const f of result.filesCreated) {
      if (options.dryRun) {
        console.log(`  ${pc.blue('DRY-RUN')} Crear archivo: ${f}`);
      } else {
        console.log(`  ${pc.green('✔')} Archivo generado: ${f}`);
      }
    }

    if (result.ciProvider) {
      console.log(pc.cyan(`\n  ✔ Configuración de CI/CD generada para proveedor: ${pc.bold(result.ciProvider)}`));
    }

    if (result.agentsConfigured && result.agentsConfigured.length > 0) {
      console.log(pc.cyan(`\n  ✔ Agentes de IA configurados: ${pc.bold(result.agentsConfigured.join(', '))}`));
    }

    if (result.architectureGranularity) {
      const label =
        result.architectureGranularity === 'full' || result.architectureGranularity === 'complete'
          ? 'Completo (arc42 + NAF v4, 12 secciones)'
          : result.architectureGranularity === 'minimal'
          ? 'Mínimo / Baseline (CMP-* y ADR-*)'
          : 'Ninguno';
      console.log(pc.cyan(`\n  ✔ Granularidad de arquitectura: ${pc.bold(label)}`));
    }

    if (options.dryRun) {
      console.log(`  ${pc.blue('DRY-RUN')} Instalar Git Hook: .git/hooks/prepare-commit-msg`);
    } else if (result.gitHookInstalled) {
      console.log(`  ${pc.green('✔')} Git Hook instalado: ${pc.bold('prepare-commit-msg')}`);
    } else {
      console.log(`  ${pc.yellow('ℹ')} Repositorio Git no detectado en el destino.`);
      console.log(`    ${pc.gray("Ejecuta 'git init' y luego 'aisdlc git hook install' para activar los hooks de commit.")}`);
    }

    console.log(pc.green('\n✔ Repositorio configurado con políticas y plantillas AI-SDLC.\n'));
  }

  if (useJson) {
    const payload = {
      command: 'init',
      success: true,
      exitCode: 0,
      targetDir: result.targetDir,
      directoriesCreated: result.directoriesCreated,
      filesCreated: result.filesCreated,
      ciProvider: result.ciProvider,
      agentsConfigured: result.agentsConfigured,
      architectureGranularity: result.architectureGranularity,
      gitHookInstalled: result.gitHookInstalled,
      dryRun: Boolean(options.dryRun),
    };
    console.log(JSON.stringify(payload, null, 2));
  }

  return true;
}

