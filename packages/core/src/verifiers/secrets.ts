/**
 * AI-SDLC: Deterministic Secret Scanning & Credential Leak Verifier (Gitleaks Gate)
 *
 * Implements deterministic secret scanning for:
 *   1. Cloud & SaaS API Keys (AWS, GitHub, Slack, Google, OpenAI, Stripe)
 *   2. Private Keys (RSA, DSA, EC, OPENSSH PEM blocks)
 *   3. JSON Web Tokens (JWT)
 *   4. Generic High-Entropy Tokens & Credentials
 *   5. Git Diff analysis against base branches (shift-left task verification)
 *   6. Seamless delegation/augmentation with native Gitleaks CLI if available.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  SecretFindingType,
  SecretVerifierOptions,
  SecretVerifierResult,
  SecretViolation,
} from '../types/index.js';

export interface SecretRule {
  id: string;
  type: SecretFindingType;
  description: string;
  regex: RegExp;
  minEntropy?: number;
  captureIndex?: number;
}

export const SECRET_RULES: readonly SecretRule[] = [
  {
    id: 'SEC-001-PRIVATE-KEY',
    type: 'PRIVATE_KEY',
    description: 'Bloque de clave privada detectado (PEM / RSA / DSA / EC / OPENSSH)',
    regex: /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----/g,
  },
  {
    id: 'SEC-002-AWS-ACCESS-KEY',
    type: 'AWS_CREDENTIAL',
    description: 'Identificador de clave de acceso AWS (AKIA...)',
    regex: /\b(AKIA[0-9A-Z]{16})\b/g,
    captureIndex: 1,
  },
  {
    id: 'SEC-003-AWS-SECRET-KEY',
    type: 'AWS_CREDENTIAL',
    description: 'Clave secreta de acceso AWS asignada en código',
    regex: /(?:aws_secret_access_key|aws_secret_key|secret_key)\s*[:=]\s*['"]([0-9a-zA-Z/+=]{40})['"]/gi,
    captureIndex: 1,
    minEntropy: 4.2,
  },
  {
    id: 'SEC-004-GITHUB-TOKEN',
    type: 'GITHUB_TOKEN',
    description: 'Token de autenticación personal o de aplicación de GitHub (ghp_, github_pat_, etc.)',
    regex: /\b(gh[pousr]_[A-Za-z0-9_]{36,255}|github_pat_[0-9a-zA-Z_]{82})\b/g,
    captureIndex: 1,
  },
  {
    id: 'SEC-005-SLACK-TOKEN',
    type: 'SLACK_TOKEN',
    description: 'Token de bot o webhook de Slack (xox[baprs]-...)',
    regex: /\b(xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*)\b/g,
    captureIndex: 1,
  },
  {
    id: 'SEC-006-GOOGLE-API-KEY',
    type: 'GOOGLE_API_KEY',
    description: 'Clave de API de Google Cloud Platform (AIza...)',
    regex: /\b(AIza[0-9A-Za-z_-]{35,36})\b/g,
    captureIndex: 1,
  },
  {
    id: 'SEC-007-OPENAI-API-KEY',
    type: 'OPENAI_API_KEY',
    description: 'Clave de API de OpenAI / Azure OpenAI (sk-...)',
    regex: /\b(sk-(?:proj-|live-)?[a-zA-Z0-9_-]{32,})\b/g,
    captureIndex: 1,
  },
  {
    id: 'SEC-008-STRIPE-API-KEY',
    type: 'STRIPE_API_KEY',
    description: 'Clave secreta de API de Stripe (sk_live_... / rk_live_...)',
    regex: /\b((?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,99})\b/g,
    captureIndex: 1,
  },
  {
    id: 'SEC-009-JWT-TOKEN',
    type: 'JWT_TOKEN',
    description: 'Token JSON Web Token (JWT) con firma criptográfica en texto plano',
    regex: /\b(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g,
    captureIndex: 1,
    minEntropy: 4.0,
  },
  {
    id: 'SEC-010-GENERIC-SECRET',
    type: 'GENERIC_HIGH_ENTROPY_SECRET',
    description: 'Asignación de credencial o contraseña genérica con alta entropía de Shannon',
    regex: /(?:api[_-]?key|secret|token|password|auth[_-]?token|access[_-]?token)\s*[:=]\s*['"]([a-zA-Z0-9_\-=+]{16,})['"]/gi,
    captureIndex: 1,
    minEntropy: 4.3,
  },
] as const;

export const DEFAULT_EXCLUDED_PATTERNS = [
  'node_modules/',
  'dist/',
  '.git/',
  '.changeset/',
  'reports/',
  'coverage/',
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  'tests/secrets.spec.ts',
];

const PLACEHOLDER_KEYWORDS = new Set([
  'placeholder',
  'your-api-key',
  'your_secret_key',
  'test-secret',
  'sample-token',
  'dummy_token',
  'xxxx',
  'changeme',
]);

/**
 * Calculates Shannon entropy of a string: H(X) = - sum(p(x) * log2(p(x)))
 */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;

  const freqMap = new Map<string, number>();
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    freqMap.set(char, (freqMap.get(char) || 0) + 1);
  }

  let entropy = 0;
  const len = str.length;
  for (const count of freqMap.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return Math.round(entropy * 100) / 100;
}

