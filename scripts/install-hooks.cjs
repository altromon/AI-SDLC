#!/usr/bin/env node
/**
 * AI-SDLC: Lightweight Git Hooks Installer for prepare lifecycle
 * Runs safely in any environment (skipped automatically in CI or non-git environments).
 */

const fs = require('fs');
const path = require('path');

if (process.env.CI) {
  process.exit(0);
}

const rootDir = process.cwd();
const gitDir = path.join(rootDir, '.git');

if (!fs.existsSync(gitDir)) {
  process.exit(0);
}

const hooksDir = path.join(gitDir, 'hooks');
if (!fs.existsSync(hooksDir)) {
  fs.mkdirSync(hooksDir, { recursive: true });
}

const PRE_COMMIT_SCRIPT = `#!/usr/bin/env bash
# ==============================================================================
# AI-SDLC: Universal Protected Branches Guard (pre-commit)
# ==============================================================================

CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

if [ -z "$CURRENT_BRANCH" ] || [ "$CURRENT_BRANCH" = "HEAD" ]; then
  exit 0
fi

# Protected branches regex: main, master, release/*, release/v*
if echo "$CURRENT_BRANCH" | grep -qE "^(main|master|release/.*)$"; then
  echo "" >&2
  echo "❌ [AI-SDLC Security Guard] BLOCKED: Direct commits to protected branch '$CURRENT_BRANCH' are forbidden!" >&2
  echo "--------------------------------------------------------------------------------" >&2
  echo "Direct commits on protected branches violate the AI-SDLC 4-Tier Branching Policy." >&2
  echo "You must create and switch to a dedicated working branch before committing:" >&2
  echo "" >&2
  echo "   git checkout -b feat/<CHG-ID>-<slug>" >&2
  echo "   or" >&2
  echo "   git checkout -b task/<PARENT-ID>/<TSK-ID>-<slug>" >&2
  echo "--------------------------------------------------------------------------------" >&2
  echo "" >&2
  exit 1
fi

exit 0
`;

const PREPARE_COMMIT_MSG_SCRIPT = `#!/usr/bin/env bash
# ==============================================================================
# AI-SDLC: Automated Commit Trailers Injection Hook
# ==============================================================================

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# Bypass if this is an automated merge commit
if [ "$COMMIT_SOURCE" = "merge" ]; then
  exit 0
fi

CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
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
DETECTED=$(node packages/cli/bin/aisdlc.js git detect-author 2>/dev/null || npx aisdlc git detect-author 2>/dev/null || node -e "try { const { detectAuthorIdentity } = require('@aisdlc/core'); const id = detectAuthorIdentity(); console.log([id.authorType, id.model, id.promptTokens, id.completionTokens, id.activeTimeSeconds].join('|')); } catch {}" 2>/dev/null || echo "")

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

try {
  fs.writeFileSync(path.join(hooksDir, 'pre-commit'), PRE_COMMIT_SCRIPT, { encoding: 'utf-8', mode: 0o755 });
  fs.writeFileSync(path.join(hooksDir, 'prepare-commit-msg'), PREPARE_COMMIT_MSG_SCRIPT, { encoding: 'utf-8', mode: 0o755 });
} catch {
  // Fail safely without breaking npm/pnpm install
}
