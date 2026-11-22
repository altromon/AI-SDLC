/**
 * AI-SDLC Native MCP Server Tools — Security, Confinement, DLP, RBAC & Audit Trail
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  createDefaultDlpPolicy,
  isReviewerRole,
  loadDlpPolicy,
  sanitizeDlpText,
} from '@aisdlc/core';

export type McpRole =
  | 'admin'
  | 'developer'
  | 'architect'
  | 'qa'
  | 'devops'
  | 'auditor'
  | 'reviewer'
  | 'readonly'
  | string;

export interface McpAuditLogEntry {
  timestamp: string;
  tool: string;
  role: string;
  paramsHash: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

export interface RegisterToolsOptions {
  rootDir?: string;
  role?: McpRole;
  auditLogPath?: string;
  enableAuditLog?: boolean;
  onAuditLog?: (entry: McpAuditLogEntry) => void;
  allowExternalRoots?: boolean;
  allowedRoots?: string[];
}

export interface McpToolResponse {
  [x: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError: boolean;
}

export interface ToolExecutorResult {
  data: unknown;
  isError?: boolean;
  root?: string;
}

export type ToolExecutor = (resolvedRoot: string) => Promise<ToolExecutorResult> | ToolExecutorResult;

export const MUTATION_TOOLS = new Set([
  'new',
  'sdd_change_new',
  'sdd_check_fix',
  'sdd_deposit',
  'sdd_integrate',
  'migrate',
  'report',
  'report_dashboard',
  'report_quality',
]);

export const READONLY_ROLES = new Set([
  'auditor',
  'reviewer',
  'readonly',
  'agent-auditor',
  'agent-adversary',
  'agent-privacy-officer',
  'agent-expert-user',
  'agent-code-reviewer',
  'agent-security-auditor',
  'agent-compliance-checker',
]);

export const REVIEWER_ONLY_TOOLS = new Set(['review_submit']);

export function safeToString(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return String(value);
  } catch {
    return '[Unstringifiable Object]';
  }
}

export function hashParams(params: unknown): string {
  try {
    const raw = params && typeof params === 'object' ? params : {};
    const sortedKeys = Object.keys(raw as Record<string, unknown>).sort();
    const sortedObj: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      sortedObj[key] = (raw as Record<string, unknown>)[key];
    }
    return crypto.createHash('sha256').update(JSON.stringify(sortedObj)).digest('hex');
  } catch {
    const fallback = params ? safeToString(params) : '';
    return crypto.createHash('sha256').update(fallback).digest('hex');
  }
}

export function assertWithinRoot(targetPath: string, rootDir: string, paramName = 'path'): string {
  const normalizedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(normalizedRoot, targetPath);
  const relative = path.relative(normalizedRoot, resolvedTarget);
  if (/^\.\.(?:[\\/]|$)/.test(relative) || path.isAbsolute(relative)) {
    throw new Error(
      `Security violation: ${paramName} '${targetPath}' escapes workspace root '${normalizedRoot}' (Path Traversal blocked).`
    );
  }
  return resolvedTarget;
}

export function resolveOptionalPath(
  targetPath: string | undefined,
  rootDir: string,
  paramName: string
): string | undefined {
  return targetPath ? assertWithinRoot(targetPath, rootDir, paramName) : undefined;
}

export function assertSafeChangeId(change: string, rootDir: string, paramName = 'change'): string {
  const trimmed = change.trim();
  if (!trimmed || trimmed === '.' || trimmed === '..' || /[/\\]/.test(trimmed)) {
    throw new Error(
      `Security violation: ${paramName} '${change}' is invalid or escapes active changes root.`
    );
  }
  const activeRoot = path.join(path.resolve(rootDir), 'specs', 'changes', 'active');
  return assertWithinRoot(trimmed, activeRoot, paramName);
}

export function checkAllowedRoots(resolved: string, base: string, allowedRoots?: string[]): boolean {
  if (allowedRoots === undefined) return true;
  return [base, ...allowedRoots].some((allowed) => {
    const rel = path.relative(path.resolve(allowed), resolved);
    return !/^\.\.(?:[\\/]|$)/.test(rel) && !path.isAbsolute(rel);
  });
}

export function resolveExternalRoot(
  customRoot: string,
  base: string,
  options?: RegisterToolsOptions,
  paramName = 'root'
): string {
  const resolved = path.resolve(customRoot);
  if (!checkAllowedRoots(resolved, base, options?.allowedRoots)) {
    throw new Error(
      `Security violation: ${paramName} '${customRoot}' escapes workspace root and allowed roots (Path Traversal blocked).`
    );
  }
  return resolved;
}

export function resolveRoot(
  customRoot: string | undefined,
  defaultRoot: string,
  options?: RegisterToolsOptions,
  paramName = 'root'
): string {
  const base = defaultRoot || process.cwd();
  if (!customRoot) return path.resolve(base);

  const allowExternal =
    options?.allowExternalRoots !== false &&
    process.env.AISDLC_MCP_ALLOW_EXTERNAL_ROOTS !== 'false';

  if (path.isAbsolute(customRoot) && allowExternal) {
    return resolveExternalRoot(customRoot, base, options, paramName);
  }

  return assertWithinRoot(customRoot, base, paramName);
}

export function recordAuditLog(options: RegisterToolsOptions, entry: McpAuditLogEntry): void {
  if (options.onAuditLog) {
    try {
      options.onAuditLog(entry);
    } catch {
      // ignore callback error
    }
  }

  if (options.enableAuditLog !== false) {
    try {
      const baseRoot = options.rootDir || process.cwd();
      const logFile = options.auditLogPath
        ? path.resolve(baseRoot, options.auditLogPath)
        : path.join(baseRoot, 'reports', 'mcp-audit.jsonl');
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n', 'utf-8');
    } catch {
      // ignore disk write failure
    }
  }
}

export function formatResponse(data: unknown, isError = false, rootDir?: string): McpToolResponse {
  let rawText: string;
  if (typeof data === 'string') {
    rawText = data;
  } else {
    try {
      rawText = JSON.stringify(data, null, 2) ?? '';
    } catch {
      rawText = safeToString(data);
    }
  }
  const dlpPolicy = loadDlpPolicy(rootDir);
  const { sanitizedText } = sanitizeDlpText(rawText, dlpPolicy);
  return {
    content: [
      {
        type: 'text' as const,
        text: sanitizedText,
      },
    ],
    isError,
  };
}

export function formatCatchError(err: unknown, rootDir?: string): McpToolResponse {
  const message = err instanceof Error ? err.message : safeToString(err);
  return formatResponse({ success: false, error: message }, true, rootDir);
}

export function normalizeRoleString(role: unknown): string {
  return typeof role === 'string' ? role.trim() : '';
}

export function resolveEffectiveRole(optionsRole?: string, paramsRole?: unknown): string {
  const opt = normalizeRoleString(optionsRole);
  if (opt && READONLY_ROLES.has(opt.toLowerCase())) return opt;
  const envRole = normalizeRoleString(process.env.AISDLC_MCP_ROLE);
  if (envRole && READONLY_ROLES.has(envRole.toLowerCase())) return envRole;
  const param = normalizeRoleString(paramsRole);
  return param || opt || envRole || 'developer';
}

export function isVerifyQualityWrite(p: Record<string, unknown>): boolean {
  return Boolean(p.updateBaseline);
}

export function isVerifyPdacWrite(p: Record<string, unknown>): boolean {
  return Boolean(p.autoSync);
}

export function isVerifyPrivacyWrite(p: Record<string, unknown>): boolean {
  return Boolean(p.generateRopa || p.ropaOutputPath || p.reportOutputPath);
}

export function isKpiReleaseWrite(p: Record<string, unknown>): boolean {
  return Boolean(p.writeReports || p.outputDir);
}

export function isDoctorWrite(p: Record<string, unknown>): boolean {
  return Boolean(p.fix);
}

export const WRITE_FLAG_CHECKERS: Record<string, (p: Record<string, unknown>) => boolean> = {
  verify_quality: isVerifyQualityWrite,
  verify_pdac: isVerifyPdacWrite,
  verify_privacy: isVerifyPrivacyWrite,
  kpi_release: isKpiReleaseWrite,
  doctor: isDoctorWrite,
};

export function hasWriteFlags(tool: string, params: Record<string, unknown>): boolean {
  const check = WRITE_FLAG_CHECKERS[tool];
  return check ? check(params) : false;
}

export function isRoleAuthorized(tool: string, role: string, params: Record<string, unknown> = {}): boolean {
  const norm = role.toLowerCase();
  if (REVIEWER_ONLY_TOOLS.has(tool)) {
    return isReviewerRole(norm);
  }
  if (MUTATION_TOOLS.has(tool)) {
    return !READONLY_ROLES.has(norm);
  }
  if (READONLY_ROLES.has(norm) && hasWriteFlags(tool, params)) {
    return false;
  }
  return true;
}

export function recordToolAudit(
  options: RegisterToolsOptions,
  tool: string,
  role: string,
  paramsHash: string,
  startMs: number,
  success: boolean,
  error?: string
): void {
  recordAuditLog(options, {
    timestamp: new Date().toISOString(),
    tool,
    role,
    paramsHash,
    success,
    durationMs: Date.now() - startMs,
    error,
  });
}

export async function runToolExecutor(executor: ToolExecutor, targetRoot: string) {
  const result = await executor(targetRoot);
  return {
    data: result.data,
    isError: Boolean(result.isError),
    root: result.root || targetRoot,
  };
}

export function handleUnauthRole(
  options: RegisterToolsOptions,
  tool: string,
  role: string,
  hash: string,
  start: number,
  root: string
): McpToolResponse {
  const msg = `Security violation: Role '${role}' is not authorized to invoke mutation tool '${tool}' (RBAC blocked).`;
  return handleToolError(options, tool, role, hash, start, root, new Error(msg));
}

export function handleToolError(
  options: RegisterToolsOptions,
  tool: string,
  role: string,
  hash: string,
  start: number,
  root: string,
  err: unknown
): McpToolResponse {
  const rawMsg = err instanceof Error ? err.message : safeToString(err);
  try {
    const policy = loadDlpPolicy(root);
    const safeMsg = sanitizeDlpText(rawMsg, policy).sanitizedText;
    recordToolAudit(options, tool, role, hash, start, false, safeMsg);
    return formatCatchError(err, root);
  } catch {
    const safeMsg = sanitizeDlpText(rawMsg, createDefaultDlpPolicy()).sanitizedText;
    recordToolAudit(options, tool, role, hash, start, false, safeMsg);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ success: false, error: safeMsg }, null, 2) }],
      isError: true,
    };
  }
}

export async function executeSecuredTool<T extends Record<string, unknown>>(
  toolName: string,
  params: T,
  options: RegisterToolsOptions,
  executor: ToolExecutor
): Promise<McpToolResponse> {
  const start = Date.now();
  const role = resolveEffectiveRole(options.role, params.role);
  const hash = hashParams(params);
  const baseRoot = options.rootDir || process.cwd();

  if (!isRoleAuthorized(toolName, role, params)) {
    return handleUnauthRole(options, toolName, role, hash, start, baseRoot);
  }

  try {
    const targetRoot = resolveRoot(params.root as string | undefined, baseRoot, options);
    const res = await runToolExecutor(executor, targetRoot);
    recordToolAudit(options, toolName, role, hash, start, !res.isError);
    return formatResponse(res.data, res.isError, res.root);
  } catch (err: unknown) {
    return handleToolError(options, toolName, role, hash, start, baseRoot, err);
  }
}
