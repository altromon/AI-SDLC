/**
 * CLI Handler: aisdlc search
 * Semantic specification search across UC-*, FR-*, SEC-REQ-*, PRIV-REQ-*, BR-*, CMP-*, ADR-*.
 */

import {
  formatSemanticSearchMarkdown,
  searchSpecifications,
  type SemanticSearchResult,
} from '@aisdlc/core';
import { isJsonOutput } from './verify.js';

export interface SearchCliOptions {
  root?: string;
  limit?: number | string;
  minScore?: number | string;
  type?: string | string[];
  json?: boolean;
  format?: string;
}

export function parseSearchTypes(raw?: string | string[]): string[] | undefined {
  if (!raw) return undefined;
  const list = Array.isArray(raw) ? raw : [raw];
  const parsed = list.flatMap((item) => item.split(',').map((s) => s.trim()).filter(Boolean));
  return parsed.length > 0 ? parsed : undefined;
}

function parseFiniteOpt(val: number | string | undefined, fallback: number): number {
  if (val === undefined || (typeof val === 'string' && !val.trim())) return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

export function runSearch(query: string, options: SearchCliOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const limit = parseFiniteOpt(options.limit, 5);
  const minScore = parseFiniteOpt(options.minScore, 0.12);
  const types = parseSearchTypes(options.type);

  const result: SemanticSearchResult = searchSpecifications(query || '', {
    rootDir,
    limit,
    minScore,
    types,
  });

  if (isJsonOutput(options)) {
    console.log(JSON.stringify(result, null, 2));
    return true;
  }

  console.log(formatSemanticSearchMarkdown(result));
  return true;
}
