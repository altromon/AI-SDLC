/**
 * @aisdlc/core — TaskContextPacker (FR-065-TASK-CONTEXT-PACKER-001)
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { assertConfinedPath, redactSensitiveText } from './cache/fs-code-graph-cache.js';
import { DefaultCodeGraphService, validateDepth } from './code-graph-service.js';
import {
  CODE_GRAPH_LIMITS,
  type CodeGraphService,
  type SpecSummary,
  type TaskContextPacker,
  type TaskContextPayload,
} from './types.js';

const TASK_ID_REGEX = /^TSK-[A-Z0-9-]+$/;
const SPEC_ID_REGEX = /^[A-Z]+(?:-[A-Z0-9]+)+$/;

const CANONICAL_SPEC_DIRS = [
  'specs/changes',
  'specs/product/requirements',
  'product/requirements',
  'specs/architecture/components',
  'architecture/components',
  'specs/architecture/decisions',
  'architecture/decisions',
  'specs/security/requirements',
  'security/requirements',
  'specs/privacy/requirements',
  'privacy/requirements',
];

export function collectMarkdownFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectMarkdownFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(full);
  }
}

export function parseFrontmatter(content: string): { data: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  try {
    const parsed = yaml.load(match[1]);
    return { data: parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}, body: match[2] };
  } catch {
    return { data: {}, body: content };
  }
}

export function extractBodySummary(body: string, repoRoot: string): string {
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('---') || line.startsWith('|')) continue;
    return redactSensitiveText(line, repoRoot).slice(0, CODE_GRAPH_LIMITS.MAX_SIGNATURE_CHARS);
  }
  return '';
}

export function extractCitedIds(taskObj: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  for (const field of ['implements-components', 'satisfies-requirements', 'depends-on']) {
    const list = taskObj[field];
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item === 'string' && SPEC_ID_REGEX.test(item)) ids.add(item);
    }
  }
  return [...ids];
}

export function findTaskSectionLines(body: string, taskId: string): string[] {
  const lines = body.split(/\r?\n/);
  const startIdx = lines.findIndex((l) => l.trim().startsWith(`### \`${taskId}\``));
  if (startIdx < 0) return [];
  const nextIdx = lines.findIndex((l, i) => i > startIdx && l.trim().startsWith('### '));
  return lines.slice(startIdx + 1, nextIdx < 0 ? undefined : nextIdx);
}

export function parseFileTouchedLine(line: string, repoRoot: string): string | null {
  const match = line.match(/^-\s+`([^`]+)`/);
  if (!match?.[1]) return null;
  try {
    assertConfinedPath(repoRoot, match[1]);
    return match[1].replace(/\\/g, '/');
  } catch {
    return null;
  }
}

export function extractFilesTouched(body: string, taskId: string, repoRoot: string): string[] {
  const sectionLines = findTaskSectionLines(body, taskId);
  const startIdx = sectionLines.findIndex((l) => l.trim().startsWith('- **files-touched**:'));
  if (startIdx < 0) return [];
  const files: string[] = [];
  for (const raw of sectionLines.slice(startIdx + 1)) {
    const line = raw.trim();
    if (line.startsWith('- **') || line.startsWith('##')) break;
    const parsed = parseFileTouchedLine(line, repoRoot);
    if (parsed) files.push(parsed);
  }
  return files;
}

export function findTaskRecord(repoRoot: string, taskId: string): { taskObj: Record<string, unknown>; body: string } | null {
  const changesDir = assertConfinedPath(repoRoot, 'specs/changes');
  const mdFiles: string[] = [];
  collectMarkdownFiles(changesDir, mdFiles);
  for (const file of mdFiles) {
    if (!file.endsWith('tasks.md')) continue;
    const { data, body } = parseFrontmatter(fs.readFileSync(file, 'utf-8'));
    if (!Array.isArray(data.tasks)) continue;
    const hit = data.tasks.find((t) => t && typeof t === 'object' && (t as Record<string, unknown>).id === taskId);
    if (hit) return { taskObj: hit as Record<string, unknown>, body };
  }
  return null;
}

export function indexSpecsInDir(repoRoot: string, relDir: string, index: Map<string, SpecSummary>): void {
  let confinedDir: string;
  try {
    confinedDir = assertConfinedPath(repoRoot, relDir);
  } catch {
    return;
  }
  const files: string[] = [];
  collectMarkdownFiles(confinedDir, files);
  for (const file of files) {
    const { data, body } = parseFrontmatter(fs.readFileSync(file, 'utf-8'));
    const id = typeof data.id === 'string' ? data.id : '';
    if (!id || !SPEC_ID_REGEX.test(id) || index.has(id)) continue;
    index.set(id, {
      id,
      type: typeof data.type === 'string' ? data.type : 'unknown',
      title: redactSensitiveText(typeof data.title === 'string' ? data.title : id, repoRoot),
      status: typeof data.status === 'string' ? data.status : 'unknown',
      summary: extractBodySummary(body, repoRoot),
    });
  }
}

export function buildSpecIndex(repoRoot: string): Map<string, SpecSummary> {
  const index = new Map<string, SpecSummary>();
  for (const relDir of CANONICAL_SPEC_DIRS) indexSpecsInDir(repoRoot, relDir, index);
  return index;
}

export function resolveCitedSpecs(citedIds: readonly string[], specIndex: Map<string, SpecSummary>) {
  const specs: SpecSummary[] = [];
  const missingRefs: string[] = [];
  for (const id of citedIds) {
    const spec = specIndex.get(id);
    if (spec) specs.push(spec);
    else missingRefs.push(id);
  }
  return { specs, missingRefs };
}

export class DefaultTaskContextPacker implements TaskContextPacker {
  private readonly graphService: CodeGraphService;

  constructor(graphService?: CodeGraphService) {
    this.graphService = graphService ?? new DefaultCodeGraphService();
  }

  async pack(repoRoot: string, taskId: string, depth: number = CODE_GRAPH_LIMITS.DEFAULT_DEPTH): Promise<TaskContextPayload> {
    const validDepth = validateDepth(depth);
    if (!TASK_ID_REGEX.test(taskId)) {
      throw new Error(`ERR_INVALID_TASK_ID: Task ID '${taskId}' does not match ^TSK-[A-Z0-9-]+$.`);
    }
    const found = findTaskRecord(repoRoot, taskId);
    if (!found) {
      throw new Error(`ERR_TASK_NOT_FOUND: Task '${taskId}' was not found in specs/changes.`);
    }
    const { specs, missingRefs } = resolveCitedSpecs(extractCitedIds(found.taskObj), buildSpecIndex(repoRoot));
    const filesTouched = extractFilesTouched(found.body, taskId, repoRoot);
    const codeSubgraph = filesTouched.length > 0 ? await this.graphService.queryMultiple(repoRoot, filesTouched, validDepth) : null;
    return { taskId, depth: validDepth, specs, missingRefs, codeSubgraph };
  }
}
