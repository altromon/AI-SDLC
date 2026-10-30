/**
 * AI-SDLC: Progressive Friction & Anti-Bypass Verifier
 */

import { canonicalSort } from '../utils/fs.js';
import { resolveDeterministicDate } from '../utils/time.js';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  ChangeProfile,
  ProgressiveFrictionOptions,
  ProgressiveFrictionResult,
} from '../types/index.js';

export const PROTECTED_BYPASS_PATTERNS: RegExp[] = [
  /^schemas[\\/]/i,
  /^examples[\\/]security[\\/]/i,
  /^specs[\\/]security[\\/]/i,
  /enclaves?[\\/]/i,
  /SEC-ENC-/i,
  /quality-policy\.ya?ml$/i,
  /license-policy\.ya?ml$/i,
  /08_security_concept\.md$/i,
  /09_decisions[\\/]/i,
  /migrations?[\\/]/i,
];

export function detectProfileFromChange(changeDir: string): ChangeProfile {
  if (!fs.existsSync(changeDir)) return 'standard';

  const specFile = path.join(changeDir, 'spec.md');
  if (fs.existsSync(specFile)) {
    try {
      const rawSpec = fs.readFileSync(specFile, 'utf-8').replace(/^\uFEFF/, '');
      const match = rawSpec.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (match) {
        const parsedFm = yaml.load(match[1]) as Record<string, unknown> | null;
        if (
          parsedFm &&
          parsedFm.profile &&
          ['patch', 'standard', 'critical'].includes(String(parsedFm.profile))
        ) {
          return parsedFm.profile as ChangeProfile;
        }
      }
    } catch {
      // Ignore parse failure, fallback
    }
  }

  return 'standard';
}

export function isPathProtectedFromPatch(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return PROTECTED_BYPASS_PATTERNS.some((pattern) => pattern.test(normalized));
}

function detectBranchChangeMatch(rootDir: string, dirs: string[]): string | undefined {
  if (!fs.existsSync(path.join(rootDir, '.git'))) return undefined;
  try {
    const branch = execFileSync('git', ['branch', '--show-current'], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim().toLowerCase();
    if (!branch) return undefined;
    return dirs.find((d) => branch.includes(path.basename(d).toLowerCase()));
  } catch {
    return undefined;
  }
}

function resolveActiveChangeDir(rootDir: string): string | undefined {
  const activeRoot = path.join(rootDir, 'specs', 'changes', 'active');
  if (!fs.existsSync(activeRoot)) return undefined;
  try {
    const dirs = fs
      .readdirSync(activeRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(activeRoot, d.name))
      .sort((a, b) => canonicalSort(a, b));
    const branchMatch = detectBranchChangeMatch(rootDir, dirs);
    if (branchMatch) return branchMatch;
    return dirs.find((d) => detectProfileFromChange(d) === 'patch') || dirs[0];
  } catch {
    return undefined;
  }
}

function detectGitDiffFiles(rootDir: string): string[] {
  if (!fs.existsSync(path.join(rootDir, '.git'))) return [];
  try {
    const tracked = execFileSync('git', ['diff', '--name-only', 'HEAD'], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const combined = `${tracked}\n${untracked}`
      .split(/\r?\n/)
      .map((f) => f.trim())
      .filter(Boolean);
    return Array.from(new Set(combined));
  } catch {
    return [];
  }
}

function resolveChangeDirectory(rootDir: string, options: ProgressiveFrictionOptions): string | undefined {
  if (options.changeDir) return options.changeDir;
  if (options.changeId) {
    const candidates = [
      path.join(rootDir, 'specs', options.changeId),
      path.join(rootDir, 'specs', 'changes', 'active', options.changeId),
      path.join(rootDir, 'examples', 'specs', options.changeId),
      path.join(rootDir, 'specs', 'changes', 'completed', options.changeId),
    ];
    return candidates.find((c) => fs.existsSync(c));
  }
  return resolveActiveChangeDir(rootDir);
}

function collectPatchViolations(rootDir: string, modifiedFiles: string[]): string[] {
  const violations: string[] = [];
  for (const rawFile of modifiedFiles) {
    const relPath = path.isAbsolute(rawFile) ? path.relative(rootDir, rawFile) : rawFile;
    if (isPathProtectedFromPatch(relPath)) {
      violations.push(
        `[ANTI-PATCH-BYPASS] File '${relPath}' is a protected path (security, schemas, architectural decisions, or master policies). Changes with 'patch' profile are strictly prohibited from modifying these paths. Must be reclassified to 'standard' or 'critical'.`
      );
    }
  }
  return violations;
}

function buildFrictionHeader(profile: ChangeProfile, success: boolean, fileCount: number): string[] {
  return [
    `# 🛡️ Progressive Friction and Anti-Bypass Verification Report`,
    ``,
    `> **Date:** ${resolveDeterministicDate().toISOString()}`,
    `> **Evaluated Profile:** \`${profile.toUpperCase()}\``,
    `> **Verdict:** ${success ? 'COMPLIANT ✅' : 'BLOCKED ❌'}`,
    ``,
    `---`,
    ``,
    `## 1. Evaluation of Modified Paths (${fileCount} files)`,
    ``,
  ];
}

function generateFrictionReportMarkdown(
  profile: ChangeProfile,
  success: boolean,
  modifiedFiles: string[],
  violations: string[]
): string {
  const header = buildFrictionHeader(profile, success, modifiedFiles.length);
  if (violations.length === 0) {
    return [...header, '✔ No Anti-Patch Bypass guardrail violations detected.'].join('\n');
  }
  const violationLines = violations.map((v) => `- ❌ ${v}`);
  return [...header, '### Detected Violations:', ...violationLines].join('\n');
}

export function verifyProgressiveFriction(
  options: ProgressiveFrictionOptions = {}
): ProgressiveFrictionResult {
  const rootDir = options.rootDir || process.cwd();
  const changeDir = resolveChangeDirectory(rootDir, options);
  const profile: ChangeProfile = changeDir ? detectProfileFromChange(changeDir) : 'standard';

  const modifiedFiles =
    options.diffFiles ||
    options.modifiedFiles ||
    (profile === 'patch' ? detectGitDiffFiles(rootDir) : []);

  const violations = profile === 'patch' ? collectPatchViolations(rootDir, modifiedFiles) : [];
  const bypassed = violations.length > 0;
  const success = !bypassed;

  return {
    success,
    profile,
    bypassed,
    violations,
    bypassedRules: violations,
    evaluatedFiles: modifiedFiles,
    errors: [],
    reportMarkdown: generateFrictionReportMarkdown(profile, success, modifiedFiles, violations),
  };
}
