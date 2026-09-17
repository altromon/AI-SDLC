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

if [ -n "$AI_MODEL" ] || [ -n "$AI_AGENT_NAME" ] || [ -n "$ANTIGRAVITY_AGENT_ID" ] || [ -f "$TELEMETRY_FILE" ]; then
  AUTHOR_TYPE="agent"
  if [ -n "$AI_MODEL" ]; then
    AI_MODEL_NAME="$AI_MODEL"
  elif [ -n "$AI_AGENT_NAME" ]; then
    AI_MODEL_NAME="$AI_AGENT_NAME"
  fi
fi

if [ -f "$TELEMETRY_FILE" ]; then
  AUTHOR_TYPE="agent"
  PARSED_MODEL=$(node -e "try { const d = JSON.parse(fs.readFileSync('$TELEMETRY_FILE')); console.log(d.model || ''); } catch { console.log(''); }" 2>/dev/null)
  if [ -n "$PARSED_MODEL" ]; then
    AI_MODEL_NAME="$PARSED_MODEL"
  fi
  PROMPT_TOKENS=$(node -e "try { const d = JSON.parse(fs.readFileSync('$TELEMETRY_FILE')); console.log(d.promptTokens || 0); } catch { console.log(0); }" 2>/dev/null)
  COMPLETION_TOKENS=$(node -e "try { const d = JSON.parse(fs.readFileSync('$TELEMETRY_FILE')); console.log(d.completionTokens || 0); } catch { console.log(0); }" 2>/dev/null)
  ACTIVE_TIME_SEC=$(node -e "try { const d = JSON.parse(fs.readFileSync('$TELEMETRY_FILE')); console.log(d.activeTimeSeconds || 0); } catch { console.log(0); }" 2>/dev/null)
fi

# Check if trailers are already present in the commit message
HAS_TRAILERS=$(grep -E "^(Task-ID|Author-Type):" "$COMMIT_MSG_FILE" 2>/dev/null || echo "")

if [ -z "$HAS_TRAILERS" ]; then
  TRAILERS_TO_ADD=""
  if [ -n "$TASK_ID" ]; then
    TRAILERS_TO_ADD="\${TRAILERS_TO_ADD}Task-ID: $TASK_ID\n"
  fi
  if [ -n "$PARENT_REF" ]; then
    TRAILERS_TO_ADD="\${TRAILERS_TO_ADD}Parent-Ref: $PARENT_REF\n"
  fi
  TRAILERS_TO_ADD="\${TRAILERS_TO_ADD}Author-Type: $AUTHOR_TYPE\n"
  TRAILERS_TO_ADD="\${TRAILERS_TO_ADD}AI-Model: $AI_MODEL_NAME\n"
  TRAILERS_TO_ADD="\${TRAILERS_TO_ADD}Prompt-Tokens: $PROMPT_TOKENS\n"
  TRAILERS_TO_ADD="\${TRAILERS_TO_ADD}Completion-Tokens: $COMPLETION_TOKENS\n"
  TRAILERS_TO_ADD="\${TRAILERS_TO_ADD}Active-Time-Seconds: $ACTIVE_TIME_SEC\n"

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
