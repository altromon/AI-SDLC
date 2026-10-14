/**
 * AI-SDLC: Git Commit Trailers Parser and Extraction Engine
 */

import { execFileSync } from 'child_process';

export interface CommitTrailers {
  taskId?: string;
  parentRef?: string;
  authorType: 'human' | 'agent';
  aiModel?: string;
  promptTokens: number;
  completionTokens: number;
  activeTimeSeconds: number;
}

export interface CommitKpiRecord {
  sha: string;
  authorName: string;
  authorEmail: string;
  date: string;
  subject: string;
  trailers: CommitTrailers;
  linesAdded: number;
  linesDeleted: number;
  isBugFix: boolean;
}

const TRAILER_REGEXES = {
  taskId: /^\s*Task-ID:\s*(.+)$/im,
  parentRef: /^\s*Parent-Ref:\s*(.+)$/im,
  authorType: /^\s*Author-Type:\s*(human|agent)/im,
  aiModel: /^\s*AI-Model:\s*(.+)$/im,
  promptTokens: /^\s*Prompt-Tokens:\s*([0-9]+)/im,
  completionTokens: /^\s*Completion-Tokens:\s*([0-9]+)/im,
  activeTimeSeconds: /^\s*Active-Time-Seconds:\s*([0-9]+)/im,
};

function parseTrailerInt(match: RegExpMatchArray | null): number {
  if (!match) return 0;
  const val = parseInt(match[1], 10);
  return isNaN(val) ? 0 : val;
}

function resolveAuthorType(
  authorTypeMatch: RegExpMatchArray | null,
  aiModelMatch: RegExpMatchArray | null
): 'human' | 'agent' {
  if (authorTypeMatch) {
    return authorTypeMatch[1].toLowerCase() as 'human' | 'agent';
  }
  if (aiModelMatch && aiModelMatch[1].trim() !== 'n/a') {
    return 'agent';
  }
  return 'human';
}

/**
 * Parses structured AI-SDLC git trailers from a commit message.
 */
export function parseCommitTrailers(rawMessage: string): CommitTrailers {
  const text = rawMessage || '';
  const taskIdMatch = text.match(TRAILER_REGEXES.taskId);
  const parentRefMatch = text.match(TRAILER_REGEXES.parentRef);
  const authorTypeMatch = text.match(TRAILER_REGEXES.authorType);
  const aiModelMatch = text.match(TRAILER_REGEXES.aiModel);

  const authorType = resolveAuthorType(authorTypeMatch, aiModelMatch);
  const rawModel = aiModelMatch ? aiModelMatch[1].trim() : undefined;
  const aiModel = rawModel && rawModel !== 'n/a' ? rawModel : undefined;

  return {
    taskId: taskIdMatch ? taskIdMatch[1].trim() : undefined,
    parentRef: parentRefMatch ? parentRefMatch[1].trim() : undefined,
    authorType,
    aiModel,
    promptTokens: parseTrailerInt(text.match(TRAILER_REGEXES.promptTokens)),
    completionTokens: parseTrailerInt(text.match(TRAILER_REGEXES.completionTokens)),
    activeTimeSeconds: parseTrailerInt(text.match(TRAILER_REGEXES.activeTimeSeconds)),
  };
}

/**
 * Formats structured git trailers into text suitable for git interpret-trailers.
 */
export function formatCommitTrailers(trailers: Partial<CommitTrailers>): string {
  const lines: string[] = [];
  if (trailers.taskId) lines.push(`Task-ID: ${trailers.taskId}`);
  if (trailers.parentRef) lines.push(`Parent-Ref: ${trailers.parentRef}`);
  lines.push(`Author-Type: ${trailers.authorType || 'human'}`);
  lines.push(`AI-Model: ${trailers.aiModel || 'n/a'}`);
  lines.push(`Prompt-Tokens: ${trailers.promptTokens ?? 0}`);
  lines.push(`Completion-Tokens: ${trailers.completionTokens ?? 0}`);
  lines.push(`Active-Time-Seconds: ${trailers.activeTimeSeconds ?? 0}`);
  return lines.join('\n');
}

interface ParsedCommitChunk {
  header: string;
  body: string;
  numstatLines: string[];
}

function parseRawLogChunks(rawLog: string): ParsedCommitChunk[] {
  const rawCommits = rawLog.split('---AI_SDLC_COMMIT---').filter((c) => c.trim().length > 0);
  const chunks: ParsedCommitChunk[] = [];

  for (const raw of rawCommits) {
    const endBodyIdx = raw.indexOf('---AI_SDLC_BODY_END---');
    if (endBodyIdx === -1) continue;

    const beforeEnd = raw.slice(0, endBodyIdx).trimStart();
    const afterEnd = raw.slice(endBodyIdx + '---AI_SDLC_BODY_END---'.length);

    const firstNewline = beforeEnd.indexOf('\n');
    const header = firstNewline === -1 ? beforeEnd : beforeEnd.slice(0, firstNewline);
    const body = firstNewline === -1 ? '' : beforeEnd.slice(firstNewline + 1);

    const numstatLines = afterEnd.split('\n').filter((l) => /^\d+\s+\d+\s+/.test(l.trim()));
    chunks.push({ header, body, numstatLines });
  }

  return chunks;
}

