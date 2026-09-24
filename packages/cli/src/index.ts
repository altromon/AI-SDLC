/**
 * @ai-sdlc/cli
 * Command Line Interface for AI-SDLC Quality Gates and Governance
 */

import { Command } from 'commander';
import pc from 'picocolors';
import { runCheck } from './commands/check.js';
import { runGherkinExtract } from './commands/gherkin.js';
import {
  runGitCheckout,
  runGitDetectAuthor,
  runGitHookInstall,
  runGitPlan,
  runGitValidate,
} from './commands/git.js';
import { promptForAgents, promptForArchitecture, runInit } from './commands/init.js';
import { runKpiPr, runKpiRelease } from './commands/kpi.js';
import { runMcpServer } from './commands/mcp.js';
import { runReportDashboard, runReportQuality } from './commands/report.js';
import { runChangeNew, runSddDeposit, runSddIntegrate, runSddVerify } from './commands/sdd.js';
import {
  runVerifyAll,
  runVerifyDuplicates,
  runVerifyFriction,
  runVerifyGovernance,
  runVerifyLicenses,
  runVerifyPdac,
  runVerifyQuality,
  runVerifySast,
  runVerifySchemas,
  runVerifySecrets,
  runVerifySecurity,
  runVerifyTesting,
  runVerifyTraceability,
} from './commands/verify.js';

const program = new Command();

program
  .name('aisdlc')
  .description('AI-SDLC: Spec-Driven Development, Governance & Quality Gates for AI & Humans')
  .version('1.0.0');

// --- check command (unified pre-flight with auto-fix) ---
program
  .command('check')
  .description('Unified pre-flight command: validates Quality Gates with optional non-destructive auto-fix')
  .option('--fix', 'Automatically synchronize Gherkin scenarios (.feature) and cryptographic digests of PDaC citations')
  .option('-r, --root <path>', 'Project root directory')
  .option('--json', 'Emit verification results in structured JSON format')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runCheck({
      fix: opts.fix,
      root: opts.root,
      json: opts.json,
      format: opts.format,
    });
    process.exit(passed ? 0 : 1);
  });

// --- verify command suite ---
const verifyCommand = program
  .command('verify')
  .description('Run deterministic verifiers for quality, traceability, governance, and licenses');

