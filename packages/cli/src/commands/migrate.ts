/**
 * CLI Command: aisdlc migrate
 * Synchronizes schemas, templates, and policies with upstream canonical versions.
 * Cites: CMP-053-MIGRATE-ENGINE, FR-053-CLI-MIGRATE-001
 */

import * as path from 'path';
import pc from 'picocolors';
import {
  MigrationService,
  MigrationReporter,
  type MigrationOptions,
  type MigrationResult,
} from '@aisdlc/core';

export interface CliMigrateOptions {
  root?: string;
  dryRun?: boolean;
  backup?: boolean;
  force?: boolean;
  allowPolicyDowngrade?: boolean;
  json?: boolean;
  verbose?: boolean;
  branch?: string;
}

function printConsoleSummary(result: MigrationResult, reporter: MigrationReporter): void {
  console.log(reporter.formatTerminal(result));
  if (result.exitCode === 0) {
    console.log(pc.green('\nMigration completed successfully.'));
  } else if (result.exitCode === 1) {
    console.log(pc.yellow('\nMigration finished with local overrides preserved. Use --force to overwrite.'));
  } else {
    console.error(pc.red('\nMigration encountered errors or conflicts.'));
  }
}

export async function runMigrate(options: CliMigrateOptions): Promise<number> {
  const root = path.resolve(options.root || process.cwd());
  const service = new MigrationService();
  const reporter = new MigrationReporter();

  const migrationOptions: MigrationOptions = {
    root,
    dryRun: Boolean(options.dryRun),
    backup: options.backup ?? true,
    force: Boolean(options.force),
    allowPolicyDowngrade: Boolean(options.allowPolicyDowngrade),
    json: Boolean(options.json),
    verbose: Boolean(options.verbose),
    branch: options.branch,
  };

  const result = await service.migrate(migrationOptions);

  if (options.json) {
    console.log(reporter.formatJson(result));
  } else {
    printConsoleSummary(result, reporter);
  }

  return result.exitCode;
}
