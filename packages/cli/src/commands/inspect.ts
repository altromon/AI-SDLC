/**
 * CLI Handler: aisdlc inspect
 * Deep inspection and navigation across requirements, architecture, code, and tests.
 */

import { inspectElement, formatInspectResultMarkdown } from '@aisdlc/core';

export interface InspectCliOptions {
  root?: string;
  json?: boolean;
  format?: string;
}

function isJsonOutput(options: InspectCliOptions = {}): boolean {
  if (options.json !== undefined) return Boolean(options.json);
  if (options.format !== undefined) return options.format.trim().toLowerCase() === 'json';
  const env =
    process.env.AISDLC_FORMAT?.trim().toLowerCase() ||
    process.env.AISDLC_OUTPUT?.trim().toLowerCase();
  return env === 'json';
}

export function runInspect(query: string, options: InspectCliOptions = {}): boolean {
  const root = options.root || process.cwd();
  const result = inspectElement(query, { rootDir: root });

  if (isJsonOutput(options)) {
    console.log(JSON.stringify(result, null, 2));
    return result.found;
  }

  const markdown = formatInspectResultMarkdown(result);
  console.log(markdown);
  return result.found;
}
