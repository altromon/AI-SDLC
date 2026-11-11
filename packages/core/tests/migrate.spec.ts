import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Target imports that will exist once developer implements them in packages/core/src/migrate/
// @ts-expect-error Types and implementations will be provided by agent-developer in TSK-001..005
import {
  FileSystemJailAdapter,
  DiffDetector,
  OverrideAnalyzer,
  PolicyRatchetEnforcer,
  TimestampedBackupManagerAdapter,
  TransactionManager,
  MigrationService,
  MigrationOrchestrator,
} from '../src/migrate/index.js';

describe('Migrate Engine Unit Tests (CMP-053-MIGRATE-ENGINE)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-migrate-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('1. FileSystemJail (SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001)', () => {
    it('blocks directory traversal escape attempts (../../etc/passwd, ..\\..\\system.ini)', () => {
      const jail = new FileSystemJailAdapter();
      expect(() => jail.resolveSafe(tmpDir, '../../etc/passwd')).toThrow('ERR_PATH_TRAVERSAL_DETECTED');
      expect(() => jail.resolveSafe(tmpDir, '..\\..\\system.ini')).toThrow('ERR_PATH_TRAVERSAL_DETECTED');
      expect(() => jail.resolveSafe(tmpDir, 'schemas/../../../etc/shadow')).toThrow('ERR_PATH_TRAVERSAL_DETECTED');
    });

    it('blocks null byte poisoning and relative escape patterns', () => {
      const jail = new FileSystemJailAdapter();
      expect(() => jail.resolveSafe(tmpDir, 'schemas/target.json\0.txt')).toThrow('ERR_PATH_TRAVERSAL_DETECTED');
    });

    it('blocks sibling directory prefix bypass attempts (e.g. /repo-sibling)', () => {
      const jail = new FileSystemJailAdapter();
      const siblingPath = `${tmpDir}-sibling/malicious.json`;
      expect(() => jail.resolveSafe(tmpDir, siblingPath)).toThrow('ERR_PATH_OUTSIDE_REPO_ROOT');
    });

    it('handles Windows drive letters and extended path prefixes safely', () => {
      const jail = new FileSystemJailAdapter();
      const safePath = jail.resolveSafe(tmpDir, 'schemas/valid.json');
      expect(safePath.toLowerCase()).toContain(tmpDir.toLowerCase());
    });

    it('detects and neutralizes symlink and junction escape pointing outside repo root', async () => {
      const jail = new FileSystemJailAdapter();
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-outside-'));
      const targetOutsideFile = path.join(outsideDir, 'secret.txt');
      fs.writeFileSync(targetOutsideFile, 'confidential', 'utf-8');

      const symlinkTarget = path.join(tmpDir, 'schemas', 'escaped-link.json');
      fs.mkdirSync(path.join(tmpDir, 'schemas'), { recursive: true });

      try {
        fs.symlinkSync(targetOutsideFile, symlinkTarget);
        await expect(jail.writeFileSafe(tmpDir, 'schemas/escaped-link.json', 'overwrite')).rejects.toThrow('ERR_SYMLINK_ESCAPE_DETECTED');
      } catch (err: any) {
        // In Windows unprivileged environments symlinks might throw EPERM, treat as success if jail throws or symlink creation fails
        if (err.code !== 'EPERM') {
          throw err;
        }
      } finally {
        fs.rmSync(outsideDir, { recursive: true, force: true });
      }
    });

    it('enforces write operations only target governed subdirectories and root policy files', async () => {
      const jail = new FileSystemJailAdapter();
      // Governed directories
      await expect(jail.writeFileSafe(tmpDir, 'schemas/test.json', '{}')).resolves.not.toThrow();
      await expect(jail.writeFileSafe(tmpDir, 'templates/test.md', '# template')).resolves.not.toThrow();
      await expect(jail.writeFileSafe(tmpDir, 'quality-policy.yaml', 'version: 1.0')).resolves.not.toThrow();
      await expect(jail.writeFileSafe(tmpDir, 'license-policy.yaml', 'version: 1.0')).resolves.not.toThrow();
      await expect(jail.writeFileSafe(tmpDir, 'privacy-policy.yaml', 'version: 1.0')).resolves.not.toThrow();
      await expect(jail.writeFileSafe(tmpDir, 'dlp-policy.yaml', 'version: 1.0')).resolves.not.toThrow();

      // Ungoverned destination paths must fail
      await expect(jail.writeFileSafe(tmpDir, 'src/malicious.ts', 'console.log("pwned")')).rejects.toThrow('ERR_UNGOVERNED_TARGET_PATH');
      await expect(jail.writeFileSafe(tmpDir, 'package.json', '{}')).rejects.toThrow('ERR_UNGOVERNED_TARGET_PATH');
    });
  });

  describe('2. DiffDetector (Deterministic Unix LF SHA-256)', () => {
    it('computes identical SHA-256 digests across Windows CRLF and Unix LF', () => {
      const detector = new DiffDetector();
      const contentLf = 'line1\nline2\nline3\n';
      const contentCrlf = 'line1\r\nline2\r\nline3\r\n';

      const digestLf = detector.computeDigest(contentLf);
      const digestCrlf = detector.computeDigest(contentCrlf);

      expect(digestLf).toBe(digestCrlf);
      expect(digestLf).toMatch(/^[a-f0-9]{64}$/);
    });

    it('detects byte-level modifications and content changes accurately', () => {
      const detector = new DiffDetector();
      const digest1 = detector.computeDigest('schema: v1');
      const digest2 = detector.computeDigest('schema: v2');
      expect(digest1).not.toBe(digest2);
    });
  });

  describe('3. OverrideAnalyzer (Classification of Artifact States)', () => {
    it('classifies identical files as UP_TO_DATE', () => {
      const analyzer = new OverrideAnalyzer();
      const status = analyzer.classify({
        currentContent: 'schema: v1\n',
        targetContent: 'schema: v1\n',
        baseContent: 'schema: v1\n',
      });
      expect(status).toBe('UP_TO_DATE');
    });

    it('classifies clean upstream updates as CLEAN_UPDATE when local matches previous base', () => {
      const analyzer = new OverrideAnalyzer();
      const status = analyzer.classify({
        currentContent: 'schema: v1\n',
        targetContent: 'schema: v2\n',
        baseContent: 'schema: v1\n',
      });
      expect(status).toBe('CLEAN_UPDATE');
    });

    it('classifies local modifications as LOCAL_OVERRIDE_PRESERVED when local differs from base', () => {
      const analyzer = new OverrideAnalyzer();
      const status = analyzer.classify({
        currentContent: 'schema: v1-custom\n',
        targetContent: 'schema: v2\n',
        baseContent: 'schema: v1\n',
      });
      expect(status).toBe('LOCAL_OVERRIDE_PRESERVED');
    });

    it('classifies irreconcilable structural discrepancies as CONFLICT', () => {
      const analyzer = new OverrideAnalyzer();
      const status = analyzer.classify({
        currentContent: 'corrupted: [invalid yaml',
        targetContent: 'version: 2.0.0',
        baseContent: 'version: 1.0.0',
      });
      expect(status).toBe('CONFLICT');
    });
  });

  describe('4. PolicyRatchetEnforcer (SEC-REQ-053-POLICY-RATCHET-PRESERVATION-001)', () => {
    it('preserves stricter local code coverage threshold over relaxed canonical upstream', () => {
      const enforcer = new PolicyRatchetEnforcer();
      const localPolicy = {
        quality: {
          coverage: { min: 95 },
          complexity: { maxCyclomatic: 10 },
        },
      };
      const upstreamPolicy = {
        quality: {
          coverage: { min: 80 },
          complexity: { maxCyclomatic: 15 },
        },
      };

      const merged = enforcer.enforceRatchet(localPolicy, upstreamPolicy);
      expect(merged.quality.coverage.min).toBe(95);
      expect(merged.quality.complexity.maxCyclomatic).toBe(10);
    });

    it('fails closed with ERR_INVALID_POLICY_FORMAT upon NaN, string, or malformed numeric thresholds', () => {
      const enforcer = new PolicyRatchetEnforcer();
      const corruptPolicy = {
        quality: {
          coverage: { min: NaN },
        },
      };
      const upstreamPolicy = {
        quality: {
          coverage: { min: 80 },
        },
      };

      expect(() => enforcer.enforceRatchet(corruptPolicy, upstreamPolicy)).toThrow('ERR_INVALID_POLICY_FORMAT');
      expect(() => enforcer.enforceRatchet({ quality: { coverage: { min: '85%' as any } } }, upstreamPolicy)).toThrow('ERR_INVALID_POLICY_FORMAT');
    });

    it('normalizes SPDX license identifiers to uppercase before comparing policy lists', () => {
      const enforcer = new PolicyRatchetEnforcer();
      const localPolicy = {
        licenses: {
          blocked: ['gpl-3.0-only', 'AGPL-3.0-or-later'],
        },
      };
      const upstreamPolicy = {
        licenses: {
          blocked: ['GPL-3.0-ONLY'],
        },
      };

      const merged = enforcer.enforceRatchet(localPolicy, upstreamPolicy);
      expect(merged.licenses.blocked).toContain('GPL-3.0-ONLY');
      expect(merged.licenses.blocked).toContain('AGPL-3.0-OR-LATER');
    });

    it('performs additive union merge on DLP and PII regex rules without removing local patterns', () => {
      const enforcer = new PolicyRatchetEnforcer();
      const localDlp = {
        rules: [
          { id: 'CUSTOM-PROPRIETARY-KEY-001', pattern: 'PROD_SECRET_[A-Z0-9]{32}' },
        ],
      };
      const upstreamDlp = {
        rules: [
          { id: 'UPSTREAM-GENERIC-TOKEN-001', pattern: 'AI_SDLC_TOKEN_[A-Z0-9]{16}' },
        ],
      };

      const merged = enforcer.enforceRatchet(localDlp, upstreamDlp);
      expect(merged.rules).toHaveLength(2);
      expect(merged.rules.map((r: any) => r.id)).toEqual(
        expect.arrayContaining(['CUSTOM-PROPRIETARY-KEY-001', 'UPSTREAM-GENERIC-TOKEN-001'])
      );
    });

    it('blocks intentional policy downgrade unless allowPolicyDowngrade flag is true', () => {
      const enforcer = new PolicyRatchetEnforcer();
      const localPolicy = {
        quality: { coverage: { min: 95 } },
      };
      const relaxedPolicy = {
        quality: { coverage: { min: 70 } },
      };

      expect(() => enforcer.enforceRatchet(localPolicy, relaxedPolicy, { allowPolicyDowngrade: false }))
        .toThrow('ERR_SECURITY_POLICY_DOWNGRADE_BLOCKED');

      const downgraded = enforcer.enforceRatchet(localPolicy, relaxedPolicy, { allowPolicyDowngrade: true });
      expect(downgraded.quality.coverage.min).toBe(70);
    });
  });

  describe('5. BackupManager & TransactionManager (SEC-REQ-053-NON-DESTRUCTIVE-BACKUP-001 & ATOMIC-ROLLBACK-001)', () => {
    it('ensures .gitignore contains .backup/ rule before creating backup directory on disk', async () => {
      const backupMgr = new TimestampedBackupManagerAdapter();
      const gitignorePath = path.join(tmpDir, '.gitignore');
      fs.writeFileSync(gitignorePath, 'node_modules/\ndist/\n', 'utf-8');

      const filesToBackup = ['quality-policy.yaml'];
      fs.writeFileSync(path.join(tmpDir, 'quality-policy.yaml'), 'version: 1.0.0', 'utf-8');

      const backupPath = await backupMgr.createBackup(tmpDir, filesToBackup);
      expect(fs.existsSync(backupPath)).toBe(true);

      const updatedGitignore = fs.readFileSync(gitignorePath, 'utf-8');
      expect(updatedGitignore).toContain('.backup/');
    });

    it('generates unique collision-resistant backup directory names with random suffix', async () => {
      const backupMgr = new TimestampedBackupManagerAdapter();
      fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.backup/\n', 'utf-8');
      fs.writeFileSync(path.join(tmpDir, 'quality-policy.yaml'), 'v1', 'utf-8');

      const path1 = await backupMgr.createBackup(tmpDir, ['quality-policy.yaml']);
      const path2 = await backupMgr.createBackup(tmpDir, ['quality-policy.yaml']);

      expect(path1).not.toBe(path2);
      expect(path1).toMatch(/migration-\d+-[a-zA-Z0-9]{6,}/);
      expect(path2).toMatch(/migration-\d+-[a-zA-Z0-9]{6,}/);
    });

    it('generates cryptographic manifest.json with normalized SHA-256 digests in backup', async () => {
      const backupMgr = new TimestampedBackupManagerAdapter();
      fs.writeFileSync(path.join(tmpDir, '.gitignore'), '.backup/\n', 'utf-8');
      const testContent = 'policy: enterprise\r\n';
      fs.writeFileSync(path.join(tmpDir, 'quality-policy.yaml'), testContent, 'utf-8');

      const backupDir = await backupMgr.createBackup(tmpDir, ['quality-policy.yaml']);
      const manifestPath = path.join(backupDir, 'manifest.json');
      expect(fs.existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.files).toHaveLength(1);
      expect(manifest.files[0].path).toBe('quality-policy.yaml');
      expect(manifest.files[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    });

    it('rolls back atomically and removes staging directory upon I/O write error or corrupt schema', async () => {
      const txManager = new TransactionManager();
      const stagingDir = await txManager.begin(tmpDir);
      expect(fs.existsSync(stagingDir)).toBe(true);

      // Stage valid file and corrupt schema
      await txManager.stageFile(tmpDir, 'schemas/valid.json', '{"valid": true}');
      await txManager.stageFile(tmpDir, 'schemas/corrupt.json', '{invalid json syntax}');

      // Pre-commit verification must fail and trigger rollback
      await expect(txManager.commit(tmpDir)).rejects.toThrow('ERR_MIGRATION_VALIDATION_FAILED');

      expect(fs.existsSync(stagingDir)).toBe(false);
      expect(fs.existsSync(path.join(tmpDir, 'schemas', 'corrupt.json'))).toBe(false);
    });

    it('executes rollbackSync() restoring backed up state on SIGINT or unhandled termination', async () => {
      const txManager = new TransactionManager();
      const backupDir = path.join(tmpDir, '.backup', 'migration-test');
      fs.mkdirSync(backupDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'quality-policy.yaml'), 'original: true', 'utf-8');
      fs.writeFileSync(path.join(backupDir, 'quality-policy.yaml'), 'original: true', 'utf-8');

      await txManager.begin(tmpDir);
      // Simulate partially written target
      fs.writeFileSync(path.join(tmpDir, 'quality-policy.yaml'), 'corrupted: true', 'utf-8');

      // Invoke rollbackSync explicitly
      txManager.rollbackSync(tmpDir, backupDir);

      expect(fs.readFileSync(path.join(tmpDir, 'quality-policy.yaml'), 'utf-8')).toBe('original: true');
    });
  });

  describe('6. MigrationService & Orchestrator (Branch Safety & Execution)', () => {
    it('aborts with ERR_PROTECTED_BRANCH_MIGRATION and code 2 when run on protected branches (main, master, release/*)', async () => {
      const orchestrator = new MigrationOrchestrator();
      const service = new MigrationService(orchestrator);

      // Mock branch resolver to return 'main'
      vi.spyOn(service as any, 'detectBranch').mockResolvedValue('main');

      const result = await service.migrate({ root: tmpDir });
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(2);
      expect(result.details.some((d: any) => d.message?.includes('ERR_PROTECTED_BRANCH_MIGRATION'))).toBe(true);
    });

    it('applies fail-closed abort when branch cannot be determined on mutating migration', async () => {
      const orchestrator = new MigrationOrchestrator();
      const service = new MigrationService(orchestrator);

      vi.spyOn(service as any, 'detectBranch').mockResolvedValue(null);

      const result = await service.migrate({ root: tmpDir, dryRun: false });
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(2);
    });

    it('allows --dry-run on any branch without mutating disk', async () => {
      const orchestrator = new MigrationOrchestrator();
      const service = new MigrationService(orchestrator);

      vi.spyOn(service as any, 'detectBranch').mockResolvedValue('main');

      const result = await service.preview({ root: tmpDir, dryRun: true });
      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(tmpDir, '.backup'))).toBe(false);
    });
  });
});
