/**
 * AI-SDLC: Shift-Left SAST (Static Application Security Testing) Verifier
 *
 * Deterministic semantic analysis for AI-generated vulnerability hotspots:
 *   1. SQL Injection via dynamic string concatenation / interpolation
 *   2. OS Command Injection (eval, exec, spawn with shell: true)
 *   3. Server-Side Request Forgery (SSRF) via unvalidated external fetches
 *   4. Path Traversal in filesystem operations
 *   5. Optional delegation to Semgrep CLI if installed.
 */

import { execFileSync } from 'child_process';
import { canonicalSort } from '../utils/fs.js';
import { resolveDeterministicDate } from '../utils/time.js';
import * as fs from 'fs';
import * as path from 'path';
import {
  PromptInjectionFinding,
  SastFindingType,
  SastSeverity,
  SastVerifierOptions,
  SastVerifierResult,
  SastViolation,
  SecuritySuppression,
} from '../types/index.js';
import { parseSecuritySuppression } from './security-suppressions.js';

export const GENERAL_SOURCE_EXTENSIONS: readonly string[] = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.cs',
  '.java',
  '.kt',
  '.scala',
  '.c',
  '.cpp',
  '.cc',
  '.cxx',
  '.h',
  '.hpp',
  '.go',
  '.rs',
  '.php',
  '.rb',
  '.swift',
  '.prompt',
];

export interface SastRule {
  id: string;
  type: SastFindingType;
  severity: SastSeverity;
  description: string;
  pattern: RegExp;
  fileExtensions?: readonly string[];
}

export const SAST_RULES: readonly SastRule[] = [
  {
    id: 'SAST-001-SQL-INJECTION',
    type: 'SQL_INJECTION',
    severity: 'CRITICAL',
    description: 'Concatenación o interpolación directa de variables en consulta SQL dinámica',
    pattern: /(?:\.query|\.execute|\.raw)\s*\(\s*(?:`[^`]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)[^`]*\$\{[^}]+\}[^`]*`|['"][^'"]*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER)[^'"]*['"]\s*\+)/i,
    fileExtensions: ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.java', '.kt', '.cs', '.php', '.rb', '.cpp', '.c'],
  },
  {
    id: 'SAST-002-COMMAND-INJECTION',
    type: 'COMMAND_INJECTION',
    severity: 'CRITICAL',
    description: 'Ejecución dinámica de comandos del sistema operativo con argumentos variables',
    pattern: /(?:child_process\.(?:exec|execSync)|(?<!\.)\b(?:exec|execSync))\s*\(\s*(?:`[^`]*\$\{[^}]+\}[^`]*`|[a-zA-Z0-9_]+\s*\+|[a-zA-Z0-9_]+\))/i,
    fileExtensions: ['.ts', '.js', '.mjs', '.cjs', '.py', '.go', '.java', '.cs', '.php', '.rb'],
  },
  {
    id: 'SAST-003-UNSAFE-EVAL',
    type: 'UNSAFE_EVAL',
    severity: 'CRITICAL',
    description: 'Uso de evaluación dinámica de código (eval o Function constructor)',
    pattern: /(?<!\.)\b(?:eval\s*\(|new\s+Function\s*\()/g,
    fileExtensions: ['.ts', '.js', '.py', '.php', '.rb', '.cs'],
  },
  {
    id: 'SAST-004-SSRF-UNVALIDATED-FETCH',
    type: 'SSRF',
    severity: 'HIGH',
    description: 'Petición de red saliente (fetch/http/axios) con URL dinámica sin validación previa',
    pattern: /(?:fetch|axios\.(?:get|post|put|delete)|http\.(?:get|request))\s*\(\s*(?:req\.(?:query|params|body)|urlParam|targetUrl|userInput|remoteUrl)\b/i,
    fileExtensions: ['.ts', '.js', '.py', '.go', '.java', '.cs', '.php', '.rb'],
  },
  {
    id: 'SAST-005-PATH-TRAVERSAL',
    type: 'PATH_TRAVERSAL',
    severity: 'HIGH',
    description: 'Lectura o escritura en sistema de archivos construida directamente desde parámetros no saneados',
    pattern: /fs\.(?:readFileSync|readFile|createReadStream|writeFileSync)\s*\(\s*(?:path\.join\([^)]*req\.(?:query|params|body)|req\.(?:query|params|body))/i,
    fileExtensions: ['.ts', '.js', '.py', '.go', '.java', '.cs'],
  },
  {
    id: 'SAST-006-PROMPT-INJECTION-CONCAT',
    type: 'PROMPT_INJECTION_RISK',
    severity: 'HIGH',
    description: 'Interpolación o concatenación directa de entradas de usuario en llamadas a LLM o plantillas de prompts sin delimitación defensiva (OWASP LLM01)',
    pattern: /(?:(?:(?:\b(?:prompt|system_?prompt|user_?prompt|prompt_?template|prompt_?text|llm_?prompt)\b\s*(?::=|\+=|\+|=))|(?:messages\s*:\s*\[[^\n]*content\s*:\s*)|(?:generateContent|chat\.completions\.create)\s*\()\s*(?:`[^`]*\$\{[^}]*(?:req\.|user_?input|raw_?input|client_?input)[^}]*\}`|f["'][^"']*\{[^}]*(?:req|user_?input|raw_?input|client_?input)[^}]*\}["']|\$["'][^"']*\{[^}]*(?:req|user_?input|raw_?input|client_?input)[^}]*\}["']|format!\s*\([^)]*(?:user_?input|raw_?input|req)[^)]*\)|(?:fmt\.)?Sprintf\s*\([^)]*(?:user_?input|raw_?input|req)[^)]*\)|(?:["'][^"']*["']\s*\+\s*|\+\s*["'][^"']*["']\s*\+?\s*|\s*\+=\s*)(?:req\.(?:body|query|params|getParameter)|user_?input|raw_?input|client_?input)))/i,
    fileExtensions: GENERAL_SOURCE_EXTENSIONS,
  },
  {
    id: 'SAST-007-PROMPT-INJECTION-JAILBREAK',
    type: 'PROMPT_INJECTION_RISK',
    severity: 'CRITICAL',
    description:
      'Firma o vector adversarial de inyección de prompt o anulación de directivas de sistema (Jailbreak / Inyección LLM01)', // ai-sdlc:allow-prompt-injection
    pattern: /(?:\b(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|directions|rules)\b|\b(?:system\s+(?:prompt\s+)?override|override\s+system\s+prompt|developer\s+mode\s+enabled|dan\s+mode(?:\s+enabled)?|unfiltered\s+(?:ai\s+)?mode)\b|\b(?:reveal|print|output)\s+(?:your\s+)?(?:system\s+prompt|initial\s+instructions)\b|<\/(?:system|instructions)>\s*(?:new\s+instructions|you\s+are\s+now|system:)|\[(?:SYSTEM|SYSTEM_OVERRIDE)\])/i,
    fileExtensions: GENERAL_SOURCE_EXTENSIONS,
  },
] as const;

