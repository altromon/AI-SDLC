#!/usr/bin/env node
/**
 * AI-SDLC: Antigravity PostToolUse Skill-Compliance Reminder Hook
 * Reminds agents to run deterministic Gherkin extraction when specs with gherkin blocks are edited,
 * and warns if tests/features/*.feature is edited manually.
 */
const fs = require('fs');
const path = require('path');

function readPayloadTarget() {
  try {
    const raw = fs.readFileSync(0, 'utf-8').trim();
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    const input = parsed.tool_input || parsed.input || {};
    return String(input.Path || input.path || input.TargetFile || input.target_file || '');
  } catch {
    return '';
  }
}

const target = readPayloadTarget();
if (!target) process.exit(0);

const rel = path.relative(process.cwd(), path.resolve(process.cwd(), target)).replace(/\\/g, '/');
if (/^tests\/features\/.*\.feature$/i.test(rel)) {
  console.error('[AI-SDLC PostEdit Hook] Warning: tests/features/*.feature should be generated via "npx aisdlc gherkin extract" (skill: aisdlc-bdd-gherkin), not hand-edited.');
} else if (/^(specs|product|security)\/.*\.md$/i.test(rel) && fs.existsSync(target)) {
  try {
    const content = fs.readFileSync(target, 'utf-8');
    if (content.includes('```gherkin')) {
      console.log('[AI-SDLC PostEdit Hook] Spec with Gherkin modified. Run "npx aisdlc gherkin extract" and "npx aisdlc check --fix" to keep .feature files and SHA-256 digests in sync.');
    }
  } catch {}
}
process.exit(0);
