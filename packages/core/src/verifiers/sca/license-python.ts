/**
 * AI-SDLC: Python Offline License Resolver (CHG-055, TSK-003)
 * Reads .venv/venv dist-info/METADATA first; falls back to pip-licenses via runSafe.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { ScannedDependency } from '../../types/index.js';
import { isPathInside, readConfinedText, runSafe, safeRealpath, type UnresolvedReason } from './safe-exec.js';

export interface EcosystemLicenseResolution {
  license?: string;
  provenance?: 'local-metadata' | 'cli';
  reason?: UnresolvedReason;
}

const MAX_METADATA_BYTES = 512 * 1024;

const CLASSIFIER_MAP: ReadonlyArray<readonly [string, string]> = [
  ['MIT License', 'MIT'],
  ['Apache Software License', 'Apache-2.0'],
  ['BSD License', 'BSD-3-Clause'],
  ['ISC License', 'ISC'],
  ['Mozilla Public License 2.0', 'MPL-2.0'],
  ['Python Software Foundation License', 'Python-2.0'],
  ['GNU General Public License v3', 'GPL-3.0-only'],
  ['GNU Lesser General Public License v3', 'LGPL-3.0-only'],
];

function normalizePyName(name: string): string {
  return name.trim().toLowerCase().replace(/[-_.]+/g, '-');
}

function mapClassifierLicense(classifier: string): string | undefined {
  for (const [needle, spdx] of CLASSIFIER_MAP) {
    if (classifier.includes(needle)) return spdx;
  }
  const parts = classifier.split('::').map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : undefined;
}

function readHeaderField(line: string, prefix: string): string | undefined {
  if (!line.startsWith(prefix)) return undefined;
  const val = line.slice(prefix.length).trim();
  return val && val !== 'UNKNOWN' ? val : undefined;
}

function parseMetadataHeaders(content: string): string | undefined {
  let licenseHeader: string | undefined;
  let classifierLicense: string | undefined;
  for (const line of content.split(/\r?\n/)) {
    if (line.trim() === '') break;
    const expr = readHeaderField(line, 'License-Expression:');
    if (expr) return expr;
    licenseHeader ??= readHeaderField(line, 'License:');
    const cls = readHeaderField(line, 'Classifier: License ::');
    if (cls && !classifierLicense) classifierLicense = mapClassifierLicense(cls);
  }
  return licenseHeader ?? classifierLicense;
}

function collectUnixSitePackages(libDir: string, realRoot: string): string[] {
  const realLib = safeRealpath(libDir);
  if (!realLib || !isPathInside(realRoot, realLib)) return [];
  const dirs: string[] = [];
  for (const entry of fs.readdirSync(realLib, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith('python')) {
      const sp = path.join(realLib, entry.name, 'site-packages');
      if (fs.existsSync(sp)) dirs.push(sp);
    }
  }
  const directSp = path.join(realLib, 'site-packages');
  if (fs.existsSync(directSp)) dirs.push(directSp);
  return dirs;
}

function findSitePackagesDirs(rootDir: string, realRoot: string): string[] {
  const dirs: string[] = [];
  for (const venvName of ['.venv', 'venv']) {
    const winSp = path.join(rootDir, venvName, 'Lib', 'site-packages');
    if (fs.existsSync(winSp)) dirs.push(winSp);
    const libDir = path.join(rootDir, venvName, 'lib');
    if (fs.existsSync(libDir)) dirs.push(...collectUnixSitePackages(libDir, realRoot));
  }
  return dirs;
}

function findDistInfoMetadata(spDir: string, realRoot: string, targetNorm: string): string | undefined {
  const realSp = safeRealpath(spDir);
  if (!realSp || !isPathInside(realRoot, realSp)) return undefined;
  for (const entry of fs.readdirSync(realSp, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.endsWith('.dist-info')) continue;
    const pkgPart = entry.name.replace(/-[^-]+\.dist-info$/, '');
    if (normalizePyName(pkgPart) !== targetNorm) continue;
    const metaPath = path.join(realSp, entry.name, 'METADATA');
    const content = readConfinedText(metaPath, realRoot, MAX_METADATA_BYTES);
    if (content) return parseMetadataHeaders(content);
  }
  return undefined;
}

function resolveFromPipLicensesCli(dep: ScannedDependency, rootDir: string): EcosystemLicenseResolution {
  const res = runSafe('pip-licenses', rootDir, rootDir);
  if (!res.ok) return { reason: res.reason };
  try {
    const items = JSON.parse(res.stdout) as Array<{ Name?: string; License?: string }>;
    if (!Array.isArray(items)) return { reason: 'invalid_output' };
    const targetNorm = normalizePyName(dep.name);
    const found = items.find((i) => typeof i.Name === 'string' && normalizePyName(i.Name) === targetNorm);
    const lic = found?.License?.trim();
    if (lic && lic !== 'UNKNOWN') return { license: lic, provenance: 'cli' };
    return { reason: 'cache_missing' };
  } catch {
    return { reason: 'invalid_output' };
  }
}

export function resolvePythonLicenseDetailed(dep: ScannedDependency, rootDir: string): EcosystemLicenseResolution {
  const realRoot = safeRealpath(rootDir);
  if (!realRoot) return { reason: 'path_rejected' };
  const targetNorm = normalizePyName(dep.name);

  for (const spDir of findSitePackagesDirs(rootDir, realRoot)) {
    const found = findDistInfoMetadata(spDir, realRoot, targetNorm);
    if (found) return { license: found, provenance: 'local-metadata' };
  }
  return resolveFromPipLicensesCli(dep, rootDir);
}

export function resolvePythonLicense(dep: ScannedDependency, rootDir: string): string | undefined {
  return resolvePythonLicenseDetailed(dep, rootDir).license;
}
