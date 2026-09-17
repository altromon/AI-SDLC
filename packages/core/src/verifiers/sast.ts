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
import * as fs from 'fs';
import * as path from 'path';
import {
  PromptInjectionFinding,
  SastFindingType,
  SastSeverity,
  SastVerifierOptions,
  SastVerifierResult,
  SastViolation,
} from '../types/index.js';

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

export function walkSourceFiles(
  dir: string,
  rootDir: string,
  excludes: string[] = DEFAULT_SAST_EXCLUDES
): string[] {
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

      let isExcluded = false;
      for (const exc of excludes) {
        if (relPath.includes(exc) || relPath.startsWith(exc)) {
          isExcluded = true;
          break;
        }
      }
      if (isExcluded) continue;

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

export function scanFileForSast(
  filePath: string,
  rootDir: string,
  minSeverity: SastSeverity = 'HIGH'
): SastViolation[] {
  const violations: SastViolation[] = [];
  const ext = path.extname(filePath).toLowerCase();

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (
        line.includes('ai-sdlc:allow-sast') ||
        line.includes('ai-sdlc:allow-prompt-injection') ||
        line.includes('nosec')
      )
        continue;

      for (const rule of SAST_RULES) {
        if (rule.fileExtensions && !rule.fileExtensions.includes(ext)) continue;

        if (minSeverity === 'CRITICAL' && rule.severity !== 'CRITICAL') continue;

        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(line)) {
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

export function verifySast(options: SastVerifierOptions = {}): SastVerifierResult {
  const rootDir = options.rootDir || process.cwd();
  const minSeverity = options.minSeverity || 'HIGH';
  const targetDirs = options.targetDirectories || ['src', 'packages', 'examples/src', 'prompts'];

  const filesToScan: string[] = [];
  for (const tDir of targetDirs) {
    const fullDir = path.join(rootDir, tDir);
    if (fs.existsSync(fullDir)) {
      filesToScan.push(...walkSourceFiles(fullDir, rootDir));
    }
  }

  const violations: SastViolation[] = [];
  for (const file of filesToScan) {
    violations.push(...scanFileForSast(file, rootDir, minSeverity));
  }

  // Delegate to Semgrep if requested or available
  if (options.semgrep || (options.semgrep === undefined && isSemgrepInstalled())) {
    try {
      const semgrepFindings = runSemgrepCli(rootDir);
      violations.push(...semgrepFindings);
    } catch {
      // Semgrep failure fallback
    }
  }

  const result: SastVerifierResult = {
    success: violations.length === 0,
    totalFilesScanned: filesToScan.length,
    violationsCount: violations.length,
    violations,
  };

  result.reportMarkdown = generateSastReportMarkdown(result);
  return result;
}

export function generateSastReportMarkdown(result: SastVerifierResult): string {
  const isOk = result.success;
  const lines: string[] = [
    `# 🛡️ Auditoría SAST Shift-Left (Análisis Estático de Seguridad)`,
    ``,
    `> **Fecha de Evaluación:** ${new Date().toISOString()}`,
    `> **Veredicto:** ${isOk ? '✅ CONFORME (Sin patrones vulnerables detectados)' : `❌ BLOQUEADO (${result.violationsCount} vulnerabilidades detectadas)`}`,
    `> **Archivos de Código Auditados:** ${result.totalFilesScanned} | **Infracciones SAST:** ${result.violationsCount}`,
    ``,
    `---`,
  ];

  if (result.violations.length === 0) {
    lines.push(
      ``,
      `## Resumen de Conformidad`,
      ``,
      `No se detectaron patrones de inyección SQL, ejecución dinámica arbitraria de comandos (eval/exec), SSRF, path traversal o prompt injection (OWASP LLM01) en los módulos de código analizados.`,
      `El código generado por personas y agentes es conforme con el estándar de codificación segura OWASP Top 10 y OWASP Top 10 for LLMs.`
    );
  } else {
    lines.push(
      ``,
      `## Detalle de Hallazgos de Seguridad Detectados`,
      ``,
      `| Severidad | Regla | Tipo | Archivo:Línea | Snippet | Detalle |`,
      `| :---: | :--- | :--- | :--- | :--- | :--- |`
    );

    for (const v of result.violations) {
      const badge = v.severity === 'CRITICAL' ? '🛑 CRITICAL' : '⚠️ HIGH';
      lines.push(
        `| **${badge}** | \`${v.ruleId}\` | \`${v.type}\` | \`${v.relPath}:${v.lineNumber}\` | \`${v.snippet.replace(/\|/g, '\\|')}\` | ${v.message} |`
      );
    }
  }

  return lines.join('\n');
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
    message: 'Intento de anulación o ignorado de instrucciones previas del sistema',
  },
  {
    ruleId: 'PROMPT-INJ-MODE-OVERRIDE',
    severity: 'CRITICAL',
    regex: /(?:\b(?:system\s+(?:prompt\s+)?override|override\s+system\s+prompt|developer\s+mode\s+enabled|dan\s+mode(?:\s+enabled)?|unfiltered\s+(?:ai\s+)?mode)\b)/i,
    message: 'Intento de forzar modo no restringido, modo desarrollador o sobrescritura de sistema',
  },
  {
    ruleId: 'PROMPT-INJ-LEAK',
    severity: 'HIGH',
    regex: /(?:\b(?:reveal|print|output|display)\s+(?:your\s+)?(?:system\s+prompt|initial\s+instructions|base\s+prompt)\b)/i,
    message: 'Intento de filtración o extracción de instrucciones de sistema (Prompt Leaking)',
  },
  {
    ruleId: 'PROMPT-INJ-DELIMITER-ESCAPE',
    severity: 'CRITICAL',
    regex: /(?:<\/(?:system|instructions|prompt|context)>\s*(?:new\s+instructions|you\s+are\s+now|system:)|\[(?:SYSTEM|SYSTEM_OVERRIDE|ADMIN)\])/i,
    message: 'Intento de ruptura de delimitadores estructurales de contexto o inyección de rol',
  },
  {
    ruleId: 'PROMPT-INJ-ROLE-SPOOFING',
    severity: 'HIGH',
    regex: /(?:\r?\n|^)\s*(?:System|Admin|Root):\s*(?:You\s+are|Override|Ignore|Execute)/i,
    message: 'Intento de suplantación de rol privilegiado (Role Spoofing)',
  },
];

export function detectPromptInjection(content: string): PromptInjectionFinding[] {
  const findings: PromptInjectionFinding[] = [];
  if (!content) return findings;

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('ai-sdlc:allow-prompt-injection') || line.includes('nosec')) continue;

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

  // Multiline checks
  for (const sig of PROMPT_INJECTION_SIGNATURES) {
    if (sig.ruleId === 'PROMPT-INJ-ROLE-SPOOFING') {
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

  return findings;
}