verifyCommand
  .command('all', { isDefault: true })
  .description('Run the full quality and governance suite (Quality Gate + RTM + Tasks + Tests + Licenses + PDaC + Schemas + Duplicates + Security)')
  .option('-r, --root <path>', 'Project root directory')
  .option('-p, --policy <path>', 'Path to quality-policy.yaml')
  .option('-C, --max-cyclomatic <number>', 'Maximum Cyclomatic Complexity threshold')
  .option('-K, --max-cognitive <number>', 'Maximum Cognitive Complexity threshold')
  .option('-M, --min-maintainability <number>', 'Minimum Maintainability threshold (0-100)')
  .option('-L, --max-lines <number>', 'Maximum lines per function threshold')
  .option('-m, --mode <mode>', 'Enforcement mode: STRICT or PERMISSIVE')
  .option('--json', 'Emit verification results in structured JSON format')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runVerifyAll({
      root: opts.root,
      policy: opts.policy,
      maxCyclomatic: opts.maxCyclomatic,
      maxCognitive: opts.maxCognitive,
      minMaintainability: opts.minMaintainability,
      maxLines: opts.maxLines,
      enforceMode: opts.mode,
      json: opts.json,
      format: opts.format,
    });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('quality')
  .description('Quality Release Gate (Cyclomatic Complexity <= 10, Maintainability >= 50)')
  .option('-r, --root <path>', 'Project root directory')
  .option('-p, --policy <path>', 'Path to quality-policy.yaml')
  .option('-C, --max-cyclomatic <number>', 'Maximum Cyclomatic Complexity threshold')
  .option('-K, --max-cognitive <number>', 'Maximum Cognitive Complexity threshold')
  .option('-M, --min-maintainability <number>', 'Minimum Maintainability threshold (0-100)')
  .option('-L, --max-lines <number>', 'Maximum lines per function threshold')
  .option('-m, --mode <mode>', 'Enforcement mode: STRICT or PERMISSIVE')
  .option('--json', 'Emit verification results in structured JSON format')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runVerifyQuality({
      root: opts.root,
      policy: opts.policy,
      maxCyclomatic: opts.maxCyclomatic,
      maxCognitive: opts.maxCognitive,
      minMaintainability: opts.minMaintainability,
      maxLines: opts.maxLines,
      enforceMode: opts.mode,
      json: opts.json,
      format: opts.format,
    });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('traceability')
  .description('Audit the 360° Requirements Traceability Matrix (Product -> Architecture -> Testing)')
  .option('-r, --root <path>', 'Project root directory')
  .option('--json', 'Emit verification results in structured JSON format')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runVerifyTraceability({ root: opts.root, json: opts.json, format: opts.format });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('governance')
  .description('Audit task governance and human autonomy modes (AUTONOMOUS, HUMAN_REVIEW_PLAN, etc.)')
  .option('-r, --root <path>', 'Project root directory')
  .option('--json', 'Emit verification results in structured JSON format')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runVerifyGovernance({ root: opts.root, json: opts.json, format: opts.format });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('testing')
  .description('Audit that 100% of requirements and tasks have verifiable tests')
  .option('-r, --root <path>', 'Project root directory')
  .option('--json', 'Emit verification results in structured JSON format')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runVerifyTesting({ root: opts.root, json: opts.json, format: opts.format });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('licenses')
  .description('Verify OSS license compliance against license-policy.yaml (dynamic SCA and SBOM)')
  .option('-r, --root <path>', 'Project root directory')
  .option('-p, --policy <path>', 'Path to license-policy.yaml')
  .option('-m, --manifest <path>', 'Path to license-manifest.yaml')
  .option('--no-dynamic', 'Disable dynamic scanning and require static manifest file')
  .option('--sbom [path]', 'Generate CycloneDX 1.5 JSON standard SBOM file')
  .option('--notices [path]', 'Generate THIRD_PARTY_NOTICES.md legal notices and attributions file')
  .option('--tool <tool>', 'SCA tool: native, trivy, syft', 'native')
  .option('--depth <depth>', 'Analysis depth: direct or transitive', 'transitive')
  .option('--json', 'Emit verification results in structured JSON format')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runVerifyLicenses({
      root: opts.root,
      policy: opts.policy,
      manifest: opts.manifest,
      dynamic: opts.dynamic,
      tool: opts.tool,
      depth: opts.depth,
      sbom: opts.sbom,
      notices: opts.notices,
      json: opts.json,
      format: opts.format,
    });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('pdac')
  .description('Verify PDaC graph and evaluate cryptographic drift of SHA-256 citations')
  .option('-r, --root <path>', 'Project root directory')
  .option('--json', 'Emit verification results in structured JSON format')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runVerifyPdac({ root: opts.root, json: opts.json, format: opts.format });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('schemas')
  .description('Verify Markdown artifacts compliance against canonical JSON schemas (Draft 2020-12)')
  .option('-r, --root <path>', 'Project root directory')
  .option('-p, --path <path>', 'Target file or directory path')
  .option('--json', 'Emit verification results in structured JSON format')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runVerifySchemas({ root: opts.root, path: opts.path, json: opts.json, format: opts.format });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('duplicates')
  .description('Audit duplicate requirements, ID collisions, lexical redundancy, and BDD overlaps')
  .option('-r, --root <path>', 'Project root directory')
  .option('-s, --similarity <number>', 'Lexical similarity threshold for titles (0.0 to 1.0)', '0.85')
  .option('--json', 'Emit verification results in structured JSON format')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runVerifyDuplicates({ root: opts.root, similarity: opts.similarity, json: opts.json, format: opts.format });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('security')
  .description('Unified security verification: deterministic secrets detection (Gitleaks) and shift-left SAST')
  .option('-r, --root <path>', 'Project root directory')
  .option('-d, --diff', 'Scan only lines added in the current branch git diff')
  .option('-b, --base <branch>', 'Base branch for git diff calculation (default: origin/main or HEAD)')
  .option('-g, --gitleaks', 'Delegate or contrast with native Gitleaks binary if available')
  .option('-s, --semgrep', 'Delegate to Semgrep CLI if installed')
  .option('-e, --entropy <number>', 'Minimum Shannon entropy threshold (0.0 to 8.0)', '4.3')
  .option('-m, --min-severity <level>', 'Minimum severity for SAST failure: CRITICAL, HIGH, MEDIUM', 'HIGH')
  .option('--json', 'Emit verification results in structured JSON format')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runVerifySecurity({
      root: opts.root,
      diff: opts.diff,
      base: opts.base,
      gitleaks: opts.gitleaks,
      semgrep: opts.semgrep,
      entropy: opts.entropy,
      minSeverity: opts.minSeverity,
      json: opts.json,
      format: opts.format,
    });
    process.exit(passed ? 0 : 4);
  });

