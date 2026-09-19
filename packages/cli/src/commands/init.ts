/**
 * CLI Handler: aisdlc init
 */

import * as readline from 'node:readline/promises';
import { initProject } from '@ai-sdlc/core';
import pc from 'picocolors';

export interface InitCliOptions {
  dryRun?: boolean;
  ci?: string;
  agents?: string | boolean;
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
  const result = initProject({
    rootDir: process.cwd(),
    targetDir,
    ci: options.ci,
    agents: options.agents === 'none' ? false : options.agents,
    dryRun: options.dryRun,
  });

  if (!result.success) {
    console.error(pc.red(`\n✖ [ERROR] ${result.error || 'Error al inicializar el proyecto.'}\n`));
    return false;
  }

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

  if (options.dryRun) {
    console.log(`  ${pc.blue('DRY-RUN')} Instalar Git Hook: .git/hooks/prepare-commit-msg`);
  } else if (result.gitHookInstalled) {
    console.log(`  ${pc.green('✔')} Git Hook instalado: ${pc.bold('prepare-commit-msg')}`);
  } else {
    console.log(`  ${pc.yellow('ℹ')} Repositorio Git no detectado en el destino.`);
    console.log(`    ${pc.gray("Ejecuta 'git init' y luego 'aisdlc git hook install' para activar los hooks de commit.")}`);
  }

  console.log(pc.green('\n✔ Repositorio configurado con políticas y plantillas AI-SDLC.\n'));
  return true;
}
