/**
 * Unit Tests for Git Agent Detector, Trailers, Checkout & Workflow Helpers (M3.1)
 * Cites: FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001, FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001, FR-064-REASONING-EFFORT-TRAILER-001
 * Tag: @FR-040-RELEASE-SUPPLY-CHAIN-PROVENANCE-001 @FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001 @FR-064-REASONING-EFFORT-TRAILER-001
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  detectFromAgentEnv,
  detectFromEnvOverride,
  detectFromGitConfig,
  detectFromSignature,
  detectFromTelemetry,
  getGitConfigValue,
  isEnvActive,
  parseEnvInt,
  readSessionTelemetry,
  resolveAgentReasoningEffort,
  resolveModelFromBotString,
  type TelemetrySessionData,
} from '../src/git/agent-detector.js';
import {
  buildCommitKpiRecord,
  evaluateIsBugFix,
  fetchGitLogOutput,
  inferAgentTrailers,
  inferHumanTrailers,
  parseCommitTrailers,
  parseRawLogChunks,
  parseTrailerInt,
  resolveAuthorType,
  resolveTrailerOrScope,
  sumNumstatLines,
  type CommitTrailers,
  type ParsedCommitChunk,
} from '../src/git/trailers.js';
import {
  branchExistsLocally,
  branchExistsRemotely,
  buildCheckoutErrorResult,
  buildCheckoutSuccessResult,
  buildDefaultTaskSuffix,
  buildLocateFailureResult,
  buildTaskMatch,
  cascadeBranchCheckout,
  checkoutTaskBranch,
  detectExistingFeatureBranch,
  detectExistingReleaseBranch,
  detectExistingTaskBranch,
  ensureBranchInCascade,
  getGitBranchList,
  inspectChangeTasks,
  isTaskMatchingId,
  parseTasksFrontmatter,
  resolveChangeVersion,
  resolveRawChangeId,
  resolveVersionFromProposal,
  switchBranch,
  type RawTasksFrontmatter,
} from '../src/git/checkout.js';
import {
  buildPlanHeader,
  buildTaskBranchLines,
  classifyBranch,
  classifyTier1And2,
  classifyTier3,
  classifyTier4,
  generateBranchHierarchyPlan,
} from '../src/git/workflow.js';
import type { ActiveTaskMatch } from '../src/types/index.js';

function initTestGitRepo(repoDir: string, authorName = 'Alice Dev', authorEmail = 'alice@example.com'): void {
  fs.mkdirSync(repoDir, { recursive: true });
  execFileSync('git', ['init', '-b', 'main'], { cwd: repoDir, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.name', authorName], { cwd: repoDir, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', authorEmail], { cwd: repoDir, stdio: 'pipe' });
  fs.writeFileSync(path.join(repoDir, 'README.md'), '# Test Repo\n', 'utf-8');
  execFileSync('git', ['add', 'README.md'], { cwd: repoDir, stdio: 'pipe' });
  execFileSync('git', ['commit', '-m', 'chore: initial commit'], { cwd: repoDir, stdio: 'pipe' });
}

describe('Git Agent Detector Helpers (M3.1)', () => {
  let tmpDir: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m3-git-detector-'));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('getGitConfigValue reads trimmed local git config and returns undefined for missing, empty, or invalid cwd', () => {
    initTestGitRepo(tmpDir, '  Jane Doe  ', 'jane@example.com');
    expect(getGitConfigValue('user.name', tmpDir)).toBe('Jane Doe');

    execFileSync('git', ['config', '--local', 'ai-sdlc.empty-val', ''], { cwd: tmpDir, stdio: 'pipe' });
    expect(getGitConfigValue('ai-sdlc.empty-val', tmpDir)).toBeUndefined();
    expect(getGitConfigValue('ai-sdlc.missing-key-xyz', tmpDir)).toBeUndefined();
    expect(getGitConfigValue('user.name', path.join(tmpDir, 'nonexistent-dir'))).toBeUndefined();
  });

  it('readSessionTelemetry reads primary or fallback telemetry and rejects corrupt or non-object JSON (R4 regression)', () => {
    expect(readSessionTelemetry(tmpDir)).toBeNull();

    const sdlcDir = path.join(tmpDir, '.ai-sdlc');
    fs.mkdirSync(sdlcDir, { recursive: true });
    const primary = path.join(sdlcDir, 'session-telemetry.json');
    const fallback = path.join(sdlcDir, 'agent-session.json');

    // Non-object JSON values must not be treated as valid telemetry (R4)
    for (const nonObjectJson of ['123', '"text"', 'true', 'null', '[]']) {
      fs.writeFileSync(primary, nonObjectJson, 'utf-8');
      expect(readSessionTelemetry(tmpDir)).toBeNull();
    }

    // Malformed primary falls back to valid secondary agent-session.json
    fs.writeFileSync(primary, '{bad json', 'utf-8');
    fs.writeFileSync(
      fallback,
      JSON.stringify({ model: 'gpt-4o', promptTokens: 400, completionTokens: 120, activeTimeSeconds: 45 })
    );
    expect(readSessionTelemetry(tmpDir)).toEqual({
      model: 'gpt-4o',
      promptTokens: 400,
      completionTokens: 120,
      activeTimeSeconds: 45,
    });

    // Primary takes precedence when valid
    fs.writeFileSync(primary, JSON.stringify({ model: 'claude-3-7-sonnet', reasoningEffort: 'high' }));
    expect(readSessionTelemetry(tmpDir)?.model).toBe('claude-3-7-sonnet');
  });

  it('resolveModelFromBotString maps known bot keywords in priority order and defaults otherwise', () => {
    expect(resolveModelFromBotString('Claude [bot]')).toBe('claude-3-7-sonnet');
    expect(resolveModelFromBotString('gpt-assistant')).toBe('gpt-4o');
    expect(resolveModelFromBotString('github-copilot[bot]')).toBe('github-copilot');
    expect(resolveModelFromBotString('Gemini Code Assist')).toBe('gemini-1.5-pro');
    expect(resolveModelFromBotString('cortex-worker')).toBe('antigravity-agent');
    expect(resolveModelFromBotString('claude-gpt-hybrid')).toBe('claude-3-7-sonnet');
    expect(resolveModelFromBotString('dependabot[bot]')).toBe('agent-developer');
    expect(resolveModelFromBotString('')).toBe('agent-developer');
  });

  it('detectFromEnvOverride handles explicit human/agent overrides, fallback AUTHOR_TYPE, and invalid values', () => {
    expect(detectFromEnvOverride({})).toBeNull();
    expect(detectFromEnvOverride({ AI_SDLC_AUTHOR_TYPE: 'AGENT' })).toBeNull();
    expect(detectFromEnvOverride({ AUTHOR_TYPE: 'bot' })).toBeNull();

    expect(detectFromEnvOverride({ AI_SDLC_AUTHOR_TYPE: 'human', AI_MODEL: 'gpt-4o' })).toEqual({
      authorType: 'human',
      model: 'n/a',
      source: 'explicit-env',
      confidence: 'HIGH',
      promptTokens: 0,
      completionTokens: 0,
      activeTimeSeconds: 0,
    });

    expect(detectFromEnvOverride({ AI_SDLC_AUTHOR_TYPE: '', AUTHOR_TYPE: 'agent' })?.model).toBe('agent-developer');
    expect(detectFromEnvOverride({ AI_SDLC_AUTHOR_TYPE: 'agent', AI_MODEL: 'claude-3-7-sonnet' })?.model).toBe(
      'claude-3-7-sonnet'
    );
  });

  it('detectFromGitConfig reads ai-sdlc.author-type and ai-sdlc.model from git config', () => {
    initTestGitRepo(tmpDir);
    expect(detectFromGitConfig(tmpDir)).toBeNull();

    execFileSync('git', ['config', '--local', 'ai-sdlc.author-type', 'bot'], { cwd: tmpDir, stdio: 'pipe' });
    expect(detectFromGitConfig(tmpDir)).toBeNull();

    execFileSync('git', ['config', '--local', 'ai-sdlc.author-type', 'human'], { cwd: tmpDir, stdio: 'pipe' });
    expect(detectFromGitConfig(tmpDir)).toEqual({
      authorType: 'human',
      model: 'n/a',
      source: 'git-config',
      confidence: 'HIGH',
      promptTokens: 0,
      completionTokens: 0,
      activeTimeSeconds: 0,
    });

    execFileSync('git', ['config', '--local', 'ai-sdlc.author-type', 'agent'], { cwd: tmpDir, stdio: 'pipe' });
    expect(detectFromGitConfig(tmpDir)?.model).toBe('agent-developer');

    execFileSync('git', ['config', '--local', 'ai-sdlc.model', 'gpt-4o'], { cwd: tmpDir, stdio: 'pipe' });
    expect(detectFromGitConfig(tmpDir)?.model).toBe('gpt-4o');
  });

  it('detectFromTelemetry respects preloaded telemetry, skips disk on preloaded null, and applies env/zero defaults', () => {
    const sdlcDir = path.join(tmpDir, '.ai-sdlc');
    fs.mkdirSync(sdlcDir, { recursive: true });
    fs.writeFileSync(path.join(sdlcDir, 'session-telemetry.json'), JSON.stringify({ model: 'from-disk' }));

    expect(detectFromTelemetry(tmpDir, {}, null)).toBeNull();
    expect(detectFromTelemetry(tmpDir, {})?.model).toBe('from-disk');

    const preloaded: TelemetrySessionData = {};
    expect(detectFromTelemetry(tmpDir, { AI_MODEL: 'env-model' }, preloaded)).toEqual({
      authorType: 'agent',
      model: 'env-model',
      source: 'session-telemetry-file',
      confidence: 'HIGH',
      promptTokens: 0,
      completionTokens: 0,
      activeTimeSeconds: 0,
    });
    expect(detectFromTelemetry(tmpDir, {}, preloaded)?.model).toBe('agent-developer');
  });

  it('parseEnvInt and isEnvActive handle numeric and boolean boundary strings', () => {
    expect(parseEnvInt(undefined)).toBe(0);
    expect(parseEnvInt('')).toBe(0);
    expect(parseEnvInt('0')).toBe(0);
    expect(parseEnvInt('abc')).toBe(0);
    expect(parseEnvInt('  42  ')).toBe(42);
    expect(parseEnvInt('12px')).toBe(12);
    expect(parseEnvInt('-5')).toBe(-5);

    expect(isEnvActive(undefined)).toBe(false);
    expect(isEnvActive('')).toBe(false);
    expect(isEnvActive('0')).toBe(false);
    expect(isEnvActive('false')).toBe(false);
    expect(isEnvActive('1')).toBe(true);
    expect(isEnvActive('true')).toBe(true);
    expect(isEnvActive('FALSE')).toBe(true);
  });

  it('detectFromAgentEnv enforces agent precedence, AIDER_MODEL fallback, and telemetry parsing', () => {
    expect(detectFromAgentEnv({})).toBeNull();
    expect(detectFromAgentEnv({ CLAUDE_CODE: '0', CURSOR_AGENT: 'false' })).toBeNull();

    const precedence = detectFromAgentEnv({
      ANTIGRAVITY_AGENT: '1',
      CLAUDE_CODE: '1',
      PROMPT_TOKENS: '100',
      COMPLETION_TOKENS: '50',
      ACTIVE_TIME_SEC: '25',
    });
    expect(precedence).toEqual({
      authorType: 'agent',
      model: 'antigravity-agent',
      source: 'env-antigravity',
      confidence: 'HIGH',
      promptTokens: 100,
      completionTokens: 50,
      activeTimeSeconds: 25,
    });

    const aider = detectFromAgentEnv({
      AIDER_MODEL: 'deepseek-coder',
      ACTIVE_TIME_SECONDS: '90',
      ACTIVE_TIME_SEC: '10',
    });
    expect(aider?.model).toBe('deepseek-coder');
    expect(aider?.activeTimeSeconds).toBe(90);

    const aiderOverridden = detectFromAgentEnv({
      AIDER_MODEL: 'deepseek-coder',
      AI_MODEL: 'override-model',
    });
    expect(aiderOverridden?.model).toBe('override-model');
  });

  it('detectFromSignature matches word-boundary bot signatures in env or git config', () => {
    initTestGitRepo(tmpDir, 'Alice Human', 'alice@example.com');
    expect(detectFromSignature({}, tmpDir)).toBeNull();
    expect(detectFromSignature({ GIT_AUTHOR_NAME: 'mybot', GIT_AUTHOR_EMAIL: 'dev@example.com' }, tmpDir)).toBeNull();

    const envBot = detectFromSignature(
      { GIT_AUTHOR_NAME: 'Copilot Helper', GIT_AUTHOR_EMAIL: 'help@example.com' },
      tmpDir
    );
    expect(envBot).toEqual({
      authorType: 'agent',
      model: 'github-copilot',
      source: 'git-user-signature',
      confidence: 'MEDIUM',
      promptTokens: 0,
      completionTokens: 0,
      activeTimeSeconds: 0,
    });

    execFileSync('git', ['config', 'user.email', 'gemini-bot@example.com'], { cwd: tmpDir, stdio: 'pipe' });
    const gitBot = detectFromSignature({}, tmpDir);
    expect(gitBot?.model).toBe('gemini-1.5-pro');
  });

  it('resolveAgentReasoningEffort resolves priority env > telemetry > git config and ignores invalid values', () => {
    initTestGitRepo(tmpDir);
    execFileSync('git', ['config', '--local', 'ai-sdlc.reasoning-effort', 'low'], { cwd: tmpDir, stdio: 'pipe' });

    expect(resolveAgentReasoningEffort(tmpDir, { AI_REASONING_EFFORT: 'MAX' }, { reasoningEffort: 'medium' })).toBe(
      'max'
    );
    expect(resolveAgentReasoningEffort(tmpDir, { AI_REASONING_EFFORT: 'ultra' }, { reasoningEffort: 'high' })).toBe(
      'high'
    );
    expect(resolveAgentReasoningEffort(tmpDir, { AI_REASONING_EFFORT: '  ' }, { reasoningEffort: 'bad' })).toBe('low');

    execFileSync('git', ['config', '--local', 'ai-sdlc.reasoning-effort', 'invalid'], { cwd: tmpDir, stdio: 'pipe' });
    expect(resolveAgentReasoningEffort(tmpDir, {}, null)).toBeUndefined();
  });
});

describe('Git Commit Trailers Helpers (M3.1)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m3-git-trailers-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  it('parseTrailerInt extracts integer or returns 0 for null/non-numeric matches', () => {
    expect(parseTrailerInt(null)).toBe(0);
    expect(parseTrailerInt('Prompt-Tokens: 1200'.match(/Prompt-Tokens:\s*(\d+)/))).toBe(1200);
    expect(parseTrailerInt('Prompt-Tokens: abc'.match(/Prompt-Tokens:\s*(\w+)/))).toBe(0);
    expect(parseTrailerInt('Prompt-Tokens:'.match(/Prompt-Tokens:/))).toBe(0);
  });

  it('resolveAuthorType handles explicit Author-Type, AI-Model inference, whitespace and case-insensitive n/a (R4 regression)', () => {
    const typeHuman = 'Author-Type: HUMAN'.match(/Author-Type:\s*(human|agent)/i);
    const typeAgent = 'Author-Type: agent'.match(/Author-Type:\s*(human|agent)/i);
    const modelGpt = 'AI-Model: gpt-4o'.match(/AI-Model:\s*(.+)/i);
    const modelLowerNa = 'AI-Model: n/a'.match(/AI-Model:\s*(.+)/i);
    const modelUpperNa = 'AI-Model: N/A'.match(/AI-Model:\s*(.+)/i);
    const modelBlank = 'AI-Model:    '.match(/AI-Model:\s*(.*)/i);

    expect(resolveAuthorType(typeHuman, modelGpt)).toBe('human');
    expect(resolveAuthorType(typeAgent, null)).toBe('agent');
    expect(resolveAuthorType(null, modelGpt)).toBe('agent');
    expect(resolveAuthorType(null, modelLowerNa)).toBe('human');
    expect(resolveAuthorType(null, modelUpperNa)).toBe('human');
    expect(resolveAuthorType(null, modelBlank)).toBe('human');
    expect(resolveAuthorType(null, null)).toBe('human');

    const parsedUpperNa = parseCommitTrailers('chore: test\n\nAI-Model: N/A\n');
    expect(parsedUpperNa.authorType).toBe('human');
    expect(parsedUpperNa.aiModel).toBeUndefined();
  });

  it('parseCommitTrailers prevents cross-line bleed on empty LF/CRLF trailer lines and enforces Author-Type boundary (R4 regression)', () => {
    const emptyModelLf = parseCommitTrailers('chore: update docs\n\nAI-Model:\nSigned-off-by: Alice <alice@example.com>\n');
    expect(emptyModelLf.authorType).toBe('human');
    expect(emptyModelLf.aiModel).toBeUndefined();

    const emptyModelCrlf = parseCommitTrailers(
      'feat: test\r\n\r\nAI-Model:   \r\nAuthor-Type: human\r\nAI-Reasoning-Effort: HIGH\r\n'
    );
    expect(emptyModelCrlf.authorType).toBe('human');
    expect(emptyModelCrlf.aiModel).toBeUndefined();
    expect(emptyModelCrlf.reasoningEffort).toBe('high');

    const emptyTaskId = parseCommitTrailers('chore: update docs\n\nTask-ID:\nSigned-off-by: Alice <alice@example.com>\n');
    expect(emptyTaskId.taskId).toBeUndefined();

    const emptyParentRef = parseCommitTrailers('chore: update docs\n\nParent-Ref:\nAuthor-Type: human\n');
    expect(emptyParentRef.parentRef).toBeUndefined();
    expect(emptyParentRef.authorType).toBe('human');

    const emptyNumeric = parseCommitTrailers(
      'feat: x\n\nPrompt-Tokens:\n42 files changed\nCompletion-Tokens:\n15\nActive-Time-Seconds:\n9\n'
    );
    expect(emptyNumeric.promptTokens).toBe(0);
    expect(emptyNumeric.completionTokens).toBe(0);
    expect(emptyNumeric.activeTimeSeconds).toBe(0);

    const invalidAuthorType = parseCommitTrailers('chore: test\n\nAuthor-Type: humanly\nAI-Model: gpt-4o\n');
    expect(invalidAuthorType.authorType).toBe('agent');
    expect(invalidAuthorType.aiModel).toBe('gpt-4o');

    const fullCrlf = parseCommitTrailers(
      'feat: full crlf\r\n\r\nTask-ID: TSK-010\r\nParent-Ref: CHG-010\r\nAuthor-Type: agent\r\nAI-Model: claude-3-7-sonnet\r\nAI-Reasoning-Effort: medium\r\nPrompt-Tokens: 120\r\nCompletion-Tokens: 45\r\nActive-Time-Seconds: 18\r\n'
    );
    expect(fullCrlf).toEqual({
      taskId: 'TSK-010',
      parentRef: 'CHG-010',
      authorType: 'agent',
      aiModel: 'claude-3-7-sonnet',
      reasoningEffort: 'medium',
      promptTokens: 120,
      completionTokens: 45,
      activeTimeSeconds: 18,
    });
  });

  it('resolveTrailerOrScope prefers explicit trailer over uppercased subject fallback', () => {
    const regex = /\b(TSK-[0-9A-Za-z_-]+)\b/i;
    const explicit = 'Task-ID:   TSK-999  '.match(/Task-ID:\s*(.+)/i);
    expect(resolveTrailerOrScope(explicit, 'feat(tsk-001): msg', regex)).toBe('TSK-999');
    expect(resolveTrailerOrScope(null, 'feat(tsk-042): msg', regex)).toBe('TSK-042');
    expect(resolveTrailerOrScope(null, 'chore: plain message', regex)).toBeUndefined();
  });

  it('parseRawLogChunks splits commits, strips CRLF header endings, and keeps binary numstat entries (R4 regression)', () => {
    expect(parseRawLogChunks('')).toEqual([]);

    const rawLog = [
      '---AI_SDLC_COMMIT---',
      'abc123\x1fAlice\x1falice@example.com\x1f2026-11-22T00:00:00Z\x1ffix(TSK-001): handle CRLF\r',
      'Author-Type: agent\r',
      'AI-Model: claude-3-7-sonnet\r',
      '---AI_SDLC_BODY_END---\r',
      '10\t2\tsrc/app.ts\r',
      '-\t-\tassets/logo.png\r',
      '---AI_SDLC_COMMIT---',
      'missing-end-marker',
      '---AI_SDLC_COMMIT---',
      'def456\x1fBob\x1fbob@example.com\x1f2026-11-22T01:00:00Z\x1fchore: header only',
      '---AI_SDLC_BODY_END---',
    ].join('\n');

    const chunks = parseRawLogChunks(rawLog);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].header.endsWith('\r')).toBe(false);
    expect(chunks[0].header).toContain('handle CRLF');
    expect(chunks[0].numstatLines).toHaveLength(2);
    expect(chunks[0].numstatLines[1]).toContain('assets/logo.png');
    expect(chunks[1].body).toBe('');
    expect(chunks[1].numstatLines).toEqual([]);
  });

  it('sumNumstatLines aggregates additions, deletions, binary entries, and preserves consecutive spaces in file paths (R4 regression)', () => {
    expect(sumNumstatLines([])).toEqual({ added: 0, deleted: 0, files: [] });
    const summary = sumNumstatLines([
      '15\t3\tsrc/my file.ts',
      '5\t1\tsrc/two  spaces.ts',
      '5\t1\t leading.ts',
      '-\t-\tassets/icon.png',
      'malformed-single-token',
    ]);
    expect(summary).toEqual({
      added: 25,
      deleted: 5,
      files: ['src/my file.ts', 'src/two  spaces.ts', ' leading.ts', 'assets/icon.png'],
    });
  });

  it('evaluateIsBugFix detects BUG-/FIX- parent refs and conventional fix/bug subjects', () => {
    expect(evaluateIsBugFix('chore: cleanup', 'BUG-10')).toBe(true);
    expect(evaluateIsBugFix('chore: cleanup', 'fix-99')).toBe(true);
    expect(evaluateIsBugFix('  fix(core): null check', 'CHG-01')).toBe(true);
    expect(evaluateIsBugFix('bug: crash on start')).toBe(true);
    expect(evaluateIsBugFix('fix!: breaking crash fix')).toBe(true);
    expect(evaluateIsBugFix('fix(core)!: breaking scoped fix')).toBe(true);
    expect(evaluateIsBugFix('bug!: breaking bugfix')).toBe(true);
    expect(evaluateIsBugFix('feat: new endpoint', 'CHG-01')).toBe(false);
    expect(evaluateIsBugFix('fixup! wip')).toBe(false);
    expect(evaluateIsBugFix('')).toBe(false);
  });

  it('inferAgentTrailers and inferHumanTrailers estimate missing metrics without mutating inputs', () => {
    const zeroAgent: CommitTrailers = {
      authorType: 'agent',
      aiModel: 'gpt-4o',
      promptTokens: 0,
      completionTokens: 0,
      activeTimeSeconds: 0,
    };
    const estZeroLines = inferAgentTrailers(zeroAgent, 0, 0);
    expect(zeroAgent.promptTokens).toBe(0);
    expect(estZeroLines.promptTokens).toBe(1000);
    expect(estZeroLines.completionTokens).toBe(0);
    expect(estZeroLines.activeTimeSeconds).toBe(30);
    expect(estZeroLines.isTelemetryEstimated).toBe(true);

    const estWithLines = inferAgentTrailers(zeroAgent, 10, 5);
    expect(estWithLines.completionTokens).toBe(100);
    expect(estWithLines.promptTokens).toBe(3000);
    expect(estWithLines.activeTimeSeconds).toBe(38);
    expect(estWithLines.isTelemetryEstimated).toBe(true);

    const explicitAgent: CommitTrailers = {
      authorType: 'agent',
      promptTokens: 500,
      completionTokens: 0,
      activeTimeSeconds: 40,
    };
    expect(inferAgentTrailers(explicitAgent, 10, 0).isTelemetryEstimated).toBe(false);

    const zeroHuman: CommitTrailers = {
      authorType: 'human',
      promptTokens: 0,
      completionTokens: 0,
      activeTimeSeconds: 0,
    };
    expect(inferHumanTrailers(zeroHuman, 0, 0).activeTimeSeconds).toBe(120);
    expect(inferHumanTrailers(zeroHuman, 5, 5)).toEqual({
      authorType: 'human',
      promptTokens: 0,
      completionTokens: 0,
      activeTimeSeconds: 200,
      isTelemetryEstimated: true,
    });
    expect(zeroHuman.activeTimeSeconds).toBe(0);

    const explicitHuman: CommitTrailers = { ...zeroHuman, activeTimeSeconds: 300 };
    expect(inferHumanTrailers(explicitHuman, 5, 5).isTelemetryEstimated).toBe(false);
  });

  it('fetchGitLogOutput fetches git log ranges, handles origin fallback, and returns empty string on failures', () => {
    const bareOrigin = path.join(tmpDir, 'origin.git');
    const localRepo = path.join(tmpDir, 'repo');
    fs.mkdirSync(bareOrigin, { recursive: true });
    execFileSync('git', ['init', '--bare'], { cwd: bareOrigin, stdio: 'pipe' });

    initTestGitRepo(localRepo);
    execFileSync('git', ['remote', 'add', 'origin', bareOrigin], { cwd: localRepo, stdio: 'pipe' });
    execFileSync('git', ['push', '-u', 'origin', 'main'], { cwd: localRepo, stdio: 'pipe' });
    execFileSync('git', ['checkout', '-b', 'feat/CHG-001-demo'], { cwd: localRepo, stdio: 'pipe' });
    fs.writeFileSync(path.join(localRepo, 'feature.txt'), 'line 1\n', 'utf-8');
    execFileSync('git', ['add', 'feature.txt'], { cwd: localRepo, stdio: 'pipe' });
    execFileSync('git', ['commit', '-m', 'feat: add feature'], { cwd: localRepo, stdio: 'pipe' });

    const singleRef = fetchGitLogOutput(localRepo, '', 'HEAD', '%s');
    expect(singleRef).toContain('feat: add feature');
    expect(singleRef).toContain('chore: initial commit');

    const rangeOut = fetchGitLogOutput(localRepo, 'main', 'HEAD', '%s');
    expect(rangeOut).toContain('feat: add feature');
    expect(rangeOut).not.toContain('chore: initial commit');

    // Delete local main so baseRef 'main' triggers fallback to 'origin/main'
    execFileSync('git', ['branch', '-D', 'main'], { cwd: localRepo, stdio: 'pipe' });
    const originFallback = fetchGitLogOutput(localRepo, 'main', 'HEAD', '%s');
    expect(originFallback).toContain('feat: add feature');

    expect(fetchGitLogOutput(localRepo, 'missing/ref', 'HEAD', '%s')).toBe('');
    expect(fetchGitLogOutput(localRepo, 'missing-no-slash', 'HEAD', '%s')).toBe('');
    expect(fetchGitLogOutput(tmpDir, '', 'HEAD', '%s')).toBe('');
  });

  it('buildCommitKpiRecord builds full record from valid chunk and returns null for malformed header', () => {
    expect(buildCommitKpiRecord({ header: 'bad-header', body: '', numstatLines: [] })).toBeNull();

    const chunk: ParsedCommitChunk = {
      header: 'sha123\x1fAlice\x1falice@example.com\x1f2026-11-22T00:00:00Z\x1ffix(TSK-007): patch bug',
      body: 'Parent-Ref: BUG-007\nAuthor-Type: agent\nAI-Model: gpt-4o',
      numstatLines: ['4\t1\tsrc/fix.ts', '-\t-\tassets/img.png'],
    };
    const record = buildCommitKpiRecord(chunk);
    expect(record).not.toBeNull();
    expect(record?.sha).toBe('sha123');
    expect(record?.isBugFix).toBe(true);
    expect(record?.linesAdded).toBe(4);
    expect(record?.linesDeleted).toBe(1);
    expect(record?.touchedFiles).toEqual(['src/fix.ts', 'assets/img.png']);
    expect(record?.trailers.isTelemetryEstimated).toBe(true);
  });
});

describe('Git Workflow & Checkout Helpers (M3.1)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-m3-git-checkout-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  describe('git/workflow helpers', () => {
    it('classifyTier1And2 classifies main and release branches and rejects invalid names', () => {
      expect(classifyTier1And2('main')?.tier).toBe(1);
      expect(classifyTier1And2('release/v1.2.3')?.tier).toBe(2);
      expect(classifyTier1And2('release/v2.0.0-rc.1')?.tier).toBe(2);
      expect(classifyTier1And2('master')).toBeNull();
      expect(classifyTier1And2('release/1.2.3')).toBeNull();
      expect(classifyTier1And2('feat/CHG-001-demo')).toBeNull();
      expect(classifyTier1And2('')).toBeNull();
    });

    it('classifyTier3 classifies feat/feature/bug/fix/patch branches and rejects malformed ones', () => {
      expect(classifyTier3('feat/CHG-001-auth')).toMatchObject({ valid: true, tier: 3, id: 'CHG-001-auth' });
      expect(classifyTier3('feature/v1.0.0/FEAT-12-ui')).toMatchObject({ valid: true, tier: 3, id: 'FEAT-12-ui' });
      expect(classifyTier3('bug/BUG-01-crash')?.tierName).toContain('Bug');
      expect(classifyTier3('fix/FIX-02-null')?.tierName).toContain('Bug');
      expect(classifyTier3('patch/PATCH-03-sec')).toMatchObject({ valid: true, targetMerge: 'release/vX.Y.Z o main' });
      expect(classifyTier3('feat/nohyphen')).toBeNull();
      expect(classifyTier3('feat/CHG-001/extra')).toBeNull();
      expect(classifyTier3('main')).toBeNull();
    });

    it('classifyTier4 classifies valid task branches and rejects invalid shapes', () => {
      expect(classifyTier4('task/CHG-001/TSK-001-dto')).toMatchObject({
        valid: true,
        tier: 4,
        parentId: 'CHG-001',
        taskId: 'TSK-001-dto',
      });
      expect(classifyTier4('task/TSK-001')).toBeNull();
      expect(classifyTier4('task/CHG/TSK-001')).toBeNull();
      expect(classifyTier4('task/CHG-001/TSK-001/extra')).toBeNull();
      expect(classifyTier4('')).toBeNull();
    });

    it('buildTaskBranchLines, buildPlanHeader, and generateBranchHierarchyPlan format full plan output', () => {
      expect(buildTaskBranchLines('CHG-042-auth', [], 'feat/CHG-042-auth')).toEqual([]);

      const taskLines = buildTaskBranchLines('CHG-042-auth-gw', ['TSK-001-DTO'], 'feat/CHG-042-auth-gw');
      expect(taskLines).toHaveLength(2);
      expect(taskLines[0]).toContain('task/CHG-042/tsk-001-dto');
      expect(taskLines[1]).toContain('git checkout feat/CHG-042-auth-gw && git checkout -b task/CHG-042/tsk-001-dto');

      expect(buildTaskBranchLines('solo', ['TSK-1'], 'feat/solo')[0]).toContain('task/solo/tsk-1');

      const header = buildPlanHeader('release/v1.0.0', 'feat/CHG-042-auth');
      expect(header).toHaveLength(7);
      expect(header[4]).toContain('release/v1.0.0');
      expect(header[5]).toContain('feat/CHG-042-auth');

      const plan = generateBranchHierarchyPlan('v1.2.0', 'CHG-042-auth', ['TSK-001-dto']);
      expect(plan.version).toBe('v1.2.0');
      expect(plan.planText).toContain('release/v1.2.0');
      expect(plan.planText).toContain('task/CHG-042/tsk-001-dto');

      const unprefixedPlan = generateBranchHierarchyPlan('1.0.0', 'CHG-001-x', ['TSK-001']);
      expect(unprefixedPlan.version).toBe('1.0.0');
      expect(unprefixedPlan.planText).toContain('release/v1.0.0');
      expect(unprefixedPlan.planText).not.toContain('release/1.0.0');
      expect(classifyBranch('release/v1.0.0').valid).toBe(true);
    });
  });

  describe('git/checkout frontmatter, matching & naming helpers', () => {
    it('resolveVersionFromProposal reads proposal.md version and safely returns 1.0.0 on missing, whitespace, or malformed YAML (R4 regression)', () => {
      expect(resolveVersionFromProposal(tmpDir)).toBe('1.0.0');

      const proposalPath = path.join(tmpDir, 'proposal.md');
      fs.writeFileSync(proposalPath, '# No frontmatter\n', 'utf-8');
      expect(resolveVersionFromProposal(tmpDir)).toBe('1.0.0');

      fs.writeFileSync(proposalPath, '---\nversion: [unclosed\n---\n', 'utf-8');
      expect(resolveVersionFromProposal(tmpDir)).toBe('1.0.0');

      fs.writeFileSync(proposalPath, '---\ntitle: Empty version\n---\n', 'utf-8');
      expect(resolveVersionFromProposal(tmpDir)).toBe('1.0.0');

      fs.writeFileSync(proposalPath, '---\nversion: "   "\n---\n', 'utf-8');
      expect(resolveVersionFromProposal(tmpDir)).toBe('1.0.0');

      fs.writeFileSync(proposalPath, '---\nversion: 2.3.1\n---\n', 'utf-8');
      expect(resolveVersionFromProposal(tmpDir)).toBe('2.3.1');
    });

    it('resolveChangeVersion applies precedence version > target-release/release > proposal.md and skips whitespace-only strings', () => {
      fs.writeFileSync(path.join(tmpDir, 'proposal.md'), '---\nversion: 3.1.0\n---\n', 'utf-8');

      expect(resolveChangeVersion({ version: 2, 'target-release': '1.5.0', release: '1.2.0' }, tmpDir)).toBe('2');
      expect(resolveChangeVersion({ version: '   ', 'target-release': '1.5.0', release: '1.2.0' }, tmpDir)).toBe(
        '1.5.0'
      );
      expect(resolveChangeVersion({ version: '  ', 'target-release': ' ', release: '1.2.0' }, tmpDir)).toBe('1.2.0');
      expect(resolveChangeVersion({ version: '  ', 'target-release': ' ', release: '  ' }, tmpDir)).toBe('3.1.0');
      expect(resolveChangeVersion({}, tmpDir)).toBe('3.1.0');
    });

    it('isTaskMatchingId matches exact and hyphen-bounded prefixes without false prefix collision', () => {
      expect(isTaskMatchingId('TSK-001', 'tsk-001')).toBe(true);
      expect(isTaskMatchingId('TSK-001-dto', 'TSK-001')).toBe(true);
      expect(isTaskMatchingId('TSK-001', 'TSK-001-dto')).toBe(true);
      expect(isTaskMatchingId('TSK-0010', 'TSK-001')).toBe(false);
      expect(isTaskMatchingId('TSK-001', 'TSK-0010')).toBe(false);
    });

    it('parseTasksFrontmatter parses valid tasks frontmatter and returns null on missing, directory, or malformed files', () => {
      const tasksFile = path.join(tmpDir, 'tasks.md');
      expect(parseTasksFrontmatter(tasksFile)).toBeNull();
      expect(parseTasksFrontmatter(tmpDir)).toBeNull();

      fs.writeFileSync(tasksFile, '# No delimiters', 'utf-8');
      expect(parseTasksFrontmatter(tasksFile)).toBeNull();

      fs.writeFileSync(tasksFile, '---\ntasks: [broken\n---\n', 'utf-8');
      expect(parseTasksFrontmatter(tasksFile)).toBeNull();

      fs.writeFileSync(tasksFile, '---\ntasks: "not-an-array"\n---\n', 'utf-8');
      expect(parseTasksFrontmatter(tasksFile)).toBeNull();

      fs.writeFileSync(tasksFile, '---\nchange-id: CHG-010\ntasks:\n  - id: TSK-001\n    title: Init\n---\n', 'utf-8');
      const parsed = parseTasksFrontmatter(tasksFile);
      expect(parsed?.['change-id']).toBe('CHG-010');
      expect(parsed?.tasks).toHaveLength(1);
    });

    it('resolveRawChangeId, buildTaskMatch, and inspectChangeTasks extract and collect task metadata', () => {
      const fm1: RawTasksFrontmatter = { 'change-id': 'CHG-011-A', changeId: 'CHG-011-B' };
      expect(resolveRawChangeId(fm1, 'chg-011-c')).toBe('CHG-011-A');
      expect(resolveRawChangeId({ changeId: 'CHG-011-B' }, 'chg-011-c')).toBe('CHG-011-B');
      expect(resolveRawChangeId({}, 'chg-011-c')).toBe('CHG-011-C');

      const built = buildTaskMatch('TSK-001', 'Auth', 'CHG-011-C', tmpDir, '1.0.0');
      expect(built).toEqual({
        taskId: 'TSK-001',
        taskTitle: 'Auth',
        changeId: 'CHG-011-C',
        changeDir: tmpDir,
        version: '1.0.0',
      });

      const availableEmpty: Array<{ id: string; title: string; changeId: string }> = [];
      expect(inspectChangeTasks(tmpDir, 'chg-011-c', 'TSK-001', availableEmpty)).toBeUndefined();

      fs.writeFileSync(
        path.join(tmpDir, 'tasks.md'),
        '---\nversion: 1.4.0\ntasks:\n  - title: missing-id\n  - id: "   "\n    title: blank-id\n  - id: TSK-001\n    title: First Task\n  - id: TSK-002\n    title: Second Task\n---\n',
        'utf-8'
      );
      const available: Array<{ id: string; title: string; changeId: string }> = [];
      const match = inspectChangeTasks(tmpDir, 'chg-011-c', 'TSK-001', available);
      expect(match).toEqual({
        taskId: 'TSK-001',
        taskTitle: 'First Task',
        changeId: 'CHG-011-C',
        changeDir: tmpDir,
        version: '1.4.0',
      });
      expect(available).toHaveLength(2);
      expect(available.map((t) => t.id)).toEqual(['TSK-001', 'TSK-002']);
      expect(inspectChangeTasks(tmpDir, 'chg-011-c', 'TSK-999', [])).toBeUndefined();
    });

    it('detectExistingReleaseBranch, detectExistingFeatureBranch, buildDefaultTaskSuffix, and detectExistingTaskBranch handle matching and R4 boundaries', () => {
      // Exact candidate match preferred over other active release branches
      expect(detectExistingReleaseBranch(['release/bad', 'release/v1.0.0', 'release/v2.0.0'], '2.0.0')).toBe(
        'release/v2.0.0'
      );
      expect(detectExistingReleaseBranch(['release/v1.0.0'], '2.0.0')).toBe('release/v1.0.0');
      expect(detectExistingReleaseBranch(['release/bad'], '2.0.0')).toBe('release/v2.0.0');

      expect(
        detectExistingFeatureBranch(['feat/bad', 'feat/CHG-042-custom'], 'chg-042-demo', 'CHG-042', 'CHG-042-demo')
      ).toBe('feat/CHG-042-custom');
      // R4 regression: CHG-001 must NOT collide with feat/CHG-0010-other
      expect(
        detectExistingFeatureBranch(['feat/CHG-0010-other'], 'chg-001-auth', 'CHG-001', 'CHG-001-auth')
      ).toBe('feat/CHG-001-auth');
      expect(detectExistingFeatureBranch([], 'chg-042-áuth', 'CHG-042', 'chg-042-áuth')).toBe('feat/CHG-042-auth');

      expect(buildDefaultTaskSuffix('TSK-001', 'Alpha Beta Gamma Delta Epsilon')).toBe(
        'tsk-001-alpha-beta-gamma-delta'
      );
      expect(buildDefaultTaskSuffix('TSK-001-custom-slug', 'Ignored Title')).toBe('tsk-001-custom-slug');
      expect(buildDefaultTaskSuffix('TSK-001', '!!!')).toBe('tsk-001');
      expect(buildDefaultTaskSuffix('TSK-001')).toBe('tsk-001');

      // R4 regression: TSK-001 must NOT match task/CHG-001/tsk-0010-other, and matches task/${parentId}/ case-insensitively
      expect(detectExistingTaskBranch(['task/CHG-001/tsk-0010-other'], 'CHG-001', 'TSK-001', 'Auth')).toBe(
        'task/CHG-001/tsk-001-auth'
      );
      expect(detectExistingTaskBranch(['task/CHG-001/tsk-001-existing'], 'CHG-001', 'TSK-001', 'Auth')).toBe(
        'task/CHG-001/tsk-001-existing'
      );
      expect(detectExistingTaskBranch(['task/chg-001/tsk-001-existing'], 'CHG-001', 'TSK-001', 'Auth')).toBe(
        'task/chg-001/tsk-001-existing'
      );
    });
  });

  describe('git/checkout git repo & result builders', () => {
    it('executes getGitBranchList, branchExistsLocally/Remotely, ensureBranchInCascade, switchBranch, and cascadeBranchCheckout in isolated temp repos', () => {
      expect(getGitBranchList(tmpDir)).toEqual([]);
      expect(branchExistsLocally('main', tmpDir)).toBe(false);
      expect(branchExistsRemotely('main', tmpDir)).toBe(false);

      const bareOrigin = path.join(tmpDir, 'origin.git');
      const repoDir = path.join(tmpDir, 'repo');
      fs.mkdirSync(bareOrigin, { recursive: true });
      execFileSync('git', ['init', '--bare'], { cwd: bareOrigin, stdio: 'pipe' });

      initTestGitRepo(repoDir);
      execFileSync('git', ['remote', 'add', 'origin', bareOrigin], { cwd: repoDir, stdio: 'pipe' });
      execFileSync('git', ['push', '-u', 'origin', 'main'], { cwd: repoDir, stdio: 'pipe' });

      // Create a remote-only branch release/v9.9.9
      execFileSync('git', ['checkout', '-b', 'release/v9.9.9'], { cwd: repoDir, stdio: 'pipe' });
      execFileSync('git', ['push', '-u', 'origin', 'release/v9.9.9'], { cwd: repoDir, stdio: 'pipe' });
      execFileSync('git', ['checkout', 'main'], { cwd: repoDir, stdio: 'pipe' });
      execFileSync('git', ['branch', '-D', 'release/v9.9.9'], { cwd: repoDir, stdio: 'pipe' });

      const branches = getGitBranchList(repoDir);
      expect(branches).toContain('main');
      expect(branches).toContain('release/v9.9.9');
      expect(branches.every((b) => b.length > 0)).toBe(true);

      const emptyCommitRepo = path.join(tmpDir, 'empty-commit-repo');
      fs.mkdirSync(emptyCommitRepo, { recursive: true });
      execFileSync('git', ['init', '-b', 'main'], { cwd: emptyCommitRepo, stdio: 'pipe' });
      expect(getGitBranchList(emptyCommitRepo)).toEqual([]);

      expect(branchExistsLocally('main', repoDir)).toBe(true);
      expect(branchExistsLocally('release/v9.9.9', repoDir)).toBe(false);
      expect(branchExistsRemotely('release/v9.9.9', repoDir)).toBe(true);

      // Existing local branch returns false
      expect(ensureBranchInCascade('main', 'main', repoDir)).toBe(false);
      // Remote-only branch creates tracking branch and returns true
      expect(ensureBranchInCascade('release/v9.9.9', 'main', repoDir)).toBe(true);
      expect(branchExistsLocally('release/v9.9.9', repoDir)).toBe(true);
      // Missing local+remote branch creates from parent and returns true
      expect(ensureBranchInCascade('feat/CHG-001-demo', 'release/v9.9.9', repoDir)).toBe(true);
      expect(() => ensureBranchInCascade('feat/CHG-999-fail', 'nonexistent-parent', repoDir)).toThrow();

      switchBranch('feat/CHG-001-demo', repoDir);
      const headAfterSwitch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        cwd: repoDir,
        encoding: 'utf-8',
      }).trim();
      expect(headAfterSwitch).toBe('feat/CHG-001-demo');
      expect(() => switchBranch('nonexistent-branch', repoDir)).toThrow();

      // Streamlined cascade checkout
      const streamlinedCreated: string[] = [];
      const streamlinedSwitched = cascadeBranchCheckout(
        {
          baseBranch: 'main',
          releaseBranch: 'release/v9.9.9',
          featureBranch: 'feat/CHG-002-fast',
          taskBranch: 'task/CHG-002/tsk-001-fast',
        },
        repoDir,
        streamlinedCreated,
        true
      );
      expect(streamlinedSwitched).toBe('feat/CHG-002-fast');
      expect(streamlinedCreated).toEqual(['feat/CHG-002-fast']);

      // Full cascade checkout + mid-cascade error preserving created branches
      const fullCreated: string[] = [];
      const fullSwitched = cascadeBranchCheckout(
        {
          baseBranch: 'main',
          releaseBranch: 'release/v1.0.0',
          featureBranch: 'feat/CHG-003-full',
          taskBranch: 'task/CHG-003/tsk-001-full',
        },
        repoDir,
        fullCreated
      );
      expect(fullSwitched).toBe('task/CHG-003/tsk-001-full');
      expect(fullCreated).toEqual([
        'release/v1.0.0',
        'feat/CHG-003-full',
        'task/CHG-003/tsk-001-full',
      ]);

      const failingCreated: string[] = [];
      expect(() =>
        cascadeBranchCheckout(
          {
            baseBranch: 'main',
            releaseBranch: 'release/v1.0.1',
            featureBranch: 'feat/CHG-004-bad',
            taskBranch: 'bad branch name with spaces',
          },
          repoDir,
          failingCreated
        )
      ).toThrow();
      expect(failingCreated).toEqual(['release/v1.0.1', 'feat/CHG-004-bad']);
    });

    it('checkoutTaskBranch avoids CHG-001 vs feat/CHG-0010-other prefix collision end-to-end in a real git repo (R4 regression)', () => {
      const collisionRepo = path.join(tmpDir, 'collision-repo');
      initTestGitRepo(collisionRepo);
      execFileSync('git', ['branch', 'feat/CHG-0010-other'], { cwd: collisionRepo, stdio: 'pipe' });

      const chgDir = path.join(collisionRepo, 'specs', 'changes', 'active', 'chg-001-auth');
      fs.mkdirSync(chgDir, { recursive: true });
      fs.writeFileSync(
        path.join(chgDir, 'tasks.md'),
        '---\nchange-id: CHG-001\nversion: 1.0.0\ntasks:\n  - id: TSK-001\n    title: Auth Task\n---\n# Tasks\n',
        'utf-8'
      );
      execFileSync('git', ['add', '.'], { cwd: collisionRepo, stdio: 'pipe' });
      execFileSync('git', ['commit', '-m', 'chore: add chg-001 tasks'], { cwd: collisionRepo, stdio: 'pipe' });

      const res = checkoutTaskBranch('TSK-001', { rootDir: collisionRepo });
      expect(res.success).toBe(true);
      expect(res.changeId).toBe('CHG-001');
      expect(res.releaseBranch).toBe('release/v1.0.0');
      expect(res.featureBranch).toBe('feat/CHG-001-auth');
      expect(res.taskBranch).toBe('task/CHG-001/tsk-001-auth-task');
      expect(res.createdBranches).toEqual([
        'release/v1.0.0',
        'feat/CHG-001-auth',
        'task/CHG-001/tsk-001-auth-task',
      ]);
      expect(res.switchedBranch).toBe('task/CHG-001/tsk-001-auth-task');
    });

    it('buildLocateFailureResult, buildCheckoutSuccessResult, and buildCheckoutErrorResult construct expected DTOs', () => {
      const failRes = buildLocateFailureResult('TSK-404', {
        found: false,
        error: 'Not found',
        availableTasks: [{ id: 'TSK-001', title: 'One', changeId: 'CHG-001' }],
      });
      expect(failRes).toEqual({
        success: false,
        taskId: 'TSK-404',
        createdBranches: [],
        error: 'Not found',
        availableTasks: [{ id: 'TSK-001', title: 'One', changeId: 'CHG-001' }],
      });

      const match: ActiveTaskMatch = {
        taskId: 'TSK-001',
        taskTitle: 'One',
        changeId: 'CHG-001',
        changeDir: tmpDir,
        version: '1.0.0',
      };
      const hierarchy = {
        releaseBranch: 'release/v1.0.0',
        featureBranch: 'feat/CHG-001-one',
        taskBranch: 'task/CHG-001/tsk-001-one',
      };

      expect(buildCheckoutSuccessResult(match, hierarchy, ['task/CHG-001/tsk-001-one'], hierarchy.taskBranch)).toEqual({
        success: true,
        taskId: 'TSK-001',
        changeId: 'CHG-001',
        releaseBranch: 'release/v1.0.0',
        featureBranch: 'feat/CHG-001-one',
        taskBranch: 'task/CHG-001/tsk-001-one',
        createdBranches: ['task/CHG-001/tsk-001-one'],
        switchedBranch: 'task/CHG-001/tsk-001-one',
      });

      expect(
        buildCheckoutSuccessResult(match, hierarchy, ['feat/CHG-001-one'], hierarchy.featureBranch, true).taskBranch
      ).toBeUndefined();

      expect(buildCheckoutErrorResult(match, hierarchy, ['release/v1.0.0'], new Error('boom'))).toEqual({
        success: false,
        taskId: 'TSK-001',
        changeId: 'CHG-001',
        releaseBranch: 'release/v1.0.0',
        featureBranch: 'feat/CHG-001-one',
        taskBranch: 'task/CHG-001/tsk-001-one',
        createdBranches: ['release/v1.0.0'],
        error: 'Error durante la creación o checkout de ramas Git: boom',
      });
      expect(buildCheckoutErrorResult(match, hierarchy, [], 'string failure').error).toContain('string failure');
    });
  });
});
