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
} from '@ai-sdlc/core';
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

export function runSddDeposit(options: SddDepositCliOptions): boolean {
  const rootDir = options.root || process.cwd();
  const changeId = options.change;
  const framework = options.framework || 'openspec';
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  if (!isSilent) {
    console.log(
      pc.bold(
        pc.cyan(`\n📦 [AI-SDLC SDD] Depositing PDaC Handoff Sidecar for '${changeId}' (${framework})...`)
      )
    );
  }

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

  try {
    const depositedPath = depositProductHandoffSidecar({
      rootDir,
      changeId,
      framework,
      handoff,
    });

    if (!isSilent) {
      console.log(`  ${pc.green('✔')} Sidecar successfully deposited: ${pc.bold(depositedPath)}`);
      console.log(`  Handoff ID: ${pc.cyan(handoff.id)}`);
      console.log(`  Delivered requirements: ${reqList.join(', ')}\n`);
    }

    if (useJson) {
      const payload = {
        command: 'sdd:deposit',
        success: true,
        exitCode: 0,
        changeId,
        framework,
        depositedPath,
        handoff,
      };
      console.log(JSON.stringify(payload, null, 2));
    }

    return true;
  } catch (err: any) {
    if (!isSilent) {
      console.error(pc.red(`  ✖ Error depositing sidecar: ${err?.message || err}\n`));
    }
    if (useJson) {
      const payload = {
        command: 'sdd:deposit',
        success: false,
        exitCode: 1,
        changeId,
        framework,
        error: err?.message || String(err),
      };
      console.log(JSON.stringify(payload, null, 2));
    }
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

export function runSddVerify(options: SddVerifyCliOptions = {}): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  if (!isSilent) {
    console.log(
      pc.bold(
        pc.cyan('\n🔍 [AI-SDLC SDD] Verifying SDD Workspaces and Handoff Sidecars (HOF-*)...')
      )
    );
  }

  const handoffsMap = scanAllProductHandoffs(rootDir);
  const totalFound = handoffsMap.size;

  if (!isSilent) {
    console.log(`  Found PDaC sidecars: ${pc.bold(String(totalFound))}`);
  }

  let validCount = 0;
  let invalidCount = 0;
  const handoffItems: Array<{
    id: string;
    changeDir: string;
    isValid: boolean;
    requirementsCount: number;
  }> = [];

  if (totalFound === 0) {
    if (!isSilent) {
      console.log(pc.yellow('  [NOTICE] No handoff.yaml sidecar companion files found in specs/.'));
    }
  } else {
    for (const [, { handoff, changeDir }] of handoffsMap.entries()) {
      const relDir = path.relative(rootDir, changeDir).replace(/\\/g, '/');
      const reqCount = (handoff.subgraph && Array.isArray(handoff.subgraph.requirements))
        ? handoff.subgraph.requirements.length
        : 0;
      const isValid = Boolean(handoff.id && handoff.id.startsWith('HOF-') && reqCount > 0);

      handoffItems.push({
        id: handoff.id || 'UNKNOWN',
        changeDir: relDir,
        isValid,
        requirementsCount: reqCount,
      });

      if (isValid) {
        validCount++;
        if (!isSilent) {
          console.log(
            `  ${pc.green('✔')} [${pc.bold(handoff.id)}] in ${relDir} (Requirements: ${reqCount})`
          );
        }
      } else {
        invalidCount++;
        if (!isSilent) {
          console.log(
            `  ${pc.red('✖')} [${pc.bold(handoff.id || 'UNKNOWN')}] in ${relDir} - Invalid handoff schema or subgraph.`
          );
        }
      }
    }
  }

  // Pre-Implementation Shift-Left: Verify requirements uniqueness and redundancy
  let duplicateErrors = 0;
  let duplicateIssues: any[] = [];
  if (options.checkDuplicates !== false) {
    const dupResult = verifyArtifactDuplicates({ rootDir });
    duplicateErrors = dupResult.errorCount;
    duplicateIssues = dupResult.issues;
    if (duplicateErrors > 0 && !isSilent) {
      console.log(
        pc.red(
          `\n  ✖ [Shift-Left Gate] Detected ${duplicateErrors} requirement collision(s)/duplicate(s) in workspace:`
        )
      );
      for (const issue of dupResult.issues.filter((i) => i.severity === 'ERROR')) {
        console.log(`    ${pc.red('✖')} [${issue.type}] ${issue.id} in ${issue.file}: ${issue.message}`);
      }
    }
  }

  const isOk = invalidCount === 0 && duplicateErrors === 0;
  if (!isSilent) {
    console.log(
      isOk
        ? pc.green('\n✔ SDD Integration COMPLIANT: All sidecars and requirements are valid.\n')
        : pc.red('\n✖ SDD Integration BLOCKED: Non-compliant sidecars or duplicate requirements detected.\n')
    );
  }

  if (useJson) {
    const payload = {
      command: 'sdd:verify',
      success: isOk,
      exitCode: isOk ? 0 : 1,
      totalHandoffs: totalFound,
      validHandoffs: validCount,
      invalidHandoffs: invalidCount,
      duplicateErrors,
      handoffs: handoffItems,
      duplicateIssues,
    };
    console.log(JSON.stringify(payload, null, 2));
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

export function runSddIntegrate(options: SddIntegrateCliOptions): boolean {
  const rootDir = options.root || process.cwd();
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);
  let changeId = options.change;

  if (!changeId && options.auto) {
    const detection = detectActiveChangeForIntegration({
      rootDir,
      headRef: options.headRef,
      prTitle: options.prTitle,
      prBody: options.prBody,
    });

    if (!detection.detected || !detection.changeId) {
      if (!isSilent) {
        console.log(pc.yellow('\nℹ [AI-SDLC SDD] No active SDD change detected to integrate:'));
        for (const r of detection.reasons) {
          console.log(`    - ${r}`);
        }
        console.log('');
      }
      if (useJson) {
        const payload = {
          command: 'sdd:integrate',
          success: false,
          exitCode: 1,
          reasons: detection.reasons,
          error: 'No active SDD change detected to integrate',
        };
        console.log(JSON.stringify(payload, null, 2));
      }
      return false;
    }

    if (!detection.allTasksCompleted) {
      if (!isSilent) {
        console.log(
          pc.red(
            `\n✖ [AI-SDLC SDD] Detected change '${detection.changeId}' has pending tasks (${detection.completedTasksCount}/${detection.totalTasksCount} completed). All tasks must be in COMPLETED status.\n`
          )
        );
      }
      if (useJson) {
        const payload = {
          command: 'sdd:integrate',
          success: false,
          exitCode: 1,
          changeId: detection.changeId,
          completedTasksCount: detection.completedTasksCount,
          totalTasksCount: detection.totalTasksCount,
          error: `Detected change '${detection.changeId}' has pending tasks (${detection.completedTasksCount}/${detection.totalTasksCount} completed).`,
        };
        console.log(JSON.stringify(payload, null, 2));
      }
      return false;
    }

    changeId = detection.changeId;
    if (!isSilent) {
      console.log(
        pc.cyan(`  ✔ Automatically detected SDD change: ${pc.bold(changeId)} (via ${detection.source})`)
      );
    }
  }

  if (!changeId) {
    if (!isSilent) {
      console.error(pc.red('\n✖ Change identifier (--change <id>) or --auto option must be specified.\n'));
    }
    if (useJson) {
      const payload = {
        command: 'sdd:integrate',
        success: false,
        exitCode: 1,
        error: 'Change identifier (--change <id>) or --auto option must be specified.',
      };
      console.log(JSON.stringify(payload, null, 2));
    }
    return false;
  }

  if (!isSilent) {
    console.log(
      pc.bold(
        pc.cyan(`\n🔄 [AI-SDLC SDD] Integrating change '${changeId}' into canonical specification...`)
      )
    );
  }

  const result = integrateSddChange({
    rootDir,
    changeId,
    author: options.author,
    autoArchive: options.autoArchive,
  });

  if (!isSilent) {
    if (result.success) {
      console.log(`  ${pc.green('✔')} Change '${changeId}' successfully processed:`);
      console.log(`    - Completed tasks:             ${pc.bold(String(result.completedTasks.length))}`);
      console.log(`    - Integrated requirements:     ${pc.green(result.integratedRequirements.join(', ') || 'None')}`);
      console.log(`    - Updated product artifacts:   ${pc.green(result.updatedProductArtifacts.join(', ') || 'None')}`);
      console.log(`    - Updated arc42 architecture:  ${pc.green(result.updatedArchitectureArtifacts.join(', ') || 'None')}`);
      if (result.archived) {
        console.log(`    - Archived to:                 ${pc.cyan(result.archivedPath || 'specs/changes/completed')}`);
      }
      console.log(pc.green('\n✔ Canonical specification integration COMPLETED (EXIT 0)\n'));
    } else {
      console.log(pc.red(`\n✖ Failed to integrate change '${changeId}':`));
      for (const err of result.errors) {
        console.log(`    ${pc.red('✖')} ${err}`);
      }
      console.log(pc.red('\n✖ Integration BLOCKED (EXIT 1)\n'));
    }
  }

  if (useJson) {
    const payload = {
      command: 'sdd:integrate',
      success: result.success,
      exitCode: result.success ? 0 : 1,
      changeId,
      completedTasks: result.completedTasks,
      integratedRequirements: result.integratedRequirements,
      updatedProductArtifacts: result.updatedProductArtifacts,
      updatedArchitectureArtifacts: result.updatedArchitectureArtifacts,
      archived: result.archived,
      archivedPath: result.archivedPath,
      errors: result.errors,
    };
    console.log(JSON.stringify(payload, null, 2));
  }

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

export function runChangeNew(options: ChangeNewCliOptions): boolean {
  const rootDir = options.root || process.cwd();
  const name = options.name;
  const framework = options.framework || 'openspec';
  const useJson = isJsonOutput(options);
  const isSilent = Boolean(options.silent || useJson);

  if (!isSilent) {
    console.log(
      pc.bold(
        pc.cyan(`\n📦 [AI-SDLC SDD] Scaffolding new SDD change '${name}' (${framework})...`)
      )
    );
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

  if (!isSilent) {
    if (result.success) {
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
    } else {
      console.log(pc.red(`\n✖ Failed to create SDD change '${name}':`));
      for (const err of result.errors) {
        console.log(`    ${pc.red('✖')} ${err}`);
      }
      console.log(pc.red('\n✖ Change creation BLOCKED\n'));
    }
  }

  if (useJson) {
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

  return result.success;
}
