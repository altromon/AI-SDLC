/**
 * AI-SDLC: Progressive Friction & Anti-Bypass Verifier
 */

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
        const parsedFm = yaml.load(match[1]) as any;
        if (
          parsedFm &&
          parsedFm.profile &&
          ['patch', 'standard', 'critical'].includes(parsedFm.profile)
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

export function verifyProgressiveFriction(
  options: ProgressiveFrictionOptions = {}
): ProgressiveFrictionResult {
  const rootDir = options.rootDir || process.cwd();
  let changeDir = options.changeDir;

  if (!changeDir && options.changeId) {
    const candidates = [
      path.join(rootDir, 'specs', options.changeId),
      path.join(rootDir, 'specs', 'changes', 'active', options.changeId),
      path.join(rootDir, 'examples', 'specs', options.changeId),
      path.join(rootDir, 'specs', 'changes', 'completed', options.changeId),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        changeDir = c;
        break;
      }
    }
  }

  const modifiedFiles = options.diffFiles || options.modifiedFiles || [];

  const profile: ChangeProfile = changeDir
    ? detectProfileFromChange(changeDir)
    : 'standard';

  const violations: string[] = [];

  if (profile === 'patch') {
    for (const rawFile of modifiedFiles) {
      const relPath = path.isAbsolute(rawFile)
        ? path.relative(rootDir, rawFile)
        : rawFile;

      if (isPathProtectedFromPatch(relPath)) {
        violations.push(
          `[ANTI-PATCH-BYPASS] File '${relPath}' is a protected path (security, schemas, architectural decisions, or master policies). Changes with 'patch' profile are strictly prohibited from modifying these paths. Must be reclassified to 'standard' or 'critical'.`
        );
      }
    }
  }

  const bypassed = violations.length > 0;
  const success = !bypassed;

  const reportMarkdown = [
    `# 🛡️ Progressive Friction and Anti-Bypass Verification Report`,
    ``,
    `> **Date:** ${new Date().toISOString()}`,
    `> **Evaluated Profile:** \`${profile.toUpperCase()}\``,
    `> **Verdict:** ${success ? 'COMPLIANT ✅' : 'BLOCKED ❌'}`,
    ``,
    `---`,
    ``,
    `## 1. Evaluation of Modified Paths (${modifiedFiles.length} files)`,
    ``,
  ];

  if (violations.length === 0) {
    reportMarkdown.push(`✔ No Anti-Patch Bypass guardrail violations detected.`);
  } else {
    reportMarkdown.push(`### Detected Violations:`);
    for (const v of violations) {
      reportMarkdown.push(`- ❌ ${v}`);
    }
  }

  return {
    success,
    profile,
    bypassed,
    violations,
    bypassedRules: violations,
    evaluatedFiles: modifiedFiles,
    errors: [],
    reportMarkdown: reportMarkdown.join('\n'),
  };
}
