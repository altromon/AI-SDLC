/**
 * AI-SDLC: Node.js Offline License Resolver (CHG-055, TSK-008)
 * Reads node_modules/<pkg>/package.json first; falls back to npm/pnpm via runSafe.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ScannedDependency } from '../../types/index.js';
import type { EcosystemLicenseResolution } from './license-python.js';
import { readConfinedText, runSafe, safeRealpath } from './safe-exec.js';
import { findLicenseFile, normalizeSpdxLicense, resolveLicenseFromFile } from './scanner.js';

const MAX_PKG_JSON_BYTES = 512 * 1024;

function isSafeNodePkgName(name: string): boolean {
  if (!name || name.includes('..') || name.includes('\\') || name.includes('\0')) return false;
  return name.split('/').every((seg) => Boolean(seg) && seg !== '.' && seg !== '..');
}

function findLocalNodeLicense(dep: ScannedDependency, realRoot: string): string | undefined {
  if (!isSafeNodePkgName(dep.name)) return undefined;
  const pkgDir = path.join(realRoot, 'node_modules', ...dep.name.split('/'));
  const content = readConfinedText(path.join(pkgDir, 'package.json'), realRoot, MAX_PKG_JSON_BYTES);
  if (!content) return undefined;
  try {
    const pkg = JSON.parse(content) as { license?: unknown; licenses?: unknown };
    const spdx = normalizeSpdxLicense(pkg.license || pkg.licenses);
    if (spdx !== 'UNKNOWN') return spdx;
    return resolveLicenseFromFile(findLicenseFile(pkgDir));
  } catch {
    return undefined;
  }
}

interface NpmTreeNode {
  version?: string;
  license?: unknown;
  dependencies?: Record<string, NpmTreeNode>;
}

function searchNpmDepsTree(deps: Record<string, NpmTreeNode> | undefined, targetName: string): string | undefined {
  if (!deps || typeof deps !== 'object') return undefined;
  if (deps[targetName]) {
    const spdx = normalizeSpdxLicense(deps[targetName].license);
    if (spdx !== 'UNKNOWN') return spdx;
  }
  for (const child of Object.values(deps)) {
    const nested = searchNpmDepsTree(child?.dependencies, targetName);
    if (nested) return nested;
  }
  return undefined;
}

function parseNpmLsOutput(stdout: string, depName: string): EcosystemLicenseResolution {
  try {
    const data = JSON.parse(stdout) as NpmTreeNode;
    const lic = searchNpmDepsTree(data?.dependencies, depName);
    return lic ? { license: lic, provenance: 'cli' } : { reason: 'cache_missing' };
  } catch {
    return { reason: 'invalid_output' };
  }
}

function parsePnpmLicensesOutput(stdout: string, depName: string): EcosystemLicenseResolution {
  try {
    const data = JSON.parse(stdout) as Record<string, Array<{ name?: string; license?: unknown }>>;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { reason: 'invalid_output' };
    for (const [licKey, entries] of Object.entries(data)) {
      if (!Array.isArray(entries)) continue;
      const hit = entries.find((e) => e?.name === depName);
      if (hit) {
        const spdx = normalizeSpdxLicense(hit.license || licKey);
        if (spdx !== 'UNKNOWN') return { license: spdx, provenance: 'cli' };
      }
    }
    return { reason: 'cache_missing' };
  } catch {
    return { reason: 'invalid_output' };
  }
}

export function resolveNodeLicenseDetailed(dep: ScannedDependency, rootDir: string): EcosystemLicenseResolution {
  const realRoot = safeRealpath(rootDir);
  if (!realRoot) return { reason: 'path_rejected' };

  const localLic = findLocalNodeLicense(dep, realRoot);
  if (localLic) return { license: localLic, provenance: 'local-metadata' };

  const usePnpm = fs.existsSync(path.join(realRoot, 'pnpm-lock.yaml'));
  const res = runSafe(usePnpm ? 'pnpm' : 'npm', rootDir, rootDir);
  if (!res.ok) return { reason: res.reason };
  return usePnpm ? parsePnpmLicensesOutput(res.stdout, dep.name) : parseNpmLsOutput(res.stdout, dep.name);
}

export function resolveNodeLicense(dep: ScannedDependency, rootDir: string): string | undefined {
  return resolveNodeLicenseDetailed(dep, rootDir).license;
}
