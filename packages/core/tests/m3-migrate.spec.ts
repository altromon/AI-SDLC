import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TimestampedBackupManagerAdapter } from '../src/migrate/backup-manager.js';
import { DiffDetector } from '../src/migrate/diff-detector.js';
import {
  checkSiblingAndEscape,
  checkSymlinkEscapesRealRoot,
  FileSystemJailAdapter,
  resolveRealRoot,
  validateRawInputs,
} from '../src/migrate/fs-jail.js';
import { OverrideAnalyzer } from '../src/migrate/override-analyzer.js';
import {
  mergeComplexity,
  mergeCoverage,
  mergeDlpRules,
  mergeLicenses,
  PolicyRatchetEnforcer,
  validateNumericField,
} from '../src/migrate/policy-ratchet.js';
import {
  buildCanonicalMap,
  classifySingleItem,
  createProtectedBranchError,
  createTransactionFailureResult,
  evaluateGovernedTargets,
  handleOverrideStatus,
  MigrationOrchestrator,
  MigrationService,
  resolveExitCode,
  scanSchemasDir,
} from '../src/migrate/service.js';
import {
  copyFileSafeSync,
  restoreDirRecursiveSync,
  restoreFromManifestSync,
  TransactionManager,
} from '../src/migrate/transaction-manager.js';

