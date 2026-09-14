/**
 * AI-SDLC: SDD Change Integration & Canonical Specification Promotion Engine
 * Ensures that changes implemented in SDD workspaces are correctly integrated
 * into canonical specifications (Product, Requirements, and Architecture arc42/NAF v4).
 */

import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import {
  ProductHandoff,
  SddIntegrationAudit,
  SddIntegrationOptions,
  SddIntegrationResult,
} from '../../types/index.js';
import { walkMdFiles } from '../../utils/fs.js';
import { parseFrontmatter } from '../../verifiers/traceability.js';
import { loadProductHandoffSidecar } from './index.js';

interface TaskParsed {
  id: string;
  title?: string;
  status?: string;
}

export function parseTasksFromContent(content: string): TaskParsed[] {
  const tasks: TaskParsed[] = [];
  const { frontmatter } = parseFrontmatter(content);

  if (frontmatter && Array.isArray(frontmatter.tasks)) {
    for (const t of frontmatter.tasks as any[]) {
      if (t && typeof t === 'object' && t.id) {
        tasks.push({
          id: String(t.id),
          title: t.title ? String(t.title) : undefined,
          status: t.status ? String(t.status).toUpperCase() : undefined,
        });
      }
    }
  }

  // Also match markdown task checkboxes if no frontmatter tasks found
  if (tasks.length === 0) {
    const lines = content.split('\n');
    let index = 1;
    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/^-\s+\[([ xX])\]\s+(?:`([^`]+)`\s*:?\s*)?(.*)$/);
      if (match) {
        const isDone = match[1].toLowerCase() === 'x';
        const taskId = match[2] || `TSK-${String(index).padStart(3, '0')}`;
        tasks.push({
          id: taskId,
          title: match[3],
          status: isDone ? 'COMPLETED' : 'PENDING',
        });
        index++;
      }
    }
  }

  return tasks;
}

export function appendRevisionHistoryRow(
  body: string,
  entry: { version: string; date: string; author: string; description: string; reference: string }
): string {
  // Check if reference already recorded in table
  if (body.includes(entry.reference)) {
    return body;
  }

  const tableHeaderMatch = body.match(
    /(\|\s*Versi[oó]n\s*\|\s*Fecha\s*\|\s*Autor[^\n]*\r?\n\|[\s\-:|]+\r?\n)/i
  );

  const newRow = `| **${entry.version}** | ${entry.date} | ${entry.author} | ${entry.description} | ${entry.reference} |\n`;

  if (tableHeaderMatch && tableHeaderMatch.index !== undefined) {
    const insertPos = tableHeaderMatch.index + tableHeaderMatch[0].length;
    return body.substring(0, insertPos) + newRow + body.substring(insertPos);
  }

  // If table header not found, append section at the end
  const newSection = `\n\n## Historial de Revisiones\n\n| Versión | Fecha | Autor / Agente | Descripción del Cambio | Referencia de Cambio (Change/PR) |\n| :--- | :--- | :--- | :--- | :--- |\n${newRow}`;
  return body + newSection;
}

export function findChangeWorkspaceDir(rootDir: string, changeId: string): string | null {
  const candidateDirs = [
    path.join(rootDir, 'specs', 'changes', 'active', changeId),
    path.join(rootDir, 'specs', changeId),
    path.join(rootDir, 'examples', 'specs', changeId),
    path.join(rootDir, 'openspec', 'changes', changeId),
    path.join(rootDir, 'specs', 'changes', 'completed', changeId),
  ];

  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) return dir;
  }

  return null;
}