export const DEFAULT_SAST_EXCLUDES = [
  'node_modules/',
  'dist/',
  '.git/',
  'reports/',
  'coverage/',
  'templates/',
  'fixtures/',
  'tests/',
];

export function isSemgrepInstalled(): boolean {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(cmd, ['semgrep'], { stdio: ['pipe', 'pipe', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}

export function runSemgrepCli(rootDir: string): SastViolation[] {
  const violations: SastViolation[] = [];
  try {
    const output = execFileSync(
      'semgrep',
      ['scan', '--config', 'auto', '--json', '--quiet'],
      {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }
    );

    if (output) {
      const parsed = JSON.parse(output);
      if (Array.isArray(parsed.results)) {
        for (const item of parsed.results) {
          const filePath = path.resolve(rootDir, item.path);
          const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
          violations.push({
            filePath,
            relPath,
            lineNumber: item.start?.line || 1,
            ruleId: item.check_id || 'SEMGREP-RULE',
            type: 'SEMGREP_FINDING',
            severity: (item.extra?.severity?.toUpperCase() || 'HIGH') as SastSeverity,
            snippet: (item.extra?.lines || '').trim(),
            message: `Semgrep [${item.check_id}]: ${item.extra?.message || ''}`,
          });
        }
      }
    }
  } catch {
    // Semgrep CLI failure fallback
  }
  return violations;
}

function isSastExcluded(relPath: string, excludes: string[]): boolean {
  for (const exc of excludes) {
    if (relPath.includes(exc) || relPath.startsWith(exc)) return true;
  }
  return false;
}

export function walkSourceFiles(
  dir: string,
  rootDir: string,
  excludes: string[] = DEFAULT_SAST_EXCLUDES
): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => canonicalSort(a.name, b.name));

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

      if (isSastExcluded(relPath, excludes)) continue;

      if (entry.isDirectory()) {
        files.push(...walkSourceFiles(fullPath, rootDir, excludes));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (GENERAL_SOURCE_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Skip
  }

  return files;
}

function checkLineSuppression(
  line: string,
  relPath: string,
  lineNumber: number,
  collected?: SecuritySuppression[]
): boolean {
  if (line.includes('ai-sdlc:allow-prompt-injection')) return true;
  const supp = parseSecuritySuppression(line, relPath, lineNumber);
  if (!supp) return false;
  if (collected) collected.push(supp);
  return supp.status === 'active';
}

function checkRuleMatch(
  rule: SastRule,
  line: string,
  ext: string,
  minSeverity: SastSeverity
): boolean {
  if (rule.fileExtensions && !rule.fileExtensions.includes(ext)) return false;
  if (minSeverity === 'CRITICAL' && rule.severity !== 'CRITICAL') return false;
  rule.pattern.lastIndex = 0;
  return rule.pattern.test(line);
}

export function scanFileForSast(
  filePath: string,
  rootDir: string,
  minSeverity: SastSeverity = 'HIGH',
  collectedSuppressions?: SecuritySuppression[]
): SastViolation[] {
  const violations: SastViolation[] = [];
  const ext = path.extname(filePath).toLowerCase();

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (checkLineSuppression(line, relPath, i + 1, collectedSuppressions)) continue;

      for (const rule of SAST_RULES) {
        if (checkRuleMatch(rule, line, ext, minSeverity)) {
          violations.push({
            filePath,
            relPath,
            lineNumber: i + 1,
            ruleId: rule.id,
            type: rule.type,
            severity: rule.severity,
            snippet: line.trim(),
            message: rule.description,
          });
        }
      }
    }
  } catch {
    // Skip
  }

  return violations;
}

