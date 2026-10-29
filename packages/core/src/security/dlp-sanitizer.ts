/**
 * AI-SDLC: Deterministic Data Loss Prevention (DLP) Pre-Prompt Sanitizer (#74)
 * Pure, synchronous, offline-first redaction of sensitive credentials, PII, and internal URLs
 * before context is dispatched through MCP tools or CLI outputs to foundation models.
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';

export interface DlpRule {
  id: string;
  description: string;
  pattern: string;
  replacement: string;
  enabled?: boolean;
}

export interface DlpPolicy {
  version: string;
  enabled: boolean;
  zero_data_retention_required?: boolean;
  rules: DlpRule[];
}

export interface DlpSanitizeResult {
  sanitizedText: string;
  redactionCount: number;
  triggeredRuleIds: string[];
}

export const DEFAULT_DLP_RULES: readonly DlpRule[] = [
  {
    id: 'DLP-001-PRIVATE-KEY',
    description: 'PEM / RSA / EC / OPENSSH Private Key Block',
    pattern: '-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----[\\s\\S]*?-----END (?:[A-Z0-9_-]+ )?PRIVATE KEY-----',
    replacement: '[REDACTED:PRIVATE_KEY]',
    enabled: true,
  },
  {
    id: 'DLP-002-API-TOKEN',
    description: 'Cloud, GitHub, Slack, OpenAI, Stripe, and AWS Access Tokens',
    pattern:
      '\\b(?:gh[pousr]_[A-Za-z0-9_]{36,255}|github_pat_[0-9a-zA-Z_]{82}|sk-(?:proj-|live-)?[a-zA-Z0-9_-]{32,}|AKIA[0-9A-Z]{16}|xox[baprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*|(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,99})\\b',
    replacement: '[REDACTED:API_TOKEN]',
    enabled: true,
  },
  {
    id: 'DLP-003-JWT',
    description: 'Plaintext JSON Web Token (JWT)',
    pattern: '\\beyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\b',
    replacement: '[REDACTED:JWT_TOKEN]',
    enabled: true,
  },
  {
    id: 'DLP-004-CREDIT-CARD',
    description: 'Payment Card Number (13-19 digits formatted)',
    pattern: '\\b(?:\\d{4}[- ]\\d{4}[- ]\\d{4}[- ]\\d{4}|\\d{16})\\b',
    replacement: '[REDACTED:CREDIT_CARD]',
    enabled: true,
  },
  {
    id: 'DLP-005-EMAIL',
    description: 'Personal or Corporate Email Address',
    pattern: '\\b[A-Za-z0-9._%+-]+@(?!example\\.com|localhost|test\\.local)[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b',
    replacement: '[REDACTED:EMAIL]',
    enabled: true,
  },
  {
    id: 'DLP-006-INTERNAL-URL',
    description: 'Internal Intranet / Corp Service URL',
    pattern:
      'https?://(?:[A-Za-z0-9._-]+:[A-Za-z0-9._-]+@|[A-Za-z0-9.-]+\\.(?:internal|corp|intranet|local)\\b)[^\\s"\'`<>]*',
    replacement: '[REDACTED:INTERNAL_URL]',
    enabled: true,
  },
];

export function createDefaultDlpPolicy(): DlpPolicy {
  return {
    version: '1.0',
    enabled: true,
    zero_data_retention_required: true,
    rules: [...DEFAULT_DLP_RULES],
  };
}

function normalizeParsedRule(raw: Record<string, unknown>, idx: number): DlpRule | null {
  if (typeof raw.pattern !== 'string' || !raw.pattern) return null;
  return {
    id: typeof raw.id === 'string' ? raw.id : `DLP-CUSTOM-${idx + 1}`,
    description: typeof raw.description === 'string' ? raw.description : 'Custom DLP rule',
    pattern: raw.pattern,
    replacement: typeof raw.replacement === 'string' ? raw.replacement : '[REDACTED]',
    enabled: raw.enabled !== false,
  };
}

export function parseDlpPolicy(yamlContent: string): DlpPolicy {
  const fallback = createDefaultDlpPolicy();
  if (!yamlContent || !yamlContent.trim()) return fallback;
  try {
    const doc = yaml.load(yamlContent) as Record<string, unknown> | undefined;
    if (!doc || typeof doc !== 'object') return fallback;
    const rawRules = Array.isArray(doc.rules) ? (doc.rules as Record<string, unknown>[]) : [];
    const parsedRules = rawRules
      .map((r, i) => normalizeParsedRule(r, i))
      .filter((r): r is DlpRule => r !== null);

    return {
      version: typeof doc.version === 'string' ? doc.version : '1.0',
      enabled: doc.enabled !== false,
      zero_data_retention_required: Boolean(doc.zero_data_retention_required ?? true),
      rules: parsedRules.length > 0 ? parsedRules : fallback.rules,
    };
  } catch {
    return fallback;
  }
}

export function loadDlpPolicy(rootDir?: string, customPolicyPath?: string): DlpPolicy {
  const base = rootDir || process.cwd();
  const filePath = customPolicyPath
    ? path.isAbsolute(customPolicyPath)
      ? customPolicyPath
      : path.join(base, customPolicyPath)
    : path.join(base, 'dlp-policy.yaml');

  if (!fs.existsSync(filePath)) return createDefaultDlpPolicy();
  try {
    return parseDlpPolicy(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return createDefaultDlpPolicy();
  }
}

function applySingleDlpRule(text: string, rule: DlpRule): { output: string; matches: number } {
  if (rule.enabled === false) return { output: text, matches: 0 };
  try {
    const regex = new RegExp(rule.pattern, 'g');
    let matches = 0;
    const output = text.replace(regex, () => {
      matches++;
      return rule.replacement;
    });
    return { output, matches };
  } catch {
    return { output: text, matches: 0 };
  }
}

export function sanitizeDlpText(text: string, policy: DlpPolicy = createDefaultDlpPolicy()): DlpSanitizeResult {
  if (!policy.enabled || !text) {
    return { sanitizedText: text, redactionCount: 0, triggeredRuleIds: [] };
  }

  let current = text;
  let totalRedactions = 0;
  const triggered: string[] = [];

  for (const rule of policy.rules) {
    const res = applySingleDlpRule(current, rule);
    if (res.matches > 0) {
      current = res.output;
      totalRedactions += res.matches;
      triggered.push(rule.id);
    }
  }

  return {
    sanitizedText: current,
    redactionCount: totalRedactions,
    triggeredRuleIds: triggered,
  };
}

export function sanitizeDlpPayload<T>(payload: T, policy: DlpPolicy = createDefaultDlpPolicy()): T {
  if (!policy.enabled || payload === null || payload === undefined) return payload;
  if (typeof payload === 'string') {
    return sanitizeDlpText(payload, policy).sanitizedText as unknown as T;
  }
  const serialized = JSON.stringify(payload);
  const { sanitizedText } = sanitizeDlpText(serialized, policy);
  try {
    return JSON.parse(sanitizedText) as T;
  } catch {
    return payload;
  }
}