export function integrateSddChange(options: SddIntegrationOptions): SddIntegrationResult {
  const rootDir = options.rootDir || process.cwd();
  const changeId = options.changeId;
  const author = options.author || 'AI-SDLC Integration Engine';
  const date = options.date || new Date().toISOString().split('T')[0];
  const autoArchive = options.autoArchive !== false;

  const errors: string[] = [];
  const updatedProductArtifacts: string[] = [];
  const updatedArchitectureArtifacts: string[] = [];

  // 1. Locate change workspace
  const changeDir = findChangeWorkspaceDir(rootDir, changeId);
  if (!changeDir) {
    return {
      success: false,
      changeId,
      completedTasks: [],
      pendingTasks: [],
      integratedRequirements: [],
      updatedProductArtifacts: [],
      updatedArchitectureArtifacts: [],
      archived: false,
      errors: [`No se encontró el espacio de trabajo para el cambio '${changeId}'.`],
    };
  }

  // 2. Parse tasks.md to identify implemented vs pending tasks
  const tasksFile = path.join(changeDir, 'tasks.md');
  const allTasks: TaskParsed[] = [];
  if (fs.existsSync(tasksFile)) {
    const tasksContent = fs.readFileSync(tasksFile, 'utf-8');
    allTasks.push(...parseTasksFromContent(tasksContent));
  }

  const completedTasks = allTasks.filter((t) => t.status === 'COMPLETED').map((t) => t.id);
  const pendingTasks = allTasks.filter((t) => t.status !== 'COMPLETED').map((t) => t.id);

  // Bloquear integración si existen tareas pendientes o no completadas
  if (pendingTasks.length > 0) {
    return {
      success: false,
      changeId,
      completedTasks,
      pendingTasks,
      integratedRequirements: [],
      updatedProductArtifacts: [],
      updatedArchitectureArtifacts: [],
      archived: false,
      errors: [
        `No se puede integrar el cambio '${changeId}' porque existen ${pendingTasks.length} tareas pendientes o bloqueadas (${pendingTasks.join(
          ', '
        )}). Todas las tareas deben estar en estado COMPLETED antes de consolidar en la especificación canónica.`,
      ],
    };
  }

  // 3. Load sidecar HOF-* or fallback to proposal citations
  let handoff: ProductHandoff | null = loadProductHandoffSidecar(changeDir);

  if (!handoff) {
    // Attempt to extract from proposal.md
    const proposalFile = path.join(changeDir, 'proposal.md');
    if (fs.existsSync(proposalFile)) {
      const propContent = fs.readFileSync(proposalFile, 'utf-8');
      const { frontmatter } = parseFrontmatter(propContent);
      const citations = Array.isArray(frontmatter.citations) ? (frontmatter.citations as any[]) : [];
      const reqs = citations.map((c) => c.id).filter((id: string) => id.startsWith('FR-') || id.startsWith('QR-') || id.startsWith('CON-') || id.startsWith('SEC-REQ-'));
      handoff = {
        id: `HOF-${changeId.toUpperCase()}`,
        type: 'handoff',
        changeId,
        subgraph: {
          requirements: reqs,
        },
        citations,
      };
    }
  }

  if (!handoff || !handoff.subgraph) {
    return {
      success: false,
      changeId,
      completedTasks,
      pendingTasks,
      integratedRequirements: [],
      updatedProductArtifacts: [],
      updatedArchitectureArtifacts: [],
      archived: false,
      errors: [`El cambio '${changeId}' no posee un sidecar 'handoff.yaml' ni citaciones válidas en proposal.md.`],
    };
  }

  // 4. Determine which requirements are implemented
  // "integra todo lo implementado": integrate all requirements declared in the handoff subgraph
  const targetReqs = [
    ...(handoff.subgraph.requirements || []),
    ...(handoff.subgraph.securityRequirements || []),
  ];

  // 5. Scan all markdown files to find canonical target files
  const allMdFiles = walkMdFiles(rootDir);
  const canonicalArtifacts = new Map<string, { file: string; frontmatter: any; body: string }>();

  for (const file of allMdFiles) {
    const relFile = path.relative(rootDir, file).replace(/\\/g, '/');
    // Skip change folders and templates
    if (relFile.includes('specs/changes/') || relFile.includes('templates/')) continue;

    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      if (frontmatter.id) {
        canonicalArtifacts.set(String(frontmatter.id), { file, frontmatter, body });
      }
    } catch {
      // Ignore
    }
  }

  // 6. Integrate Product & Requirements Artifacts
  for (const reqId of targetReqs) {
    const canonical = canonicalArtifacts.get(reqId);
    if (canonical) {
      try {
        const fm = canonical.frontmatter;
        let modified = false;

        if (fm.status !== 'active') {
          fm.status = 'active';
          modified = true;
        }

        const taskDesc =
          completedTasks.length > 0
            ? `Implementación verificada (${completedTasks.join(', ')})`
            : `Integración de especificación`;

        const updatedBody = appendRevisionHistoryRow(canonical.body, {
          version: String(fm.version || '1.0.0'),
          date,
          author,
          description: taskDesc,
          reference: changeId,
        });

        if (updatedBody !== canonical.body || modified) {
          const yamlHeader = `---\n${yaml.dump(fm, { indent: 2, lineWidth: -1 }).trim()}\n---\n`;
          fs.writeFileSync(canonical.file, yamlHeader + updatedBody, 'utf-8');
          updatedProductArtifacts.push(reqId);
        }
      } catch (err: any) {
        errors.push(`Error actualizando artefacto canónico '${reqId}': ${err.message}`);
      }
    }
  }

  // 7. Integrate Architecture Services & Views (arc42 / NAF v4)
  // Identify cited architecture components in handoff or proposal
  const citedServices: string[] = [];
  if (handoff.citations) {
    for (const c of handoff.citations) {
      const citeId = (c as any).targetId || (c as any).id;
      if (
        citeId &&
        (citeId.startsWith('SRV-') ||
          citeId.startsWith('SYS-') ||
          citeId.startsWith('SEC-ENC-') ||
          citeId.startsWith('ADR-'))
      ) {
        citedServices.push(citeId);
      }
    }
  }

  // If no services cited directly in citations, search canonical services that implement target requirements
  for (const [artId, art] of canonicalArtifacts.entries()) {
    if (artId.startsWith('SRV-') && art.frontmatter) {
      const satisfies = Array.isArray(art.frontmatter['satisfies-requirements'])
        ? (art.frontmatter['satisfies-requirements'] as string[])
        : [];
      if (targetReqs.some((r) => satisfies.includes(r))) {
        if (!citedServices.includes(artId)) citedServices.push(artId);
      }
    }
  }

  for (const srvId of citedServices) {
    const canonical = canonicalArtifacts.get(srvId);
    if (canonical) {
      try {
        const fm = canonical.frontmatter;
        let modified = false;

        // Ensure satisfies-requirements includes target requirements
        if (srvId.startsWith('SRV-')) {
          const existingSatisfies = Array.isArray(fm['satisfies-requirements'])
            ? [...fm['satisfies-requirements']]
            : [];
          for (const req of targetReqs) {
            if (!existingSatisfies.includes(req)) {
              existingSatisfies.push(req);
              modified = true;
            }
          }
          fm['satisfies-requirements'] = existingSatisfies;
        }

        const updatedBody = appendRevisionHistoryRow(canonical.body, {
          version: String(fm.version || '1.0.0'),
          date,
          author,
          description: `Integración de incremento de entrega ${changeId}`,
          reference: changeId,
        });

        if (updatedBody !== canonical.body || modified) {
          const yamlHeader = `---\n${yaml.dump(fm, { indent: 2, lineWidth: -1 }).trim()}\n---\n`;
          fs.writeFileSync(canonical.file, yamlHeader + updatedBody, 'utf-8');
          updatedArchitectureArtifacts.push(srvId);
        }
      } catch (err: any) {
        errors.push(`Error actualizando componente de arquitectura '${srvId}': ${err.message}`);
      }
    }
  }

  // 8. Archiving / Promotion of Change Workspace
  let archived = false;
  let archivedPath: string | undefined;

  const isActiveFolder = changeDir.includes('specs' + path.sep + 'changes' + path.sep + 'active');
  const allTasksCompleted = allTasks.length > 0 && pendingTasks.length === 0;

  if (allTasksCompleted && autoArchive && isActiveFolder) {
    const completedParent = path.join(rootDir, 'specs', 'changes', 'completed');
    if (!fs.existsSync(completedParent)) {
      fs.mkdirSync(completedParent, { recursive: true });
    }

    const destDir = path.join(completedParent, changeId);
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }

    // Move folder
    fs.renameSync(changeDir, destDir);
    archived = true;
    archivedPath = destDir;

    // Update proposal.md status to applied
    const destProposal = path.join(destDir, 'proposal.md');
    if (fs.existsSync(destProposal)) {
      const content = fs.readFileSync(destProposal, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      frontmatter.status = 'applied';
      const newContent = `---\n${yaml.dump(frontmatter, { indent: 2, lineWidth: -1 }).trim()}\n---\n` + body;
      fs.writeFileSync(destProposal, newContent, 'utf-8');
    }
  } else {
    // Update proposal status or add integration note
    const proposalFile = path.join(changeDir, 'proposal.md');
    if (fs.existsSync(proposalFile)) {
      const content = fs.readFileSync(proposalFile, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      if (allTasksCompleted) {
        frontmatter.status = 'completed';
      }
      const newContent = `---\n${yaml.dump(frontmatter, { indent: 2, lineWidth: -1 }).trim()}\n---\n` + body;
      fs.writeFileSync(proposalFile, newContent, 'utf-8');
    }
  }

  return {
    success: errors.length === 0,
    changeId,
    completedTasks,
    pendingTasks,
    integratedRequirements: targetReqs,
    updatedProductArtifacts,
    updatedArchitectureArtifacts,
    archived,
    archivedPath,
    errors,
  };
}