verifyCommand
  .command('secrets')
  .description('Verify absence of exposed credentials, API keys, and certificates (Gitleaks Gate)')
  .option('-r, --root <path>', 'Project root directory')
  .option('-d, --diff', 'Scan only lines added in the current branch git diff')
  .option('-b, --base <branch>', 'Base branch for git diff calculation (default: origin/main or HEAD)')
  .option('-g, --gitleaks', 'Delegate or contrast with native Gitleaks binary if available')
  .option('-e, --entropy <number>', 'Minimum Shannon entropy threshold (0.0 to 8.0)', '4.3')
  .option('--json', 'Emit verification results in structured JSON format')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runVerifySecrets({
      root: opts.root,
      diff: opts.diff,
      base: opts.base,
      gitleaks: opts.gitleaks,
      entropy: opts.entropy,
      json: opts.json,
      format: opts.format,
    });
    process.exit(passed ? 0 : 4);
  });

verifyCommand
  .command('sast')
  .description('Shift-left static application security testing (SAST) for critical patterns (SQLi, exec, SSRF)')
  .option('-r, --root <path>', 'Project root directory')
  .option('-s, --semgrep', 'Delegate to Semgrep CLI if installed')
  .option('-m, --min-severity <level>', 'Minimum severity for failure: CRITICAL, HIGH, MEDIUM', 'HIGH')
  .option('--json', 'Emit verification results in structured JSON format')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runVerifySast({
      root: opts.root,
      semgrep: opts.semgrep,
      minSeverity: opts.minSeverity,
      json: opts.json,
      format: opts.format,
    });
    process.exit(passed ? 0 : 1);
  });

verifyCommand
  .command('friction [change]')
  .description('Verify progressive friction and Anti-Bypass guardrails for quick patches')
  .option('-r, --root <path>', 'Project root directory')
  .option('--json', 'Emit verification results in structured JSON format')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((change, opts) => {
    const passed = runVerifyFriction({ root: opts.root, change, json: opts.json, format: opts.format });
    process.exit(passed ? 0 : 1);
  });

// --- report command suite ---
const reportCommand = program
  .command('report')
  .description('Generate formal metric reports in Markdown format');

reportCommand
  .command('quality')
  .description('Generate formal polyglot code quality report (reports/QUALITY_REPORT.md)')
  .option('-r, --root <path>', 'Project root directory')
  .option('-p, --policy <path>', 'Path to quality-policy.yaml')
  .option('-C, --max-cyclomatic <number>', 'Maximum Cyclomatic Complexity threshold')
  .option('-K, --max-cognitive <number>', 'Maximum Cognitive Complexity threshold')
  .option('-M, --min-maintainability <number>', 'Minimum Maintainability threshold (0-100)')
  .option('-L, --max-lines <number>', 'Maximum lines per function threshold')
  .option('-m, --mode <mode>', 'Enforcement mode: STRICT or PERMISSIVE')
  .action((opts) => {
    const passed = runReportQuality({
      root: opts.root,
      policy: opts.policy,
      maxCyclomatic: opts.maxCyclomatic,
      maxCognitive: opts.maxCognitive,
      minMaintainability: opts.minMaintainability,
      maxLines: opts.maxLines,
      enforceMode: opts.mode,
    });
    process.exit(passed ? 0 : 1);
  });

