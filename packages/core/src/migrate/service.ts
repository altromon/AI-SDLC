/**
 * MigrationOrchestrator and MigrationService: Core Execution and Coordination
 * Cites: CMP-053-MIGRATE-ENGINE, FR-053-CLI-MIGRATE-001, AGENTS.md
 */

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import type {
  IMigrationService,
  MigrationOptions,
  MigrationResult,
  MigrationItemReport,
  MigrationSummary,
  MigrationFileStatus,
} from '../types/migrate.js';
import { FileSystemJailAdapter } from './fs-jail.js';
import { DiffDetector } from './diff-detector.js';
import { OverrideAnalyzer } from './override-analyzer.js';
import { PolicyRatchetEnforcer } from './policy-ratchet.js';
import { TimestampedBackupManagerAdapter } from './backup-manager.js';
import { TransactionManager } from './transaction-manager.js';
import { STARTER_QUALITY_POLICY, STARTER_LICENSE_POLICY, STARTER_PRIVACY_POLICY } from '../init/index.js';
import { STARTER_SCHEMAS } from '../init/starter-schemas.js';
import { STARTER_BASE_TEMPLATES } from '../init/starter-templates.js';

export class MigrationOrchestrator {
  public fsJail = new FileSystemJailAdapter();
  public diffDetector = new DiffDetector();
  public analyzer = new OverrideAnalyzer();
  public ratchetEnforcer = new PolicyRatchetEnforcer();
  public backupManager = new TimestampedBackupManagerAdapter();
  public transactionManager = new TransactionManager();
}

interface GovernedItem {
  relPath: string;
  category: 'schema' | 'template' | 'policy';
  currentContent: string;
  targetContent: string;
  baseContent: string;
}

interface ItemEvaluation {
  summary: MigrationSummary;
  details: MigrationItemReport[];
  filesToModify: { relPath: string; content: string }[];
  filesToBackup: string[];
}

interface ItemClassification {
  status: MigrationFileStatus;
  message?: string;
  shouldModify: boolean;
  category: 'upToDate' | 'cleanUpdated' | 'overridesPreserved' | 'conflicts';
}

function handleOverrideStatus(force?: boolean): ItemClassification {
  return force
    ? { status: 'CLEAN_UPDATE', message: 'Overridden file updated due to --force flag', shouldModify: true, category: 'cleanUpdated' }
    : { status: 'LOCAL_OVERRIDE_PRESERVED', message: 'Local customization retained (use --force to overwrite)', shouldModify: false, category: 'overridesPreserved' };
}

function classifySingleItem(item: GovernedItem, orchestrator: MigrationOrchestrator, force?: boolean): ItemClassification {
  const rawStatus = orchestrator.analyzer.classify({
    currentContent: item.currentContent,
    targetContent: item.targetContent,
    baseContent: item.baseContent,
  });

  switch (rawStatus) {
    case 'UP_TO_DATE':
      return { status: 'UP_TO_DATE', shouldModify: false, category: 'upToDate' };
    case 'CLEAN_UPDATE':
      return { status: 'CLEAN_UPDATE', shouldModify: true, category: 'cleanUpdated' };
    case 'LOCAL_OVERRIDE_PRESERVED':
      return handleOverrideStatus(force);
    default:
      return { status: 'CONFLICT', message: 'Structural conflict or syntax corruption detected', shouldModify: false, category: 'conflicts' };
  }
}

