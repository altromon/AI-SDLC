/**
 * AI-SDLC: Signature Readiness Check (SEC-REQ-052-NO-SECRET-LEAK-DIAGNOSTICS-001 & SEC-REQ-052-RESILIENT-DIAGNOSTIC-TIMEOUTS-001)
 */

import { CategoryReport, DiagnosticFinding, DoctorOptions, IProcessRunner } from '../types/doctor.js';
import { SafeProcessRunnerAdapter } from './process-runner.js';
import { sanitizeDlpText } from '../security/dlp-sanitizer.js';

async function checkLocalKey(
  runner: IProcessRunner,
  rootDir: string
): Promise<DiagnosticFinding> {
  try {
    const res = await runner.execSafe('git', ['config', '--get', 'user.signingkey'], { cwd: rootDir });
    const key = (res.stdout || '').trim();
    if (key) {
      return {
        id: 'INFO_SIGNING_KEY_DETECTED',
        category: 'signing_readiness',
        status: 'pass',
        message: `Signing key configured: ${sanitizeDlpText(key).sanitizedText}`,
      };
    }
  } catch {
    // ignore
  }

  return {
    id: 'WARN_LOCAL_KEY_MISSING',
    category: 'signing_readiness',
    status: 'warn',
    message: 'No local GPG or SSH signing key configured in git config (user.signingkey).',
    remediation: 'Configure git signing key: git config user.signingkey <key-id>',
  };
}

async function checkRemoteEndpoint(
  runner: IProcessRunner,
  rootDir: string,
  timeoutMs: number
): Promise<DiagnosticFinding | null> {
  try {
    const res = await runner.execSafe('git', ['ls-remote', '--get-url'], {
      cwd: rootDir,
      timeout: Math.min(timeoutMs, 2000),
    });
    if (res.exitCode === 0) return null;
    return {
      id: 'WARN_REMOTE_CHECK_UNAVAILABLE',
      category: 'signing_readiness',
      status: 'warn',
      message: 'Remote repository or signing endpoint could not be reached.',
    };
  } catch {
    return {
      id: 'ERR_NETWORK_PROBE_TIMEOUT',
      category: 'signing_readiness',
      status: 'warn',
      message: 'Remote network probe timed out or failed.',
    };
  }
}

function sanitizeFinding(f: DiagnosticFinding): void {
  f.message = sanitizeDlpText(f.message).sanitizedText;
  if (!f.details) return;
  for (const [k, v] of Object.entries(f.details)) {
    if (typeof v === 'string') {
      f.details[k] = sanitizeDlpText(v).sanitizedText;
    }
  }
}

export class SignatureReadinessCheck {
  private runner: IProcessRunner;

  constructor(runner?: IProcessRunner) {
    this.runner = runner || new SafeProcessRunnerAdapter();
  }

  public async inspect(options: DoctorOptions): Promise<CategoryReport> {
    const findings: DiagnosticFinding[] = [];
    const rootDir = options.rootDir || process.cwd();
    const isOffline = options.offline || process.env.AI_SDLC_OFFLINE === '1';

    findings.push(await checkLocalKey(this.runner, rootDir));

    if (!isOffline) {
      const remoteFinding = await checkRemoteEndpoint(this.runner, rootDir, options.timeout ?? 2000);
      if (remoteFinding) findings.push(remoteFinding);
    }

    for (const f of findings) {
      sanitizeFinding(f);
    }

    const hasFail = findings.some((f) => f.status === 'fail');
    const hasWarn = findings.some((f) => f.status === 'warn');

    return {
      category: 'signing_readiness',
      title: 'Cryptographic Signing Readiness & Key Integrity',
      status: hasFail ? 'fail' : hasWarn ? 'warn' : 'pass',
      findings,
    };
  }
}
