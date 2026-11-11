/**
 * AI-SDLC: Doctor Service and Orchestrator (CMP-052-DOCTOR-ENGINE)
 */

import {
  CategoryReport,
  DoctorOptions,
  DoctorReport,
  DoctorStatus,
  IDoctorService,
} from '../types/doctor.js';
import { GitHooksHealthCheck } from './git-hooks-check.js';
import { BranchSafetyCheck } from './branch-safety-check.js';
import { SchemasPdacHealthCheck } from './schemas-pdac-check.js';
import { ToolchainHealthCheck } from './toolchain-check.js';
import { SignatureReadinessCheck } from './signature-check.js';
import { sanitizeDlpPayload } from '../security/dlp-sanitizer.js';

export class DoctorOrchestrator {
  private hooksCheck = new GitHooksHealthCheck();
  private branchCheck = new BranchSafetyCheck();
  private schemasCheck = new SchemasPdacHealthCheck();
  private toolchainCheck = new ToolchainHealthCheck();
  private signatureCheck = new SignatureReadinessCheck();

  public async runAll(options: DoctorOptions): Promise<CategoryReport[]> {
    const categories: CategoryReport[] = [];

    categories.push(await this.hooksCheck.inspect(options));
    categories.push(await this.branchCheck.inspect(options));
    categories.push(await this.schemasCheck.inspect(options));
    categories.push(await this.toolchainCheck.inspect(options));
    categories.push(await this.signatureCheck.inspect(options));

    return categories;
  }
}

export class DoctorService implements IDoctorService {
  private orchestrator = new DoctorOrchestrator();

  public async diagnose(options: DoctorOptions): Promise<DoctorReport> {
    const categories = await this.runCategoryChecks(options);
    const remediations = this.collectRemediations(categories);

    let overallStatus: DoctorStatus = 'pass';
    let exitCode: 0 | 1 | 2 = 0;

    const hasFail = categories.some((c) => c.status === 'fail');
    const hasWarn = categories.some((c) => c.status === 'warn');

    if (hasFail) {
      overallStatus = 'fail';
      exitCode = 2;
    } else if (hasWarn) {
      overallStatus = 'warn';
      exitCode = options.strict ? 2 : 1;
    }

    const report: DoctorReport = {
      overallStatus,
      exitCode,
      timestamp: new Date().toISOString(),
      categories,
      remediations,
    };

    return sanitizeDlpPayload(report);
  }

  protected async runCategoryChecks(options: DoctorOptions): Promise<CategoryReport[]> {
    return this.orchestrator.runAll(options);
  }

  private collectRemediations(categories: CategoryReport[]): string[] {
    const rems = new Set<string>();
    for (const cat of categories) {
      for (const finding of cat.findings) {
        if (finding.remediation) {
          rems.add(finding.remediation);
        }
      }
    }
    return Array.from(rems);
  }
}
