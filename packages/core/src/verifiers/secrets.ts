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
  SecuritySuppression,
} from '../types/index.js';
import { parseSecuritySuppression } from './security-suppressions.js';

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

export function isPlaceholderOrIgnored(
  secret: string,
  line: string,
  filePath = '',
  lineNumber = 0,
  collectedSuppressions?: SecuritySuppression[]
): boolean {
  const lowerSecret = secret.toLowerCase();
  for (const placeholder of PLACEHOLDER_KEYWORDS) {
    if (lowerSecret.includes(placeholder)) return true;
  }

  const suppression = parseSecuritySuppression(line, filePath, lineNumber);
  if (suppression) {
    if (collectedSuppressions) collectedSuppressions.push(suppression);
    return suppression.status === 'active';
  }

  return false;
}

export interface DiffLineItem {
  file: string;
  lineNumber: number;
  content: string;
}

function tryGitDiff(rootDir: string, args: string[]): string | null {
  try {
    return execFileSync('git', args, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function getGitDiffOutput(rootDir: string, baseBranch?: string): string {
  const targetBase = baseBranch || 'origin/main';
  return (
    tryGitDiff(rootDir, ['diff', '-U0', `${targetBase}...HEAD`]) ??
    tryGitDiff(rootDir, ['diff', '-U0', 'HEAD']) ??
    tryGitDiff(rootDir, ['diff', '-U0']) ??
    ''
  );
}

function parseHunkHeaderLine(rawLine: string): number | null {
  const match = rawLine.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  return match ? parseInt(match[1], 10) : null;
}

function appendDiffLine(
  lines: DiffLineItem[],
  file: string,
  lineNumber: number,
  rawContent: string
): void {
  if (file) {
    lines.push({ file, lineNumber, content: rawContent });
  }
}

function parseDiffOutput(diffOutput: string): DiffLineItem[] {
  const lines: DiffLineItem[] = [];
  let currentFile = '';
  let currentLine = 1;

  for (const rawLine of diffOutput.split('\n')) {
    if (rawLine.startsWith('+++ b/')) {
      currentFile = rawLine.substring(6).trim();
      continue;
    }
    if (rawLine.startsWith('@@ ')) {
      const hunkLine = parseHunkHeaderLine(rawLine);
      if (hunkLine !== null) currentLine = hunkLine;
      continue;
    }
    if (rawLine.startsWith('+') && !rawLine.startsWith('+++')) {
      appendDiffLine(lines, currentFile, currentLine, rawLine.substring(1));
      currentLine++;
    }
  }
  return lines;
}

export function getGitDiffLines(rootDir: string, baseBranch?: string): DiffLineItem[] {
  try {
    return parseDiffOutput(getGitDiffOutput(rootDir, baseBranch));
  } catch {
    return [];
  }
}

function isPathExcluded(relPath: string, patterns: string[]): boolean {
  return patterns.some((pat) => relPath.includes(pat) || relPath.startsWith(pat));
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

      if (isPathExcluded(relPath, excludedPatterns)) continue;

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

interface GitleaksRawItem {
  File?: string;
  file?: string;
  StartLine?: number;
  line?: number;
  RuleID?: string;
  ruleID?: string;
  Secret?: string;
  secret?: string;
  Match?: string;
  Entropy?: number;
  entropy?: number;
  Description?: string;
}

function pickFirstString(...vals: (string | undefined)[]): string {
  for (const v of vals) {
    if (v) return v;
  }
  return '';
}

function parseGitleaksItem(item: GitleaksRawItem, rootDir: string): SecretViolation {
  const rawFile = pickFirstString(item.File, item.file);
  const filePath = path.resolve(rootDir, rawFile);
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
  const ruleId = pickFirstString(item.RuleID, item.ruleID) || 'GITLEAKS-MATCH';
  const rawSecret = pickFirstString(item.Secret, item.secret, item.Match);
  const line = item.StartLine ?? item.line ?? 1;

  return {
    filePath,
    relPath,
    lineNumber: line,
    type: 'GITLEAKS_FINDING',
    ruleId,
    maskedMatch: maskSecret(rawSecret),
    entropy: item.Entropy ?? item.entropy,
    message: `Gitleaks detectó credencial [${ruleId}]: ${item.Description || ''}`,
  };
}

export function runGitleaksCli(rootDir: string): SecretViolation[] {
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
    if (!output) return [];
    const parsed = JSON.parse(output);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: GitleaksRawItem) => parseGitleaksItem(item, rootDir));
  } catch {
    return [];
  }
}

function buildSecretViolation(
  rule: SecretRule,
  rawMatch: string,
  entropy: number,
  filePath: string,
  relPath: string,
  lineNumber: number
): SecretViolation {
  return {
    filePath,
    relPath,
    lineNumber,
    type: rule.type,
    ruleId: rule.id,
    maskedMatch: maskSecret(rawMatch),
    entropy,
    message: `${rule.description} (Entropía: ${entropy})`,
  };
}

function checkRuleOnLine(
  rule: SecretRule,
  line: string,
  lineNumber: number,
  filePath: string,
  relPath: string,
  entropyThreshold: number,
  collectedSuppressions?: SecuritySuppression[]
): SecretViolation[] {
  const violations: SecretViolation[] = [];
  rule.regex.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = rule.regex.exec(line)) !== null) {
    const rawMatch = rule.captureIndex ? match[rule.captureIndex] : match[0];
    if (!rawMatch || rawMatch.length < 8) continue;
    if (isPlaceholderOrIgnored(rawMatch, line, filePath, lineNumber, collectedSuppressions)) continue;

    const entropy = calculateShannonEntropy(rawMatch);
    if (rule.minEntropy && entropy < (entropyThreshold || rule.minEntropy)) {
      continue;
    }

    violations.push(buildSecretViolation(rule, rawMatch, entropy, filePath, relPath, lineNumber));
  }
  return violations;
}

