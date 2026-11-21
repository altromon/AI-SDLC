import { describe, expect, it } from 'vitest';
import { MigrationReporter } from '../src/migrate/reporter.js';
import type { MigrationResult } from '../src/types/migrate.js';

describe('MigrationReporter (Happy / Sad / Boundary / Malformed)', () => {
  const reporter = new MigrationReporter();

  it('formatTerminal: formats successful migration with backupPath and details (happy)', () => {
    const result: MigrationResult = {
      success: true,
      exitCode: 0,
      backupPath: '.aisdlc-backup/2026-01-01',
      summary: {
        upToDate: 4,
        cleanUpdated: 2,
        overridesPreserved: 1,
        conflicts: 0,
      },
      details: [
        { file: 'policies/quality-policy.yaml', status: 'clean_updated', message: 'Updated schema' },
        { file: 'AGENTS.md', status: 'up_to_date' },
      ],
    };

    const output = reporter.formatTerminal(result);
    expect(output).toContain('=== AI-SDLC Migration Report ===');
    expect(output).toContain('Status: SUCCESS (Exit Code: 0)');
    expect(output).toContain('Up to date: 4');
    expect(output).toContain('Clean updated: 2');
    expect(output).toContain('Local overrides preserved: 1');
    expect(output).toContain('Conflicts: 0');
    expect(output).toContain('Backup Location: .aisdlc-backup/2026-01-01');
    expect(output).toContain('[clean_updated] policies/quality-policy.yaml - Updated schema');
    expect(output).toContain('[up_to_date] AGENTS.md');
    expect(output).not.toContain('[up_to_date] AGENTS.md -');
  });

  it('formatTerminal: formats failed migration without backupPath and with empty details (sad/boundary)', () => {
    const result: MigrationResult = {
      success: false,
      exitCode: 1,
      summary: {
        upToDate: 0,
        cleanUpdated: 0,
        overridesPreserved: 0,
        conflicts: 2,
      },
      details: [],
    };

    const output = reporter.formatTerminal(result);
    expect(output).toContain('Status: FAILED (Exit Code: 1)');
    expect(output).toContain('Conflicts: 2');
    expect(output).not.toContain('Backup Location:');
    expect(output).not.toContain('Details:');
  });

  it('formatJson: serializes valid MigrationResult and throws on circular malformed input (happy/malformed)', () => {
    const result: MigrationResult = {
      success: true,
      exitCode: 0,
      summary: { upToDate: 1, cleanUpdated: 0, overridesPreserved: 0, conflicts: 0 },
      details: [],
    };

    expect(JSON.parse(reporter.formatJson(result))).toEqual(result);

    const circular: Record<string, unknown> = { ...result };
    circular.self = circular;
    expect(() => reporter.formatJson(circular as unknown as MigrationResult)).toThrow();
  });
});