reportCommand
  .command('dashboard')
  .description('Generate interactive web dashboard and PDaC / RTM graph visualizer (reports/dashboard.html)')
  .option('-r, --root <path>', 'Project root directory')
  .option('-o, --output <path>', 'Output HTML file path (default: reports/dashboard.html)')
  .option('-t, --title <title>', 'Web dashboard title')
  .option('--open', 'Open dashboard in default browser')
  .action((opts) => {
    const passed = runReportDashboard({
      root: opts.root,
      output: opts.output,
      title: opts.title,
      open: opts.open,
    });
    process.exit(passed ? 0 : 1);
  });

// --- gherkin command suite ---
const gherkinCommand = program
  .command('gherkin')
  .description('BDD / Gherkin synchronization and extraction tools');

gherkinCommand
  .command('extract')
  .description('Extract ```gherkin``` blocks from Markdown specifications into .feature files')
  .option('-r, --root <path>', 'Project root directory')
  .option('-p, --path <path>', 'Target Markdown file or directory')
  .option('-a, --all', 'Process all specifications and requirements')
  .option('--json', 'Structured JSON format output')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runGherkinExtract({
      root: opts.root,
      path: opts.path,
      all: opts.all,
      json: opts.json,
      format: opts.format,
    });
    process.exit(passed ? 0 : 1);
  });

// --- git command suite ---
const gitCommand = program
  .command('git')
  .description('Tools for the 4-tier hierarchical Git branch model');

gitCommand
  .command('validate <branch>')
  .description('Validate naming and hierarchy of a Git branch (Tier 1 to 4)')
  .action((branch) => {
    const passed = runGitValidate(branch);
    process.exit(passed ? 0 : 1);
  });

gitCommand
  .command('plan')
  .description('Plan 4-tier Git branch hierarchy for a version and feature')
  .option('-r, --release <version>', 'Release version (e.g. v1.1.0)', 'v1.1.0')
  .option('-f, --feature <feature>', 'Feature identifier (e.g. CHG-001-telemetry)', 'CHG-001-telemetry')
  .option('-t, --tasks <tasks>', 'Comma-separated tasks list (e.g. TSK-001,TSK-002)', 'TSK-001,TSK-002')
  .action((opts) => {
    runGitPlan({ version: opts.release, feature: opts.feature, tasks: opts.tasks });
    process.exit(0);
  });

gitCommand
  .command('checkout <task>')
  .description('Navigate and automatically create 4-tier cascading branches for a task')
  .option('-r, --root <path>', 'Project root directory')
  .action((task, opts) => {
    const passed = runGitCheckout(task, { root: opts.root });
    process.exit(passed ? 0 : 1);
  });

const gitHookCommand = gitCommand
  .command('hook')
  .description('AI-SDLC automated Git Hooks management and installation');

gitHookCommand
  .command('install')
  .description('Install prepare-commit-msg hook for automatic commit trailer injection')
  .option('-r, --root <path>', 'Project root directory')
  .action((opts) => {
    const passed = runGitHookInstall({ root: opts.root });
    process.exit(passed ? 0 : 1);
  });

gitCommand
  .command('detect-author')
  .description('Universally detect IDE-independently whether the author is human or an agent')
  .option('--json', 'Structured JSON format output')
  .option('-r, --root <path>', 'Project root directory')
  .action((opts) => {
    const passed = runGitDetectAuthor({ root: opts.root, json: opts.json });
    process.exit(passed ? 0 : 1);
  });

// --- kpi command suite ---
const kpiCommand = program
  .command('kpi')
  .description('Metrics, telemetry, and KPI aggregation tools (PR and Release)');

kpiCommand
  .command('pr')
  .description('Calculate and generate aggregated Markdown KPI table for a Pull Request')
  .option('-b, --base <branch>', 'Comparison base branch', 'main')
  .option('-h, --head <branch>', 'Source branch or HEAD', 'HEAD')
  .option('-u, --update-file <path>', 'File where to inject the KPI block (e.g. .github/PULL_REQUEST_TEMPLATE.md)')
  .option('--json', 'Print output in structured JSON format')
  .option('-r, --root <path>', 'Project root directory')
  .action((opts) => {
    const passed = runKpiPr({
      base: opts.base,
      head: opts.head,
      updateFile: opts.updateFile,
      json: opts.json,
      root: opts.root,
    });
    process.exit(passed ? 0 : 1);
  });