function scanLineForSecrets(
  line: string,
  lineNumber: number,
  filePath: string,
  relPath: string,
  entropyThreshold: number,
  collectedSuppressions?: SecuritySuppression[]
): SecretViolation[] {
  if (!line || line.trim().length === 0) return [];
  const lineViolations: SecretViolation[] = [];
  for (const rule of SECRET_RULES) {
    lineViolations.push(...checkRuleOnLine(rule, line, lineNumber, filePath, relPath, entropyThreshold, collectedSuppressions));
  }
  return lineViolations;
}

export function scanContentForSecrets(
  content: string,
  filePath: string,
  rootDir: string,
  entropyThreshold = 4.3,
  collectedSuppressions?: SecuritySuppression[]
): SecretViolation[] {
  const violations: SecretViolation[] = [];
  const lines = content.split(/\r?\n/);
  const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

  for (let i = 0; i < lines.length; i++) {
    violations.push(...scanLineForSecrets(lines[i], i + 1, filePath, relPath, entropyThreshold, collectedSuppressions));
  }

  return violations;
}

function groupDiffLinesByFile(diffLines: DiffLineItem[]): Map<string, DiffLineItem[]> {
  const fileGroups = new Map<string, DiffLineItem[]>();
  for (const item of diffLines) {
    const list = fileGroups.get(item.file) || [];
    list.push(item);
    fileGroups.set(item.file, list);
  }
  return fileGroups;
}

function scanDiffItems(
  diffLines: DiffLineItem[],
  rootDir: string,
  excludePatterns: string[],
  entropyThreshold: number
): { findings: SecretViolation[]; filesScannedCount: number; suppressions: SecuritySuppression[] } {
  const fileGroups = groupDiffLinesByFile(diffLines);
  const findings: SecretViolation[] = [];
  const suppressions: SecuritySuppression[] = [];

  for (const [relFile, items] of fileGroups) {
    if (isPathExcluded(relFile, excludePatterns)) continue;
    const absPath = path.resolve(rootDir, relFile);
    for (const item of items) {
      const lineViolations = scanLineForSecrets(item.content, item.lineNumber, absPath, relFile, entropyThreshold, suppressions);
      for (const v of lineViolations) {
        findings.push({ ...v, message: `[DIFF] ${v.message}` });
      }
    }
  }
  return { findings, filesScannedCount: fileGroups.size, suppressions };
}

function scanAllProjectFiles(
  rootDir: string,
  excludePatterns: string[],
  entropyThreshold: number
): { findings: SecretViolation[]; filesScannedCount: number; suppressions: SecuritySuppression[] } {
  const allFiles = walkProjectFiles(rootDir, rootDir, excludePatterns);
  const findings: SecretViolation[] = [];
  const suppressions: SecuritySuppression[] = [];
  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      findings.push(...scanContentForSecrets(content, file, rootDir, entropyThreshold, suppressions));
    } catch {
      // Skip unreadable files
    }
  }
  return { findings, filesScannedCount: allFiles.length, suppressions };
}

function appendNonDuplicateFindings(target: SecretViolation[], incoming: SecretViolation[]): void {
  for (const item of incoming) {
    const exists = target.some(
      (f) => f.relPath === item.relPath && Math.abs(f.lineNumber - item.lineNumber) <= 1
    );
    if (!exists) {
      target.push(item);
    }
  }
}