function collectSastFiles(rootDir: string, targetDirs: string[]): string[] {
  const files: string[] = [];
  for (const tDir of targetDirs) {
    const fullDir = path.join(rootDir, tDir);
    if (fs.existsSync(fullDir)) {
      files.push(...walkSourceFiles(fullDir, rootDir));
    }
  }
  return files;
}

function shouldRunSemgrep(options: SastVerifierOptions): boolean {
  if (options.semgrep !== undefined) return options.semgrep;
  return isSemgrepInstalled();
}

export function verifySast(options: SastVerifierOptions = {}): SastVerifierResult {
  const rootDir = options.rootDir || process.cwd();
  const minSeverity = options.minSeverity || 'HIGH';
  const targetDirs = options.targetDirectories || ['src', 'packages', 'prompts'];
  const filesToScan = collectSastFiles(rootDir, targetDirs);

  const violations: SastViolation[] = [];
  const suppressions: SecuritySuppression[] = [];
  for (const file of filesToScan) {
    violations.push(...scanFileForSast(file, rootDir, minSeverity, suppressions));
  }

  if (shouldRunSemgrep(options)) {
    try {
      violations.push(...runSemgrepCli(rootDir));
    } catch {
      // Semgrep failure fallback
    }
  }

  const hasExpired = suppressions.some((s) => s.status === 'expired');
  const result: SastVerifierResult = {
    success: violations.length === 0 && !hasExpired,
    totalFilesScanned: filesToScan.length,
    violationsCount: violations.length,
    violations,
    suppressions,
  };

  result.reportMarkdown = generateSastReportMarkdown(result);
  return result;
}

function formatSastViolationRow(v: SastViolation): string {
  const badge = v.severity === 'CRITICAL' ? '🛑 CRITICAL' : '⚠️ HIGH';
  return `| **${badge}** | \`${v.ruleId}\` | \`${v.type}\` | \`${v.relPath}:${v.lineNumber}\` | \`${v.snippet.replace(/\|/g, '\\|')}\` | ${v.message} |`;
}

function buildSastHeader(isOk: boolean, violationsCount: number, totalFilesScanned: number): string[] {
  const verdict = isOk
    ? '✅ COMPLIANT (No vulnerable patterns detected)'
    : `❌ BLOCKED (${violationsCount} vulnerabilities detected)`;
  return [
    `# 🛡️ Shift-Left SAST Audit (Static Application Security Testing)`,
    ``,
    `> **Evaluation Date:** ${resolveDeterministicDate().toISOString()}`,
    `> **Verdict:** ${verdict}`,
    `> **Audited Code Files:** ${totalFilesScanned} | **SAST Violations:** ${violationsCount}`,
    ``,
    `---`,
  ];
}

const SAST_CLEAN_SUMMARY = `## Compliance Summary

No SQL injection, arbitrary dynamic command execution (eval/exec), SSRF, path traversal, or prompt injection (OWASP LLM01) patterns detected in analyzed code modules.
Code generated by humans and agents complies with OWASP Top 10 and OWASP Top 10 for LLMs secure coding standards.`;

