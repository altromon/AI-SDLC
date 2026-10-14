/**
 * AI-SDLC: SDD Adapters Engine (OpenSpec & Spec Kit)
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProductHandoff, SddDepositOptions, SddFramework } from '../../types/index.js';
import { OpenSpecAdapter } from './openspec.js';
import { SpecKitAdapter } from './speckit.js';
import { SddAdapter } from './types.js';

export * from './types.js';
export * from './openspec.js';
export * from './speckit.js';
export * from './integration.js';
export * from './scaffold.js';
export * from './ci.js';

export function getSddAdapter(framework: SddFramework): SddAdapter {
  switch (framework) {
    case 'openspec':
      return new OpenSpecAdapter();
    case 'speckit':
      return new SpecKitAdapter();
    default:
      throw new Error(`Framework SDD no soportado: ${framework}`);
  }
}

export function depositProductHandoffSidecar(options: SddDepositOptions): string {
  const adapter = getSddAdapter(options.framework);
  return adapter.depositSidecar({
    rootDir: options.rootDir || process.cwd(),
    changeId: options.changeId,
    handoff: options.handoff,
  });
}

export function loadProductHandoffSidecar(changeDir: string): ProductHandoff | null {
  const openspec = new OpenSpecAdapter();
  const res = openspec.loadSidecar(changeDir);
  if (res) return res;

  const speckit = new SpecKitAdapter();
  return speckit.loadSidecar(changeDir);
}

function isIgnoredEntry(name: string): boolean {
  return name === 'changes' || name === 'active' || name === 'node_modules';
}

function scanParentDirectoryHandoffs(
  parentDir: string,
  handoffsMap: Map<string, { handoff: ProductHandoff; changeDir: string }>
): void {
  if (!fs.existsSync(parentDir)) return;
  const entries = fs.readdirSync(parentDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || isIgnoredEntry(entry.name)) continue;

    const changeDir = path.join(parentDir, entry.name);
    if (handooffsHasDir(handoffsMap, changeDir)) continue;

    const handoff = loadProductHandoffSidecar(changeDir);
    if (handoff?.id) {
      handoffsMap.set(changeDir, { handoff, changeDir });
    }
  }
}

export function scanAllProductHandoffs(
  rootDir: string
): Map<string, { handoff: ProductHandoff; changeDir: string }> {
  const handoffsMap = new Map<string, { handoff: ProductHandoff; changeDir: string }>();
  const candidateParentDirs = [
    path.join(rootDir, 'specs', 'changes', 'active'),
    path.join(rootDir, 'specs', 'changes', 'completed'),
    path.join(rootDir, 'specs'),
    path.join(rootDir, 'openspec', 'changes'),
  ];

  for (const parentDir of candidateParentDirs) {
    scanParentDirectoryHandoffs(parentDir, handoffsMap);
  }

  return handoffsMap;
}

function handooffsHasDir(map: Map<string, unknown>, dir: string): boolean {
  const norm = path.resolve(dir);
  for (const key of map.keys()) {
    if (path.resolve(key) === norm) return true;
  }
  return false;
}