function mergeGitleaksFindings(
  findings: SecretViolation[],
  rootDir: string,
  gitleaksEnabled: boolean | undefined
): { findings: SecretViolation[]; scannedWithGitleaks: boolean } {
  const shouldRun = gitleaksEnabled || (gitleaksEnabled === undefined && isGitleaksInstalled());
  if (!shouldRun) {
    return { findings, scannedWithGitleaks: false };
  }
  try {
    const gitleaksFindings = runGitleaksCli(rootDir);
    if (gitleaksFindings.length === 0) {
      return { findings, scannedWithGitleaks: false };
    }
    const merged = [...findings];
    appendNonDuplicateFindings(merged, gitleaksFindings);
    return { findings: merged, scannedWithGitleaks: true };
  } catch {
    return { findings, scannedWithGitleaks: false };
  }
}

export function verifySecrets(options: SecretVerifierOptions = {}): SecretVerifierResult {
  const rootDir = options.rootDir || process.cwd();
  const entropyThreshold = options.entropyThreshold ?? 4.3;
  const excludePatterns = options.excludePatterns || DEFAULT_EXCLUDED_PATTERNS;

  const { findings, filesScannedCount, suppressions } = options.diff
    ? scanDiffItems(getGitDiffLines(rootDir, options.baseBranch), rootDir, excludePatterns, entropyThreshold)
    : scanAllProjectFiles(rootDir, excludePatterns, entropyThreshold);

  const merged = mergeGitleaksFindings(findings, rootDir, options.gitleaks);
  const hasExpired = (suppressions || []).some((s) => s.status === 'expired');

  const result: SecretVerifierResult = {
    success: merged.findings.length === 0 && !hasExpired,
    totalFilesScanned: filesScannedCount,
    findingsCount: merged.findings.length,
    findings: merged.findings,
    scannedWithGitleaks: merged.scannedWithGitleaks,
    suppressions,
  };

  result.reportMarkdown = generateSecretsReportMarkdown(result);
  return result;
}

function buildReportHeader(result: SecretVerifierResult): string[] {
  const isOk = result.success;
  return [
    `# 🔐 Deterministic Secrets and Credentials Audit (Gitleaks Gate)`,
    ``,
    `> **Evaluation Date:** ${new Date().toISOString()}`,
    `> **Verdict:** ${isOk ? '✅ COMPLIANT (No exposed secrets or credentials)' : `❌ BLOCKED (${result.findingsCount} exposed credentials detected)`}`,
    `> **Audited Files:** ${result.totalFilesScanned} | **Security Violations:** ${result.findingsCount}`,
    `> **Native Gitleaks Engine:** ${result.scannedWithGitleaks ? '🟢 Active / Integrated' : '⚪ Deterministic Native Scanner (@aisdlc/core)'}`,
    ``,
    `---`,
  ];
}

function buildReportRemediationProtocol(): string[] {
  return [
    ``,
    `## 🚨 Mandatory Remediation Protocol (Exit Code 4)`,
    ``,
    `1. **Immediate Revocation**: Any credential or token detected above must be considered compromised and immediately revoked at the respective provider.`,
    `2. **Rotation and Secure Storage**: Migrate credentials to protected environment variables or secrets management vaults (Vault, AWS Secrets Manager, GitHub Secrets).`,
    `3. **Git History Purge**: If the secret was committed, purge it from Git history with \`git filter-repo\` or BFG before merging.`,
    `4. **False Positives**: For legitimate test fixtures or non-secret strings, add \`// ai-sdlc:allow-secret\` on the offending line or add the path to \`.secretsignore\`.`,
  ];
}

function buildFindingsTable(findings: SecretViolation[]): string[] {
  const rows: string[] = [
    ``,
    `## Detected Secret Leaks Detail`,
    ``,
    `| Severity | Rule | Type | File:Line | Token (Masked) | Details |`,
    `| :---: | :--- | :--- | :--- | :--- | :--- |`,
  ];
  for (const f of findings) {
    rows.push(
      `| 🛑 **CRITICAL** | \`${f.ruleId}\` | \`${f.type}\` | \`${f.relPath}:${f.lineNumber}\` | \`${f.maskedMatch}\` | ${f.message} |`
    );
  }
  rows.push(...buildReportRemediationProtocol());
  return rows;
}

export function generateSecretsReportMarkdown(result: SecretVerifierResult): string {
  const lines = buildReportHeader(result);

  if (result.findings.length === 0) {
    lines.push(
      ``,
      `## Compliance Summary`,
      ``,
      `The repository and analyzed diffs are free of private keys, Cloud/SaaS provider API tokens (AWS, GitHub, Google, OpenAI, Slack, Stripe), plaintext JWTs, or high-entropy secrets.`,
      `Credentials security Quality Gate is APPROVED (EXIT 0).`
    );
  } else {
    lines.push(...buildFindingsTable(result.findings));
  }

  return lines.join('\n');
}
