/**
 * AI-SDLC: OpenSpec SDD Adapter
 * Manages OpenSpec change workspaces and deposits Product Handoff sidecars (HOF-*).
 * Aligns with @prodshape/integration-openspec.
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { ChangeProfile, ProductHandoff, SddValidationResult, SddWorkspaceInfo } from '../../types/index.js';
import { SddAdapter } from './types.js';

export class OpenSpecAdapter implements SddAdapter {
  readonly framework = 'openspec' as const;

  getChangeWorkspaceDir(rootDir: string, changeId: string): string {
    // 1. Check for standard openspec path: openspec/changes/<changeId>
    const openspecDir = path.join(rootDir, 'openspec', 'changes', changeId);
    if (fs.existsSync(openspecDir)) return openspecDir;

    // 2. Check for AI-SDLC active change path: specs/changes/active/<changeId>
    const activeChangeDir = path.join(rootDir, 'specs', 'changes', 'active', changeId);
    if (fs.existsSync(activeChangeDir)) return activeChangeDir;

    // 3. Check for AI-SDLC completed change path: specs/changes/completed/<changeId>
    const completedChangeDir = path.join(rootDir, 'specs', 'changes', 'completed', changeId);
    if (fs.existsSync(completedChangeDir)) return completedChangeDir;

    // 4. Default: specs/changes/active/<changeId>
    return activeChangeDir;
  }

  depositSidecar(options: {
    rootDir: string;
    changeId: string;
    handoff: ProductHandoff;
    format?: 'yaml' | 'json';
  }): string {
    const changeDir = this.getChangeWorkspaceDir(options.rootDir, options.changeId);
    if (!fs.existsSync(changeDir)) {
      fs.mkdirSync(changeDir, { recursive: true });
    }

    const handoff = { ...options.handoff };
    if (!handoff.id.startsWith('HOF-')) {
      handoff.id = `HOF-${handoff.id}`;
    }
    if (!handoff.changeId) {
      handoff.changeId = options.changeId;
    }
    if (!handoff.createdAt) {
      handoff.createdAt = new Date().toISOString();
    }

    const filename = options.format === 'json' ? 'handoff.json' : 'handoff.yaml';
    const filePath = path.join(changeDir, filename);

    const content =
      options.format === 'json'
        ? JSON.stringify(handoff, null, 2)
        : yaml.dump(handoff, { indent: 2, lineWidth: -1 });

    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  loadSidecar(changeWorkspaceDir: string): ProductHandoff | null {
    if (!fs.existsSync(changeWorkspaceDir)) return null;

    const candidateFiles = [
      'handoff.yaml',
      'handoff.yml',
      'product-handoff.yaml',
      'product-handoff.yml',
      '.handoff.yaml',
      'handoff.json',
      'product-handoff.json',
    ];

    for (const file of candidateFiles) {
      const fullPath = path.join(changeWorkspaceDir, file);
      if (fs.existsSync(fullPath)) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf-8').replace(/^\uFEFF/, '');
          const parsed = file.endsWith('.json') ? JSON.parse(raw) : (yaml.load(raw) as any);
          if (parsed && typeof parsed === 'object' && parsed.id && String(parsed.id).startsWith('HOF-')) {
            return parsed as ProductHandoff;
          }
        } catch {
          // Ignore invalid parse attempt, try next
        }
      }
    }

    return null;
  }

  validateWorkspace(changeWorkspaceDir: string): SddValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!fs.existsSync(changeWorkspaceDir)) {
      return {
        valid: false,
        errors: [`El directorio del cambio OpenSpec no existe: ${changeWorkspaceDir}`],
        warnings: [],
      };
    }

    const changeId = path.basename(changeWorkspaceDir);

    const proposalFile = path.join(changeWorkspaceDir, 'proposal.md');
    const specFile = path.join(changeWorkspaceDir, 'spec.md');
    const designFile = path.join(changeWorkspaceDir, 'design.md');
    const tasksFile = path.join(changeWorkspaceDir, 'tasks.md');

    let profile: ChangeProfile = 'standard';
    if (fs.existsSync(specFile)) {
      try {
        const rawSpec = fs.readFileSync(specFile, 'utf-8').replace(/^\uFEFF/, '');
        const match = rawSpec.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        if (match) {
          const parsedFm = yaml.load(match[1]) as any;
          if (parsedFm && parsedFm.profile && ['patch', 'standard', 'critical'].includes(parsedFm.profile)) {
            profile = parsedFm.profile as ChangeProfile;
          }
        }
      } catch {
        // ignore parse error
      }
    }

    if (!fs.existsSync(specFile)) {
      errors.push(`Falta el archivo obligatorio 'spec.md' en ${changeWorkspaceDir}.`);
    }

    let sidecarFile: string | undefined;
    let handoff: ProductHandoff | null = null;

    if (profile === 'patch') {
      handoff = this.loadSidecar(changeWorkspaceDir);
      if (handoff) {
        sidecarFile = path.join(changeWorkspaceDir, 'handoff.yaml');
      }
    } else {
      if (!fs.existsSync(proposalFile)) {
        warnings.push(`Falta 'proposal.md' en el espacio de trabajo OpenSpec.`);
      }
      if (!fs.existsSync(tasksFile)) {
        errors.push(`Falta el archivo obligatorio 'tasks.md' en ${changeWorkspaceDir}.`);
      }

      handoff = this.loadSidecar(changeWorkspaceDir);
      if (!handoff) {
        errors.push(
          `Falta el archivo de acompañamiento (sidecar) 'handoff.yaml' con identificador 'HOF-*' en ${changeWorkspaceDir}.`
        );
      } else {
        if (!handoff.subgraph || !Array.isArray(handoff.subgraph.requirements)) {
          errors.push(`El sidecar '${handoff.id}' no define un subgrafo de requerimientos válido.`);
        }
        sidecarFile = path.join(changeWorkspaceDir, 'handoff.yaml');
      }
    }

    const workspace: SddWorkspaceInfo = {
      framework: this.framework,
      changeId,
      changeDir: changeWorkspaceDir,
      profile,
      proposalFile: fs.existsSync(proposalFile) ? proposalFile : undefined,
      specFile: fs.existsSync(specFile) ? specFile : undefined,
      designFile: fs.existsSync(designFile) ? designFile : undefined,
      tasksFile: fs.existsSync(tasksFile) ? tasksFile : undefined,
      sidecarFile,
      handoff: handoff || undefined,
    };

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      workspace,
    };
  }
}
