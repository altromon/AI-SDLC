/**
 * AI-SDLC: CLI Doctor Engine Types, DTOs and Interfaces (CMP-052-DOCTOR-ENGINE)
 */

export type DoctorStatus = 'pass' | 'warn' | 'fail';
export type CheckStatus = DoctorStatus;

export type DiagnosticCategory =
  | 'git_hooks'
  | 'branch_safety'
  | 'schemas_pdac'
  | 'toolchain'
  | 'signing_readiness';

export interface DiagnosticFinding {
  id: string; // e.g. 'ERR_HOOKS_NOT_INSTALLED', 'ERR_PROTECTED_BRANCH_ACTIVE'
  category: DiagnosticCategory;
  status: DoctorStatus;
  message: string;
  remediation?: string;
  details?: Record<string, unknown>;
}

export interface CategoryReport {
  category: DiagnosticCategory;
  title: string;
  status: DoctorStatus;
  findings: DiagnosticFinding[];
}

export type CategoryResult = CategoryReport;

export interface DoctorOptions {
  rootDir: string;
  json?: boolean;
  fix?: boolean;
  strict?: boolean;
  offline?: boolean; // When true (or AI_SDLC_OFFLINE=1), skips remote probes without triggering failure
  timeout?: number; // ms, default: 2000ms
}

export interface DoctorReport {
  overallStatus: DoctorStatus;
  exitCode: 0 | 1 | 2; // 0: healthy, 1: warnings, 2: critical failures
  timestamp: string; // ISO 8601 UTC
  categories: CategoryReport[];
  remediations: string[];
}

export interface IDoctorService {
  diagnose(options: DoctorOptions): Promise<DoctorReport>;
}

export interface ProcessExecOptions {
  timeout?: number; // default 2000ms
  maxBuffer?: number; // default 1024 bytes
  cwd?: string;
}

export interface ProcessExecResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export interface IProcessRunner {
  execSafe(
    executable: 'node' | 'pnpm' | 'git',
    args: string[],
    options?: ProcessExecOptions
  ): Promise<ProcessExecResult>;
}

export interface IFileSystemProbe {
  exists(filePath: string): Promise<boolean>;
  readFile(filePath: string): Promise<string>;
  getFileSize(filePath: string): Promise<number>;
  isExecutable(filePath: string): Promise<boolean>;
}

export interface IDiagnosticsReporter {
  formatTerminal(report: DoctorReport): string;
  formatJson(report: DoctorReport): string;
}
