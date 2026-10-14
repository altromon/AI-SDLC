/**
 * CLI Handler: aisdlc sdd
 * Commands for SDD Ecosystem Integration (OpenSpec & Spec Kit) and PDaC Handoff Sidecars
 */

import * as path from 'path';
import pc from 'picocolors';
import {
  ChangeProfile,
  depositProductHandoffSidecar,
  detectActiveChangeForIntegration,
  integrateSddChange,
  ProductHandoff,
  scaffoldSddChange,
  scanAllProductHandoffs,
  SddFramework,
  verifyArtifactDuplicates,
  DuplicateIssue,
} from '@aisdlc/core';
import { isJsonOutput } from './verify.js';



export interface SddDepositCliOptions {
  root?: string;
  change: string;
  framework: SddFramework;
  title?: string;
  requirements?: string;
  useCases?: string;
  silent?: boolean;
  json?: boolean;
  format?: string;
}

function buildHandoffPayload(options: SddDepositCliOptions, changeId: string): { handoff: ProductHandoff; reqList: string[] } {
  const reqList = options.requirements
    ? options.requirements.split(',').map((r) => r.trim())
    : ['FR-001'];
  const ucList = options.useCases
    ? options.useCases.split(',').map((u) => u.trim())
    : ['UC-001'];

  const handoff: ProductHandoff = {
    id: `HOF-${changeId.toUpperCase()}`,
    type: 'handoff',
    title: options.title || `PDaC Handoff for ${changeId}`,
    changeId,
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    subgraph: {
      requirements: reqList,
      useCases: ucList,
    },
  };
  return { handoff, reqList };
}

function printDepositSuccess(depositedPath: string, handoffId: string, reqList: string[]): void {
  console.log(`  ${pc.green('✔')} Sidecar successfully deposited: ${pc.bold(depositedPath)}`);
  console.log(`  Handoff ID: ${pc.cyan(handoffId)}`);
  console.log(`  Delivered requirements: ${reqList.join(', ')}\n`);
}

