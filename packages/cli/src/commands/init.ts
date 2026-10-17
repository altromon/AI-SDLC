import * as readline from 'node:readline/promises';
import { initProject } from '@aisdlc/core';
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

const CI_MENU = [
  pc.bold(pc.cyan('\n🚀 [AI-SDLC] CI/CD Pipeline Provider:')),
  '  1) ' + pc.green('GitHub Actions') + ' (.github/workflows/) ' + pc.yellow('[Recommended]'),
  '  2) GitLab CI (.gitlab-ci.yml)',
  '  3) Azure DevOps Pipelines (azure-pipelines.yml)',
  '  4) Bitbucket Pipelines (bitbucket-pipelines.yml)',
  '  5) ' + pc.gray('None') + ' (Reference templates in templates/ci/ only)',
].join('\n');

const CI_CHOICE_MAP: Record<string, string | undefined> = {
  '1': 'github',
  '2': 'gitlab',
  '3': 'azure',
  '4': 'bitbucket',
  '5': undefined,
  github: 'github',
  gitlab: 'gitlab',
  azure: 'azure',
  bitbucket: 'bitbucket',
  none: undefined,
};

function parseCiChoice(answer: string): string | undefined {
  const trimmed = answer.trim().toLowerCase();
  if (!trimmed) return 'github';
  return trimmed in CI_CHOICE_MAP ? CI_CHOICE_MAP[trimmed] : trimmed;
}

export async function promptForCi(): Promise<string | undefined> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(CI_MENU);
  try {
    const answer = await rl.question(pc.bold('\nWhich CI/CD provider do you wish to configure? [1-5] (default 1): '));
    return parseCiChoice(answer);
  } finally {
    rl.close();
  }
}

function parseArchitectureChoice(answer: string): string {
  const trimmed = answer.trim().toLowerCase();
  if (!trimmed || trimmed === '1' || trimmed === 'minimal') return 'minimal';
  if (trimmed === '2' || trimmed === 'full' || trimmed === 'complete') return 'full';
  if (trimmed === '3' || trimmed === 'none') return 'none';
  return trimmed;
}

const ARCH_MENU = [
  pc.bold(pc.cyan('\n🏛️  [AI-SDLC] Architecture Granularity Level:')),
  '  1) ' + pc.green('Minimal / Baseline') + ' (ARCH-INTRO-* Vision, CMP-* Decisions) ' + pc.yellow('[Recommended]'),
  '  2) ' + pc.cyan('Full / arc42 + NAF v4') + ' (12 complete architecture sections)',
  '  3) ' + pc.gray('None') + ' (No architecture templates)',
].join('\n');

export async function promptForArchitecture(): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(ARCH_MENU);
  try {
    const answer = await rl.question(pc.bold('\nWhich architecture granularity level do you wish to configure? [1-3] (default 1): '));
    return parseArchitectureChoice(answer);
  } finally {
    rl.close();
  }
}

const AGENTS_MENU = [
  pc.bold(pc.cyan('\n🤖 [AI-SDLC] Project AI Agents Configuration:')),
  '  1) ' + pc.green('All') + ' (Cursor, Claude Code, Antigravity, Copilot, MCP) ' + pc.yellow('[Recommended]'),
  '  2) Cursor (.cursor/rules and .cursor/mcp.json)',
  '  3) Claude Code (CLAUDE.md)',
  '  4) Google Antigravity / Gemini CLI (.agent/rules and antigravity.mcp.json)',
  '  5) GitHub Copilot (.github/copilot-instructions.md)',
  '  6) MCP connectors only (.cursor/mcp.json, antigravity.mcp.json, .vscode/mcp.json)',
  '  7) None (only core policies and base templates)',
].join('\n');

function parseAgentsChoice(answer: string): string {
  const map: Record<string, string> = {
    '1': 'all', '2': 'cursor', '3': 'claude', '4': 'antigravity',
    '5': 'copilot', '6': 'mcp', '7': 'none',
  };
  const trimmed = answer.trim();
  return !trimmed ? 'all' : map[trimmed] || trimmed;
}

export async function promptForAgents(): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log(AGENTS_MENU);
  try {
    const answer = await rl.question(pc.bold('\nWhich agents do you wish to deploy? [1-7 or comma-separated list] (default 1): '));
    return parseAgentsChoice(answer);
  } finally {
    rl.close();
  }
}

