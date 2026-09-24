/**
 * AI-SDLC: Automated Git Hook Installer for Commit Trailers
 */

import * as fs from 'fs';
import * as path from 'path';

export interface HookInstallResult {
  success: boolean;
  hookPath?: string;
  error?: string;
}

export const PREPARE_COMMIT_MSG_SCRIPT = `#!/usr/bin/env bash
# ==============================================================================
# AI-SDLC: Automated Commit Trailers Injection Hook
# ==============================================================================

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# Bypass if this is an automated merge commit
if [ "$COMMIT_SOURCE" = "merge" ]; then
  exit 0
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
if [ -z "$CURRENT_BRANCH" ]; then
  exit 0
fi

# Extract Task-ID and Parent-Ref from 4-tier branch hierarchy
# Patterns: task/<PARENT-ID>/<TSK-ID>-slug | feat/<FEAT-ID>-slug | bug/<BUG-ID>-slug
TASK_ID=$(echo "$CURRENT_BRANCH" | grep -oE "TSK-[0-9A-Za-z-]+" || echo "")
PARENT_REF=$(echo "$CURRENT_BRANCH" | grep -oE "(CHG|FEAT|BUG|FIX|PATCH)-[0-9A-Za-z-]+" | head -n 1 || echo "")

TELEMETRY_FILE=".ai-sdlc/session-telemetry.json"
AUTHOR_TYPE="human"
AI_MODEL_NAME="n/a"
PROMPT_TOKENS=0
COMPLETION_TOKENS=0
ACTIVE_TIME_SEC=0

# Execute universal IDE-agnostic author detection engine
DETECTED=$(node packages/cli/bin/aisdlc.js git detect-author 2>/dev/null || npx aisdlc git detect-author 2>/dev/null || node -e "try { const { detectAuthorIdentity } = require('@ai-sdlc/core'); const id = detectAuthorIdentity(); console.log([id.authorType, id.model, id.promptTokens, id.completionTokens, id.activeTimeSeconds].join('|')); } catch {}" 2>/dev/null || echo "")

if [ -n "$DETECTED" ]; then
  IFS='|' read -r DET_AUTHOR DET_MODEL DET_PROMPT DET_COMPL DET_TIME <<< "$DETECTED"
  AUTHOR_TYPE="\${DET_AUTHOR:-\$AUTHOR_TYPE}"
  AI_MODEL_NAME="\${DET_MODEL:-\$AI_MODEL_NAME}"
  PROMPT_TOKENS="\${DET_PROMPT:-\$PROMPT_TOKENS}"
  COMPLETION_TOKENS="\${DET_COMPL:-\$COMPLETION_TOKENS}"
  ACTIVE_TIME_SEC="\${DET_TIME:-\$ACTIVE_TIME_SEC}"
else
  if [ -n "$AI_MODEL" ] || [ -n "$AI_AGENT_NAME" ] || [ -n "$ANTIGRAVITY_AGENT" ] || [ -n "$ANTIGRAVITY_AGENT_ID" ] || [ -n "$ANTIGRAVITY_CONVERSATION_ID" ] || [ -n "$CLAUDE_CODE" ] || [ -n "$CURSOR_AGENT" ] || [ -n "$WINDSURF_AGENT" ] || [ -n "$AIDER_MODEL" ] || [ -f "$TELEMETRY_FILE" ]; then
    AUTHOR_TYPE="agent"
    AI_MODEL_NAME="\${AI_MODEL:-\${AI_AGENT_NAME:-\${AIDER_MODEL:-agent-developer}}}"
  fi
fi

# Estimate tokens and active time if not provided for agent
if [ "\$PROMPT_TOKENS" = "0" ] && [ "\$AUTHOR_TYPE" = "agent" ]; then
  CHG_LINES=\$(git diff --cached --shortstat 2>/dev/null | grep -oE '[0-9]+ (insertion|deletion)' | awk '{s+=\$1} END {print s+0}')
  if [ -n "\$CHG_LINES" ] && [ "\$CHG_LINES" -gt 0 ]; then
    COMPLETION_TOKENS=\$((CHG_LINES * 10))
    PROMPT_TOKENS=\$((2500 + CHG_LINES * 25))
    ACTIVE_TIME_SEC=\$((30 + CHG_LINES / 2))
  else
    PROMPT_TOKENS=1000
    COMPLETION_TOKENS=0
    ACTIVE_TIME_SEC=30
  fi
fi

# Inject missing trailers individually into the commit message
TRAILERS_TO_ADD=""

if [ -n "$TASK_ID" ] && ! grep -qE "^Task-ID:" "$COMMIT_MSG_FILE" 2>/dev/null; then
  TRAILERS_TO_ADD="\${TRAILERS_TO_ADD}Task-ID: $TASK_ID\n"
fi
if [ -n "$PARENT_REF" ] && ! grep -qE "^Parent-Ref:" "$COMMIT_MSG_FILE" 2>/dev/null; then
  TRAILERS_TO_ADD="\${TRAILERS_TO_ADD}Parent-Ref: $PARENT_REF\n"
fi
if ! grep -qE "^Author-Type:" "$COMMIT_MSG_FILE" 2>/dev/null; then
  TRAILERS_TO_ADD="\${TRAILERS_TO_ADD}Author-Type: $AUTHOR_TYPE\n"
fi
if [ "$AUTHOR_TYPE" = "agent" ] && ! grep -qE "^AI-Model:" "$COMMIT_MSG_FILE" 2>/dev/null; then
  TRAILERS_TO_ADD="\${TRAILERS_TO_ADD}AI-Model: $AI_MODEL_NAME\n"
fi
if ! grep -qE "^Prompt-Tokens:" "$COMMIT_MSG_FILE" 2>/dev/null; then
  TRAILERS_TO_ADD="\${TRAILERS_TO_ADD}Prompt-Tokens: $PROMPT_TOKENS\n"
fi
if ! grep -qE "^Completion-Tokens:" "$COMMIT_MSG_FILE" 2>/dev/null; then
  TRAILERS_TO_ADD="\${TRAILERS_TO_ADD}Completion-Tokens: $COMPLETION_TOKENS\n"
fi
if ! grep -qE "^Active-Time-Seconds:" "$COMMIT_MSG_FILE" 2>/dev/null; then
  TRAILERS_TO_ADD="\${TRAILERS_TO_ADD}Active-Time-Seconds: $ACTIVE_TIME_SEC\n"
fi

if [ -n "$TRAILERS_TO_ADD" ]; then
  echo "" >> "$COMMIT_MSG_FILE"
  printf "$TRAILERS_TO_ADD" >> "$COMMIT_MSG_FILE"
fi

if [ -f "$TELEMETRY_FILE" ]; then
  rm -f "$TELEMETRY_FILE" 2>/dev/null || true
fi
`;

/**
 * Installs the AI-SDLC prepare-commit-msg hook in .git/hooks.
 */
export function installGitHooks(rootDir: string = process.cwd()): HookInstallResult {
  const gitDir = path.join(rootDir, '.git');
  if (!fs.existsSync(gitDir)) {
    return {
      success: false,
      error: `No se encontró el directorio Git en '${gitDir}'.`,
    };
  }

  const hooksDir = path.join(gitDir, 'hooks');
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  const hookPath = path.join(hooksDir, 'prepare-commit-msg');
  try {
    fs.writeFileSync(hookPath, PREPARE_COMMIT_MSG_SCRIPT, { encoding: 'utf-8', mode: 0o755 });
    return {
      success: true,
      hookPath,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Error al escribir el hook en '${hookPath}': ${msg}`,
    };
  }
}
