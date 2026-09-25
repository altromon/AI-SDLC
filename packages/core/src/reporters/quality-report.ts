/**
 * AI-SDLC: Automated Formal Quality Report Generator (Polyglot)
 */

import * as fs from 'fs';
import * as path from 'path';
import { QualityReportOptions, QualityReportResult } from '../types/index.js';
import { verifyQualityGate } from '../verifiers/quality-gate.js';

export function calculateRating(mi: number, cc: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (mi >= 75 && cc <= 5) return 'A';
  if (mi >= 60 && cc <= 10) return 'B';
  if (mi >= 50 && cc <= 15) return 'C';
  if (mi >= 40 && cc <= 20) return 'D';
  return 'F';
}

export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.ts':
      return 'TypeScript';
    case '.js':
      return 'JavaScript';
    case '.py':
      return 'Python';
    case '.java':
      return 'Java';
    case '.go':
      return 'Go';
    case '.cs':
      return 'C#';
    case '.rs':
      return 'Rust';
    case '.cpp':
    case '.c':
      return 'C/C++';
    default:
      return 'Unknown';
  }
}

export function generateQualityReport(options: QualityReportOptions = {}): QualityReportResult {
  const rootDir = options.rootDir || process.cwd();
  const gateResult = verifyQualityGate({
    rootDir,
    policyPath: options.policyPath,
    thresholds: options.thresholds,
  });

  const totalFiles = gateResult.totalFiles;
  const totalFunctions = gateResult.totalFunctions;

  let totalMi = 0;
  let totalCc = 0;
  let totalCognitive = 0;
  let totalLoc = 0;

  const langMap = new Map<string, { fns: number; loc: number; miSum: number; ccSum: number }>();
  const violationsList: string[] = [];

  for (const fn of gateResult.results) {
    totalMi += fn.maintainability;
    totalCc += fn.cyclomatic;
    totalCognitive += fn.cognitive;
    totalLoc += fn.loc;

    const lang = detectLanguage(fn.filePath);
    const existing = langMap.get(lang) || { fns: 0, loc: 0, miSum: 0, ccSum: 0 };
    existing.fns++;
    existing.loc += fn.loc;
    existing.miSum += fn.maintainability;
    existing.ccSum += fn.cyclomatic;
    langMap.set(lang, existing);

    if (fn.violations.length > 0) {
      violationsList.push(`- **\`${fn.relPath}\`** [\`${fn.functionName}\`]: ${fn.violations.join(', ')}`);
    }
  }

  const avgMaintainability = totalFunctions > 0 ? Math.round((totalMi / totalFunctions) * 10) / 10 : 100;
  const avgCyclomatic = totalFunctions > 0 ? Math.round((totalCc / totalFunctions) * 10) / 10 : 1;
  const avgCognitive = totalFunctions > 0 ? Math.round((totalCognitive / totalFunctions) * 10) / 10 : 0;
  const globalRating = calculateRating(avgMaintainability, avgCyclomatic);
  const verdict = gateResult.success ? 'PASS' : 'FAIL';

  const lines: string[] = [
    `# 📊 Formal Quality and Release Gate Report (AI-SDLC)`,
    ``,
    `> **Generation Date:** ${new Date().toISOString()}`,
    `> **Release Gate Verdict:** ${verdict === 'PASS' ? '🟢 APPROVED (RELEASE READY)' : '🔴 BLOCKED (VIOLATIONS DETECTED)'}`,
    `> **Global Rating:** **\`${globalRating}\`** (MI Index: ${avgMaintainability}/100, Average CC: ${avgCyclomatic})`,
    ``,
    `---`,
    ``,
    `## 1. Executive Metric Summary`,
    ``,
    `| Key Metric | Measured Value | Policy Threshold | Compliance |`,
    `| :--- | :---: | :---: | :---: |`,
    `| **Analyzed Files** | \`${totalFiles}\` | N/A | ℹ️ |`,
    `| **Evaluated Functions** | \`${totalFunctions}\` | N/A | ℹ️ |`,
    `| **Lines of Code (LOC)** | \`${totalLoc}\` | N/A | ℹ️ |`,
    `| **Cyclomatic Complexity (Average)** | \`${avgCyclomatic}\` | $\\le ${gateResult.policy.max_cyclomatic}$ | ${avgCyclomatic <= gateResult.policy.max_cyclomatic ? '✅ COMPLIANT' : '❌ EXCEEDED'} |`,
    `| **Cognitive Complexity (Average)** | \`${avgCognitive}\` | $\\le ${gateResult.policy.max_cognitive}$ | ${avgCognitive <= gateResult.policy.max_cognitive ? '✅ COMPLIANT' : '❌ EXCEEDED'} |`,
    `| **Maintainability Index (SEI MI)** | \`${avgMaintainability} / 100\` | $\\ge ${gateResult.policy.min_maintainability}$ | ${avgMaintainability >= gateResult.policy.min_maintainability ? '✅ COMPLIANT' : '❌ INSUFFICIENT'} |`,
    `| **Functions in Violation** | \`${gateResult.failCount}\` | $0$ (Mode ${gateResult.policy.enforce_mode}) | ${gateResult.failCount === 0 ? '✅ 0 VIOLATIONS' : '❌ BLOCKED'} |`,
    ``,
    `---`,
    ``,
    `## 2. Polyglot Breakdown by Language Ecosystem`,
    ``,
    `| Language | Functions | Total LOC | Average MI | Average CC | Rating |`,
    `| :--- | :---: | :---: | :---: | :---: | :---: |`,
  ];

  for (const [lang, stats] of langMap.entries()) {
    const langMi = Math.round((stats.miSum / stats.fns) * 10) / 10;
    const langCc = Math.round((stats.ccSum / stats.fns) * 10) / 10;
    const rating = calculateRating(langMi, langCc);
    lines.push(
      `| **${lang}** | \`${stats.fns}\` | \`${stats.loc}\` | \`${langMi}\` | \`${langCc}\` | \`${rating}\` |`
    );
  }

  if (violationsList.length > 0) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 3. Quality Gate Violations Log');
    lines.push('');
    lines.push(...violationsList);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 4. Evaluation Criteria and Standards');
  lines.push('- **McCabe Cyclomatic Complexity (CC)**: Number of linearly independent paths.');
  lines.push('- **Maintainability Index (SEI MI)**: Normalized formula [0 - 100] combining Halstead Volume, CC, and LOC.');
  lines.push('- **Clean Code Guardrails**: Prohibition of implicit `any` typing, function length limits ($\le 40$ lines), and zero unjustified suppressions.');

  const markdown = lines.join('\n');

  // Optionally write to reports/QUALITY_REPORT.md
  const reportsDir = path.join(rootDir, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, 'QUALITY_REPORT.md'), markdown, 'utf-8');

  return {
    markdown,
    totalFiles,
    totalFunctions,
    avgMaintainability,
    avgCyclomatic,
    verdict,
  };
}