kpiCommand
  .command('release')
  .description('Consolidate release KPIs, DIR by model/human, and rework costs')
  .requiredOption('--release <branch>', 'Release branch to audit (e.g. release/v1.1.0)')
  .option('-b, --base <branch>', 'Stable base branch (e.g. main)', 'main')
  .option('-o, --output <dir>', 'Output directory for reports (default: reports/releases/)')
  .option('--json', 'Print output in structured JSON format')
  .option('-r, --root <path>', 'Project root directory')
  .action((opts) => {
    const passed = runKpiRelease({
      release: opts.release,
      base: opts.base,
      output: opts.output,
      json: opts.json,
      root: opts.root,
    });
    process.exit(passed ? 0 : 1);
  });

// --- change command suite ---
const changeCommand = program
  .command('change')
  .description('SDD change lifecycle and scaffolding management');

changeCommand
  .command('new <name>')
  .description('Create complete scaffolding for a new SDD change (proposal, spec, design, tasks, handoff.yaml)')
  .option('-r, --root <path>', 'Project root directory')
  .option('--from <ids...>', 'Identifier or list of identifiers to cite (UC-*, FR-*, etc.)')
  .option('--id <changeId>', 'Explicit change identifier (e.g. chg-002-my-change)')
  .option('-p, --profile <profile>', 'Change risk profile: patch, standard, or critical', 'standard')
  .option('-f, --framework <framework>', 'SDD framework: openspec or speckit', 'openspec')
  .option('-a, --author <author>', 'Author name or developer agent')
  .option('--json', 'Structured JSON format output')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((name, opts) => {
    const passed = runChangeNew({
      root: opts.root,
      name,
      from: opts.from,
      id: opts.id,
      profile: opts.profile,
      framework: opts.framework,
      author: opts.author,
      json: opts.json,
      format: opts.format,
    });
    process.exit(passed ? 0 : 1);
  });

// --- sdd command suite ---
const sddCommand = program
  .command('sdd')
  .description('Tools for integration with SDD ecosystems (OpenSpec and Spec Kit)');

sddCommand
  .command('new <name>')
  .description('Alias of `aisdlc change new`: create complete scaffolding for a new SDD change')
  .option('-r, --root <path>', 'Project root directory')
  .option('--from <ids...>', 'Identifier or list of identifiers to cite (UC-*, FR-*, etc.)')
  .option('--id <changeId>', 'Explicit change identifier (e.g. chg-002-my-change)')
  .option('-p, --profile <profile>', 'Change risk profile: patch, standard, or critical', 'standard')
  .option('-f, --framework <framework>', 'SDD framework: openspec or speckit', 'openspec')
  .option('-a, --author <author>', 'Author name or developer agent')
  .option('--json', 'Structured JSON format output')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((name, opts) => {
    const passed = runChangeNew({
      root: opts.root,
      name,
      from: opts.from,
      id: opts.id,
      profile: opts.profile,
      framework: opts.framework,
      author: opts.author,
      json: opts.json,
      format: opts.format,
    });
    process.exit(passed ? 0 : 1);
  });

sddCommand
  .command('deposit')
  .description('Deposit a product subgraph as a sidecar companion file (handoff.yaml)')
  .requiredOption('-c, --change <id>', 'Change identifier (e.g. chg-001-telemetry)')
  .option('-f, --framework <framework>', 'SDD framework: openspec or speckit', 'openspec')
  .option('-r, --root <path>', 'Project root directory')
  .option('-t, --title <title>', 'PDaC handoff title')
  .option('--requirements <reqs>', 'Comma-separated list of requirement IDs')
  .option('--use-cases <ucs>', 'Comma-separated list of use case IDs')
  .option('--json', 'Structured JSON format output')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runSddDeposit({
      root: opts.root,
      change: opts.change,
      framework: opts.framework,
      title: opts.title,
      requirements: opts.requirements,
      useCases: opts.useCases,
      json: opts.json,
      format: opts.format,
    });
    process.exit(passed ? 0 : 1);
  });