function sumNumstatLines(lines: string[]): { added: number; deleted: number } {
  let added = 0;
  let deleted = 0;
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      const a = parseInt(parts[0], 10);
      const d = parseInt(parts[1], 10);
      if (!isNaN(a)) added += a;
      if (!isNaN(d)) deleted += d;
    }
  }
  return { added, deleted };
}

function evaluateIsBugFix(subject: string, parentRef?: string): boolean {
  if (parentRef && /^(BUG|FIX)-/i.test(parentRef)) return true;
  return /^(fix|bug)(\([^)]+\))?:/i.test(subject.trim());
}

function inferAgentTrailers(trailers: CommitTrailers, linesAdded: number, linesDeleted: number): CommitTrailers {
  const res: CommitTrailers = { ...trailers };
  const linesChanged = linesAdded + linesDeleted;

  if (res.promptTokens === 0 && res.completionTokens === 0) {
    res.completionTokens = linesChanged > 0 ? Math.max(linesAdded * 10, 50) : 0;
    res.promptTokens = linesChanged > 0 ? Math.max(2500 + linesChanged * 25, 3000) : 1000;
  }
  if (res.activeTimeSeconds === 0) {
    res.activeTimeSeconds = linesChanged > 0 ? Math.round(30 + linesChanged * 0.5) : 30;
  }
  return res;
}

function inferHumanTrailers(trailers: CommitTrailers, linesAdded: number, linesDeleted: number): CommitTrailers {
  const res: CommitTrailers = { ...trailers };
  const linesChanged = linesAdded + linesDeleted;
  if (res.activeTimeSeconds === 0) {
    res.activeTimeSeconds = linesChanged > 0 ? Math.round(180 + linesChanged * 2) : 120;
  }
  return res;
}

/**
 * Infers or estimates missing KPI metrics (tokens and active development time)
 * when not explicitly declared in commit trailers.
 */
export function inferMissingTrailers(
  trailers: CommitTrailers,
  linesAdded: number,
  linesDeleted: number
): CommitTrailers {
  return trailers.authorType === 'agent'
    ? inferAgentTrailers(trailers, linesAdded, linesDeleted)
    : inferHumanTrailers(trailers, linesAdded, linesDeleted);
}

function fetchGitLogOutput(cwd: string, baseRef: string, headRef: string, format: string): string {
  const rangeArg = baseRef ? `${baseRef}..${headRef}` : headRef;
  try {
    return execFileSync('git', ['log', rangeArg, `--format=${format}`, '--numstat'], {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    if (baseRef && !baseRef.includes('/')) {
      try {
        return execFileSync('git', ['log', `origin/${baseRef}..${headRef}`, `--format=${format}`, `--numstat`], {
          cwd,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch {
        return '';
      }
    }
    return '';
  }
}

function buildCommitKpiRecord(chunk: ParsedCommitChunk): CommitKpiRecord | null {
  const fields = chunk.header.split('\x1f');
  if (fields.length < 5) return null;

  const rawTrailers = parseCommitTrailers(chunk.body);
  const { added, deleted } = sumNumstatLines(chunk.numstatLines);
  const trailers = inferMissingTrailers(rawTrailers, added, deleted);

  return {
    sha: fields[0],
    authorName: fields[1],
    authorEmail: fields[2],
    date: fields[3],
    subject: fields[4],
    trailers,
    linesAdded: added,
    linesDeleted: deleted,
    isBugFix: evaluateIsBugFix(fields[4], trailers.parentRef),
  };
}

/**
 * Extracts all commit records and their KPIs in a git revision range (e.g. main..HEAD).
 */
export function extractCommitKpisFromRange(
  baseRef: string,
  headRef: string = 'HEAD',
  options: { cwd?: string } = {}
): CommitKpiRecord[] {
  const cwd = options.cwd || process.cwd();
  const format = '---AI_SDLC_COMMIT---%n%H%x1f%an%x1f%ae%x1f%aI%x1f%s%n%B%n---AI_SDLC_BODY_END---';
  const rawOutput = fetchGitLogOutput(cwd, baseRef, headRef, format);
  if (!rawOutput) return [];

  const chunks = parseRawLogChunks(rawOutput);
  const records: CommitKpiRecord[] = [];
  for (const chunk of chunks) {
    const rec = buildCommitKpiRecord(chunk);
    if (rec) records.push(rec);
  }
  return records;
}
