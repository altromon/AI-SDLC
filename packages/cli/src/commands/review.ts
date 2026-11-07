/**
 * CLI Handler: aisdlc review
 * Reviewer Report Submission (sanctioned write channel for reviewer and auditor agents)
 */

import pc from 'picocolors';
import { submitReviewReport, ReviewReportResult } from '@aisdlc/core';

export interface ReviewSubmitCliOptions {
  root?: string;
  change: string;
  reviewer: string;
  verdict: string;
  body: string;
  silent?: boolean;
  json?: boolean;
}

function printJsonResult(options: ReviewSubmitCliOptions, result: ReviewReportResult): void {
  console.log(
    JSON.stringify(
      {
        command: 'review:submit',
        success: result.success,
        change: options.change,
        reviewer: options.reviewer,
        verdict: result.verdict,
        reportPath: result.reportPath,
        digest: result.digest,
        error: result.error,
      },
      null,
      2
    )
  );
}

function printTextResult(result: ReviewReportResult): void {
  if (result.success) {
    console.log(`  ${pc.green('✔')} Review report persisted: ${pc.bold(result.reportPath || '')}`);
    console.log(`    Verdict: ${pc.cyan(result.verdict || '')} | Digest: ${pc.dim(result.digest || '')}`);
  } else {
    console.error(`  ${pc.red('✖')} Review submission rejected: ${result.error || 'Unknown error'}`);
  }
}

export function runReviewSubmit(options: ReviewSubmitCliOptions): boolean {
  const result = submitReviewReport({
    rootDir: options.root,
    changeId: options.change,
    reviewer: options.reviewer,
    verdict: options.verdict,
    body: options.body,
  });

  if (options.json) {
    printJsonResult(options, result);
    return result.success;
  }

  if (!options.silent) {
    printTextResult(result);
  }

  return result.success;
}