function emitDepositJson(
  success: boolean,
  changeId: string,
  framework: SddFramework,
  depositedPath?: string,
  handoff?: ProductHandoff,
  err?: unknown
): void {
  const payload = {
    command: 'sdd:deposit',
    success,
    exitCode: success ? 0 : 1,
    changeId,
    framework,
    ...(depositedPath ? { depositedPath, handoff } : { error: err instanceof Error ? err.message : String(err) }),
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printDepositHeader(changeId: string, framework: string): void {
  console.log(pc.bold(pc.cyan(`\n📦 [AI-SDLC SDD] Depositing PDaC Handoff Sidecar for '${changeId}' (${framework})...`)));
}

function printDepositError(err: unknown): void {
  const errMessage = err instanceof Error ? err.message : String(err);
  console.error(pc.red(`  ✖ Error depositing sidecar: ${errMessage}\n`));
}

export function runSddDeposit(options: SddDepositCliOptions): boolean {
  const rootDir = options.root || process.cwd();
  const changeId = options.change;
  const framework = options.framework || 'openspec';
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  if (!isSilent) {
    printDepositHeader(changeId, framework);
  }

  const { handoff, reqList } = buildHandoffPayload(options, changeId);

  try {
    const depositedPath = depositProductHandoffSidecar({ rootDir, changeId, framework, handoff });
    if (!isSilent) printDepositSuccess(depositedPath, handoff.id, reqList);
    if (useJson) emitDepositJson(true, changeId, framework, depositedPath, handoff);
    return true;
  } catch (err: unknown) {
    if (!isSilent) printDepositError(err);
    if (useJson) emitDepositJson(false, changeId, framework, undefined, undefined, err);
    return false;
  }
}

export interface SddVerifyCliOptions {
  root?: string;
  framework?: SddFramework;
  checkDuplicates?: boolean;
  silent?: boolean;
  json?: boolean;
  format?: string;
}

interface HandoffItem {
  id: string;
  changeDir: string;
  isValid: boolean;
  requirementsCount: number;
}

function printHandoffEntry(isValid: boolean, id: string, relDir: string, reqCount: number): void {
  if (isValid) {
    console.log(`  ${pc.green('✔')} [${pc.bold(id)}] in ${relDir} (Requirements: ${reqCount})`);
  } else {
    console.log(`  ${pc.red('✖')} [${pc.bold(id)}] in ${relDir} - Invalid handoff schema or subgraph.`);
  }
}

function processHandoffEntry(
  handoff: ProductHandoff,
  changeDir: string,
  rootDir: string,
  isSilent: boolean
): HandoffItem {
  const relDir = path.relative(rootDir, changeDir).replace(/\\/g, '/');
  const reqCount = (handoff.subgraph && Array.isArray(handoff.subgraph.requirements))
    ? handoff.subgraph.requirements.length
    : 0;
  const isValid = Boolean(handoff.id && handoff.id.startsWith('HOF-') && reqCount > 0);
  const id = handoff.id || 'UNKNOWN';

  if (!isSilent) {
    printHandoffEntry(isValid, id, relDir, reqCount);
  }

  return { id, changeDir: relDir, isValid, requirementsCount: reqCount };
}

function auditHandoffsMap(
  handoffsMap: Map<string, { handoff: ProductHandoff; changeDir: string }>,
  rootDir: string,
  isSilent: boolean
): { handoffItems: HandoffItem[]; validCount: number; invalidCount: number } {
  if (handoffsMap.size === 0) {
    if (!isSilent) {
      console.log(pc.yellow('  [NOTICE] No handoff.yaml sidecar companion files found in specs/.'));
    }
    return { handoffItems: [], validCount: 0, invalidCount: 0 };
  }

  const handoffItems: HandoffItem[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (const [, { handoff, changeDir }] of handoffsMap.entries()) {
    const item = processHandoffEntry(handoff, changeDir, rootDir, isSilent);
    handoffItems.push(item);
    if (item.isValid) {
      validCount++;
    } else {
      invalidCount++;
    }
  }
  return { handoffItems, validCount, invalidCount };
}

function auditDuplicatesShiftLeft(
  rootDir: string,
  checkDuplicates: boolean | undefined,
  isSilent: boolean
): { duplicateErrors: number; duplicateIssues: DuplicateIssue[] } {
  if (checkDuplicates === false) {
    return { duplicateErrors: 0, duplicateIssues: [] };
  }
  const dupResult = verifyArtifactDuplicates({ rootDir });
  if (dupResult.errorCount > 0 && !isSilent) {
    console.log(pc.red(`\n  ✖ [Shift-Left Gate] Detected ${dupResult.errorCount} requirement collision(s)/duplicate(s) in workspace:`));
    for (const issue of dupResult.issues.filter((i) => i.severity === 'ERROR')) {
      console.log(`    ${pc.red('✖')} [${issue.type}] ${issue.id} in ${issue.file}: ${issue.message}`);
    }
  }
  return { duplicateErrors: dupResult.errorCount, duplicateIssues: dupResult.issues };
}

function emitSddVerifyJson(payload: {
  isOk: boolean;
  totalFound: number;
  validCount: number;
  invalidCount: number;
  duplicateErrors: number;
  handoffItems: HandoffItem[];
  duplicateIssues: DuplicateIssue[];
}): void {
  const jsonOutput = {
    command: 'sdd:verify',
    success: payload.isOk,
    exitCode: payload.isOk ? 0 : 1,
    totalHandoffs: payload.totalFound,
    validHandoffs: payload.validCount,
    invalidHandoffs: payload.invalidCount,
    duplicateErrors: payload.duplicateErrors,
    handoffs: payload.handoffItems,
    duplicateIssues: payload.duplicateIssues,
  };
  console.log(JSON.stringify(jsonOutput, null, 2));
}

function printSddVerifyVerdict(isOk: boolean): void {
  console.log(
    isOk
      ? pc.green('\n✔ SDD Integration COMPLIANT: All sidecars and requirements are valid.\n')
      : pc.red('\n✖ SDD Integration BLOCKED: Non-compliant sidecars or duplicate requirements detected.\n')
  );
}

function printSddVerifyHeader(totalFound: number): void {
  console.log(pc.bold(pc.cyan('\n🔍 [AI-SDLC SDD] Verifying SDD Workspaces and Handoff Sidecars (HOF-*)...')));
  console.log(`  Found PDaC sidecars: ${pc.bold(String(totalFound))}`);
}

export function runSddVerify(options: SddVerifyCliOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  const handoffsMap = scanAllProductHandoffs(rootDir);
  const totalFound = handoffsMap.size;
  if (!isSilent) {
    printSddVerifyHeader(totalFound);
  }

  const { handoffItems, validCount, invalidCount } = auditHandoffsMap(handoffsMap, rootDir, isSilent);
  const { duplicateErrors, duplicateIssues } = auditDuplicatesShiftLeft(rootDir, options.checkDuplicates, isSilent);

  const isOk = invalidCount === 0 && duplicateErrors === 0;
  if (!isSilent) {
    printSddVerifyVerdict(isOk);
  }

  if (useJson) {
    emitSddVerifyJson({ isOk, totalFound, validCount, invalidCount, duplicateErrors, handoffItems, duplicateIssues });
  }

  return isOk;
}

export interface SddIntegrateCliOptions {
  root?: string;
  change?: string;
  auto?: boolean;
  headRef?: string;
  prTitle?: string;
  prBody?: string;
  author?: string;
  autoArchive?: boolean;
  silent?: boolean;
  json?: boolean;
  format?: string;
}

function handleUndetectedChange(detection: ReturnType<typeof detectActiveChangeForIntegration>, isSilent: boolean, useJson: boolean): null {
  if (!isSilent) {
    console.log(pc.yellow('\nℹ [AI-SDLC SDD] No active SDD change detected to integrate:'));
    for (const r of detection.reasons) console.log(`    - ${r}`);
    console.log('');
  }
  if (useJson) {
    const payload = { command: 'sdd:integrate', success: false, exitCode: 1, reasons: detection.reasons, error: 'No active SDD change detected to integrate' };
    console.log(JSON.stringify(payload, null, 2));
  }
  return null;
}

function handlePendingTasks(detection: ReturnType<typeof detectActiveChangeForIntegration>, isSilent: boolean, useJson: boolean): null {
  if (!isSilent) {
    console.log(pc.red(`\n✖ [AI-SDLC SDD] Detected change '${detection.changeId}' has pending tasks (${detection.completedTasksCount}/${detection.totalTasksCount} completed). All tasks must be in COMPLETED status.\n`));
  }
  if (useJson) {
    const payload = {
      command: 'sdd:integrate', success: false, exitCode: 1, changeId: detection.changeId,
      completedTasksCount: detection.completedTasksCount, totalTasksCount: detection.totalTasksCount,
      error: `Detected change '${detection.changeId}' has pending tasks (${detection.completedTasksCount}/${detection.totalTasksCount} completed).`,
    };
    console.log(JSON.stringify(payload, null, 2));
  }
  return null;
}

function resolveAutoChange(
  options: SddIntegrateCliOptions,
  rootDir: string,
  isSilent: boolean,
  useJson: boolean
): string | null {
  const detection = detectActiveChangeForIntegration({
    rootDir,
    headRef: options.headRef,
    prTitle: options.prTitle,
    prBody: options.prBody,
  });
  if (!detection.detected || !detection.changeId) {
    return handleUndetectedChange(detection, isSilent, useJson);
  }
  if (!detection.allTasksCompleted) {
    return handlePendingTasks(detection, isSilent, useJson);
  }
  if (!isSilent) {
    console.log(pc.cyan(`  ✔ Automatically detected SDD change: ${pc.bold(detection.changeId)} (via ${detection.source})`));
  }
  return detection.changeId;
}

function resolveIntegrationChangeId(options: SddIntegrateCliOptions, rootDir: string, isSilent: boolean, useJson: boolean): string | null {
  const changeId = options.change || (options.auto ? resolveAutoChange(options, rootDir, isSilent, useJson) : null);
  if (!changeId) {
    if (!options.auto) {
      if (!isSilent) console.error(pc.red('\n✖ Change identifier (--change <id>) or --auto option must be specified.\n'));
      if (useJson) {
        console.log(JSON.stringify({ command: 'sdd:integrate', success: false, exitCode: 1, error: 'Change identifier (--change <id>) or --auto option must be specified.' }, null, 2));
      }
    }
    return null;
  }
  return changeId;
}

function printIntegrationSuccess(changeId: string, result: ReturnType<typeof integrateSddChange>): void {
  console.log(`  ${pc.green('✔')} Change '${changeId}' successfully processed:`);
  console.log(`    - Completed tasks:             ${pc.bold(String(result.completedTasks.length))}`);
  console.log(`    - Integrated requirements:     ${pc.green(result.integratedRequirements.join(', ') || 'None')}`);
  console.log(`    - Created canonical artifacts: ${pc.green(result.createdCanonicalArtifacts?.join(', ') || 'None')}`);
  console.log(`    - Updated product artifacts:   ${pc.green(result.updatedProductArtifacts.join(', ') || 'None')}`);
  console.log(`    - Updated arc42 architecture:  ${pc.green(result.updatedArchitectureArtifacts.join(', ') || 'None')}`);
  if (result.archived) {
    console.log(`    - Archived to:                 ${pc.cyan(result.archivedPath || 'specs/changes/completed')}`);
  }
  console.log(pc.green('\n✔ Canonical specification integration COMPLETED (EXIT 0)\n'));
}

function printIntegrationFailure(changeId: string, errors: string[]): void {
  console.log(pc.red(`\n✖ Failed to integrate change '${changeId}':`));
  for (const err of errors) console.log(`    ${pc.red('✖')} ${err}`);
  console.log(pc.red('\n✖ Integration BLOCKED (EXIT 1)\n'));
}

function emitIntegrateJson(changeId: string, result: ReturnType<typeof integrateSddChange>): void {
  const payload = {
    command: 'sdd:integrate',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    changeId,
    completedTasks: result.completedTasks,
    integratedRequirements: result.integratedRequirements,
    createdCanonicalArtifacts: result.createdCanonicalArtifacts ?? [],
    updatedProductArtifacts: result.updatedProductArtifacts,
    updatedArchitectureArtifacts: result.updatedArchitectureArtifacts,
    archived: result.archived,
    archivedPath: result.archivedPath,
    errors: result.errors,
  };
  console.log(JSON.stringify(payload, null, 2));
}

export function runSddIntegrate(options: SddIntegrateCliOptions): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  const changeId = resolveIntegrationChangeId(options, rootDir, isSilent, useJson);
  if (!changeId) return false;

  if (!isSilent) {
    console.log(pc.bold(pc.cyan(`\n🔄 [AI-SDLC SDD] Integrating change '${changeId}' into canonical specification...`)));
  }

  const result = integrateSddChange({ rootDir, changeId, author: options.author, autoArchive: options.autoArchive });
  if (!isSilent) {
    if (result.success) printIntegrationSuccess(changeId, result);
    else printIntegrationFailure(changeId, result.errors);
  }
  if (useJson) emitIntegrateJson(changeId, result);
  return result.success;
}

export interface ChangeNewCliOptions {
  root?: string;
  name: string;
  from?: string | string[];
  id?: string;
  profile?: ChangeProfile;
  framework?: SddFramework;
  author?: string;
  silent?: boolean;
  json?: boolean;
  format?: string;
}

function printChangeNewSuccess(result: ReturnType<typeof scaffoldSddChange>): void {
  console.log(`  ${pc.green('✔')} Change directory:    ${pc.bold(result.changeDir)}`);
  console.log(`  ${pc.green('✔')} SDD Change ID:       ${pc.cyan(result.canonicalId)} (${result.changeId})`);
  console.log(`  ${pc.green('✔')} Risk profile:        ${pc.magenta(result.profile || 'standard')}`);
  if (result.productArtifactCreated) {
    console.log(`  ${pc.green('✔')} Product artifact:    ${pc.bold(result.productArtifactCreated)} (status: draft)`);
  }
  console.log(`  ${pc.green('✔')} Cited artifacts:     ${result.citedArtifacts.length}`);
  for (const cite of result.citedArtifacts) {
    console.log(`    - [${pc.cyan(cite.id)}] ${cite.digest.substring(0, 19)}... (${cite.title || 'Untitled'})`);
  }
  console.log(`  ${pc.green('✔')} Generated files:     ${result.createdFiles.length}`);
  console.log(pc.green('\n✔ SDD change successfully initialized and validated.\n'));
}

function printChangeNewFailure(name: string, errors: string[]): void {
  console.log(pc.red(`\n✖ Failed to create SDD change '${name}':`));
  for (const err of errors) console.log(`    ${pc.red('✖')} ${err}`);
  console.log(pc.red('\n✖ Change creation BLOCKED\n'));
}

function emitChangeNewJson(name: string, result: ReturnType<typeof scaffoldSddChange>): void {
  const payload = {
    command: 'change:new',
    success: result.success,
    exitCode: result.success ? 0 : 1,
    name,
    canonicalId: result.canonicalId,
    changeId: result.changeId,
    changeDir: result.changeDir,
    profile: result.profile,
    createdFiles: result.createdFiles,
    productArtifactCreated: result.productArtifactCreated,
    citedArtifacts: result.citedArtifacts,
    errors: result.errors,
  };
  console.log(JSON.stringify(payload, null, 2));
}

function printChangeNewHeader(name: string, framework: string): void {
  console.log(pc.bold(pc.cyan(`\n📦 [AI-SDLC SDD] Scaffolding new SDD change '${name}' (${framework})...`)));
}

function handleScaffoldOutput(name: string, result: ReturnType<typeof scaffoldSddChange>, isSilent: boolean, useJson: boolean): void {
  if (!isSilent) {
    if (result.success) printChangeNewSuccess(result);
    else printChangeNewFailure(name, result.errors);
  }
  if (useJson) emitChangeNewJson(name, result);
}

export function runChangeNew(options: ChangeNewCliOptions): boolean {
  const rootDir = options.root || process.cwd();
  const name = options.name;
  const framework = options.framework || 'openspec';
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  if (!isSilent) {
    printChangeNewHeader(name, framework);
  }

  const result = scaffoldSddChange({
    rootDir,
    name,
    changeId: options.id,
    profile: options.profile,
    from: options.from,
    framework,
    author: options.author,
    silent: isSilent,
  });

  handleScaffoldOutput(name, result, isSilent, useJson);
  return result.success;
}
