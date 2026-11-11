/**
 * TimestampedBackupManagerAdapter: Cryptographically Verified Backup
 * Cites: SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001, CMP-053-MIGRATE-ENGINE
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { IBackupManager, BackupManifest, BackupManifestEntry } from '../types/migrate.js';
import { DiffDetector } from './diff-detector.js';

export class TimestampedBackupManagerAdapter implements IBackupManager {
  private diffDetector = new DiffDetector();

  public async createBackup(repoRoot: string, filesToBackup: string[]): Promise<string> {
    const resolvedRoot = path.resolve(repoRoot);
    const gitignorePath = path.join(resolvedRoot, '.gitignore');

    // 1. Ensure .backup/ rule in .gitignore BEFORE creating .backup folder on disk
    this.ensureGitignoreRule(gitignorePath);

    // 2. Generate unique backup folder name migration-<timestamp>-<random6>
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex').slice(0, 6);
    const backupDirName = `migration-${timestamp}-${randomSuffix}`;
    const backupRoot = path.join(resolvedRoot, '.backup');
    const targetBackupDir = path.join(backupRoot, backupDirName);

    fs.mkdirSync(targetBackupDir, { recursive: true, mode: 0o700 });

    const manifestEntries: BackupManifestEntry[] = [];

    // 3. Copy files and generate manifest
    for (const relPath of filesToBackup) {
      const srcFile = path.resolve(resolvedRoot, relPath);
      if (fs.existsSync(srcFile)) {
        const destFile = path.resolve(targetBackupDir, relPath);
        const destDir = path.dirname(destFile);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        const content = fs.readFileSync(srcFile, 'utf-8');
        fs.writeFileSync(destFile, content, 'utf-8');

        const digest = this.diffDetector.computeDigest(content);
        const stats = fs.statSync(destFile);

        manifestEntries.push({
          path: relPath,
          sha256: digest,
          bytes: stats.size,
        });
      }
    }

    const manifest: BackupManifest = {
      timestamp: new Date().toISOString(),
      files: manifestEntries,
    };

    fs.writeFileSync(
      path.join(targetBackupDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );

    return targetBackupDir;
  }

  public async restoreBackup(repoRoot: string, backupPath: string): Promise<void> {
    const resolvedRoot = path.resolve(repoRoot);
    const manifestPath = path.join(backupPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`ERR_BACKUP_MANIFEST_MISSING: Backup at ${backupPath} has no manifest.json`);
    }

    const manifest: BackupManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    for (const entry of manifest.files) {
      const backupFile = path.join(backupPath, entry.path);
      const targetFile = path.join(resolvedRoot, entry.path);

      if (fs.existsSync(backupFile)) {
        const targetDir = path.dirname(targetFile);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.copyFileSync(backupFile, targetFile);
      }
    }
  }

  private ensureGitignoreRule(gitignorePath: string): void {
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      const lines = gitignore.split(/\r?\n/);
      const hasBackup = lines.some(l => l.trim() === '.backup/' || l.trim() === '.backup' || l.trim() === '/.backup/');
      if (!hasBackup) {
        const trailingNewline = gitignore.endsWith('\n') ? '' : '\n';
        fs.writeFileSync(gitignorePath, `${gitignore}${trailingNewline}.backup/\n`, 'utf-8');
      }
    } else {
      fs.writeFileSync(gitignorePath, '.backup/\n', 'utf-8');
    }
  }
}
