import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface GateStep {
  gate: number;
  subcommand: string;
  label: string;
}

const CORE_GATES: GateStep[] = [
  { gate: 8, subcommand: 'schemas', label: 'Schema & Graph Validation' },
  { gate: 9, subcommand: 'duplicates', label: 'Duplicate & Collision Pre-Flight' },
  { gate: 4, subcommand: 'gherkin', label: 'BDD Gherkin Extraction Sync' },
  { gate: 7, subcommand: 'pdac', label: 'Cryptographic Integrity & PDaC Drift' },
  { gate: 3, subcommand: 'governance', label: 'Task Governance & Autonomy' },
  { gate: 10, subcommand: 'friction', label: 'Progressive Friction & Anti-Bypass' },
  { gate: 12, subcommand: 'privacy', label: 'Privacy-by-Design Audit' },
  { gate: 11, subcommand: 'secrets', label: 'Shift-Left Secret Detection' },
];

const LICENSE_GATE: GateStep = {
  gate: 6,
  subcommand: 'licenses',
  label: 'OSS License Audit & SBOM',
};

function parseArgs(argv: string[]): { root?: string; withLicenses: boolean } {
  let root: string | undefined;
  let withLicenses = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--with-licenses') {
      withLicenses = true;
    } else if (arg === '--root' || arg === '-r') {
      root = argv[i + 1];
      i++;
    }
  }

  return { root, withLicenses };
}

function runCliCommand(cliArgs: string[], cliEntry: string, useLocalCli: boolean): boolean {
  if (useLocalCli) {
    const require = createRequire(import.meta.url);
    const tsxCli = require.resolve('tsx/cli');
    const result = spawnSync(process.execPath, [tsxCli, cliEntry, ...cliArgs], {
      stdio: 'inherit',
    });
    return result.status === 0;
  }

  const result = spawnSync('aisdlc', cliArgs, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  return result.status === 0;
}

function runGate(step: GateStep, cliEntry: string, useLocalCli: boolean, root?: string): boolean {
  console.log(`\n▶ [Checkpoint 1 | Gate ${step.gate}] ${step.label} (verify ${step.subcommand})`);
  const cliArgs = ['verify', step.subcommand, ...(root ? ['--root', root] : [])];
  return runCliCommand(cliArgs, cliEntry, useLocalCli);
}

function main(): void {
  const { root, withLicenses } = parseArgs(process.argv.slice(2));
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(scriptDir, '..');
  const cliEntry = resolve(repoRoot, 'packages/cli/src/index.ts');
  const useLocalCli = existsSync(cliEntry);

  const gates = withLicenses ? [...CORE_GATES, LICENSE_GATE] : CORE_GATES;

  console.log('=== AI-SDLC Checkpoint 1 Deterministic Verification ===');
  const failed: GateStep[] = [];

  for (const step of gates) {
    const ok = runGate(step, cliEntry, useLocalCli, root);
    if (!ok) {
      failed.push(step);
    }
  }

  console.log('\n=== Checkpoint 1 Verification Summary ===');
  if (failed.length > 0) {
    for (const step of failed) {
      console.error(`✖ Gate ${step.gate} (${step.subcommand}) FAILED`);
    }
    process.exit(1);
  }

  console.log(`✔ All ${gates.length} Checkpoint 1 gates PASSED.`);
  console.log('\n▶ [Checkpoint 1 | Post-Check] Refreshing incremental Code Graph cache (graph index)...');
  runCliCommand(['graph', 'index', ...(root ? ['--root', root] : [])], cliEntry, useLocalCli);
}

main();
