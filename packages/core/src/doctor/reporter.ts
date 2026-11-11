/**
 * AI-SDLC: Doctor Reporters (Terminal and JSON Formatter)
 */

import { CategoryReport, DiagnosticFinding, DoctorReport, IDiagnosticsReporter } from '../types/doctor.js';

function formatFinding(f: DiagnosticFinding): string[] {
  const icon = f.status === 'pass' ? 'ℹ️' : f.status === 'warn' ? '⚠️' : '❌';
  const out = [`   ${icon} [${f.id}] ${f.message}`];
  if (f.remediation) {
    out.push(`      Remediation: ${f.remediation}`);
  }
  return out;
}

function formatCategory(cat: CategoryReport): string[] {
  const icon = cat.status === 'pass' ? '✅' : cat.status === 'warn' ? '⚠️' : '❌';
  const out: string[] = [`${icon} [${cat.category.toUpperCase()}] ${cat.title}`];

  if (cat.findings.length === 0) {
    out.push('   No issues detected.');
  } else {
    for (const f of cat.findings) {
      out.push(...formatFinding(f));
    }
  }
  out.push('');
  return out;
}

export class DoctorReporter implements IDiagnosticsReporter {
  public formatTerminal(report: DoctorReport): string {
    const icon = report.overallStatus === 'pass' ? '✅' : report.overallStatus === 'warn' ? '⚠️' : '❌';
    const lines: string[] = [
      '\n=== AI-SDLC Doctor Environment Diagnostics ===',
      `Timestamp: ${report.timestamp}`,
      `Overall Status: ${icon} ${report.overallStatus.toUpperCase()} (Exit Code: ${report.exitCode})\n`,
    ];

    for (const cat of report.categories) {
      lines.push(...formatCategory(cat));
    }

    if (report.remediations.length > 0) {
      lines.push('=== Suggested Remediations ===');
      for (const rem of report.remediations) {
        lines.push(`- ${rem}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  public formatJson(report: DoctorReport): string {
    return JSON.stringify(report, null, 2);
  }
}
