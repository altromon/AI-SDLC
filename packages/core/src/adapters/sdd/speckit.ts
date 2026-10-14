/**
 * AI-SDLC: Spec Kit SDD Adapter
 * Manages GitHub Spec Kit workspaces and deposits Product Handoff sidecars (HOF-*).
 * Aligns with @prodshape/integration-speckit.
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import { ChangeProfile, ProductHandoff, SddValidationResult, SddWorkspaceInfo } from '../../types/index.js';
import { extractGherkinBlock } from '../../verifiers/gherkin.js';
import { SddAdapter } from './types.js';

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
    errors.push(`Falta el archivo de especificación obligatorio 'spec.md' en ${changeWorkspaceDir}.`);
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

function validateSpecKitStructure(
  profile: ChangeProfile,
  changeWorkspaceDir: string,
  adapter: SpecKitAdapter,
  errors: string[],
  warnings: string[]
): { handoff: ProductHandoff | null; sidecarFile?: string } {
  const planFile = path.join(changeWorkspaceDir, 'plan.md');
  const tasksFile = path.join(changeWorkspaceDir, 'tasks.md');

  if (profile === 'patch') {
    const handoff = adapter.loadSidecar(changeWorkspaceDir);
    return { handoff, sidecarFile: handoff ? path.join(changeWorkspaceDir, 'handoff.yaml') : undefined };
  }

  if (!fs.existsSync(tasksFile)) {
    errors.push(`Falta el archivo de tareas obligatorio 'tasks.md' en ${changeWorkspaceDir}.`);
  }
  if (!fs.existsSync(planFile)) {
    warnings.push(`Se recomienda incluir 'plan.md' en el espacio de trabajo Spec Kit.`);
  }

  const handoff = adapter.loadSidecar(changeWorkspaceDir);
  const sidecarFile = validateHandoffSidecar(handoff, changeWorkspaceDir, errors);
  return { handoff, sidecarFile };
}

function buildSpecKitWorkspaceInfo(
  changeWorkspaceDir: string,
  profile: ChangeProfile,
  handoff: ProductHandoff | null,
  sidecarFile?: string
): SddWorkspaceInfo {
  const changeId = path.basename(changeWorkspaceDir);
  const specFile = path.join(changeWorkspaceDir, 'spec.md');
  const planFile = path.join(changeWorkspaceDir, 'plan.md');
  const tasksFile = path.join(changeWorkspaceDir, 'tasks.md');

  return {
    framework: 'speckit',
    changeId,
    changeDir: changeWorkspaceDir,
    profile,
    specFile: fs.existsSync(specFile) ? specFile : undefined,
    designFile: fs.existsSync(planFile) ? planFile : undefined,
    tasksFile: fs.existsSync(tasksFile) ? tasksFile : undefined,
    sidecarFile,
    handoff: handoff || undefined,
  };
}

export class SpecKitAdapter implements SddAdapter {
  readonly framework = 'speckit' as const;

  getChangeWorkspaceDir(rootDir: string, changeId: string): string {
    // 1. Spec Kit convention: specs/<changeId>
    const standardDir = path.join(rootDir, 'specs', changeId);
    if (fs.existsSync(standardDir)) return standardDir;

    // 2. Active changes path: specs/changes/active/<changeId>
    const activeChangeDir = path.join(rootDir, 'specs', 'changes', 'active', changeId);
    if (fs.existsSync(activeChangeDir)) return activeChangeDir;

    // 3. Completed changes path: specs/changes/completed/<changeId>
    const completedChangeDir = path.join(rootDir, 'specs', 'changes', 'completed', changeId);
    if (fs.existsSync(completedChangeDir)) return completedChangeDir;

    // 4. Default: specs/<changeId>
    return standardDir;
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

    // Also mirror to .specify/memory/<changeId>.handoff.yaml if .specify/ directory exists
    const specifyMemoryDir = path.join(options.rootDir, '.specify', 'memory');
    if (fs.existsSync(path.join(options.rootDir, '.specify'))) {
      if (!fs.existsSync(specifyMemoryDir)) {
        fs.mkdirSync(specifyMemoryDir, { recursive: true });
      }
      fs.writeFileSync(path.join(specifyMemoryDir, `${options.changeId}.handoff.yaml`), content, 'utf-8');
    }

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
        errors: [`El directorio del cambio Spec Kit no existe: ${changeWorkspaceDir}`],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const specFile = path.join(changeWorkspaceDir, 'spec.md');
    const profile = parseChangeProfile(specFile);

    validateSpecFileContent(specFile, changeWorkspaceDir, errors);
    const { handoff, sidecarFile } = validateSpecKitStructure(profile, changeWorkspaceDir, this, errors, warnings);
    const workspace = buildSpecKitWorkspaceInfo(changeWorkspaceDir, profile, handoff, sidecarFile);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      workspace,
    };
  }
}
