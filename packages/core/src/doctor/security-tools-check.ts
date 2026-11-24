/**
 * AI-SDLC: Optional Security CLIs Health Check (CMP-060-DOCTOR-SECURITY-TOOLS)
 */

import { sanitizeDlpText } from '../security/dlp-sanitizer.js';
import {
  CategoryReport,
  DiagnosticFinding,
  DoctorOptions,
  IProcessRunner,
  SafeProbeExecutable,
} from '../types/doctor.js';
import {
  getToolInstallSpec,
  redactSensitiveDiagnostics,
  resolveTrustedBinaryPath,
} from '../verifiers/tool-installer.js';
import { SafeProcessRunnerAdapter } from './process-runner.js';

interface SecurityToolProbe {
  name: Extract<SafeProbeExecutable, 'semgrep' | 'trivy' | 'gitleaks'>;
  flag: string;
}

const SECURITY_TOOLS: readonly SecurityToolProbe[] = [
  { name: 'semgrep', flag: '--version' },
  { name: 'trivy', flag: '--version' },
  { name: 'gitleaks', flag: 'version' },
];

export function sanitizeFindingText(text: string, rootDir: string): string {
  const redacted = redactSensitiveDiagnostics(text, rootDir);
  return sanitizeDlpText(redacted).sanitizedText;
}

export function buildMissingFinding(
  toolName: SecurityToolProbe['name'],
  platform: NodeJS.Platform
): DiagnosticFinding {
  const remediation = getToolInstallSpec(toolName, platform)?.displayCommand;
  return {
    id: `WARN_SECURITY_TOOL_${toolName.toUpperCase()}_MISSING`,
    category: 'security_tools',
    status: 'warn',
    message: `Optional security CLI "${toolName}" was not found on trusted PATH.`,
    remediation,
  };
}

export function buildIssueFinding(
  toolName: SecurityToolProbe['name'],
  platform: NodeJS.Platform,
  rootDir: string,
  rawDetail: string
): DiagnosticFinding {
  const remediation = getToolInstallSpec(toolName, platform)?.displayCommand;
  const sanitizedDetail = sanitizeFindingText(rawDetail, rootDir);
  return {
    id: `WARN_SECURITY_TOOL_${toolName.toUpperCase()}_ISSUE`,
    category: 'security_tools',
    status: 'warn',
    message: sanitizeFindingText(
      `Optional security CLI "${toolName}" probe failed or returned empty output.`,
      rootDir
    ),
    remediation,
    details: sanitizedDetail ? { stderr: sanitizedDetail } : undefined,
  };
}

export class SecurityToolsHealthCheck {
  private readonly runner: IProcessRunner;
  private readonly resolveBinary: (bin: string, rootDir?: string) => string | null;
  private readonly platform: NodeJS.Platform;

  constructor(
    runner?: IProcessRunner,
    resolveBinary: (bin: string, rootDir?: string) => string | null = resolveTrustedBinaryPath,
    platform: NodeJS.Platform = process.platform
  ) {
    this.runner = runner ?? new SafeProcessRunnerAdapter();
    this.resolveBinary = resolveBinary;
    this.platform = platform;
  }

  public async inspect(options: DoctorOptions): Promise<CategoryReport> {
    const rootDir = options.rootDir || process.cwd();
    const results = await Promise.all(
      SECURITY_TOOLS.map((tool) => this.probeSingleTool(tool, rootDir, options.timeout))
    );
    const findings = results.filter((f): f is DiagnosticFinding => f !== null);

    return {
      category: 'security_tools',
      title: 'Optional Security CLIs (Semgrep, Trivy, Gitleaks)',
      status: findings.length > 0 ? 'warn' : 'pass',
      findings,
    };
  }

  private async probeSingleTool(
    tool: SecurityToolProbe,
    rootDir: string,
    timeout?: number
  ): Promise<DiagnosticFinding | null> {
    const trustedPath = this.resolveBinary(tool.name, rootDir);
    if (!trustedPath) {
      return buildMissingFinding(tool.name, this.platform);
    }
    try {
      const res = await this.runner.execSafe(tool.name, [tool.flag], { cwd: rootDir, timeout });
      if (res.exitCode === 0 && res.stdout.trim()) return null;
      return buildIssueFinding(tool.name, this.platform, rootDir, res.stderr || 'Empty version output');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return buildIssueFinding(tool.name, this.platform, rootDir, errMsg);
    }
  }
}
