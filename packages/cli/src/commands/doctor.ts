/**
 * AI-SDLC CLI: Doctor Command (FR-052-CLI-DOCTOR-001)
 */

import { DoctorService, DoctorReporter, DoctorOptions, DoctorReport } from '@aisdlc/core';

export interface DoctorCommandOptions {
  rootDir?: string;
  json?: boolean;
  fix?: boolean;
  strict?: boolean;
  offline?: boolean;
  timeout?: number;
}

function printReport(report: DoctorReport, reporter: DoctorReporter, asJson: boolean): void {
  if (asJson) {
    console.log(reporter.formatJson(report));
    return;
  }
  const formatted = reporter.formatTerminal(report);
  if (report.exitCode === 2) {
    console.error(formatted);
  } else {
    console.log(formatted);
  }
}

export async function runDoctor(opts: DoctorCommandOptions = {}): Promise<number> {
  const doctorOpts: DoctorOptions = {
    rootDir: opts.rootDir || process.cwd(),
    json: opts.json,
    fix: opts.fix,
    strict: opts.strict,
    offline: opts.offline || process.env.AI_SDLC_OFFLINE === '1',
    timeout: opts.timeout,
  };

  const service = new DoctorService();
  const reporter = new DoctorReporter();
  const report = await service.diagnose(doctorOpts);

  printReport(report, reporter, Boolean(opts.json));
  return report.exitCode;
}
