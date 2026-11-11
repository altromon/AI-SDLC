/**
 * MigrationReporter: Terminal and JSON Formatting for Migration Reports
 * Cites: CMP-053-MIGRATE-ENGINE, FR-053-CLI-MIGRATE-001
 */

import type { IMigrationReporter, MigrationResult } from '../types/migrate.js';

export class MigrationReporter implements IMigrationReporter {
  public formatTerminal(result: MigrationResult): string {
    const lines: string[] = [];
    lines.push('=== AI-SDLC Migration Report ===');
    lines.push(`Status: ${result.success ? 'SUCCESS' : 'FAILED'} (Exit Code: ${result.exitCode})`);
    lines.push(`Summary:`);
    lines.push(`  - Up to date: ${result.summary.upToDate}`);
    lines.push(`  - Clean updated: ${result.summary.cleanUpdated}`);
    lines.push(`  - Local overrides preserved: ${result.summary.overridesPreserved}`);
    lines.push(`  - Conflicts: ${result.summary.conflicts}`);

    if (result.backupPath) {
      lines.push(`Backup Location: ${result.backupPath}`);
    }

    if (result.details.length > 0) {
      lines.push('\nDetails:');
      for (const item of result.details) {
        lines.push(`  [${item.status}] ${item.file}${item.message ? ` - ${item.message}` : ''}`);
      }
    }

    return lines.join('\n');
  }

  public formatJson(result: MigrationResult): string {
    return JSON.stringify(result, null, 2);
  }
}