type InitProjectResult = ReturnType<typeof initProject>;

function emitInitJson(result: InitProjectResult, isSuccess: boolean, dryRun: boolean): void {
  const payload = {
    command: 'init',
    success: isSuccess,
    exitCode: isSuccess ? 0 : 1,
    targetDir: result.targetDir,
    directoriesCreated: result.directoriesCreated,
    filesCreated: result.filesCreated,
    ciProvider: result.ciProvider,
    agentsConfigured: result.agentsConfigured,
    architectureGranularity: result.architectureGranularity,
    gitHookInstalled: result.gitHookInstalled,
    dryRun,
    ...(isSuccess ? {} : { error: result.error || 'Error initializing project.' }),
  };
  console.log(JSON.stringify(payload, null, 2));
}

function formatGranularityLabel(granularity?: string): string {
  if (granularity === 'full' || granularity === 'complete') return 'Full (arc42 + NAF v4, 12 sections)';
  if (granularity === 'minimal') return 'Minimal / Baseline (ARCH-INTRO-*, CMP-* and ADR-*)';
  return 'None';
}

function printGitHookStatus(dryRun: boolean, installed?: boolean): void {
  if (dryRun) {
    console.log(`  ${pc.blue('DRY-RUN')} Install Git Hook: .git/hooks/prepare-commit-msg`);
  } else if (installed) {
    console.log(`  ${pc.green('✔')} Git Hook installed: ${pc.bold('prepare-commit-msg')}`);
  } else {
    console.log(`  ${pc.yellow('ℹ')} Git repository not detected at target.`);
    console.log(`    ${pc.gray("Run 'git init' and then 'aisdlc git hook install' to activate commit hooks.")}`);
  }
}

function printCreatedItems(items: string[], type: 'directory' | 'file', dryRun: boolean): void {
  const isDir = type === 'directory';
  for (const item of items) {
    const prefix = dryRun ? pc.blue('DRY-RUN') + ` ${isDir ? 'Create directory:' : 'Create file:'}` : pc.green('✔') + ` ${isDir ? 'Directory created:' : 'File generated:'}`;
    console.log(`  ${prefix} ${item}`);
  }
}

function printInitSuccess(result: InitProjectResult, dryRun: boolean): void {
  console.log(pc.bold(pc.cyan(`\n🚀 [AI-SDLC] Initializing governance structure in: ${result.targetDir}\n`)));
  printCreatedItems(result.directoriesCreated, 'directory', dryRun);
  printCreatedItems(result.filesCreated, 'file', dryRun);

  if (result.ciProvider) {
    console.log(pc.cyan(`\n  ✔ CI/CD configuration generated for provider: ${pc.bold(result.ciProvider)}`));
  }
  if (result.agentsConfigured && result.agentsConfigured.length > 0) {
    console.log(pc.cyan(`\n  ✔ Configured AI agents: ${pc.bold(result.agentsConfigured.join(', '))}`));
  }
  if (result.architectureGranularity) {
    console.log(pc.cyan(`\n  ✔ Architecture granularity: ${pc.bold(formatGranularityLabel(result.architectureGranularity))}`));
  }

  printGitHookStatus(dryRun, result.gitHookInstalled);
  console.log(pc.green('\n✔ Repository configured with AI-SDLC policies and templates.\n'));
}

function handleInitResult(
  result: InitProjectResult,
  ctx: { isSilent: boolean; useJson: boolean; dryRun: boolean }
): boolean {
  if (!result.success) {
    if (!ctx.isSilent) {
      console.error(pc.red(`\n✖ [ERROR] ${result.error || 'Error initializing project.'}\n`));
    }
    if (ctx.useJson) {
      emitInitJson(result, false, ctx.dryRun);
    }
    return false;
  }

  if (!ctx.isSilent) {
    printInitSuccess(result, ctx.dryRun);
  }

  if (ctx.useJson) {
    emitInitJson(result, true, ctx.dryRun);
  }

  return true;
}

export function runInit(
  targetDir: string = '.',
  options: InitCliOptions = {}
): boolean {
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  const dryRun = Boolean(options.dryRun);

  const result = initProject({
    rootDir: process.cwd(),
    targetDir,
    ci: options.ci,
    agents: options.agents === 'none' ? false : options.agents,
    architecture: options.architecture,
    dryRun,
  });

  return handleInitResult(result, { isSilent, useJson, dryRun });
}

