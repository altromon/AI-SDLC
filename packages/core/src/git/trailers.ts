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

/**
 * Parses structured AI-SDLC git trailers from a commit message.
 */
export function parseCommitTrailers(rawMessage: string): CommitTrailers {
  const text = rawMessage || '';
  const taskIdMatch = text.match(TRAILER_REGEXES.taskId);
  const parentRefMatch = text.match(TRAILER_REGEXES.parentRef);
  const authorTypeMatch = text.match(TRAILER_REGEXES.authorType);
  const aiModelMatch = text.match(TRAILER_REGEXES.aiModel);
  const promptTokensMatch = text.match(TRAILER_REGEXES.promptTokens);
  const completionTokensMatch = text.match(TRAILER_REGEXES.completionTokens);
  const activeTimeMatch = text.match(TRAILER_REGEXES.activeTimeSeconds);

  let authorType: 'human' | 'agent' = 'human';
  if (authorTypeMatch) {
    authorType = authorTypeMatch[1].toLowerCase() as 'human' | 'agent';
  } else if (aiModelMatch && aiModelMatch[1].trim() !== 'n/a') {
    authorType = 'agent';
  }

  const aiModel = aiModelMatch ? aiModelMatch[1].trim() : undefined;
  const promptTokens = promptTokensMatch ? parseInt(promptTokensMatch[1], 10) : 0;
  const completionTokens = completionTokensMatch ? parseInt(completionTokensMatch[1], 10) : 0;
  const activeTimeSeconds = activeTimeMatch ? parseInt(activeTimeMatch[1], 10) : 0;

  return {
    taskId: taskIdMatch ? taskIdMatch[1].trim() : undefined,
    parentRef: parentRefMatch ? parentRefMatch[1].trim() : undefined,
    authorType,
    aiModel: aiModel && aiModel !== 'n/a' ? aiModel : undefined,
    promptTokens: isNaN(promptTokens) ? 0 : promptTokens,
    completionTokens: isNaN(completionTokens) ? 0 : completionTokens,
    activeTimeSeconds: isNaN(activeTimeSeconds) ? 0 : activeTimeSeconds,
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
  let rawOutput = '';
  try {
    rawOutput = execFileSync(
      'git',
      ['log', `${baseRef}..${headRef}`, `--format=${format}`, '--numstat'],
      { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch {
    if (!baseRef.includes('/')) {
      try {
        rawOutput = execFileSync(
          'git',
          ['log', `origin/${baseRef}..${headRef}`, `--format=${format}`, `--numstat`],
          { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }

  const chunks = parseRawLogChunks(rawOutput);
  const records: CommitKpiRecord[] = [];

  for (const chunk of chunks) {
    const fields = chunk.header.split('\x1f');
    if (fields.length < 5) continue;
    const sha = fields[0];
    const authorName = fields[1];
    const authorEmail = fields[2];
    const date = fields[3];
    const subject = fields[4];

    const trailers = parseCommitTrailers(chunk.body);
    const { added, deleted } = sumNumstatLines(chunk.numstatLines);
    const isBugFix = evaluateIsBugFix(subject, trailers.parentRef);

    records.push({
      sha,
      authorName,
      authorEmail,
      date,
      subject,
      trailers,
      linesAdded: added,
      linesDeleted: deleted,
      isBugFix,
    });
  }

  return records;
}
