/**
 * AI-SDLC: Universal, IDE-Agnostic Human vs. Agent Author Detection Engine
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface AuthorIdentity {
  authorType: 'human' | 'agent';
  model: string;
  source: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  promptTokens: number;
  completionTokens: number;
  activeTimeSeconds: number;
}

const AGENT_ENV_MAPPINGS: Array<{ envKey: string; defaultModel: string; source: string }> = [
  { envKey: 'ANTIGRAVITY_AGENT', defaultModel: 'gemini-3.8-flash', source: 'antigravity' },
  { envKey: 'ANTIGRAVITY_CONVERSATION_ID', defaultModel: 'gemini-3.8-flash', source: 'antigravity' },
  { envKey: 'ANTIGRAVITY_AGENT_ID', defaultModel: 'gemini-3.8-flash', source: 'antigravity' },
  { envKey: 'CORTEX_SESSION_ID', defaultModel: 'antigravity-agent', source: 'cortex' },
  { envKey: 'CLAUDE_CODE', defaultModel: 'claude-3-7-sonnet', source: 'claude-code' },
  { envKey: 'CLAUDE_AGENT', defaultModel: 'claude-3-7-sonnet', source: 'claude-agent' },
  { envKey: 'CURSOR_AGENT', defaultModel: 'cursor-agent', source: 'cursor' },
  { envKey: 'CURSOR_SESSION_ID', defaultModel: 'cursor-agent', source: 'cursor' },
  { envKey: 'WINDSURF_AGENT', defaultModel: 'windsurf-cascade', source: 'windsurf' },
  { envKey: 'CASCADE_AGENT', defaultModel: 'windsurf-cascade', source: 'cascade' },
  { envKey: 'GITHUB_COPILOT_AGENT', defaultModel: 'github-copilot', source: 'copilot' },
  { envKey: 'COPILOT_AGENT_NAME', defaultModel: 'github-copilot', source: 'copilot' },
  { envKey: 'AIDER_MODEL', defaultModel: 'aider-agent', source: 'aider' },
  { envKey: 'GEMINI_CLI', defaultModel: 'gemini-1.5-pro', source: 'gemini' },
  { envKey: 'AI_AGENT_NAME', defaultModel: 'agent-developer', source: 'ai-sdlc-agent' },
  { envKey: 'AI_MODEL', defaultModel: 'agent-developer', source: 'ai-sdlc-model' },
];

const BOT_NAME_REGEX = /\b(bot|agent|copilot|assistant|llm|claude|gpt|cortex|gemini)\b/i;

function getGitConfigValue(key: string, cwd: string): string | undefined {
  try {
    const val = execFileSync('git', ['config', '--get', key], {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return val.length > 0 ? val : undefined;
  } catch {
    return undefined;
  }
}

interface TelemetrySessionData {
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  activeTimeSeconds?: number;
}

function readSessionTelemetry(cwd: string): TelemetrySessionData | null {
  const possiblePaths = [
    path.join(cwd, '.ai-sdlc', 'session-telemetry.json'),
    path.join(cwd, '.ai-sdlc', 'agent-session.json'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        return JSON.parse(raw) as TelemetrySessionData;
      } catch {
        // Ignore parsing errors
      }
    }
  }
  return null;
}

function resolveModelFromBotString(str: string): string {
  if (/claude/i.test(str)) return 'claude-3-7-sonnet';
  if (/gpt/i.test(str)) return 'gpt-4o';
  if (/copilot/i.test(str)) return 'github-copilot';
  if (/gemini/i.test(str)) return 'gemini-1.5-pro';
  if (/cortex/i.test(str)) return 'antigravity-agent';
  return 'agent-developer';
}

/**
 * Universally detects whether the current author is an AI Agent or a Human,
 * regardless of IDE (VSCode, Cursor, Windsurf, Claude Code, CLI, JetBrains).
 */
export function detectAuthorIdentity(
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): AuthorIdentity {
  const env = options.env || process.env;
  const cwd = options.cwd || process.cwd();

  // 1. Explicit Override via Environment Variable
  const explicitEnv = env.AI_SDLC_AUTHOR_TYPE || env.AUTHOR_TYPE;
  if (explicitEnv === 'human' || explicitEnv === 'agent') {
    const model = explicitEnv === 'agent' ? (env.AI_MODEL || 'agent-developer') : 'n/a';
    return {
      authorType: explicitEnv,
      model,
      source: 'explicit-env',
      confidence: 'HIGH',
      promptTokens: 0,
      completionTokens: 0,
      activeTimeSeconds: 0,
    };
  }

  // 2. Explicit Git Config (git config ai-sdlc.author-type [human|agent])
  const gitConfigType = getGitConfigValue('ai-sdlc.author-type', cwd);
  if (gitConfigType === 'human' || gitConfigType === 'agent') {
    const gitConfigModel = getGitConfigValue('ai-sdlc.model', cwd) || (gitConfigType === 'agent' ? 'agent-developer' : 'n/a');
    return {
      authorType: gitConfigType,
      model: gitConfigModel,
      source: 'git-config',
      confidence: 'HIGH',
      promptTokens: 0,
      completionTokens: 0,
      activeTimeSeconds: 0,
    };
  }

  // 3. Local Session Telemetry File (.ai-sdlc/session-telemetry.json)
  const telemetry = readSessionTelemetry(cwd);
  if (telemetry) {
    const model = telemetry.model || env.AI_MODEL || 'agent-developer';
    return {
      authorType: 'agent',
      model,
      source: 'session-telemetry-file',
      confidence: 'HIGH',
      promptTokens: telemetry.promptTokens || 0,
      completionTokens: telemetry.completionTokens || 0,
      activeTimeSeconds: telemetry.activeTimeSeconds || 0,
    };
  }

  // 4. IDE & Toolchain Environment Variables
  for (const mapping of AGENT_ENV_MAPPINGS) {
    const envVal = env[mapping.envKey];
    if (envVal && envVal !== '0' && envVal !== 'false') {
      const model = env.AI_MODEL || (mapping.envKey === 'AIDER_MODEL' ? envVal : mapping.defaultModel);
      return {
        authorType: 'agent',
        model,
        source: `env-${mapping.source}`,
        confidence: 'HIGH',
        promptTokens: parseInt(env.PROMPT_TOKENS || '0', 10) || 0,
        completionTokens: parseInt(env.COMPLETION_TOKENS || '0', 10) || 0,
        activeTimeSeconds: parseInt(env.ACTIVE_TIME_SECONDS || env.ACTIVE_TIME_SEC || '0', 10) || 0,
      };
    }
  }

  // 5. Git Author / Committer Signature Inspection
  const authorName = env.GIT_AUTHOR_NAME || getGitConfigValue('user.name', cwd) || '';
  const authorEmail = env.GIT_AUTHOR_EMAIL || getGitConfigValue('user.email', cwd) || '';

  if (BOT_NAME_REGEX.test(authorName) || BOT_NAME_REGEX.test(authorEmail)) {
    const inferredModel = resolveModelFromBotString(`${authorName} ${authorEmail}`);
    return {
      authorType: 'agent',
      model: inferredModel,
      source: 'git-user-signature',
      confidence: 'MEDIUM',
      promptTokens: 0,
      completionTokens: 0,
      activeTimeSeconds: 0,
    };
  }

  // 6. Default Fallback: Human Developer
  return {
    authorType: 'human',
    model: 'n/a',
    source: 'default-human',
    confidence: 'HIGH',
    promptTokens: 0,
    completionTokens: 0,
    activeTimeSeconds: 0,
  };
}
