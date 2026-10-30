import { resolveDeterministicDate } from '../utils/time.js';
import type { SecuritySuppression } from '../types/index.js';

const SUPPRESSION_TRIGGER_REGEX =
  /(?:\/\/|#|--|\/\*)\s*(?:ai-sdlc:allow-sast|ai-sdlc:allow-secret|ai-sdlc:allow-prompt-injection|gitleaks:allow|pragma:\s*allowlist\s*secret|\bnosec\b)/i;

function extractAttribute(text: string, attrName: string): string | undefined {
  const pattern = new RegExp(`${attrName}\\s*=\\s*["']([^"']+)["']`, 'i');
  const match = text.match(pattern);
  return match ? match[1].trim() : undefined;
}

function determineSuppressionKind(line: string): 'sast' | 'secret' {
  if (line.includes('ai-sdlc:allow-secret') || line.includes('gitleaks:allow') || line.includes('allowlist secret')) {
    return 'secret';
  }
  return 'sast';
}

function isInformalSuppression(line: string): boolean {
  return line.includes('nosec') || line.includes('pragma: allowlist secret') || line.includes('gitleaks:allow');
}

function checkMissingFields(reason?: string, expires?: string, approvedBy?: string): string[] {
  const missing: string[] = [];
  if (!reason) missing.push('reason');
  if (!expires) missing.push('expires');
  if (!approvedBy) missing.push('approved-by');
  return missing;
}

function checkExpiration(
  expires: string,
  referenceDate?: Date
): { status: 'active' | 'expired' | 'invalid'; invalidReason?: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
    return { status: 'invalid', invalidReason: 'Formato de fecha expires inválido (se requiere YYYY-MM-DD)' };
  }
  const expDate = new Date(`${expires}T23:59:59.999Z`);
  if (isNaN(expDate.getTime())) {
    return { status: 'invalid', invalidReason: 'Fecha expires no es una fecha válida' };
  }
  const now = referenceDate || new Date();
  if (expDate.getTime() < now.getTime()) {
    return { status: 'expired', invalidReason: `Excepción caducada en fecha ${expires}` };
  }
  return { status: 'active' };
}

function evaluateSuppressionStatus(
  reason: string | undefined,
  expires: string | undefined,
  approvedBy: string | undefined,
  isInformal: boolean,
  referenceDate?: Date
): { status: 'active' | 'expired' | 'invalid'; invalidReason?: string } {
  if (isInformal) {
    return { status: 'invalid', invalidReason: 'Formato informal (nosec/allowlist no estructurado) no permitido' };
  }
  const missing = checkMissingFields(reason, expires, approvedBy);
  if (missing.length > 0) {
    return { status: 'invalid', invalidReason: `Faltan campos obligatorios: ${missing.join(', ')}` };
  }
  return checkExpiration(expires!, referenceDate);
}

function extractSuppressionAttrs(line: string) {
  return {
    ruleId: extractAttribute(line, 'rule'),
    reason: extractAttribute(line, 'reason'),
    expires: extractAttribute(line, 'expires'),
    approvedBy: extractAttribute(line, 'approved-by') || extractAttribute(line, 'approvedBy'),
  };
}

export function parseSecuritySuppression(
  line: string,
  filePath: string,
  lineNumber: number,
  referenceDate?: Date
): SecuritySuppression | null {
  if (!SUPPRESSION_TRIGGER_REGEX.test(line)) return null;

  const kind = determineSuppressionKind(line);
  const isInformal = isInformalSuppression(line);
  const attrs = extractSuppressionAttrs(line);
  const evalResult = evaluateSuppressionStatus(attrs.reason, attrs.expires, attrs.approvedBy, isInformal, referenceDate);

  return {
    kind,
    ruleId: attrs.ruleId,
    reason: attrs.reason,
    expires: attrs.expires,
    approvedBy: attrs.approvedBy,
    status: evalResult.status,
    filePath,
    lineNumber,
    rawComment: line.trim(),
    invalidReason: evalResult.invalidReason,
  };
}

function formatSuppressionRow(s: SecuritySuppression): string {
  const rule = s.ruleId ? `\`${s.ruleId}\`` : '*(all)*';
  const fileRef = `\`${s.filePath}:${s.lineNumber}\``;
  const reason = s.reason ? s.reason.replace(/\|/g, '\\|') : s.invalidReason || '*(Sin justificación)*';
  const expires = s.expires || 'N/A';
  const approver = s.approvedBy || '*(Sin aprobador)*';
  return `| ${s.kind.toUpperCase()} | ${rule} | ${fileRef} | ${reason} | ${expires} | ${approver} |`;
}

function buildAuditHeader(total: number, active: number, expired: number, invalid: number): string[] {
  return [
    '# 📋 Security Suppressions and Audit Exceptions Inventory',
    '',
    `> **Generated at:** ${resolveDeterministicDate().toISOString()}`,
    `> **Total Audited Suppressions:** ${total} | **Active:** ${active} | **Expired:** ${expired} | **Invalid:** ${invalid}`,
    '',
    '## 1. Executive Summary',
    '',
    '| Category | Count | Status | Policy Compliance |',
    '| :--- | :---: | :---: | :--- |',
    `| **Active Suppressions** | ${active} | 🟢 PASS | Permitted until expiration date |`,
    `| **Expired Suppressions** | ${expired} | ${expired > 0 ? '🔴 BLOCKED' : '🟢 PASS'} | Must be renewed or remediated immediately |`,
    `| **Invalid Suppressions** | ${invalid} | ${invalid > 0 ? '⚠️ REJECTED' : '🟢 PASS'} | Missing mandatory metadata fields |`,
    '',
  ];
}

function buildTableSection(title: string, items: SecuritySuppression[], emptyMsg: string): string[] {
  const lines = [
    title,
    '',
    '| Engine | Rule / ID | Location | Details / Justification | Expires | Approved By |',
    '| :--- | :--- | :--- | :--- | :--- | :--- |',
  ];
  if (items.length === 0) {
    lines.push(`| - | - | - | ${emptyMsg} | - | - |`);
  } else {
    for (const item of items) lines.push(formatSuppressionRow(item));
  }
  lines.push('');
  return lines;
}

export function generateSuppressionsAuditReport(suppressions: SecuritySuppression[]): string {
  const active = suppressions.filter((s) => s.status === 'active');
  const expired = suppressions.filter((s) => s.status === 'expired');
  const invalid = suppressions.filter((s) => s.status === 'invalid');

  return [
    ...buildAuditHeader(suppressions.length, active.length, expired.length, invalid.length),
    ...buildTableSection('## 2. Active Security Exceptions', active, '*(No active suppressions recorded)*'),
    ...buildTableSection('## 3. Expired or Invalid Exceptions (Blocking/Rejected)', [...expired, ...invalid], '*(No expired or invalid suppressions)*'),
  ].join('\n');
}
