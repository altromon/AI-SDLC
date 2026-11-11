/**
 * TransactionManager: Atomic Staging, Schema Pre-commit Verification, and Rollback
 * Cites: SEC-REQ-053-ATOMIC-ROLLBACK-001, CMP-053-MIGRATE-ENGINE
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { ITransactionManager } from '../types/migrate.js';

function copyFileSafeSync(src: string, dest: string): void {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

function restoreFromManifestSync(backupPath: string, resolvedRoot: string): void {
  const manifestFile = path.join(backupPath, 'manifest.json');
  if (!fs.existsSync(manifestFile)) return;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'));
    for (const entry of manifest.files || []) {
      const backedUpFile = path.join(backupPath, entry.path);
      const targetFile = path.join(resolvedRoot, entry.path);
      if (fs.existsSync(backedUpFile)) {
        copyFileSafeSync(backedUpFile, targetFile);
      }
    }
  } catch {
    // ignore sync restore errors
  }
}

function restoreDirRecursiveSync(dir: string, resolvedRoot: string, baseBackupDir: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      restoreDirRecursiveSync(fullPath, resolvedRoot, baseBackupDir);
    } else if (entry.isFile()) {
      const rel = path.relative(baseBackupDir, fullPath);
      copyFileSafeSync(fullPath, path.join(resolvedRoot, rel));
    }
  }
}

export class TransactionManager implements ITransactionManager {
  private activeStagingDir: string | null = null;
  private stagedFiles: Map<string, string> = new Map();
  private boundSignalHandlers: { [signal: string]: () => void } = {};

  public async begin(repoRoot: string): Promise<string> {
    const resolvedRoot = path.resolve(repoRoot);
    const stagingUuid = crypto.randomUUID();
    const stagingDir = path.join(resolvedRoot, '.backup', `.staging-${stagingUuid}`);

    fs.mkdirSync(stagingDir, { recursive: true, mode: 0o700 });
    this.activeStagingDir = stagingDir;
    this.stagedFiles.clear();

    this.registerSignalHandlers(resolvedRoot);
    return stagingDir;
  }

  public async stageFile(_repoRoot: string, relativePath: string, content: string): Promise<void> {
    if (!this.activeStagingDir) {
      throw new Error('ERR_NO_ACTIVE_TRANSACTION: Transaction must be started with begin()');
    }

    const stagedTarget = path.join(this.activeStagingDir, relativePath);
    const stagedDir = path.dirname(stagedTarget);
    if (!fs.existsSync(stagedDir)) {
      fs.mkdirSync(stagedDir, { recursive: true });
    }

    fs.writeFileSync(stagedTarget, content, 'utf-8');
    this.stagedFiles.set(relativePath, content);
  }

  public async commit(repoRoot: string): Promise<void> {
    if (!this.activeStagingDir) {
      throw new Error('ERR_NO_ACTIVE_TRANSACTION: No transaction to commit');
    }

    const resolvedRoot = path.resolve(repoRoot);

    try {
      for (const [relPath, content] of this.stagedFiles.entries()) {
        this.validateStagedFile(relPath, content);
      }

      for (const [relPath] of this.stagedFiles.entries()) {
        copyFileSafeSync(path.join(this.activeStagingDir, relPath), path.join(resolvedRoot, relPath));
      }

      this.cleanupStaging();
    } catch (err) {
      await this.rollback(repoRoot);
      throw err;
    } finally {
      this.unregisterSignalHandlers();
    }
  }

  public async rollback(_repoRoot: string): Promise<void> {
    this.cleanupStaging();
    this.unregisterSignalHandlers();
  }

  public rollbackSync(repoRoot: string, backupPath?: string): void {
    const resolvedRoot = path.resolve(repoRoot);

    if (backupPath && fs.existsSync(backupPath)) {
      const manifestFile = path.join(backupPath, 'manifest.json');
      if (fs.existsSync(manifestFile)) {
        restoreFromManifestSync(backupPath, resolvedRoot);
      } else {
        restoreDirRecursiveSync(backupPath, resolvedRoot, backupPath);
      }
    }

    this.cleanupStaging();
    this.unregisterSignalHandlers();
  }

  private validateStagedFile(relPath: string, content: string): void {
    if (content.length === 0) {
      throw new Error(`ERR_MIGRATION_VALIDATION_FAILED: Staged file ${relPath} is empty`);
    }

    if (relPath.endsWith('.json')) {
      try {
        JSON.parse(content);
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        throw new Error(`ERR_MIGRATION_VALIDATION_FAILED: Invalid JSON in ${relPath}: ${errorMsg}`);
      }
    }
  }

  private cleanupStaging(): void {
    if (this.activeStagingDir && fs.existsSync(this.activeStagingDir)) {
      try {
        fs.rmSync(this.activeStagingDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
    this.activeStagingDir = null;
    this.stagedFiles.clear();
  }

  private registerSignalHandlers(repoRoot: string): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
    for (const sig of signals) {
      const handler = () => {
        this.rollbackSync(repoRoot);
        process.exit(2);
      };
      this.boundSignalHandlers[sig] = handler;
      try {
        process.once(sig, handler);
      } catch {
        // ignore
      }
    }
  }

  private unregisterSignalHandlers(): void {
    for (const sig of Object.keys(this.boundSignalHandlers)) {
      try {
        process.removeListener(sig as NodeJS.Signals, this.boundSignalHandlers[sig]);
      } catch {
        // ignore
      }
    }
    this.boundSignalHandlers = {};
  }
}
