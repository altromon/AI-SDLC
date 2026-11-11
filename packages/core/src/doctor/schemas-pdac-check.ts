/**
 * AI-SDLC: Schemas and PDaC Health Check
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CategoryReport, DiagnosticFinding, DoctorOptions } from '../types/doctor.js';

function hasArtifacts(dirPath: string): boolean {
  return fs.existsSync(dirPath) && fs.readdirSync(dirPath).length > 0;
}

export class SchemasPdacHealthCheck {
  public async inspect(options: DoctorOptions): Promise<CategoryReport> {
    const findings: DiagnosticFinding[] = [];
    const rootDir = options.rootDir || process.cwd();

    const ok = hasArtifacts(path.join(rootDir, 'schemas')) && hasArtifacts(path.join(rootDir, 'specs'));
    if (!ok) {
      findings.push({
        id: 'ERR_SCHEMAS_DESYNCHRONIZED',
        category: 'schemas_pdac',
        status: 'fail',
        message: 'Project schemas or specs directories are missing, empty, or uninitialized.',
        remediation: 'Run "aisdlc init" or "aisdlc check --fix" to generate canonical schemas and PDaC specifications.',
      });
    }

    return {
      category: 'schemas_pdac',
      title: 'Schemas & Product Definition as Code (PDaC) Consistency',
      status: findings.length > 0 ? 'fail' : 'pass',
      findings,
    };
  }
}