sddCommand
  .command('verify')
  .description('Validate compliance of handoff.yaml sidecar files (HOF-*) in changes')
  .option('-r, --root <path>', 'Project root directory')
  .option('-f, --framework <framework>', 'SDD framework: openspec or speckit')
  .option('--json', 'Structured JSON format output')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runSddVerify({
      root: opts.root,
      framework: opts.framework,
      json: opts.json,
      format: opts.format,
    });
    process.exit(passed ? 0 : 1);
  });

sddCommand
  .command('integrate')
  .description('Integrate and synchronize implemented SDD changes into canonical specification (product, requirements, and architecture)')
  .option('-c, --change <id>', 'Change identifier (e.g. chg-001-telemetry)')
  .option('--auto', 'Automatically detect active change to integrate based on branch, PR, or diff')
  .option('--head-ref <ref>', 'Source branch for automatic resolution')
  .option('--pr-title <title>', 'Pull Request title for automatic resolution')
  .option('--pr-body <body>', 'Pull Request body for automatic resolution')
  .option('-r, --root <path>', 'Project root directory')
  .option('-a, --author <author>', 'Name of author or agent performing integration')
  .option('--no-archive', 'Do not archive change to specs/changes/completed after integration')
  .option('--json', 'Structured JSON format output')
  .option('-F, --format <format>', 'Output format: text or json')
  .action((opts) => {
    const passed = runSddIntegrate({
      root: opts.root,
      change: opts.change,
      auto: opts.auto,
      headRef: opts.headRef,
      prTitle: opts.prTitle,
      prBody: opts.prBody,
      author: opts.author,
      autoArchive: opts.archive !== false,
      json: opts.json,
      format: opts.format,
    });
    process.exit(passed ? 0 : 1);
  });

// --- init command ---
program
  .command('init [directory]')
  .description('Initialize a new repository with AI-SDLC guidelines, schemas, and policies')
  .option('-d, --dry-run', 'Simulate file and directory creation without writing to disk')
  .option('--ci <provider>', 'CI/CD provider for pipeline generation (github, gitlab, azure, bitbucket)')
  .option('--agents [targets]', 'AI agent environments to configure (all, cursor, claude, antigravity, copilot, mcp, or comma-separated combination)')
  .option('--arch, --architecture <granularity>', 'Architecture templates granularity level (minimal, full, complete, none)')
  .option('--json', 'Structured JSON format output')
  .option('-F, --format <format>', 'Output format: text or json')
  .action(async (directory, opts) => {
    let agents = opts.agents;
    let arch = opts.architecture || opts.arch;
    const isJson = opts.json || opts.format === 'json' || process.env.AISDLC_FORMAT === 'json' || process.env.AISDLC_OUTPUT === 'json';
    if (arch === undefined && process.stdin.isTTY && !opts.dryRun && !isJson) {
      arch = await promptForArchitecture();
    }
    if (agents === undefined && process.stdin.isTTY && !opts.dryRun && !isJson) {
      agents = await promptForAgents();
    }
    const passed = runInit(directory, {
      dryRun: opts.dryRun,
      ci: opts.ci,
      agents,
      architecture: arch,
      json: opts.json,
      format: opts.format,
    });
    process.exit(passed ? 0 : 1);
  });

// --- mcp command ---
program
  .command('mcp')
  .description('Start native AI-SDLC Model Context Protocol (MCP) server (stdio)')
  .option('-r, --root <path>', 'Project root directory')
  .action(async (opts) => {
    await runMcpServer({ root: opts.root });
  });

// Handle unknown commands gracefully
program.on('command:*', () => {
  console.error(pc.red(`\n[ERROR] Unrecognized command: ${program.args.join(' ')}`));
  console.log(pc.yellow('Run `aisdlc --help` to see available commands.\n'));
  process.exit(1);
});

program.parse(process.argv);