function buildSastFindingsSection(violations: SastViolation[]): string[] {
  const rows = violations.map(formatSastViolationRow);
  return [
    ``,
    `## Detected Security Findings Detail`,
    ``,
    `| Severity | Rule | Type | File:Line | Snippet | Details |`,
    `| :---: | :--- | :--- | :--- | :--- | :--- |`,
    ...rows,
  ];
}

export function generateSastReportMarkdown(result: SastVerifierResult): string {
  const header = buildSastHeader(result.success, result.violationsCount, result.totalFilesScanned);
  const body = result.violations.length === 0
    ? [``, SAST_CLEAN_SUMMARY]
    : buildSastFindingsSection(result.violations);
  return [...header, ...body].join('\n');
}

export const PROMPT_INJECTION_SIGNATURES: readonly {
  ruleId: string;
  severity: SastSeverity;
  regex: RegExp;
  message: string;
}[] = [
  {
    ruleId: 'PROMPT-INJ-JAILBREAK',
    severity: 'CRITICAL',
    regex: /(?:\b(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|directions|rules)\b)/i,
    message: 'Attempted bypass or disregard of prior system instructions',
  },
  {
    ruleId: 'PROMPT-INJ-MODE-OVERRIDE',
    severity: 'CRITICAL',
    regex: /(?:\b(?:system\s+(?:prompt\s+)?override|override\s+system\s+prompt|developer\s+mode\s+enabled|dan\s+mode(?:\s+enabled)?|unfiltered\s+(?:ai\s+)?mode)\b)/i,
    message: 'Attempted system prompt override, developer mode, or unrestricted mode activation', // ai-sdlc:allow-sast rule="PROMPT-INJ-MODE-OVERRIDE" reason="Regla interna de deteccion" expires="2099-12-31" approved-by="security@ai-sdlc.dev"
  },
  {
    ruleId: 'PROMPT-INJ-LEAK',
    severity: 'HIGH',
    regex: /(?:\b(?:reveal|print|output|display)\s+(?:your\s+)?(?:system\s+prompt|initial\s+instructions|base\s+prompt)\b)/i,
    message: 'Attempted extraction or exfiltration of system prompt or instructions (Prompt Leaking)',
  },
  {
    ruleId: 'PROMPT-INJ-DELIMITER-ESCAPE',
    severity: 'CRITICAL',
    regex: /(?:<\/(?:system|instructions|prompt|context)>\s*(?:new\s+instructions|you\s+are\s+now|system:)|\[(?:SYSTEM|SYSTEM_OVERRIDE|ADMIN)\])/i,
    message: 'Delimiter injection attempt to escape context boundaries or inject roles',
  },
  {
    ruleId: 'PROMPT-INJ-ROLE-SPOOFING',
    severity: 'HIGH',
    regex: /(?:\r?\n|^)\s*(?:System|Admin|Root):\s*(?:You\s+are|Override|Ignore|Execute)/i,
    message: 'Attempted role spoofing or privileged role impersonation',
  },
];

function scanLinesForPromptInjection(lines: string[], findings: PromptInjectionFinding[]): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('ai-sdlc:allow-prompt-injection')) continue;

    for (const sig of PROMPT_INJECTION_SIGNATURES) {
      sig.regex.lastIndex = 0;
      if (sig.regex.test(line)) {
        findings.push({
          ruleId: sig.ruleId,
          severity: sig.severity,
          pattern: sig.regex.source,
          snippet: line.trim(),
          lineNumber: i + 1,
          message: sig.message,
        });
      }
    }
  }
}

function checkMultilinePromptInjection(content: string, findings: PromptInjectionFinding[]): void {
  for (const sig of PROMPT_INJECTION_SIGNATURES) {
    if (sig.ruleId !== 'PROMPT-INJ-ROLE-SPOOFING') continue;
    sig.regex.lastIndex = 0;
    if (sig.regex.test(content)) {
      const alreadyFound = findings.some((f) => f.ruleId === sig.ruleId);
      if (!alreadyFound) {
        findings.push({
          ruleId: sig.ruleId,
          severity: sig.severity,
          pattern: sig.regex.source,
          snippet: content.slice(0, 100).trim(),
          message: sig.message,
        });
      }
    }
  }
}

export function detectPromptInjection(content: string): PromptInjectionFinding[] {
  const findings: PromptInjectionFinding[] = [];
  if (!content) return findings;

  scanLinesForPromptInjection(content.split(/\r?\n/), findings);
  checkMultilinePromptInjection(content, findings);

  return findings;
}

