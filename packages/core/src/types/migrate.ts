/**
 * AI-SDLC Migration Engine Domain Types and DTO Contracts
 * Cites: CMP-053-MIGRATE-ENGINE, FR-053-CLI-MIGRATE-001
 */

export type MigrationFileStatus =
  | 'UP_TO_DATE'
  | 'CLEAN_UPDATE'
  | 'LOCAL_OVERRIDE_PRESERVED'
  | 'CONFLICT';

export type MigrationStatus = MigrationFileStatus;
export type FileClassification = MigrationFileStatus;

export interface MigrationOptions {
  root?: string;
  dryRun?: boolean;
  backup?: boolean;
  force?: boolean;
  allowPolicyDowngrade?: boolean;
  json?: boolean;
  verbose?: boolean;
  branch?: string;
}

export interface MigrationItemReport {
  file: string;
  category: 'schema' | 'template' | 'policy';
  status: MigrationFileStatus;
  currentDigest?: string;
  targetDigest?: string;
  message?: string;
}

export type MigrationPlanItem = MigrationItemReport;

export interface MigrationSummary {
  upToDate: number;
  cleanUpdated: number;
  overridesPreserved: number;
  conflicts: number;
}

export interface MigrationResult {
  success: boolean;
  exitCode: 0 | 1 | 2;
  summary: MigrationSummary;
  backupPath?: string;
  details: MigrationItemReport[];
}

export type MigrationReport = MigrationResult;

export interface IFileSystemJail {
  resolveSafe(repoRoot: string, relativePath: string): string;
  readFileSafe(repoRoot: string, relativePath: string): Promise<string>;
  writeFileSafe(repoRoot: string, relativePath: string, content: string): Promise<void>;
  existsSafe(repoRoot: string, relativePath: string): Promise<boolean>;
  ensureDirectorySafe(repoRoot: string, relativeDir: string): Promise<void>;
  isSymlinkSafe(repoRoot: string, relativePath: string): Promise<boolean>;
}

export interface BackupManifestEntry {
  path: string;
  sha256: string;
  bytes: number;
}

export interface BackupManifest {
  timestamp: string;
  changeId?: string;
  files: BackupManifestEntry[];
}

export interface IBackupManager {
  createBackup(repoRoot: string, filesToBackup: string[]): Promise<string>;
  restoreBackup(repoRoot: string, backupPath: string): Promise<void>;
}

export interface ITransactionManager {
  begin(repoRoot: string): Promise<string>;
  stageFile(repoRoot: string, relativePath: string, content: string): Promise<void>;
  commit(repoRoot: string): Promise<void>;
  rollback(repoRoot: string): Promise<void>;
  rollbackSync(repoRoot: string, backupPath?: string): void;
}

export interface IMigrationService {
  migrate(options: MigrationOptions): Promise<MigrationResult>;
  preview(options: MigrationOptions): Promise<MigrationResult>;
}

export interface IMigrationReporter {
  formatTerminal(result: MigrationResult): string;
  formatJson(result: MigrationResult): string;
}
