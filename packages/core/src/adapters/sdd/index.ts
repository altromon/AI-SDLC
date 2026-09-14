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

export function scanAllProductHandoffs(
  rootDir: string
): Map<string, { handoff: ProductHandoff; changeDir: string }> {
  const handoffsMap = new Map<string, { handoff: ProductHandoff; changeDir: string }>();

  // Look across potential SDD change locations:
  // 1. specs/changes/active/*
  // 2. specs/*
  // 3. openspec/changes/*
  // 4. examples/specs/*
  const candidateParentDirs = [
    path.join(rootDir, 'specs', 'changes', 'active'),
    path.join(rootDir, 'specs'),
    path.join(rootDir, 'openspec', 'changes'),
    path.join(rootDir, 'examples', 'specs'),
  ];

  for (const parentDir of candidateParentDirs) {
    if (!fs.existsSync(parentDir)) continue;
    const entries = fs.readdirSync(parentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      // Skip non-change directories
      if (entry.name === 'changes' || entry.name === 'active' || entry.name === 'node_modules') continue;

      const changeDir = path.join(parentDir, entry.name);
      if (handooffsHasDir(handoffsMap, changeDir)) continue;

      const handoff = loadProductHandoffSidecar(changeDir);
      if (handoff && handoff.id) {
        handoffsMap.set(changeDir, { handoff, changeDir });
      }
    }
  }

  return handoffsMap;
}

function handooffsHasDir(map: Map<string, any>, dir: string): boolean {
  const norm = path.resolve(dir);
  for (const key of map.keys()) {
    if (path.resolve(key) === norm) return true;
  }
  return false;
}
