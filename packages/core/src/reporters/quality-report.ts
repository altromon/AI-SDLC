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
      return 'Desconocido';
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
    `# 📊 Informe Formal de Calidad y Release Gate (AI-SDLC)`,
    ``,
    `> **Fecha de Generación:** ${new Date().toISOString()}`,
    `> **Veredicto Release Gate:** ${verdict === 'PASS' ? '🟢 APROBADO (RELEASE READY)' : '🔴 BLOQUEADO (VIOLACIONES DETECTADAS)'}`,
    `> **Calificación Global:** **\`${globalRating}\`** (Índice MI: ${avgMaintainability}/100, CC Promedio: ${avgCyclomatic})`,
    ``,
    `---`,
    ``,
    `## 1. Resumen Ejecutivo de Métricas`,
    ``,
    `| Métrica Clave | Valor Medido | Umbral de Política | Cumplimiento |`,
    `| :--- | :---: | :---: | :---: |`,
    `| **Archivos Analizados** | \`${totalFiles}\` | N/A | ℹ️ |`,
    `| **Funciones Evaluadas** | \`${totalFunctions}\` | N/A | ℹ️ |`,
    `| **Líneas de Código (LOC)** | \`${totalLoc}\` | N/A | ℹ️ |`,
    `| **Complejidad Ciclomática (Promedio)** | \`${avgCyclomatic}\` | $\\le ${gateResult.policy.max_cyclomatic}$ | ${avgCyclomatic <= gateResult.policy.max_cyclomatic ? '✅ CONFORME' : '❌ EXCEDIDO'} |`,
    `| **Complejidad Cognitiva (Promedio)** | \`${avgCognitive}\` | $\\le ${gateResult.policy.max_cognitive}$ | ${avgCognitive <= gateResult.policy.max_cognitive ? '✅ CONFORME' : '❌ EXCEDIDO'} |`,
    `| **Índice de Mantenibilidad (SEI MI)** | \`${avgMaintainability} / 100\` | $\\ge ${gateResult.policy.min_maintainability}$ | ${avgMaintainability >= gateResult.policy.min_maintainability ? '✅ CONFORME' : '❌ INSUFICIENTE'} |`,
    `| **Funciones en Violación** | \`${gateResult.failCount}\` | $0$ (Modo ${gateResult.policy.enforce_mode}) | ${gateResult.failCount === 0 ? '✅ 0 VIOLACIONES' : '❌ BLOQUEADO'} |`,
    ``,
    `---`,
    ``,
    `## 2. Desglose Políglota por Ecosistema de Lenguaje`,
    ``,
    `| Lenguaje | Funciones | LOC Total | MI Promedio | CC Promedio | Calificación |`,
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
    lines.push('## 3. Registro de Infracciones del Quality Gate');
    lines.push('');
    lines.push(...violationsList);
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 4. Criterios de Evaluación y Estándares');
  lines.push('- **McCabe Cyclomatic Complexity (CC)**: Número de caminos linealmente independientes.');
  lines.push('- **Maintainability Index (SEI MI)**: Fórmula normalizada [0 - 100] combinando Halstead Volume, CC y LOC.');
  lines.push('- **Clean Code Guardrails**: Prohibición de tipado `any` implícito, límites de extensión por función ($\le 40$ líneas) y cero supresiones no justificadas.');

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