function evaluateGovernedTargets(targets: GovernedItem[], orchestrator: MigrationOrchestrator, force?: boolean): ItemEvaluation {
  const summary: MigrationSummary = { upToDate: 0, cleanUpdated: 0, overridesPreserved: 0, conflicts: 0 };
  const details: MigrationItemReport[] = [];
  const filesToModify: { relPath: string; content: string }[] = [];
  const filesToBackup: string[] = [];

  for (const item of targets) {
    const outcome = classifySingleItem(item, orchestrator, force);
    summary[outcome.category]++;

    details.push({
      file: item.relPath,
      category: item.category,
      status: outcome.status,
      currentDigest: item.currentContent ? orchestrator.diffDetector.computeDigest(item.currentContent) : undefined,
      targetDigest: item.targetContent ? orchestrator.diffDetector.computeDigest(item.targetContent) : undefined,
      message: outcome.message,
    });

    if (outcome.shouldModify) {
      filesToModify.push({ relPath: item.relPath, content: item.targetContent });
      filesToBackup.push(item.relPath);
    }
  }

  return { summary, details, filesToModify, filesToBackup };
}

function buildCanonicalMap(): Map<string, { category: 'schema' | 'template' | 'policy'; content: string }> {
  const canonicalMap = new Map<string, { category: 'schema' | 'template' | 'policy'; content: string }>();
  canonicalMap.set('quality-policy.yaml', { category: 'policy', content: STARTER_QUALITY_POLICY });
  canonicalMap.set('license-policy.yaml', { category: 'policy', content: STARTER_LICENSE_POLICY });
  canonicalMap.set('privacy-policy.yaml', { category: 'policy', content: STARTER_PRIVACY_POLICY });

  for (const s of STARTER_SCHEMAS) {
    canonicalMap.set(s.relPath.replace(/\\/g, '/'), { category: 'schema', content: s.content });
  }
  for (const t of STARTER_BASE_TEMPLATES) {
    canonicalMap.set(t.relPath.replace(/\\/g, '/'), { category: 'template', content: t.content });
  }
  return canonicalMap;
}

function scanSchemasDir(schemasDir: string, canonicalMap: Map<string, { category: 'schema' | 'template' | 'policy'; content: string }>): GovernedItem[] {
  const items: GovernedItem[] = [];
  if (!fs.existsSync(schemasDir)) return items;
  try {
    for (const f of fs.readdirSync(schemasDir)) {
      if (f.endsWith('.json')) {
        const relPath = path.join('schemas', f).replace(/\\/g, '/');
        const content = fs.readFileSync(path.join(schemasDir, f), 'utf-8');
        const canonical = canonicalMap.get(relPath);
        const targetContent = canonical ? canonical.content : content;
        items.push({ relPath, category: 'schema', currentContent: content, targetContent, baseContent: targetContent });
      }
    }
  } catch {
    // ignore
  }
  return items;
}

function resolveExitCode(summary: MigrationSummary): 0 | 1 | 2 {
  if (summary.conflicts > 0) return 2;
  if (summary.overridesPreserved > 0) return 1;
  return 0;
}

function createProtectedBranchError(errorMsg?: string): MigrationResult {
  return {
    success: false,
    exitCode: 2,
    summary: { upToDate: 0, cleanUpdated: 0, overridesPreserved: 0, conflicts: 0 },
    details: [{ file: 'workspace', category: 'policy', status: 'CONFLICT', message: errorMsg }],
  };
}

function createTransactionFailureResult(summary: MigrationSummary, backupPath?: string, errorMsg?: string): MigrationResult {
  return {
    success: false,
    exitCode: 2,
    summary,
    backupPath,
    details: [{ file: 'transaction', category: 'policy', status: 'CONFLICT', message: errorMsg || 'Transaction failed' }],
  };
}

export class MigrationService implements IMigrationService {
  constructor(private orchestrator: MigrationOrchestrator = new MigrationOrchestrator()) {}

  public async preview(options: MigrationOptions): Promise<MigrationResult> {
    return this.executeMigration({ ...options, dryRun: true });
  }

  public async migrate(options: MigrationOptions): Promise<MigrationResult> {
    return this.executeMigration({ ...options, dryRun: options.dryRun ?? false });
  }

