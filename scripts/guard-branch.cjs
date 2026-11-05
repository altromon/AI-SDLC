#!/usr/bin/env node
/**
 * AI-SDLC: Antigravity PreToolUse Branch & Immutable Coding Rules Guard Hook
 * 1. Prevents AI agents from modifying or writing files directly on protected branches (main, master, release/*).
 * 2. Prevents AI agents from modifying or weakening deployed coding rules files once created.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROTECTED_CODING_RULES_FILES = [
  'Directory.Build.props',
  'tsconfig.strict.json',
  'eslint.config.mjs',
  'gradle/init.d/aisdlc-strict.init.gradle.kts',
  'config/pmd/aisdlc-ruleset.xml',
  'config/detekt/detekt.yml',
  '.cargo/config.toml',
  '.clippy.toml',
  '.golangci.yml',
  '.clang-tidy',
  'cmake/AisdlcStrictCompiler.cmake',
];

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

function isProtectedCodingRulesTarget(targetPath, cwd) {
  if (!targetPath) return false;
  const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(cwd, targetPath);
  if (!fs.existsSync(resolved)) return false;

  const norm = resolved.replace(/\\/g, '/');
  const rel = path.relative(cwd, resolved).replace(/\\/g, '/');
  return PROTECTED_CODING_RULES_FILES.some(
    (ruleFile) => rel === ruleFile || norm.endsWith('/' + ruleFile)
  ) || rel.startsWith('templates/coding-rules/');
}

function evaluateGuardDecision(payload) {
  const targetPath = payload.toolCall?.args?.Path || '';
  const workspacePaths = payload.workspacePaths || [];
  const cwd = workspacePaths[0] || process.cwd();
  const resolvedPath = targetPath ? path.resolve(cwd, targetPath) : '';
  const normPath = resolvedPath.replace(/\\/g, '/');

  if (isProtectedCodingRulesTarget(resolvedPath, cwd)) {
    return {
      decision: 'deny',
      reason: `❌ [AI-SDLC Immutable Coding Rules Guard] BLOCKED: AI agents are forbidden from modifying protected coding rules file '${path.basename(targetPath)}'. Fix the source or test code to satisfy the compiler/linter rules instead of altering the rule configuration.`,
    };
  }

  if (
    normPath.includes('/.gemini/') ||
    normPath.includes('/brain/') ||
    normPath.includes('/scratch/')
  ) {
    return { decision: 'allow' };
  }

  const branch = getWorkingBranch(cwd);
  if (/^(main|master|release\/.*)$/.test(branch)) {
    return {
      decision: 'deny',
      reason: `❌ [AI-SDLC Security Guard] BLOCKED: Direct file modifications on protected branch '${branch}' are forbidden. You must create and checkout a new working branch first before editing files (e.g. 'git checkout -b feat/<CHG-ID>-<slug>' or 'git checkout -b task/<PARENT-ID>/<TSK-ID>-<slug>').`,
    };
  }

  return { decision: 'allow' };
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
      console.log(JSON.stringify(evaluateGuardDecision(payload)));
    } catch {
      console.log(JSON.stringify({ decision: 'allow' }));
    }
  });
}

main();
