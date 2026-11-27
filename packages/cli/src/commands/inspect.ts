/**
 * CLI Handler: aisdlc inspect
 * Deep inspection and navigation across requirements, architecture, code, and tests.
 */

import { inspectElement, formatInspectResultMarkdown, type InspectResult } from '@aisdlc/core';
import { isJsonOutput } from './verify.js';

export interface InspectCliOptions {
  root?: string;
  json?: boolean;
  format?: string;
}

export async function runInspect(query: string, options: InspectCliOptions = {}): Promise<boolean> {
  const root = options.root || process.cwd();
  const trimmed = query ? query.trim() : '';
  const result: InspectResult = trimmed
    ? await inspectElement(trimmed, { rootDir: root })
    : {
        found: false,
        query: '',
        summary: 'No se encontró ningún elemento o archivo coincidente con "". Revisa el identificador o la ruta relativa.',
        upstream: [],
        downstream: [],
        relatedItems: [],
      };

  if (isJsonOutput(options)) {
    console.log(JSON.stringify(result, null, 2));
    return result.found;
  }

  const markdown = formatInspectResultMarkdown(result);
  console.log(markdown);
  return result.found;
}