  private async detectBranch(repoRoot: string): Promise<string | null> {
    try {
      const out = child_process.execSync('git symbolic-ref --short HEAD', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf-8' }).trim();
      if (out) return out;
    } catch { /* fallback */ }

    try {
      const out = child_process.execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf-8' }).trim();
      if (out && out !== 'HEAD') return out;
    } catch { /* fallback */ }

    const ciRef = process.env.GITHUB_REF_NAME || process.env.CI_COMMIT_REF_NAME;
    if (ciRef) return ciRef;

    try {
      const cwdOut = child_process.execSync('git symbolic-ref --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf-8' }).trim();
      if (cwdOut) return cwdOut;
    } catch { /* fallback */ }

    return null;
  }

  private isProtectedBranch(branch: string): boolean {
    return branch === 'main' || branch === 'master' || branch.startsWith('release/');
  }

  private async verifyBranchSafety(root: string, branchOption?: string): Promise<{ ok: boolean; branch?: string; error?: string }> {
    const branch = branchOption || (await this.detectBranch(root)) || undefined;
    if (!branch) {
      return { ok: false, error: 'ERR_PROTECTED_BRANCH_MIGRATION: Unable to determine Git branch in mutating migration' };
    }
    if (this.isProtectedBranch(branch)) {
      return { ok: false, branch, error: `ERR_PROTECTED_BRANCH_MIGRATION: Migration forbidden on protected branch "${branch}"` };
    }
    return { ok: true, branch };
  }

  private async runMutationTransaction(root: string, evaluation: ItemEvaluation, enableBackup: boolean): Promise<{ success: boolean; backupPath?: string; error?: string }> {
    let backupPath: string | undefined;
    if (enableBackup) {
      backupPath = await this.orchestrator.backupManager.createBackup(root, evaluation.filesToBackup);
    }

    await this.orchestrator.transactionManager.begin(root);
    try {
      for (const file of evaluation.filesToModify) {
        await this.orchestrator.transactionManager.stageFile(root, file.relPath, file.content);
      }
      await this.orchestrator.transactionManager.commit(root);
      return { success: true, backupPath };
    } catch (err: unknown) {
      if (backupPath) {
        this.orchestrator.transactionManager.rollbackSync(root, backupPath);
      }
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, backupPath, error: message };
    }
  }

  private async executeMigration(options: MigrationOptions): Promise<MigrationResult> {
    const root = path.resolve(options.root || process.cwd());
    const isDryRun = Boolean(options.dryRun);

    if (!isDryRun) {
      const branchCheck = await this.verifyBranchSafety(root, options.branch);
      if (!branchCheck.ok) {
        return createProtectedBranchError(branchCheck.error);
      }
    }

    const targets = this.discoverGovernedFiles(root);
    const evaluation = evaluateGovernedTargets(targets, this.orchestrator, options.force);

    if (isDryRun || evaluation.filesToModify.length === 0) {
      const exitCode = resolveExitCode(evaluation.summary);
      return { success: exitCode === 0, exitCode, summary: evaluation.summary, details: evaluation.details };
    }

    const tx = await this.runMutationTransaction(root, evaluation, options.backup ?? true);
    if (!tx.success) {
      return createTransactionFailureResult(evaluation.summary, tx.backupPath, tx.error);
    }

    const exitCode = resolveExitCode(evaluation.summary);
    return { success: exitCode === 0, exitCode, summary: evaluation.summary, backupPath: tx.backupPath, details: evaluation.details };
  }


  private discoverGovernedFiles(root: string): GovernedItem[] {
    const items: GovernedItem[] = [];
    const canonicalMap = buildCanonicalMap();

    const policyFiles = ['quality-policy.yaml', 'license-policy.yaml', 'privacy-policy.yaml', 'dlp-policy.yaml'];
    for (const pf of policyFiles) {
      const fullPath = path.join(root, pf);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const canonical = canonicalMap.get(pf);
        const targetContent = canonical ? canonical.content : content;
        items.push({ relPath: pf, category: 'policy', currentContent: content, targetContent, baseContent: targetContent });
      }
    }

    items.push(...scanSchemasDir(path.join(root, 'schemas'), canonicalMap));
    return items;
  }
}
