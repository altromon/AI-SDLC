#!/usr/bin/env node
/**
 * AI-SDLC: Antigravity PreToolUse Branch Guard Hook
 * Prevents AI agents from modifying or writing files directly on protected branches (main, master, release/*).
 */

const { execSync } = require('child_process');
const path = require('path');

function getWorkingBranch(cwd) {
  try {
    const sym = execSync('git symbolic-ref --short HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
    if (sym) return sym;
  } catch {}

  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();
  } catch {}

  return '';
}

function main() {
  let input = '';
  process.stdin.setEncoding('utf-8');

  process.stdin.on('data', (chunk) => {
    input += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const payload = input.trim() ? JSON.parse(input) : {};
      const targetPath = payload.toolCall?.args?.Path || '';
      const workspacePaths = payload.workspacePaths || [];
      const cwd = workspacePaths[0] || process.cwd();

      // Normalize target path
      const normPath = targetPath.replace(/\\/g, '/');

      // Exclude artifacts, brain state, and git internal metadata
      if (
        normPath.includes('.gemini') ||
        normPath.includes('/brain/') ||
        normPath.includes('/scratch/') ||
        normPath.includes('/.git/')
      ) {
        console.log(JSON.stringify({ decision: 'allow' }));
        return;
      }

      const branch = getWorkingBranch(cwd);

      // Check if current branch is protected (main, master, release/*, release/v*)
      if (/^(main|master|release\/.*)$/.test(branch)) {
        const reason = `❌ [AI-SDLC Security Guard] BLOCKED: Direct file modifications on protected branch '${branch}' are forbidden. You must create and checkout a new working branch first before editing files (e.g. 'git checkout -b feat/<CHG-ID>-<slug>' or 'git checkout -b task/<PARENT-ID>/<TSK-ID>-<slug>').`;
        console.log(JSON.stringify({
          decision: 'deny',
          reason,
        }));
        return;
      }

      console.log(JSON.stringify({ decision: 'allow' }));
    } catch {
      // In case of unexpected error, fail-safe to allow
      console.log(JSON.stringify({ decision: 'allow' }));
    }
  });
}

main();
