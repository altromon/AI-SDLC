/**
 * AI-SDLC: Go Offline License Resolver (CHG-055, TSK-005)
 * Reads LICENSE from GOMODCACHE first; falls back to go list -m -json all via runSafe.
 */

import * as os from 'os';
import * as path from 'path';
import type { ScannedDependency } from '../../types/index.js';
import type { EcosystemLicenseResolution } from './license-python.js';
import { isPathInside, safeRealpath, runSafe } from './safe-exec.js';
import { findLicenseFile, resolveLicenseFromFile } from './scanner.js';

function encodeGoModulePath(modPath: string): string {
  return modPath.replace(/[A-Z]/g, (ch) => `!${ch.toLowerCase()}`);
}

function getGoModCacheDir(): string {
  if (process.env.GOMODCACHE) return process.env.GOMODCACHE;
  const gopath = process.env.GOPATH || path.join(os.homedir(), 'go');
  return path.join(gopath, 'pkg', 'mod');
}

function readLicenseInConfinedDir(dir: string, baseReal: string): string | undefined {
  const realDir = safeRealpath(dir);
  if (!realDir || !isPathInside(baseReal, realDir)) return undefined;
  const licFile = findLicenseFile(realDir);
  if (!licFile) return undefined;
  const realLic = safeRealpath(licFile);
  if (!realLic || !isPathInside(realDir, realLic)) return undefined;
  return resolveLicenseFromFile(realLic);
}

function findLocalGoLicense(dep: ScannedDependency): string | undefined {
  const realCache = safeRealpath(getGoModCacheDir());
  if (!realCache) return undefined;
  const encodedMod = encodeGoModulePath(dep.name);
  const versions = dep.version.startsWith('v') ? [dep.version] : [`v${dep.version}`, dep.version];

  for (const ver of versions) {
    const modDir = path.join(realCache, `${encodedMod}@${ver}`);
    const lic = readLicenseInConfinedDir(modDir, realCache);
    if (lic) return lic;
  }
  return undefined;
}

function findJsonObjectEnd(raw: string, openIdx: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = openIdx; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return i;
  }
  return -1;
}

function parseConcatenatedJsonObjects(raw: string): Array<{ Path?: string; Dir?: string }> {
  const items: Array<{ Path?: string; Dir?: string }> = [];
  let idx = raw.indexOf('{');
  while (idx !== -1) {
    const endIdx = findJsonObjectEnd(raw, idx);
    if (endIdx === -1) break;
    items.push(JSON.parse(raw.slice(idx, endIdx + 1)) as { Path?: string; Dir?: string });
    idx = raw.indexOf('{', endIdx + 1);
  }
  return items;
}

function resolveFromGoCli(dep: ScannedDependency, rootDir: string): EcosystemLicenseResolution {
  const res = runSafe('go', rootDir, rootDir);
  if (!res.ok) return { reason: res.reason };
  try {
    const mods = parseConcatenatedJsonObjects(res.stdout);
    const match = mods.find((m) => m.Path === dep.name && typeof m.Dir === 'string');
    if (!match?.Dir) return { reason: 'cache_missing' };
    const realModDir = safeRealpath(match.Dir);
    if (!realModDir) return { reason: 'path_rejected' };
    const lic = readLicenseInConfinedDir(realModDir, realModDir);
    return lic ? { license: lic, provenance: 'cli' } : { reason: 'cache_missing' };
  } catch {
    return { reason: 'invalid_output' };
  }
}

export function resolveGoLicenseDetailed(dep: ScannedDependency, rootDir: string): EcosystemLicenseResolution {
  const localLic = findLocalGoLicense(dep);
  if (localLic) return { license: localLic, provenance: 'local-metadata' };
  return resolveFromGoCli(dep, rootDir);
}

export function resolveGoLicense(dep: ScannedDependency, rootDir: string): string | undefined {
  return resolveGoLicenseDetailed(dep, rootDir).license;
}