export function verifySddIntegration(options: { rootDir?: string } = {}): {
  success: boolean;
  audits: SddIntegrationAudit[];
  errors: string[];
} {
  const rootDir = options.rootDir || process.cwd();
  const audits: SddIntegrationAudit[] = [];
  const errors: string[] = [];

  // Look for changes in specs/changes/active, specs/changes/completed, and examples/specs
  const searchDirs = [
    path.join(rootDir, 'specs', 'changes', 'completed'),
    path.join(rootDir, 'specs', 'changes', 'active'),
    path.join(rootDir, 'examples', 'specs'),
  ];

  // Scan all canonical requirements
  const allMdFiles = walkMdFiles(rootDir);
  const canonicalMap = new Map<string, any>();
  for (const file of allMdFiles) {
    const rel = path.relative(rootDir, file).replace(/\\/g, '/');
    if (rel.includes('specs/changes/') || rel.includes('templates/')) continue;
    try {
      const { frontmatter, body } = parseFrontmatter(fs.readFileSync(file, 'utf-8'));
      if (frontmatter.id) {
        canonicalMap.set(String(frontmatter.id), { file, frontmatter, body });
      }
    } catch {}
  }

  for (const parent of searchDirs) {
    if (!fs.existsSync(parent)) continue;
    const entries = fs.readdirSync(parent, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const changeDir = path.join(parent, e.name);
      const handoff = loadProductHandoffSidecar(changeDir);
      if (!handoff) continue;

      const tasksFile = path.join(changeDir, 'tasks.md');
      const tasks: TaskParsed[] = fs.existsSync(tasksFile)
        ? parseTasksFromContent(fs.readFileSync(tasksFile, 'utf-8'))
        : [];

      const completed = tasks.filter((t) => t.status === 'COMPLETED');
      const targetReqs = handoff.subgraph?.requirements || [];
      const integrated: string[] = [];
      const missing: string[] = [];
      const gaps: string[] = [];

      for (const reqId of targetReqs) {
        const canonical = canonicalMap.get(reqId);
        if (!canonical) {
          missing.push(reqId);
          gaps.push(`El requerimiento '${reqId}' no existe en la especificación canónica.`);
        } else {
          // Check if canonical reflects active status
          if (canonical.frontmatter.status !== 'active') {
            gaps.push(`El requerimiento '${reqId}' no tiene status: active en la especificación canónica.`);
          }
          integrated.push(reqId);
        }
      }

      let status: 'FULLY_INTEGRATED' | 'PARTIALLY_INTEGRATED' | 'UNINTEGRATED' = 'UNINTEGRATED';
      if (integrated.length === targetReqs.length && gaps.length === 0) {
        status = 'FULLY_INTEGRATED';
      } else if (integrated.length > 0) {
        status = 'PARTIALLY_INTEGRATED';
      }

      if (gaps.length > 0) {
        errors.push(`[${e.name}] Desalineación: ${gaps.join('; ')}`);
      }

      audits.push({
        changeId: e.name,
        status,
        completedTasksCount: completed.length,
        totalTasksCount: tasks.length,
        integratedRequirements: integrated,
        missingRequirements: missing,
        gaps,
      });
    }
  }

  return {
    success: errors.length === 0,
    audits,
    errors,
  };
}
