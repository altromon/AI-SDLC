/**
 * Unit Tests for MCP Tools Security, Confinement, DLP, RBAC & Audit Trail
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001, FR-050-IDE-AGENT-TOOLS-MCP-001
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertSafeChangeId,
  assertWithinRoot,
  checkAllowedRoots,
  executeSecuredTool,
  formatCatchError,
  formatResponse,
  handleToolError,
  handleUnauthRole,
  hashParams,
  hasWriteFlags,
  isDoctorWrite,
  isKpiReleaseWrite,
  isRoleAuthorized,
  isVerifyPdacWrite,
  isVerifyPrivacyWrite,
  isVerifyQualityWrite,
  normalizeRoleString,
  recordAuditLog,
  recordToolAudit,
  resolveEffectiveRole,
  resolveExternalRoot,
  resolveOptionalPath,
  resolveRoot,
  runToolExecutor,
  safeToString,
  WRITE_FLAG_CHECKERS,
  type McpAuditLogEntry,
} from '../src/tools/index.js';

describe('MCP Tools Security, Confinement, DLP, RBAC & Audit Helpers', () => {
  let tmpDir: string;
  const originalEnvRole = process.env.AISDLC_MCP_ROLE;
  const originalAllowExt = process.env.AISDLC_MCP_ALLOW_EXTERNAL_ROOTS;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-mcp-sec-'));
    delete process.env.AISDLC_MCP_ROLE;
    delete process.env.AISDLC_MCP_ALLOW_EXTERNAL_ROOTS;
  });

  afterEach(() => {
    if (originalEnvRole === undefined) delete process.env.AISDLC_MCP_ROLE;
    else process.env.AISDLC_MCP_ROLE = originalEnvRole;
    if (originalAllowExt === undefined) delete process.env.AISDLC_MCP_ALLOW_EXTERNAL_ROOTS;
    else process.env.AISDLC_MCP_ALLOW_EXTERNAL_ROOTS = originalAllowExt;
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    vi.restoreAllMocks();
  });

  describe('safeToString & hashParams', () => {
    it('safeToString converts primitives, objects, and null-prototype objects without throwing', () => {
      expect(safeToString('hello')).toBe('hello');
      expect(safeToString(123)).toBe('123');
      expect(safeToString(null)).toBe('null');
      expect(safeToString(undefined)).toBe('undefined');
      const nullProto = Object.create(null);
      expect(safeToString(nullProto)).toBe('[Unstringifiable Object]');
    });

    it('hashParams normalizes key order and handles circular/BigInt/null-proto inputs safely', () => {
      expect(hashParams({ z: 1, a: 2 })).toBe(hashParams({ a: 2, z: 1 }));
      const expected = crypto.createHash('sha256').update(JSON.stringify({ a: 2, z: 1 })).digest('hex');
      expect(hashParams({ z: 1, a: 2 })).toBe(expected);

      const nullProto = Object.create(null) as Record<string, unknown>;
      nullProto.self = nullProto;
      expect(hashParams(nullProto)).toBe(
        crypto.createHash('sha256').update('[Unstringifiable Object]').digest('hex')
      );
      expect(hashParams({ big: 42n })).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Path confinement helpers (assertWithinRoot, resolveOptionalPath, assertSafeChangeId, checkAllowedRoots, resolveExternalRoot, resolveRoot)', () => {
    it('assertWithinRoot permits in-root paths including ..name files and rejects escapes', () => {
      expect(assertWithinRoot('src/index.ts', tmpDir)).toBe(path.resolve(tmpDir, 'src/index.ts'));
      expect(assertWithinRoot('..env', tmpDir)).toBe(path.resolve(tmpDir, '..env'));
      expect(assertWithinRoot('..meta/sub', tmpDir)).toBe(path.resolve(tmpDir, '..meta/sub'));
      expect(() => assertWithinRoot('..', tmpDir, 'p')).toThrow(/Security violation: p/);
      expect(() => assertWithinRoot('../evil', tmpDir, 'p')).toThrow(/escapes workspace root/);
    });

    it('resolveOptionalPath returns undefined when omitted and validates when provided', () => {
      expect(resolveOptionalPath(undefined, tmpDir, 'opt')).toBeUndefined();
      expect(resolveOptionalPath('', tmpDir, 'opt')).toBeUndefined();
      expect(resolveOptionalPath('reports/out.md', tmpDir, 'opt')).toBe(path.resolve(tmpDir, 'reports/out.md'));
      expect(() => resolveOptionalPath('../../out.md', tmpDir, 'opt')).toThrow(/Security violation: opt/);
    });

    it('assertSafeChangeId confines to specs/changes/active and rejects empty, dot, and separator inputs', () => {
      expect(assertSafeChangeId('chg-123-feat', tmpDir)).toBe(
        path.resolve(tmpDir, 'specs', 'changes', 'active', 'chg-123-feat')
      );
      for (const bad of ['', '   ', '.', '..', '../../evil', 'sub/dir', 'sub\\dir']) {
        expect(() => assertSafeChangeId(bad, tmpDir, 'change')).toThrow(/Security violation: change/);
      }
    });

    it('checkAllowedRoots treats undefined as unrestricted, [] as base-only, and validates allowedRoots', () => {
      const extDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-ext-allow-'));
      try {
        expect(checkAllowedRoots(extDir, tmpDir, undefined)).toBe(true);
        expect(checkAllowedRoots(extDir, tmpDir, [])).toBe(false);
        expect(checkAllowedRoots(path.join(tmpDir, 'sub'), tmpDir, [])).toBe(true);
        expect(checkAllowedRoots(path.join(tmpDir, '..env'), tmpDir, [])).toBe(true);
        expect(checkAllowedRoots(extDir, tmpDir, [extDir])).toBe(true);
        expect(checkAllowedRoots(`${extDir}-sibling`, tmpDir, [extDir])).toBe(false);
      } finally {
        fs.rmSync(extDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
    });

    it('resolveExternalRoot & resolveRoot enforce external root boundaries and env overrides', () => {
      const extDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-ext-res-'));
      try {
        expect(resolveExternalRoot(extDir, tmpDir, { allowedRoots: [extDir] })).toBe(path.resolve(extDir));
        expect(() => resolveExternalRoot(extDir, tmpDir, { allowedRoots: [] }, 'custom')).toThrow(
          /Security violation: custom .* escapes workspace root and allowed roots/
        );

        expect(resolveRoot(undefined, tmpDir)).toBe(path.resolve(tmpDir));
        expect(resolveRoot(extDir, tmpDir, { allowExternalRoots: true })).toBe(path.resolve(extDir));
        expect(() => resolveRoot('../../escape', tmpDir, { allowExternalRoots: true })).toThrow(/escapes workspace root/);
        expect(() => resolveRoot(extDir, tmpDir, { allowExternalRoots: false })).toThrow(/escapes workspace root/);

        process.env.AISDLC_MCP_ALLOW_EXTERNAL_ROOTS = 'false';
        expect(() => resolveRoot(extDir, tmpDir, { allowExternalRoots: true })).toThrow(/escapes workspace root/);
      } finally {
        fs.rmSync(extDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
    });
  });

  describe('DLP response & error formatting (formatResponse, formatCatchError)', () => {
    it('formatResponse handles strings, objects, undefined, circular objects, and custom DLP policies', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'dlp-policy.yaml'),
        'version: "1.0"\nrules:\n  - id: CUST\n    pattern: "MASK_ME_[0-9]+"\n    replacement: "[MASKED]"\n'
      );

      const strRes = formatResponse('hello MASK_ME_99', false, tmpDir);
      expect(strRes.isError).toBe(false);
      expect(strRes.content[0].text).toBe('hello [MASKED]');

      const undefRes = formatResponse(undefined, true, tmpDir);
      expect(undefRes.isError).toBe(true);
      expect(undefRes.content[0].text).toBe('');

      const circ: Record<string, unknown> = {};
      circ.self = circ;
      const circRes = formatResponse(circ, false, tmpDir);
      expect(circRes.content[0].text).toBe('[object Object]');

      fs.writeFileSync(path.join(tmpDir, 'dlp-policy.yaml'), ':::bad_yaml: [', 'utf-8');
      expect(() => formatResponse('ok', false, tmpDir)).toThrow(/Fail-Closed/);
    });

    it('formatCatchError formats Error, string, null, and null-prototype throwables with DLP', () => {
      const token = ['ghp_', '1234567890abcdefghijklmnopqrstuvwxyzABCD'].join('');
      const errRes = formatCatchError(new Error(`bad token ${token}`), tmpDir);
      expect(errRes.isError).toBe(true);
      expect(errRes.content[0].text).toContain('[REDACTED:API_TOKEN]');
      expect(errRes.content[0].text).not.toContain(token);

      const strRes = formatCatchError('plain string', tmpDir);
      expect(strRes.isError).toBe(true);
      expect(JSON.parse(strRes.content[0].text)).toEqual({ success: false, error: 'plain string' });

      const nullRes = formatCatchError(null, tmpDir);
      expect(nullRes.isError).toBe(true);
      expect(JSON.parse(nullRes.content[0].text)).toEqual({ success: false, error: 'null' });

      const nullProto = Object.create(null);
      const npRes = formatCatchError(nullProto, tmpDir);
      expect(npRes.isError).toBe(true);
      expect(JSON.parse(npRes.content[0].text).error).toBe('[Unstringifiable Object]');
    });
  });

  describe('RBAC helpers (normalizeRoleString, resolveEffectiveRole, WRITE_FLAG_CHECKERS, hasWriteFlags, isRoleAuthorized)', () => {
    it('normalizeRoleString & resolveEffectiveRole trim whitespace and prevent readonly escalation', () => {
      expect(normalizeRoleString('  auditor  ')).toBe('auditor');
      expect(normalizeRoleString(42)).toBe('');

      expect(resolveEffectiveRole(' auditor ', 'developer')).toBe('auditor');
      process.env.AISDLC_MCP_ROLE = ' reviewer ';
      expect(resolveEffectiveRole(undefined, 'developer')).toBe('reviewer');
      delete process.env.AISDLC_MCP_ROLE;

      expect(resolveEffectiveRole('developer', '   ')).toBe('developer');
      expect(resolveEffectiveRole('developer', 'agent-code-reviewer')).toBe('agent-code-reviewer');
      expect(resolveEffectiveRole(undefined, undefined)).toBe('developer');
    });

    it('WRITE_FLAG_CHECKERS predicates & hasWriteFlags accurately detect all write-capable flags', () => {
      expect(WRITE_FLAG_CHECKERS.verify_quality).toBe(isVerifyQualityWrite);
      expect(WRITE_FLAG_CHECKERS.verify_pdac).toBe(isVerifyPdacWrite);
      expect(WRITE_FLAG_CHECKERS.verify_privacy).toBe(isVerifyPrivacyWrite);
      expect(WRITE_FLAG_CHECKERS.kpi_release).toBe(isKpiReleaseWrite);
      expect(WRITE_FLAG_CHECKERS.doctor).toBe(isDoctorWrite);

      expect(isVerifyQualityWrite({ updateBaseline: true })).toBe(true);
      expect(isVerifyQualityWrite({})).toBe(false);
      expect(isVerifyPdacWrite({ autoSync: true })).toBe(true);
      expect(isVerifyPdacWrite({ autoSync: false })).toBe(false);
      expect(isVerifyPrivacyWrite({ generateRopa: true })).toBe(true);
      expect(isVerifyPrivacyWrite({ ropaOutputPath: 'r.md' })).toBe(true);
      expect(isVerifyPrivacyWrite({ reportOutputPath: 'p.md' })).toBe(true);
      expect(isVerifyPrivacyWrite({})).toBe(false);
      expect(isKpiReleaseWrite({ writeReports: true })).toBe(true);
      expect(isKpiReleaseWrite({ outputDir: 'out' })).toBe(true);
      expect(isKpiReleaseWrite({})).toBe(false);
      expect(isDoctorWrite({ fix: true })).toBe(true);
      expect(isDoctorWrite({ fix: false })).toBe(false);

      expect(hasWriteFlags('doctor', { fix: true })).toBe(true);
      expect(hasWriteFlags('verify_schemas', { fix: true })).toBe(false);
    });

    it('isRoleAuthorized enforces reviewer-only, mutation, and write-flag rules', () => {
      expect(isRoleAuthorized('review_submit', 'agent-code-reviewer')).toBe(true);
      expect(isRoleAuthorized('review_submit', 'AUDITOR')).toBe(true);
      expect(isRoleAuthorized('review_submit', 'developer')).toBe(false);
      expect(isRoleAuthorized('review_submit', 'readonly')).toBe(false);

      expect(isRoleAuthorized('sdd_deposit', 'developer')).toBe(true);
      expect(isRoleAuthorized('sdd_deposit', 'auditor')).toBe(false);

      expect(isRoleAuthorized('doctor', 'auditor', {})).toBe(true);
      expect(isRoleAuthorized('doctor', 'auditor', { fix: true })).toBe(false);
      expect(isRoleAuthorized('verify_quality', 'auditor', { updateBaseline: true })).toBe(false);
    });
  });

  describe('Audit & Secured Execution Pipeline (recordToolAudit, runToolExecutor, handleUnauthRole, handleToolError, executeSecuredTool)', () => {
    it('recordToolAudit records structured entries and runToolExecutor resolves sync/async/error executors', async () => {
      const entries: McpAuditLogEntry[] = [];
      recordToolAudit({ rootDir: tmpDir, enableAuditLog: false, onAuditLog: (e) => entries.push(e) }, 'verify', 'qa', 'h1', Date.now() - 5, true);
      expect(entries).toHaveLength(1);
      expect(entries[0].tool).toBe('verify');
      expect(entries[0].durationMs).toBeGreaterThanOrEqual(0);

      const syncOut = await runToolExecutor(() => ({ data: { ok: 1 } }), tmpDir);
      expect(syncOut).toEqual({ data: { ok: 1 }, isError: false, root: tmpDir });

      const asyncOut = await runToolExecutor(async () => ({ data: 'err', isError: true, root: '/custom' }), tmpDir);
      expect(asyncOut).toEqual({ data: 'err', isError: true, root: '/custom' });

      await expect(
        runToolExecutor(async () => {
          throw new Error('executor rejected');
        }, tmpDir)
      ).rejects.toThrow('executor rejected');
    });

    it('handleToolError & handleUnauthRole redact DLP secrets in BOTH response and audit log, and survive malformed dlp-policy.yaml', () => {
      fs.writeFileSync(
        path.join(tmpDir, 'dlp-policy.yaml'),
        'version: "1.0"\nrules:\n  - id: TOK\n    pattern: "SECRET_[A-Z0-9]+"\n    replacement: "[REDACTED_TOK]"\n'
      );
      const entries: McpAuditLogEntry[] = [];
      const opts = { rootDir: tmpDir, enableAuditLog: false, onAuditLog: (e: McpAuditLogEntry) => entries.push(e) };

      const errResp = handleToolError(opts, 'get_active_handoff', 'developer', 'abc', Date.now(), tmpDir, new Error('Missing SECRET_XYZ99'));
      expect(errResp.isError).toBe(true);
      expect(errResp.content[0].text).toContain('[REDACTED_TOK]');
      expect(entries[0].error).toBe('Missing [REDACTED_TOK]');
      expect(entries[0].error).not.toContain('SECRET_XYZ99');

      const rbacResp = handleUnauthRole(opts, 'sdd_deposit', 'auditor', 'def', Date.now(), tmpDir);
      expect(rbacResp.isError).toBe(true);
      expect(rbacResp.content[0].text).toContain('RBAC blocked');

      // Malformed dlp-policy.yaml fallback (must not throw unhandled rejection)
      fs.writeFileSync(path.join(tmpDir, 'dlp-policy.yaml'), ':::invalid: [', 'utf-8');
      const token = ['ghp_', '1234567890abcdefghijklmnopqrstuvwxyzABCD'].join('');
      const failClosedResp = handleToolError(opts, 'verify', 'developer', 'ghi', Date.now(), tmpDir, new Error(`leak ${token}`));
      expect(failClosedResp.isError).toBe(true);
      expect(failClosedResp.content[0].text).toContain('[REDACTED:API_TOKEN]');
      expect(entries[2].error).toContain('[REDACTED:API_TOKEN]');
    });

    it('executeSecuredTool executes authorized calls, blocks RBAC before executor, and catches errors', async () => {
      const entries: McpAuditLogEntry[] = [];
      const opts = { rootDir: tmpDir, role: 'developer', enableAuditLog: false, onAuditLog: (e: McpAuditLogEntry) => entries.push(e) };

      const okRes = await executeSecuredTool('verify_schemas', {}, opts, (r) => ({ data: { root: r } }));
      expect(okRes.isError).toBe(false);
      expect(JSON.parse(okRes.content[0].text).root).toBe(path.resolve(tmpDir));
      expect(entries[0].success).toBe(true);

      let called = false;
      const blockedRes = await executeSecuredTool('sdd_deposit', { change: 'c1', role: 'developer' }, { ...opts, role: ' auditor ' }, () => {
        called = true;
        return { data: {} };
      });
      expect(called).toBe(false);
      expect(blockedRes.isError).toBe(true);
      expect(blockedRes.content[0].text).toContain('RBAC blocked');

      const travRes = await executeSecuredTool('verify_schemas', { root: '../../outside' }, opts, () => ({ data: {} }));
      expect(travRes.isError).toBe(true);
      expect(travRes.content[0].text).toContain('escapes workspace root');

      const syncThrowRes = await executeSecuredTool('verify_schemas', {}, opts, () => {
        throw new Error('sync boom');
      });
      expect(syncThrowRes.isError).toBe(true);
      expect(JSON.parse(syncThrowRes.content[0].text)).toEqual({ success: false, error: 'sync boom' });
      expect(entries[entries.length - 1].success).toBe(false);
      expect(entries[entries.length - 1].error).toBe('sync boom');

      const asyncRejectRes = await executeSecuredTool('verify_schemas', {}, opts, async () => {
        throw new Error('async boom');
      });
      expect(asyncRejectRes.isError).toBe(true);
      expect(JSON.parse(asyncRejectRes.content[0].text)).toEqual({ success: false, error: 'async boom' });

      const executorErrRes = await executeSecuredTool('verify_schemas', {}, opts, () => ({
        data: { success: false, reason: 'failed check' },
        isError: true,
      }));
      expect(executorErrRes.isError).toBe(true);
      expect(JSON.parse(executorErrRes.content[0].text)).toEqual({ success: false, reason: 'failed check' });
      expect(entries[entries.length - 1].success).toBe(false);

      // Also verify recordAuditLog direct call
      const auditPath = path.join(tmpDir, 'reports', 'direct.jsonl');
      recordAuditLog({ rootDir: tmpDir, auditLogPath: 'reports/direct.jsonl' }, entries[0]);
      expect(fs.existsSync(auditPath)).toBe(true);
    });
  });
});
