/**
 * Cites: FR-037-SDD-INTEGRATE-CONCURRENCY-001, FR-045-PDAC-SCHEMA-FAIL-CLOSED-001, FR-046-NATIVE-SDK-CLI-AST-001, FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001, FR-063-UI-E2E-MODALITY-GATE-001
 * Tag: @FR-037-SDD-INTEGRATE-CONCURRENCY-001 @FR-045-PDAC-SCHEMA-FAIL-CLOSED-001 @FR-046-NATIVE-SDK-CLI-AST-001 @FR-061-INCREMENT-PROFILE-AND-SEMVER-GUARD-001 @FR-063-UI-E2E-MODALITY-GATE-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DuplicateIssue, ProductHandoff, SddFramework } from '@aisdlc/core';
import {
  auditDuplicatesShiftLeft,
  auditHandoffsMap,
  buildFailedScaffoldResult,
  buildHandoffPayload,
  emitBatchIntegrateJson,
  emitChangeNewJson,
  emitDepositJson,
  emitIntegrateJson,
  emitSddVerifyJson,
  executeSingleSddIntegrate,
  handlePendingTasks,
  handleScaffoldOutput,
  handleSddIntegrateError,
  handleSddVerifyError,
  handleUndetectedChange,
  parseCsvTokens,
  printBatchIntegrationResult,
  printChangeNewFailure,
  printChangeNewHeader,
  printChangeNewSuccess,
  printDepositError,
  printDepositHeader,
  printDepositSuccess,
  printHandoffEntry,
  printIntegrationFailure,
  printIntegrationSuccess,
  printSddVerifyHeader,
  printSddVerifyVerdict,
  processHandoffEntry,
  renderSingleIntegrationOutput,
  resolveAutoChange,
  resolveIntegrationChangeId,
  runBatchSddIntegrate,
  runChangeNew,
  runSddDeposit,
  runSddIntegrate,
  runSddVerify,
} from '../src/commands/sdd.js';

describe('CLI sdd.ts helper and runner unit suite (100% function coverage)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-sdd-helpers-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('parseCsvTokens & buildHandoffPayload: trims CSV tokens, strips empties, and guards undefined changeId', () => {
    expect(parseCsvTokens(' FR-1 , , FR-2 ', ['FR-001'])).toEqual(['FR-1', 'FR-2']);
    expect(parseCsvTokens('  ,  ', ['FR-001'])).toEqual(['FR-001']);
    expect(parseCsvTokens(undefined, ['UC-001'])).toEqual(['UC-001']);

    const happy = buildHandoffPayload(
      { change: 'chg-010-auth', framework: 'openspec', title: 'Auth Title', requirements: 'FR-1, FR-2', useCases: 'UC-9' },
      'chg-010-auth'
    );
    expect(happy.handoff.id).toBe('HOF-CHG-010-AUTH');
    expect(happy.handoff.title).toBe('Auth Title');
    expect(happy.reqList).toEqual(['FR-1', 'FR-2']);
    expect(happy.handoff.subgraph.useCases).toEqual(['UC-9']);

    const fallback = buildHandoffPayload(
      { change: undefined as unknown as string, framework: 'speckit', requirements: '  , ', useCases: '  ' },
      undefined as unknown as string
    );
    expect(fallback.handoff.id).toBe('HOF-');
    expect(fallback.handoff.changeId).toBe('');
    expect(fallback.reqList).toEqual(['FR-001']);
    expect(fallback.handoff.subgraph.useCases).toEqual(['UC-001']);
  });

  it('printDepositHeader, printDepositSuccess, printDepositError & emitDepositJson format deposit output and avoid "undefined"', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    printDepositHeader('chg-01', 'openspec');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("'chg-01' (openspec)"));

    printDepositSuccess('/tmp/handoff.yaml', 'HOF-CHG-01', ['FR-1', 'FR-2']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('/tmp/handoff.yaml'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('HOF-CHG-01'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('FR-1, FR-2'));

    printDepositError(new Error('disk full'));
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('disk full'));
    printDepositError('raw failure');
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('raw failure'));

    logSpy.mockClear();
    const hof: ProductHandoff = {
      id: 'HOF-CHG-01',
      type: 'handoff',
      changeId: 'chg-01',
      subgraph: { requirements: ['FR-1'] },
    };
    emitDepositJson(true, 'chg-01', 'openspec', '/tmp/handoff.yaml', hof);
    const okJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(okJson.command).toBe('sdd:deposit');
    expect(okJson.success).toBe(true);
    expect(okJson.exitCode).toBe(0);
    expect(okJson.depositedPath).toBe('/tmp/handoff.yaml');

    emitDepositJson(false, 'chg-01', 'openspec', undefined, undefined, undefined);
    const unknownErrJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(unknownErrJson.success).toBe(false);
    expect(unknownErrJson.exitCode).toBe(1);
    expect(unknownErrJson.error).toBe('Unknown deposit error');

    emitDepositJson(false, 'chg-01', 'openspec', undefined, undefined, new Error('EACCES'));
    const explicitErrJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(explicitErrJson.error).toBe('EACCES');
  });

  it('runSddDeposit handles openspec, speckit, undefined changeId, and invalid framework/root cleanly', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(
      runSddDeposit({
        root: tmpDir,
        change: 'chg-spec-01',
        framework: 'speckit',
        requirements: 'FR-10, ',
        useCases: 'UC-10',
        json: true,
      })
    ).toBe(true);
    const speckitJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(speckitJson.success).toBe(true);
    expect(speckitJson.handoff.subgraph.requirements).toEqual(['FR-10']);

    // Undefined changeId must not crash with uncaught TypeError before try block
    expect(
      runSddDeposit({
        root: tmpDir,
        change: undefined as unknown as string,
        framework: 'invalid-fw' as unknown as SddFramework,
        json: true,
      })
    ).toBe(false);
    const fwErrJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(fwErrJson.success).toBe(false);
    expect(fwErrJson.exitCode).toBe(1);
    expect(fwErrJson.error).toContain('invalid-fw');

    const fileAsRoot = path.join(tmpDir, 'not-a-dir.txt');
    fs.writeFileSync(fileAsRoot, 'x', 'utf-8');
    expect(runSddDeposit({ root: fileAsRoot, change: 'chg-1', framework: 'openspec' })).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Error depositing sidecar'));
  });

  it('printHandoffEntry, processHandoffEntry & auditHandoffsMap validate HOF-* entries and handle non-string ids', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printHandoffEntry(true, 'HOF-1', 'specs/changes/active/chg-1', 2);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('HOF-1'));
    printHandoffEntry(false, 'BAD-1', 'specs/changes/active/chg-2', 0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid handoff schema'));

    const validHof: ProductHandoff = {
      id: 'HOF-VALID',
      type: 'handoff',
      changeId: 'chg-valid',
      subgraph: { requirements: ['FR-1', 'FR-2'] },
    };
    const validDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-valid');
    const validItem = processHandoffEntry(validHof, validDir, tmpDir, true);
    expect(validItem).toEqual({
      id: 'HOF-VALID',
      changeDir: 'specs/changes/active/chg-valid',
      isValid: true,
      requirementsCount: 2,
    });

    const numericIdHof = {
      id: 123 as unknown as string,
      type: 'handoff',
      changeId: 'chg-num',
      subgraph: { requirements: ['FR-1'] },
    };
    const numericItem = processHandoffEntry(numericIdHof, validDir, tmpDir, false);
    expect(numericItem.isValid).toBe(false);
    expect(numericItem.id).toBe('UNKNOWN');

    const noSubgraphHof = { id: 'HOF-EMPTY', type: 'handoff', changeId: 'chg-empty' } as ProductHandoff;
    expect(processHandoffEntry(noSubgraphHof, validDir, tmpDir, true).isValid).toBe(false);

    logSpy.mockClear();
    const emptyAudit = auditHandoffsMap(new Map(), tmpDir, false);
    expect(emptyAudit).toEqual({ handoffItems: [], validCount: 0, invalidCount: 0 });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No handoff.yaml'));

    const mixedMap = new Map<string, { handoff: ProductHandoff; changeDir: string }>([
      ['a', { handoff: validHof, changeDir: validDir }],
      ['b', { handoff: noSubgraphHof, changeDir: validDir }],
    ]);
    const mixedAudit = auditHandoffsMap(mixedMap, tmpDir, true);
    expect(mixedAudit.validCount).toBe(1);
    expect(mixedAudit.invalidCount).toBe(1);
    expect(mixedAudit.handoffItems).toHaveLength(2);
  });

  it('auditDuplicatesShiftLeft, emitSddVerifyJson, printSddVerifyVerdict, printSddVerifyHeader, handleSddVerifyError & runSddVerify', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(auditDuplicatesShiftLeft(tmpDir, false, false)).toEqual({ duplicateErrors: 0, duplicateIssues: [] });
    expect(auditDuplicatesShiftLeft(tmpDir, true, true).duplicateErrors).toBe(0);

    // Create duplicate requirement IDs to trigger shift-left failure
    const prodDir = path.join(tmpDir, 'product', 'requirements');
    fs.mkdirSync(prodDir, { recursive: true });
    fs.writeFileSync(path.join(prodDir, 'FR-DUP-A.md'), '---\nid: FR-DUP-001\ntype: requirement\ntitle: A\n---\n', 'utf-8');
    fs.writeFileSync(path.join(prodDir, 'FR-DUP-B.md'), '---\nid: FR-DUP-001\ntype: requirement\ntitle: B\n---\n', 'utf-8');

    const dupAudit = auditDuplicatesShiftLeft(tmpDir, true, false);
    expect(dupAudit.duplicateErrors).toBeGreaterThan(0);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('FR-DUP-001'));

    logSpy.mockClear();
    printSddVerifyHeader(3);
    const verifyHdr = logSpy.mock.calls.map((c) => String(c[0])).join('\n').replace(/\u001b\[[0-9;]*m/g, '');
    expect(verifyHdr).toMatch(/Found PDaC sidecars:\s*3$/m);
    printSddVerifyVerdict(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('COMPLIANT'));
    printSddVerifyVerdict(false);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('BLOCKED'));

    const sampleIssues: DuplicateIssue[] = [
      { type: 'ID_COLLISION', severity: 'ERROR', id: 'FR-DUP-001', file: 'a.md', message: 'dup' },
    ];
    emitSddVerifyJson({
      isOk: false,
      totalFound: 1,
      validCount: 0,
      invalidCount: 1,
      duplicateErrors: 1,
      handoffItems: [{ id: 'BAD', changeDir: 'specs/x', isValid: false, requirementsCount: 0 }],
      duplicateIssues: sampleIssues,
    });
    const verifyJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(verifyJson.command).toBe('sdd:verify');
    expect(verifyJson.success).toBe(false);
    expect(verifyJson.exitCode).toBe(1);

    // Blocked on duplicate IDs, compliant when checkDuplicates: false
    expect(runSddVerify({ root: tmpDir, json: true })).toBe(false);
    expect(runSddVerify({ root: tmpDir, checkDuplicates: false, silent: true })).toBe(true);

    // Error handler path
    expect(handleSddVerifyError(new Error('boom'), false, true)).toBe(false);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('boom'));
    const verifyErrPayload = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(verifyErrPayload.command).toBe('sdd:verify');
    expect(verifyErrPayload.error).toBe('boom');
  });

  it('handleUndetectedChange, handlePendingTasks, resolveAutoChange & resolveIntegrationChangeId handle all branches', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(handleUndetectedChange({ detected: false, reasons: ['no branch'] }, false, true)).toBeNull();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('no branch'));
    expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).error).toContain('No active SDD change');

    expect(
      handlePendingTasks(
        { detected: true, changeId: 'chg-pend', allTasksCompleted: false, completedTasksCount: 1, totalTasksCount: 3, reasons: [] },
        false,
        true
      )
    ).toBeNull();
    expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).completedTasksCount).toBe(1);

    // Whitespace --change rejected cleanly
    expect(resolveIntegrationChangeId({ root: tmpDir, change: '   ' }, tmpDir, false, true)).toBeNull();
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('--change <id>'));
    expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).exitCode).toBe(1);

    // Explicit --change returned trimmed
    expect(resolveIntegrationChangeId({ root: tmpDir, change: '  chg-explicit  ' }, tmpDir, true, false)).toBe('chg-explicit');

    // Auto detection with no active change
    expect(resolveAutoChange({ root: tmpDir, auto: true }, tmpDir, true, false)).toBeNull();

    // Auto detection with pending tasks vs completed tasks
    const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-auto-01');
    fs.mkdirSync(chgDir, { recursive: true });
    fs.writeFileSync(path.join(chgDir, 'handoff.yaml'), 'id: HOF-AUTO-01\nchangeId: chg-auto-01\nsubgraph:\n  requirements: [FR-1]\n', 'utf-8');
    fs.writeFileSync(path.join(chgDir, 'tasks.md'), '- [ ] TSK-1: Pending\n', 'utf-8');
    expect(resolveAutoChange({ root: tmpDir, auto: true }, tmpDir, true, false)).toBeNull();

    fs.writeFileSync(path.join(chgDir, 'tasks.md'), '- [x] TSK-1: Done\n', 'utf-8');
    expect(resolveAutoChange({ root: tmpDir, auto: true }, tmpDir, false, false)).toBe('chg-auto-01');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('chg-auto-01'));
  });

  it('printIntegrationSuccess, printIntegrationFailure, emitIntegrateJson, renderSingleIntegrationOutput, executeSingleSddIntegrate & handleSddIntegrateError', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printIntegrationSuccess('chg-1', {
      success: true,
      changeId: 'chg-1',
      completedTasks: ['TSK-1'],
      pendingTasks: [],
      integratedRequirements: ['FR-1'],
      createdCanonicalArtifacts: ['specs/product/FR-1.md'],
      updatedProductArtifacts: ['product/README.md'],
      updatedArchitectureArtifacts: ['architecture/README.md'],
      archived: true,
      archivedPath: 'specs/changes/completed/chg-1',
      errors: [],
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('specs/changes/completed/chg-1'));

    printIntegrationFailure('chg-1', ['missing tasks.md']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('missing tasks.md'));

    logSpy.mockClear();
    emitIntegrateJson('chg-1', {
      success: false,
      changeId: 'chg-1',
      completedTasks: [],
      pendingTasks: ['TSK-1'],
      integratedRequirements: [],
      updatedProductArtifacts: [],
      updatedArchitectureArtifacts: [],
      archived: false,
      errors: ['pending'],
    });
    const failJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(failJson.exitCode).toBe(1);
    expect(failJson.createdCanonicalArtifacts).toEqual([]);

    renderSingleIntegrationOutput(
      'chg-1',
      {
        success: true,
        changeId: 'chg-1',
        completedTasks: ['TSK-1'],
        pendingTasks: [],
        integratedRequirements: [],
        updatedProductArtifacts: [],
        updatedArchitectureArtifacts: [],
        archived: false,
        errors: [],
      },
      false,
      true
    );
    expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).exitCode).toBe(0);

    // Full executeSingleSddIntegrate & runSddIntegrate happy path on completed change
    const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-exec-01');
    fs.mkdirSync(chgDir, { recursive: true });
    fs.writeFileSync(path.join(chgDir, 'handoff.yaml'), 'id: HOF-EXEC-01\nchangeId: chg-exec-01\nsubgraph:\n  requirements: [FR-1]\n', 'utf-8');
    fs.writeFileSync(path.join(chgDir, 'tasks.md'), '- [x] TSK-1: Done\n', 'utf-8');
    expect(executeSingleSddIntegrate({ root: tmpDir, change: 'chg-exec-01' }, tmpDir, false, false)).toBe(true);
    expect(runSddIntegrate({ root: tmpDir, change: 'chg-nonexistent', silent: true })).toBe(false);

    expect(handleSddIntegrateError('chg-err', new Error('unexpected io'), false, true)).toBe(false);
    expect(JSON.parse(String(logSpy.mock.calls.at(-1)?.[0])).errors).toEqual(['unexpected io']);
  });

  it('printBatchIntegrationResult, emitBatchIntegrateJson & runBatchSddIntegrate cover empty, success, and error cases', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printBatchIntegrationResult({
      success: true,
      processedChanges: ['chg-1'],
      skippedChanges: [],
      results: [],
      updatedProductArtifacts: ['a.md'],
      updatedArchitectureArtifacts: [],
      createdCanonicalArtifacts: [],
      syncedDigestsCount: 2,
      errors: [],
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('COMPLETED (EXIT 0)'));

    printBatchIntegrationResult({
      success: false,
      processedChanges: [],
      skippedChanges: [{ changeId: 'chg-2', reason: 'pending' }],
      results: [],
      updatedProductArtifacts: [],
      updatedArchitectureArtifacts: [],
      createdCanonicalArtifacts: [],
      syncedDigestsCount: 0,
      errors: ['batch error'],
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('batch error'));

    logSpy.mockClear();
    emitBatchIntegrateJson({
      success: true,
      processedChanges: [],
      skippedChanges: [],
      results: [],
      updatedProductArtifacts: [],
      updatedArchitectureArtifacts: [],
      createdCanonicalArtifacts: [],
      syncedDigestsCount: 0,
      errors: [],
    });
    const batchJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(batchJson.command).toBe('sdd:integrate:all');
    expect(batchJson.exitCode).toBe(0);

    expect(runBatchSddIntegrate({ root: tmpDir, all: true }, tmpDir, false, true)).toBe(true);
    expect(runSddIntegrate({ root: tmpDir, all: true, silent: true })).toBe(true);
  });

  it('printChangeNewHeader, printChangeNewSuccess, printChangeNewFailure, emitChangeNewJson, handleScaffoldOutput, buildFailedScaffoldResult & runChangeNew', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    printChangeNewHeader('Telemetry', 'openspec');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Telemetry'));

    printChangeNewSuccess({
      success: true,
      changeId: 'chg-001',
      canonicalId: 'CHG-001',
      profile: 'standard',
      changeDir: 'specs/changes/active/chg-001',
      createdFiles: ['proposal.md'],
      productArtifactCreated: 'specs/product/FR-001.md',
      citedArtifacts: [{ id: 'FR-001', digest: '', title: '' }],
      errors: [],
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('FR-001'));

    printChangeNewFailure('Bad Change', ['missing name']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('missing name'));

    logSpy.mockClear();
    const builtErr = buildFailedScaffoldResult({ name: 'Bad', id: 'chg-bad', profile: 'patch' }, new Error('bad framework'));
    expect(builtErr.success).toBe(false);
    expect(builtErr.profile).toBe('patch');
    expect(builtErr.errors).toEqual(['bad framework']);

    emitChangeNewJson('Bad', builtErr);
    const errJson = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(errJson.command).toBe('change:new');
    expect(errJson.exitCode).toBe(1);
    expect(errJson.errors).toEqual(['bad framework']);

    handleScaffoldOutput('Bad', builtErr, false, true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Change creation BLOCKED'));

    // Regression: unsupported framework throws inside scaffoldSddChange; runChangeNew catches and returns false with JSON error
    logSpy.mockClear();
    const badFwOk = runChangeNew({
      root: tmpDir,
      name: 'Invalid Framework Test',
      framework: 'invalid-fw' as unknown as SddFramework,
      json: true,
    });
    expect(badFwOk).toBe(false);
    const parsedBadFw = JSON.parse(String(logSpy.mock.calls.at(-1)?.[0]));
    expect(parsedBadFw.command).toBe('change:new');
    expect(parsedBadFw.success).toBe(false);
    expect(parsedBadFw.exitCode).toBe(1);
    expect(parsedBadFw.errors.length).toBeGreaterThan(0);

    // Regression: root pointing to a file throws EEXIST/ENOTDIR inside scaffoldSddChange; caught cleanly
    const fileRoot = path.join(tmpDir, 'file-root.txt');
    fs.writeFileSync(fileRoot, 'hello', 'utf-8');
    expect(runChangeNew({ root: fileRoot, name: 'File Root', silent: false })).toBe(false);
  });
});