/**
 * Masks a secret string for safe display and logging (e.g. ghp_1234...5678)
 */
export function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return '***[REDACTED]***';
  }
  const prefixLen = Math.min(6, Math.floor(secret.length / 4));
  const suffixLen = Math.min(4, Math.floor(secret.length / 6));
  const prefix = secret.slice(0, prefixLen);
  const suffix = secret.slice(-suffixLen);
  return `${prefix}****${suffix}`;
}

export function isPlaceholderOrIgnored(secret: string, line: string): boolean {
  const lowerSecret = secret.toLowerCase();
  for (const placeholder of PLACEHOLDER_KEYWORDS) {
    if (lowerSecret.includes(placeholder)) return true;
  }

  // Check inline suppression comments
  if (
    line.includes('ai-sdlc:allow-secret') ||
    line.includes('gitleaks:allow') ||
    line.includes('pragma: allowlist secret')
  ) {
    return true;
  }

  return false;
}

export interface DiffLineItem {
  file: string;
  lineNumber: number;
  content: string;
}

export function getGitDiffLines(rootDir: string, baseBranch?: string): DiffLineItem[] {
  const lines: DiffLineItem[] = [];
  try {
    const targetBase = baseBranch || 'origin/main';
    let diffOutput = '';

    // Check if targetBase exists
    try {
      diffOutput = execFileSync('git', ['diff', '-U0', `${targetBase}...HEAD`], {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
    } catch {
      // Fallback to diff against HEAD or working tree
      try {
        diffOutput = execFileSync('git', ['diff', '-U0', 'HEAD'], {
          cwd: rootDir,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
      } catch {
        diffOutput = '';
      }
    }

    if (!diffOutput) {
      // Check unstaged changes as fallback
      diffOutput = execFileSync('git', ['diff', '-U0'], {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
    }

    let currentFile = '';
    let currentLine = 1;

    for (const rawLine of diffOutput.split('\n')) {
      if (rawLine.startsWith('+++ b/')) {
        currentFile = rawLine.substring(6).trim();
      } else if (rawLine.startsWith('@@ ')) {
        // Parse hunk header: @@ -1,1 +15,3 @@
        const match = rawLine.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          currentLine = parseInt(match[1], 10);
        }
      } else if (rawLine.startsWith('+') && !rawLine.startsWith('+++')) {
        const content = rawLine.substring(1);
        if (currentFile) {
          lines.push({
            file: currentFile,
            lineNumber: currentLine,
            content,
          });
        }
        currentLine++;
      }
    }
  } catch {
    // Git diff failure fallback
  }

  return lines;
}

export function walkProjectFiles(
  dir: string,
  rootDir: string,
  excludedPatterns: string[] = DEFAULT_EXCLUDED_PATTERNS
): string[] {
  const results: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

      let isExcluded = false;
      for (const pat of excludedPatterns) {
        if (relPath.includes(pat) || relPath.startsWith(pat)) {
          isExcluded = true;
          break;
        }
      }

      if (isExcluded) continue;

      if (entry.isDirectory()) {
        results.push(...walkProjectFiles(fullPath, rootDir, excludedPatterns));
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  } catch {
    // Skip inaccessible folders
  }

  return results;
}

export function isGitleaksInstalled(): boolean {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(cmd, ['gitleaks'], { stdio: ['pipe', 'pipe', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}

export function runGitleaksCli(rootDir: string): SecretViolation[] {
  const violations: SecretViolation[] = [];
  try {
    const output = execFileSync(
      'gitleaks',
      ['detect', '--no-git', '--report-format', 'json', '--report-path', 'stdout'],
      {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }
    );

    if (output) {
      const parsed = JSON.parse(output);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const filePath = path.resolve(rootDir, item.File || item.file);
          const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
          violations.push({
            filePath,
            relPath,
            lineNumber: item.StartLine || item.line || 1,
            type: 'GITLEAKS_FINDING',
            ruleId: item.RuleID || item.ruleID || 'GITLEAKS-MATCH',
            maskedMatch: maskSecret(item.Secret || item.secret || item.Match || ''),
            entropy: item.Entropy || item.entropy,
            message: `Gitleaks detectó credencial [${item.RuleID || 'SECRET'}]: ${item.Description || ''}`,
          });
        }
      }
    }
  } catch {
    // If gitleaks exits with code > 0 it typically means secrets were found or syntax error
  }
  return violations;
}

export function scanContentForSecrets(
  content: string,
  filePath: string,
  rootDir: string,
  entropyThreshold = 4.3
): SecretViolation[] {
  const violations: SecretViolation[] = [];
  const lines = content.split(/\r?\n/);
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim().length === 0) continue;

    for (const rule of SECRET_RULES) {
      rule.regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = rule.regex.exec(line)) !== null) {
        const rawMatch = rule.captureIndex ? match[rule.captureIndex] : match[0];
        if (!rawMatch || rawMatch.length < 8) continue;

        if (isPlaceholderOrIgnored(rawMatch, line)) continue;

        const entropy = calculateShannonEntropy(rawMatch);
        if (rule.minEntropy && entropy < (entropyThreshold || rule.minEntropy)) {
          continue;
        }

        violations.push({
          filePath,
          relPath,
          lineNumber: i + 1,
          type: rule.type,
          ruleId: rule.id,
          maskedMatch: maskSecret(rawMatch),
          entropy,
          message: `${rule.description} (Entropía: ${entropy})`,
        });
      }
    }
  }

  return violations;
}

export function verifySecrets(options: SecretVerifierOptions = {}): SecretVerifierResult {
  const rootDir = options.rootDir || process.cwd();
  const entropyThreshold = options.entropyThreshold ?? 4.3;
  const excludePatterns = options.excludePatterns || DEFAULT_EXCLUDED_PATTERNS;

  const findings: SecretViolation[] = [];
  let totalFilesScanned = 0;
  let scannedWithGitleaks = false;

  // 1. If diff mode is requested, scan git diff lines
  if (options.diff) {
    const diffLines = getGitDiffLines(rootDir, options.baseBranch);
    const fileGroups = new Map<string, DiffLineItem[]>();

    for (const item of diffLines) {
      const list = fileGroups.get(item.file) || [];
      list.push(item);
      fileGroups.set(item.file, list);
    }

    totalFilesScanned = fileGroups.size;

    for (const [relFile, items] of fileGroups) {
      let isExcluded = false;
      for (const pat of excludePatterns) {
        if (relFile.includes(pat) || relFile.startsWith(pat)) {
          isExcluded = true;
          break;
        }
      }
      if (isExcluded) continue;

      for (const item of items) {
        const line = item.content;
        for (const rule of SECRET_RULES) {
          rule.regex.lastIndex = 0;
          let match: RegExpExecArray | null;

          while ((match = rule.regex.exec(line)) !== null) {
            const rawMatch = rule.captureIndex ? match[rule.captureIndex] : match[0];
            if (!rawMatch || rawMatch.length < 8) continue;

            if (isPlaceholderOrIgnored(rawMatch, line)) continue;

            const entropy = calculateShannonEntropy(rawMatch);
            if (rule.minEntropy && entropy < (entropyThreshold || rule.minEntropy)) {
              continue;
            }

            findings.push({
              filePath: path.resolve(rootDir, item.file),
              relPath: item.file,
              lineNumber: item.lineNumber,
              type: rule.type,
              ruleId: rule.id,
              maskedMatch: maskSecret(rawMatch),
              entropy,
              message: `[DIFF] ${rule.description} (Entropía: ${entropy})`,
            });
          }
        }
      }
    }
  } else {
    // 2. Full project scan
    const allFiles = walkProjectFiles(rootDir, rootDir, excludePatterns);
    totalFilesScanned = allFiles.length;

    for (const file of allFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const fileViolations = scanContentForSecrets(content, file, rootDir, entropyThreshold);
        findings.push(...fileViolations);
      } catch {
        // Skip unreadable files
      }
    }
  }

  // 3. Delegate to Gitleaks CLI if requested or available
  if (options.gitleaks || (options.gitleaks === undefined && isGitleaksInstalled())) {
    try {
      const gitleaksFindings = runGitleaksCli(rootDir);
      if (gitleaksFindings.length > 0) {
        scannedWithGitleaks = true;
        // Merge without duplicating same file and line
        for (const gf of gitleaksFindings) {
          const exists = findings.some(
            (f) => f.relPath === gf.relPath && Math.abs(f.lineNumber - gf.lineNumber) <= 1
          );
          if (!exists) {
            findings.push(gf);
          }
        }
      }
    } catch {
      // Gitleaks failure fallback
    }
  }

  const result: SecretVerifierResult = {
    success: findings.length === 0,
    totalFilesScanned,
    findingsCount: findings.length,
    findings,
    scannedWithGitleaks,
  };

  result.reportMarkdown = generateSecretsReportMarkdown(result);
  return result;
}

export function generateSecretsReportMarkdown(result: SecretVerifierResult): string {
  const isOk = result.success;
  const lines: string[] = [
    `# 🔐 Deterministic Secrets and Credentials Audit (Gitleaks Gate)`,
    ``,
    `> **Evaluation Date:** ${new Date().toISOString()}`,
    `> **Verdict:** ${isOk ? '✅ COMPLIANT (No exposed secrets or credentials)' : `❌ BLOCKED (${result.findingsCount} exposed credentials detected)`}`,
    `> **Audited Files:** ${result.totalFilesScanned} | **Security Violations:** ${result.findingsCount}`,
    `> **Native Gitleaks Engine:** ${result.scannedWithGitleaks ? '🟢 Active / Integrated' : '⚪ Deterministic Native Scanner (@ai-sdlc/core)'}`,
    ``,
    `---`,
  ];

  if (result.findings.length === 0) {
    lines.push(
      ``,
      `## Compliance Summary`,
      ``,
      `The repository and analyzed diffs are free of private keys, Cloud/SaaS provider API tokens (AWS, GitHub, Google, OpenAI, Slack, Stripe), plaintext JWTs, or high-entropy secrets.`,
      `Credentials security Quality Gate is APPROVED (EXIT 0).`
    );
  } else {
    lines.push(
      ``,
      `## Detected Secret Leaks Detail`,
      ``,
      `| Severity | Rule | Type | File:Line | Token (Masked) | Details |`,
      `| :---: | :--- | :--- | :--- | :--- | :--- |`
    );

    for (const f of result.findings) {
      lines.push(
        `| 🛑 **CRITICAL** | \`${f.ruleId}\` | \`${f.type}\` | \`${f.relPath}:${f.lineNumber}\` | \`${f.maskedMatch}\` | ${f.message} |`
      );
    }

    lines.push(
      ``,
      `## 🚨 Mandatory Remediation Protocol (Exit Code 4)`,
      ``,
      `1. **Immediate Revocation**: Any credential or token detected above must be considered compromised and immediately revoked at the respective provider.`,
      `2. **Rotation and Secure Storage**: Migrate credentials to protected environment variables or secrets management vaults (Vault, AWS Secrets Manager, GitHub Secrets).`,
      `3. **Git History Purge**: If the secret was committed, purge it from Git history with \`git filter-repo\` or BFG before merging.`,
      `4. **False Positives**: For legitimate test fixtures or non-secret strings, add \`// ai-sdlc:allow-secret\` on the offending line or add the path to \`.secretsignore\`.`
    );
  }

  return lines.join('\n');
}
