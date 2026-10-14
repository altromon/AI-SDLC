/**
 * AI-SDLC: OpenSpec SDD Adapter
 * Manages OpenSpec change workspaces and deposits Product Handoff sidecars (HOF-*).
 * Aligns with @prodshape/integration-openspec.
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { ChangeProfile, ProductHandoff, SddValidationResult, SddWorkspaceInfo } from '../../types/index.js';
import { extractGherkinBlock } from '../../verifiers/gherkin.js';
import { SddAdapter } from './types.js';

function normalizeHandoffPayload(handoff: ProductHandoff, changeId: string): ProductHandoff {
  return {
    ...handoff,
    id: handoff.id.startsWith('HOF-') ? handoff.id : `HOF-${handoff.id}`,
    changeId: handoff.changeId || changeId,
    createdAt: handoff.createdAt || new Date().toISOString(),
  };
}

function parseChangeProfile(specFile: string): ChangeProfile {
  if (!fs.existsSync(specFile)) return 'standard';
  try {
    const rawSpec = fs.readFileSync(specFile, 'utf-8').replace(/^\uFEFF/, '');
    const match = rawSpec.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (match) {
      const parsedFm = yaml.load(match[1]) as Record<string, unknown> | null;
      if (parsedFm?.profile && ['patch', 'standard', 'critical'].includes(String(parsedFm.profile))) {
        return parsedFm.profile as ChangeProfile;
      }
    }
  } catch {}
  return 'standard';
}

function checkSpecGherkinFormat(parsedFm: Record<string, unknown>, rawSpec: string, changeWorkspaceDir: string, errors: string[]): void {
  const format = parsedFm['acceptance-format'];
  if (format && format !== 'gherkin') {
    errors.push(`El archivo 'spec.md' declara acceptance-format '${format}', pero el estándar obligatorio es 'gherkin'.`);
  }
  if (format === 'gherkin' && extractGherkinBlock(rawSpec).length === 0) {
    errors.push(`El archivo 'spec.md' en ${changeWorkspaceDir} declara 'acceptance-format: gherkin' pero no incluye ningún bloque de especificación ejecutable (\`\`\`gherkin ... \`\`\`).`);
  }
}

function validateSpecFileContent(specFile: string, changeWorkspaceDir: string, errors: string[]): void {
  if (!fs.existsSync(specFile)) {
    errors.push(`Falta el archivo obligatorio 'spec.md' en ${changeWorkspaceDir}.`);
    return;
  }
  try {
    const rawSpec = fs.readFileSync(specFile, 'utf-8').replace(/^\uFEFF/, '');
    const match = rawSpec.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (match) {
      const parsedFm = yaml.load(match[1]) as Record<string, unknown> | null;
      if (parsedFm) checkSpecGherkinFormat(parsedFm, rawSpec, changeWorkspaceDir, errors);
    }
  } catch {}
}

function validateHandoffSidecar(handoff: ProductHandoff | null, changeWorkspaceDir: string, errors: string[]): string | undefined {
  if (!handoff) {
    errors.push(
      `Falta el archivo de acompañamiento (sidecar) 'handoff.yaml' con identificador 'HOF-*' en ${changeWorkspaceDir}.`
    );
    return undefined;
  }
  if (!handoff.subgraph || !Array.isArray(handoff.subgraph.requirements)) {
    errors.push(`El sidecar '${handoff.id}' no define un subgrafo de requerimientos válido.`);
  }
  return path.join(changeWorkspaceDir, 'handoff.yaml');
}

function validateOpenSpecStructure(
  profile: ChangeProfile,
  changeWorkspaceDir: string,
  adapter: OpenSpecAdapter,
  errors: string[],
  warnings: string[]
): { handoff: ProductHandoff | null; sidecarFile?: string } {
  const proposalFile = path.join(changeWorkspaceDir, 'proposal.md');
  const tasksFile = path.join(changeWorkspaceDir, 'tasks.md');

  if (profile === 'patch') {
    const handoff = adapter.loadSidecar(changeWorkspaceDir);
    return { handoff, sidecarFile: handoff ? path.join(changeWorkspaceDir, 'handoff.yaml') : undefined };
  }

  if (!fs.existsSync(proposalFile)) {
    warnings.push(`Falta 'proposal.md' en el espacio de trabajo OpenSpec.`);
  }
  if (!fs.existsSync(tasksFile)) {
    errors.push(`Falta el archivo obligatorio 'tasks.md' en ${changeWorkspaceDir}.`);
  }

  const handoff = adapter.loadSidecar(changeWorkspaceDir);
  const sidecarFile = validateHandoffSidecar(handoff, changeWorkspaceDir, errors);
  return { handoff, sidecarFile };
}

function buildOpenSpecWorkspaceInfo(
  changeWorkspaceDir: string,
  profile: ChangeProfile,
  handoff: ProductHandoff | null,
  sidecarFile?: string
): SddWorkspaceInfo {
  const changeId = path.basename(changeWorkspaceDir);
  const proposalFile = path.join(changeWorkspaceDir, 'proposal.md');
  const specFile = path.join(changeWorkspaceDir, 'spec.md');
  const designFile = path.join(changeWorkspaceDir, 'design.md');
  const tasksFile = path.join(changeWorkspaceDir, 'tasks.md');

  return {
    framework: 'openspec',
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
}

export class OpenSpecAdapter implements SddAdapter {
  readonly framework = 'openspec' as const;

  getChangeWorkspaceDir(rootDir: string, changeId: string): string {
    const openspecDir = path.join(rootDir, 'openspec', 'changes', changeId);
    if (fs.existsSync(openspecDir)) return openspecDir;

    const activeChangeDir = path.join(rootDir, 'specs', 'changes', 'active', changeId);
    if (fs.existsSync(activeChangeDir)) return activeChangeDir;

    const completedChangeDir = path.join(rootDir, 'specs', 'changes', 'completed', changeId);
    if (fs.existsSync(completedChangeDir)) return completedChangeDir;

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

    const handoff = normalizeHandoffPayload(options.handoff, options.changeId);
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
          const parsed = file.endsWith('.json') ? JSON.parse(raw) : (yaml.load(raw) as Record<string, unknown>);
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
    if (!fs.existsSync(changeWorkspaceDir)) {
      return {
        valid: false,
        errors: [`El directorio del cambio OpenSpec no existe: ${changeWorkspaceDir}`],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const specFile = path.join(changeWorkspaceDir, 'spec.md');
    const profile = parseChangeProfile(specFile);

    validateSpecFileContent(specFile, changeWorkspaceDir, errors);
    const { handoff, sidecarFile } = validateOpenSpecStructure(profile, changeWorkspaceDir, this, errors, warnings);
    const workspace = buildOpenSpecWorkspaceInfo(changeWorkspaceDir, profile, handoff, sidecarFile);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      workspace,
    };
  }
}
