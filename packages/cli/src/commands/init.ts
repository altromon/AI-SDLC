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

  console.log(pc.bold(pc.cyan('\n🏛️  [AI-SDLC] Architecture Granularity Level:')));
  console.log('  1) ' + pc.green('Minimal / Baseline') + ' (CMP-* Components and ADR-* Decisions only) ' + pc.yellow('[Recommended for microservices and CLI]'));
  console.log('  2) ' + pc.cyan('Full / arc42 + NAF v4') + ' (12 complete architecture sections)');
  console.log('  3) ' + pc.gray('None') + ' (No architecture templates)');

  try {
    const answer = await rl.question(
      pc.bold('\nWhich architecture granularity level do you wish to configure? [1-3] (default 1): ')
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

  console.log(pc.bold(pc.cyan('\n🤖 [AI-SDLC] Project AI Agents Configuration:')));
  console.log('  1) ' + pc.green('All') + ' (Cursor, Claude Code, Antigravity, Copilot, MCP) ' + pc.yellow('[Recommended]'));
  console.log('  2) Cursor (.cursor/rules and .cursor/mcp.json)');
  console.log('  3) Claude Code (CLAUDE.md)');
  console.log('  4) Google Antigravity / Gemini CLI (.agent/rules and antigravity.mcp.json)');
  console.log('  5) GitHub Copilot (.github/copilot-instructions.md)');
  console.log('  6) MCP connectors only (.cursor/mcp.json, antigravity.mcp.json, .vscode/mcp.json)');
  console.log('  7) None (only core policies and base templates)');

  try {
    const answer = await rl.question(
      pc.bold('\nWhich agents do you wish to deploy? [1-7 or comma-separated list] (default 1): ')
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
      console.error(pc.red(`\n✖ [ERROR] ${result.error || 'Error initializing project.'}\n`));
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
        error: result.error || 'Error initializing project.',
      };
      console.log(JSON.stringify(payload, null, 2));
    }
    return false;
  }

  if (!isSilent) {
    console.log(pc.bold(pc.cyan(`\n🚀 [AI-SDLC] Initializing governance structure in: ${result.targetDir}\n`)));

    for (const d of result.directoriesCreated) {
      if (options.dryRun) {
        console.log(`  ${pc.blue('DRY-RUN')} Create directory: ${d}`);
      } else {
        console.log(`  ${pc.green('✔')} Directory created: ${d}`);
      }
    }

    for (const f of result.filesCreated) {
      if (options.dryRun) {
        console.log(`  ${pc.blue('DRY-RUN')} Create file: ${f}`);
      } else {
        console.log(`  ${pc.green('✔')} File generated: ${f}`);
      }
    }

    if (result.ciProvider) {
      console.log(pc.cyan(`\n  ✔ CI/CD configuration generated for provider: ${pc.bold(result.ciProvider)}`));
    }

    if (result.agentsConfigured && result.agentsConfigured.length > 0) {
      console.log(pc.cyan(`\n  ✔ Configured AI agents: ${pc.bold(result.agentsConfigured.join(', '))}`));
    }

    if (result.architectureGranularity) {
      const label =
        result.architectureGranularity === 'full' || result.architectureGranularity === 'complete'
          ? 'Full (arc42 + NAF v4, 12 sections)'
          : result.architectureGranularity === 'minimal'
          ? 'Minimal / Baseline (CMP-* and ADR-*)'
          : 'None';
      console.log(pc.cyan(`\n  ✔ Architecture granularity: ${pc.bold(label)}`));
    }

    if (options.dryRun) {
      console.log(`  ${pc.blue('DRY-RUN')} Install Git Hook: .git/hooks/prepare-commit-msg`);
    } else if (result.gitHookInstalled) {
      console.log(`  ${pc.green('✔')} Git Hook installed: ${pc.bold('prepare-commit-msg')}`);
    } else {
      console.log(`  ${pc.yellow('ℹ')} Git repository not detected at target.`);
      console.log(`    ${pc.gray("Run 'git init' and then 'aisdlc git hook install' to activate commit hooks.")}`);
    }

    console.log(pc.green('\n✔ Repository configured with AI-SDLC policies and templates.\n'));
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

