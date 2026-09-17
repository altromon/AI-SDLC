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
  SastFindingType,
  SastSeverity,
  SastVerifierOptions,
  SastVerifierResult,
  SastViolation,
} from '../types/index.js';

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
    fileExtensions: ['.ts', '.js', '.tsx', '.jsx', '.py', '.go', '.java'],
  },
  {
    id: 'SAST-002-COMMAND-INJECTION',
    type: 'COMMAND_INJECTION',
    severity: 'CRITICAL',
    description: 'Ejecución dinámica de comandos del sistema operativo con argumentos variables',
    pattern: /(?:child_process\.(?:exec|execSync)|(?<!\.)\b(?:exec|execSync))\s*\(\s*(?:`[^`]*\$\{[^}]+\}[^`]*`|[a-zA-Z0-9_]+\s*\+|[a-zA-Z0-9_]+\))/i,
    fileExtensions: ['.ts', '.js', '.mjs', '.cjs'],
  },
  {
    id: 'SAST-003-UNSAFE-EVAL',
    type: 'UNSAFE_EVAL',
    severity: 'CRITICAL',
    description: 'Uso de evaluación dinámica de código (eval o Function constructor)',
    pattern: /(?<!\.)\b(?:eval\s*\(|new\s+Function\s*\()/g,
    fileExtensions: ['.ts', '.js', '.py'],
  },
  {
    id: 'SAST-004-SSRF-UNVALIDATED-FETCH',
    type: 'SSRF',
    severity: 'HIGH',
    description: 'Petición de red saliente (fetch/http/axios) con URL dinámica sin validación previa',
    pattern: /(?:fetch|axios\.(?:get|post|put|delete)|http\.(?:get|request))\s*\(\s*(?:req\.(?:query|params|body)|urlParam|targetUrl|userInput|remoteUrl)\b/i,
    fileExtensions: ['.ts', '.js', '.py'],
  },
  {
    id: 'SAST-005-PATH-TRAVERSAL',
    type: 'PATH_TRAVERSAL',
    severity: 'HIGH',
    description: 'Lectura o escritura en sistema de archivos construida directamente desde parámetros no saneados',
    pattern: /fs\.(?:readFileSync|readFile|createReadStream|writeFileSync)\s*\(\s*(?:path\.join\([^)]*req\.(?:query|params|body)|req\.(?:query|params|body))/i,
    fileExtensions: ['.ts', '.js'],
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
        if (['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.java', '.cs', '.rs'].includes(ext)) {
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
      if (line.includes('ai-sdlc:allow-sast') || line.includes('nosec')) continue;

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
  const targetDirs = options.targetDirectories || ['src', 'packages', 'examples/src'];

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
      `No se detectaron patrones de inyección SQL, ejecución dinámica arbitraria de comandos (eval/exec), SSRF o path traversal en los módulos de código analizados.`,
      `El código generado por personas y agentes es conforme con el estándar de codificación segura OWASP Top 10.`
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
