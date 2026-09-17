#!/usr/bin/env node
/**
 * AI-SDLC: CI Helper Script for Pull Request KPI Summary Aggregation
 */

import * as fs from 'fs';
import { aggregatePrKpis, formatPrKpiMarkdown } from '../packages/core/src/index.js';

function run(): void {
  const baseBranch = process.env.PR_BASE_REF || process.env.GITHUB_BASE_REF || 'main';
  const headBranch = process.env.PR_HEAD_REF || 'HEAD';

  console.log(`[AI-SDLC] Agregando KPIs para Pull Request: ${baseBranch}..${headBranch}`);
  const kpi = aggregatePrKpis(baseBranch, headBranch);
  const markdown = formatPrKpiMarkdown(kpi);

  console.log(markdown);

  // If in GitHub Actions, append to GITHUB_STEP_SUMMARY
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n\n${markdown}\n`);
  }

  // If GITHUB_OUTPUT is set, write output parameters
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `total_commits=${kpi.totalCommits}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `total_tokens=${kpi.totalTokens}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `estimated_cost_usd=${kpi.estimatedCostUsd}\n`);
  }
}

run();
