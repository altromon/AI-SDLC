/**
 * Skill Execution Evidence Verifier
 * Audits reports/mcp-audit.jsonl to verify expected MCP tool traces for each lifecycle skill.
 */

import * as fs from 'fs';
import * as path from 'path';

export type SkillEvidenceStatus = 'VERIFIED' | 'PARTIAL' | 'NO_EVIDENCE';

export interface SkillExecutionEvidenceResult {
  skillId: string;
  status: SkillEvidenceStatus;
  expectedTools: readonly string[];
  executedTools: string[];
  missingExpectedTools: string[];
}

export const SKILL_EXPECTED_TOOLS: Record<string, readonly string[]> = {
  'aisdlc-greenfield': ['new', 'verify_schemas', 'sdd_change_new', 'verify'],
  'aisdlc-legacy-onboarding': ['verify_licenses', 'verify_security', 'verify_privacy', 'sdd_check_fix'],
  'aisdlc-increment': ['sdd_change_new', 'verify_governance', 'sdd_check_fix', 'verify'],
  'aisdlc-inspector': ['inspect_element'],
  'aisdlc-doctor-migrate': ['doctor', 'migrate'],
  'aisdlc-release-compliance': ['verify', 'kpi_release', 'report_dashboard'],
  'aisdlc-security-sca-triage': ['verify_security', 'verify_privacy', 'verify_licenses'],
  'aisdlc-bdd-gherkin': ['sdd_check_fix', 'verify_testing'],
  'aisdlc-spot-audit': ['inspect_element'],
};

function readExecutedMcpTools(auditLogFile: string): Set<string> {
  const executed = new Set<string>();
  if (!fs.existsSync(auditLogFile)) return executed;

  const lines = fs.readFileSync(auditLogFile, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const entry = JSON.parse(trimmed) as { tool?: unknown; success?: unknown };
      if (typeof entry.tool === 'string' && entry.success === true) {
        executed.add(entry.tool);
      }
    } catch {
      // Ignore malformed JSONL lines
    }
  }
  return executed;
}

export function verifySkillExecutionEvidence(
  rootDir: string,
  skillId: string,
  auditLogPath?: string
): SkillExecutionEvidenceResult {
  const expectedTools = SKILL_EXPECTED_TOOLS[skillId] || [];
  const logFile = auditLogPath || path.join(path.resolve(rootDir), 'reports', 'mcp-audit.jsonl');
  const allExecuted = readExecutedMcpTools(logFile);

  const executedTools = expectedTools.filter((t) => allExecuted.has(t));
  const missingExpectedTools = expectedTools.filter((t) => !allExecuted.has(t));

  let status: SkillEvidenceStatus = 'NO_EVIDENCE';
  if (expectedTools.length > 0 && missingExpectedTools.length === 0) {
    status = 'VERIFIED';
  } else if (executedTools.length > 0) {
    status = 'PARTIAL';
  }

  return { skillId, status, expectedTools, executedTools, missingExpectedTools };
}
