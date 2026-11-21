import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TimestampedBackupManagerAdapter } from '../src/migrate/backup-manager.js';
import { TransactionManager } from '../src/migrate/transaction-manager.js';

describe('Migrate BackupManager & TransactionManager Paths (Happy / Sad / Boundary)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-migrate-tx-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('TimestampedBackupManagerAdapter: creates backup, restores modified files, and ignores missing backup dir (happy/sad/boundary)', async () => {
    const backup = new TimestampedBackupManagerAdapter();
    fs.mkdirSync(path.join(tmpDir, 'schemas'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'schemas', 'a.json'), '{"v":1}', 'utf-8');

    const backupPath = await backup.createBackup(tmpDir, ['schemas/a.json', 'schemas/nonexistent.json']);
    expect(fs.existsSync(backupPath)).toBe(true);

    // Mutate file and restore
    fs.writeFileSync(path.join(tmpDir, 'schemas', 'a.json'), '{"v":999}', 'utf-8');
    await backup.restoreBackup(tmpDir, backupPath);
    expect(fs.readFileSync(path.join(tmpDir, 'schemas', 'a.json'), 'utf-8')).toBe('{"v":1}');

    // Nonexistent backupPath throws ERR_BACKUP_MANIFEST_MISSING
    await expect(backup.restoreBackup(tmpDir, path.join(tmpDir, 'missing-backup'))).rejects.toThrow(
      'ERR_BACKUP_MANIFEST_MISSING'
    );
  });

  it('TransactionManager: stages, commits, and rolls back cleanly (happy/sad/boundary)', async () => {
    const tx = new TransactionManager();
    const txId = await tx.begin(tmpDir);
    expect(txId).toBeTruthy();

    await tx.stageFile(tmpDir, 'quality-policy.yaml', 'version: "1.0"\n');
    await tx.commit(tmpDir);
    expect(fs.readFileSync(path.join(tmpDir, 'quality-policy.yaml'), 'utf-8')).toBe('version: "1.0"\n');

    // Rollback async and sync
    await tx.begin(tmpDir);
    await tx.stageFile(tmpDir, 'quality-policy.yaml', 'version: "2.0"\n');
    await expect(tx.rollback(tmpDir)).resolves.toBeUndefined();
    expect(() => tx.rollbackSync(tmpDir)).not.toThrow();

    // RollbackSync with a backup dir
    const backup = new TimestampedBackupManagerAdapter();
    const bPath = await backup.createBackup(tmpDir, ['quality-policy.yaml']);
    fs.writeFileSync(path.join(tmpDir, 'quality-policy.yaml'), 'corrupted', 'utf-8');
    tx.rollbackSync(tmpDir, bPath);
    expect(fs.readFileSync(path.join(tmpDir, 'quality-policy.yaml'), 'utf-8')).toBe('version: "1.0"\n');
  });
});