describe('M3 Migrate Unit Suite (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'm3-migrate-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {
      // ignore transient Windows lock
    }
  });

  it('backup-manager: createBackup, backupSingleFile, ensureGitignoreRule, restoreBackup', async () => {
    const mgr = new TimestampedBackupManagerAdapter();
    fs.mkdirSync(path.join(tmpDir, 'schemas'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'schemas', 'a.json'), '{"v":1}', 'utf-8');

    const backupDir = await mgr.createBackup(tmpDir, ['schemas/a.json', 'missing.json']);
    expect(fs.existsSync(path.join(backupDir, 'manifest.json'))).toBe(true);
    expect(fs.readFileSync(path.join(tmpDir, '.gitignore'), 'utf-8')).toContain('.backup/');

    const priv = mgr as unknown as {
      backupSingleFile: (r: string, d: string, p: string) => unknown;
      ensureGitignoreRule: (g: string) => void;
    };
    expect(priv.backupSingleFile(tmpDir, backupDir, 'nonexistent.txt')).toBeNull();
    priv.ensureGitignoreRule(path.join(tmpDir, '.gitignore'));

    fs.writeFileSync(path.join(tmpDir, 'schemas', 'a.json'), '{"v":2}', 'utf-8');
    await mgr.restoreBackup(tmpDir, backupDir);
    expect(fs.readFileSync(path.join(tmpDir, 'schemas', 'a.json'), 'utf-8')).toBe('{"v":1}');
  });

  it('diff-detector & override-analyzer: isEqual, classify, isCorruptDiscrepancy', () => {
    const dd = new DiffDetector();
    expect(dd.isEqual('a\r\nb', 'a\nb')).toBe(true);
    expect(dd.isEqual('a', 'b')).toBe(false);

    const oa = new OverrideAnalyzer();
    expect(oa.classify({ currentContent: 'corrupted: [invalid yaml', targetContent: 'a', baseContent: 'a' })).toBe('CONFLICT');
    expect(oa.classify({ currentContent: 'a', targetContent: 'a', baseContent: 'b' })).toBe('UP_TO_DATE');
    expect(oa.classify({ currentContent: 'b', targetContent: 'a', baseContent: 'b' })).toBe('CLEAN_UPDATE');
    expect(oa.classify({ currentContent: 'custom', targetContent: 'a', baseContent: 'b' })).toBe('LOCAL_OVERRIDE_PRESERVED');

    const priv = oa as unknown as { isCorruptDiscrepancy: (c: string) => boolean };
    expect(priv.isCorruptDiscrepancy('')).toBe(false);
    expect(priv.isCorruptDiscrepancy('corrupted: [invalid yaml')).toBe(true);
  });

  it('fs-jail: validateRawInputs, checkSiblingAndEscape, resolveRealRoot, checkSymlinkEscapesRealRoot, verifySymlinkSafe', async () => {
    expect(() => validateRawInputs('', 'a')).toThrow('repoRoot is required');
    expect(() => validateRawInputs(tmpDir, 'a\0b')).toThrow('ERR_PATH_TRAVERSAL_DETECTED');
    validateRawInputs(tmpDir, 'schemas/a.json');

    const root = path.resolve(tmpDir, 'repo');
    const sibling = path.resolve(tmpDir, 'repo-evil');
    expect(() => checkSiblingAndEscape(root, sibling)).toThrow('ERR_PATH_OUTSIDE_REPO_ROOT');
    expect(() => checkSiblingAndEscape(root, path.resolve(tmpDir, 'other'))).toThrow('ERR_PATH_TRAVERSAL_DETECTED');
    checkSiblingAndEscape(root, path.join(root, 'schemas', 'a.json'));

    expect(resolveRealRoot(path.join(tmpDir, 'nonexistent'))).toBe(path.join(tmpDir, 'nonexistent'));
    checkSymlinkEscapesRealRoot(tmpDir, path.join(tmpDir, 'missing.txt'));

    const jail = new FileSystemJailAdapter();
    await expect(jail.verifySymlinkSafe(tmpDir, path.join(tmpDir, 'schemas', 'x.json'))).resolves.toBeUndefined();
  });

  it('policy-ratchet: mergeCoverage, mergeComplexity, mergeLicenses, mergeDlpRules, validateNumericField, validatePolicyStructure', () => {
    expect(mergeCoverage(undefined, undefined)).toBeUndefined();
    expect(mergeCoverage({ min: 80 }, { min: 90 })).toEqual({ min: 90 });
    expect(() => mergeCoverage({ min: 90 }, { min: 70 }, false)).toThrow('ERR_SECURITY_POLICY_DOWNGRADE_BLOCKED');

    expect(mergeComplexity(undefined, undefined)).toBeUndefined();
    expect(mergeComplexity({ maxCyclomatic: 8 }, { maxCyclomatic: 12 })).toEqual({ maxCyclomatic: 8 });

    expect(mergeLicenses({ blocked: ['gpl-3.0'] }, { blocked: ['MIT'] })).toEqual({ blocked: ['MIT', 'GPL-3.0'] });
    expect(mergeDlpRules([{ id: 'r1', pattern: 'a' }], [{ id: 'r1', pattern: 'b' }, { id: 'r2', pattern: 'c' }])?.length).toBe(2);

    expect(() => validateNumericField('bad', 'min')).toThrow('ERR_INVALID_POLICY_FORMAT');
    validateNumericField(10, 'min');

    const enforcer = new PolicyRatchetEnforcer();
    const priv = enforcer as unknown as { validatePolicyStructure: (p: unknown) => void };
    expect(() => priv.validatePolicyStructure(null)).not.toThrow();
    expect(() => priv.validatePolicyStructure({ quality: { coverage: { min: 'bad' } } })).toThrow('ERR_INVALID_POLICY_FORMAT');
    const merged = enforcer.enforceRatchet({ quality: { coverage: { min: 85 } } }, { quality: { coverage: { min: 90 } } });
    expect(merged.quality?.coverage?.min).toBe(90);
  });

  it('service: helpers & MigrationService methods (happy/sad/boundary)', async () => {
    expect(handleOverrideStatus(true).status).toBe('CLEAN_UPDATE');
    expect(handleOverrideStatus(false).status).toBe('LOCAL_OVERRIDE_PRESERVED');

    const orch = new MigrationOrchestrator();
    const item = { relPath: 'quality-policy.yaml', category: 'policy' as const, currentContent: 'a', targetContent: 'b', baseContent: 'a' };
    expect(classifySingleItem(item, orch, false).status).toBe('CLEAN_UPDATE');

    const evalRes = evaluateGovernedTargets([item], orch, false);
    expect(evalRes.summary.cleanUpdated).toBe(1);

    const map = buildCanonicalMap();
    expect(map.has('quality-policy.yaml')).toBe(true);

    fs.mkdirSync(path.join(tmpDir, 'schemas'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'schemas', 'custom.json'), '{}', 'utf-8');
    expect(scanSchemasDir(path.join(tmpDir, 'schemas'), map).length).toBe(1);

    expect(resolveExitCode({ upToDate: 1, cleanUpdated: 0, overridesPreserved: 0, conflicts: 0 })).toBe(0);
    expect(resolveExitCode({ upToDate: 0, cleanUpdated: 0, overridesPreserved: 1, conflicts: 0 })).toBe(1);
    expect(resolveExitCode({ upToDate: 0, cleanUpdated: 0, overridesPreserved: 0, conflicts: 1 })).toBe(2);

    expect(createProtectedBranchError('blocked').exitCode).toBe(2);
    expect(createTransactionFailureResult(evalRes.summary, undefined, 'tx err').exitCode).toBe(2);

    const svc = new MigrationService(orch);
    const priv = svc as unknown as {
      isInsideGitRepository: (r: string) => boolean;
      queryGitBranch: (r: string) => string | null;
      isProtectedBranch: (b: string) => boolean;
      verifyBranchSafety: (r: string, b?: string) => Promise<{ ok: boolean; error?: string }>;
      runMutationTransaction: (r: string, e: typeof evalRes, b: boolean) => Promise<{ success: boolean }>;
      executeMigration: (o: { root: string; dryRun?: boolean; branch?: string }) => Promise<{ exitCode: number }>;
      syncManifestVersion: (r: string) => void;
      discoverGovernedFiles: (r: string) => unknown[];
      discoverConfiguredAgentTargets: (r: string) => string[];
      isGovernedAgentPath: (p: string) => boolean;
      discoverAgentFiles: (r: string) => unknown[];
    };

    expect(priv.isInsideGitRepository(tmpDir)).toBe(false);
    expect(priv.queryGitBranch(tmpDir)).toBeNull();
    expect(priv.isProtectedBranch('main')).toBe(true);
    expect((await priv.verifyBranchSafety(tmpDir, 'main')).ok).toBe(false);
    expect((await priv.verifyBranchSafety(tmpDir, 'feat/ok')).ok).toBe(true);
    expect(priv.isGovernedAgentPath('.agent/rules/x.md')).toBe(true);
    expect(priv.isGovernedAgentPath('src/index.ts')).toBe(false);
    expect(priv.discoverConfiguredAgentTargets(tmpDir)).toEqual([]);
    expect(priv.discoverAgentFiles(tmpDir)).toEqual([]);
    expect(priv.discoverGovernedFiles(tmpDir).length).toBeGreaterThanOrEqual(1);

    priv.syncManifestVersion(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.aisdlc.json'))).toBe(true);

    const previewRes = await priv.executeMigration({ root: tmpDir, dryRun: true });
    expect(previewRes.exitCode).toBe(0);

    const txRes = await priv.runMutationTransaction(tmpDir, {
      summary: { upToDate: 0, cleanUpdated: 1, overridesPreserved: 0, conflicts: 0 },
      details: [],
      filesToModify: [{ relPath: 'schemas/custom.json', content: '{"ok":true}' }],
      filesToBackup: ['schemas/custom.json'],
    }, false);
    expect(txRes.success).toBe(true);
  });

  it('transaction-manager: copyFileSafeSync, restoreFromManifestSync, restoreDirRecursiveSync, and private lifecycle', async () => {
    const srcFile = path.join(tmpDir, 'src.txt');
    const destFile = path.join(tmpDir, 'nested', 'dest.txt');
    fs.writeFileSync(srcFile, 'hello', 'utf-8');
    copyFileSafeSync(srcFile, destFile);
    expect(fs.readFileSync(destFile, 'utf-8')).toBe('hello');

    const backupDir = path.join(tmpDir, 'bkp');
    fs.mkdirSync(backupDir, { recursive: true });
    fs.writeFileSync(path.join(backupDir, 'a.txt'), 'restored-a', 'utf-8');
    fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify({ files: [{ path: 'a.txt' }] }), 'utf-8');
    restoreFromManifestSync(backupDir, tmpDir);
    expect(fs.readFileSync(path.join(tmpDir, 'a.txt'), 'utf-8')).toBe('restored-a');

    const rawBackup = path.join(tmpDir, 'bkp-raw');
    fs.mkdirSync(path.join(rawBackup, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(rawBackup, 'sub', 'b.txt'), 'restored-b', 'utf-8');
    restoreDirRecursiveSync(rawBackup, tmpDir, rawBackup);
    expect(fs.readFileSync(path.join(tmpDir, 'sub', 'b.txt'), 'utf-8')).toBe('restored-b');

    const tm = new TransactionManager();
    const priv = tm as unknown as {
      validateStagedFile: (p: string, c: string) => void;
      cleanupStaging: () => void;
      registerSignalHandlers: (r: string) => void;
      unregisterSignalHandlers: () => void;
    };
    expect(() => priv.validateStagedFile('empty.txt', '')).toThrow('ERR_MIGRATION_VALIDATION_FAILED');
    expect(() => priv.validateStagedFile('bad.json', '{')).toThrow('ERR_MIGRATION_VALIDATION_FAILED');
    priv.validateStagedFile('ok.json', '{"ok":1}');

    await tm.begin(tmpDir);
    priv.registerSignalHandlers(tmpDir);
    await tm.stageFile(tmpDir, 'schemas/ok.json', '{"ok":1}');
    await tm.commit(tmpDir);
    priv.cleanupStaging();
    priv.unregisterSignalHandlers();
    expect(fs.readFileSync(path.join(tmpDir, 'schemas', 'ok.json'), 'utf-8')).toBe('{"ok":1}');
  });
});
