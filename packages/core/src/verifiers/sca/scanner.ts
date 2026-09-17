/**
 * AI-SDLC: Dynamic Software Composition Analysis (SCA) Scanner
 * Inspects installed dependencies in node_modules, lockfiles, or external SCA tools (Trivy, Syft).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { ScannedDependency, ScaTool } from '../../types/index.js';

export interface ScanOptions {
  depth?: 'direct' | 'transitive';
  tool?: ScaTool;
  productionOnly?: boolean;
}

export function isToolAvailable(toolName: string): boolean {
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    child_process.execFileSync(cmd, [toolName], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function normalizeSpdxLicense(raw: any): string {
  if (!raw) return 'UNKNOWN';
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : 'UNKNOWN';
  }
  if (Array.isArray(raw)) {
    const parts = raw.map((item) => normalizeSpdxLicense(item)).filter((id) => id !== 'UNKNOWN');
    if (parts.length === 0) return 'UNKNOWN';
    if (parts.length === 1) return parts[0];
    return `(${parts.join(' OR ')})`;
  }
  if (typeof raw === 'object') {
    if (raw.type && typeof raw.type === 'string') return raw.type.trim();
    if (raw.name && typeof raw.name === 'string') return raw.name.trim();
    if (raw.license && typeof raw.license === 'string') return raw.license.trim();
  }
  return 'UNKNOWN';
}

export function findLicenseFile(pkgDir: string): string | undefined {
  const candidates = [
    'LICENSE',
    'LICENSE.md',
    'LICENSE.txt',
    'LICENCE',
    'LICENCE.md',
    'LICENCE.txt',
    'license',
    'license.md',
    'license.txt',
  ];
  for (const c of candidates) {
    const full = path.join(pkgDir, c);
    if (fs.existsSync(full)) {
      return full;
    }
  }
  return undefined;
}

export function resolveLicenseFromFile(licenseFilePath?: string): string | undefined {
  if (!licenseFilePath || !fs.existsSync(licenseFilePath)) return undefined;
  try {
    const text = fs.readFileSync(licenseFilePath, 'utf-8');
    if (text.includes('Apache License') && text.includes('Version 2.0')) {
      return 'Apache-2.0';
    }
    if (text.includes('MIT License') || text.includes('Permission is hereby granted, free of charge')) {
      return 'MIT';
    }
    if (text.includes('Blue Oak Model License 1.0.0')) {
      return 'BlueOak-1.0.0';
    }
    if (text.includes('Python Software Foundation License') || text.includes('PSF LICENSE AGREEMENT')) {
      return 'Python-2.0';
    }
    if (text.includes('Redistribution and use in source and binary forms') && text.includes('Neither the name')) {
      return 'BSD-3-Clause';
    }
    if (text.includes('ISC License')) {
      return 'ISC';
    }
    if (text.includes('Microsoft Public License') || text.includes('MS-PL')) {
      return 'MS-PL';
    }
    if (text.includes('Microsoft Reciprocal License') || text.includes('MS-RL')) {
      return 'MS-RL';
    }
  } catch {
    // Ignore read error
  }
  return undefined;
}

export function readPackageJson(filePath: string): any | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function extractDirectDepNames(rootDir: string, productionOnly?: boolean): Set<string> {
  const names = new Set<string>();
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = readPackageJson(pkgPath);
  if (!pkg) return names;

  if (pkg.dependencies && typeof pkg.dependencies === 'object') {
    Object.keys(pkg.dependencies).forEach((d) => names.add(d));
  }
  if (!productionOnly && pkg.devDependencies && typeof pkg.devDependencies === 'object') {
    Object.keys(pkg.devDependencies).forEach((d) => names.add(d));
  }
  return names;
}

export function processPackageDir(pkgDir: string, directNames: Set<string>, seen: Map<string, ScannedDependency>): void {
  const pkgJsonPath = path.join(pkgDir, 'package.json');
  const pkg = readPackageJson(pkgJsonPath);
  if (!pkg || !pkg.name || !pkg.version) return;

  const key = `${pkg.name}@${pkg.version}`;
  if (seen.has(key)) return;

  const licFile = findLicenseFile(pkgDir);
  let spdx = normalizeSpdxLicense(pkg.license || pkg.licenses);

  if (spdx === 'UNKNOWN' || spdx.toUpperCase().includes('SEE LICENSE')) {
    const inferred = resolveLicenseFromFile(licFile);
    if (inferred) spdx = inferred;
  }

  const repoUrl = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
  const authorStr = typeof pkg.author === 'string' ? pkg.author : pkg.author?.name;

  seen.set(key, {
    name: pkg.name,
    version: pkg.version,
    spdxLicense: spdx,
    purl: `pkg:npm/${pkg.name}@${pkg.version}`,
    path: pkgDir,
    licenseFile: licFile,
    repository: repoUrl,
    author: authorStr,
    isDirect: directNames.has(pkg.name),
  });
}

export function scanSubdirectories(baseDir: string, directNames: Set<string>, seen: Map<string, ScannedDependency>): void {
  if (!fs.existsSync(baseDir)) return;
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('@')) {
      const scopeDir = path.join(baseDir, entry.name);
      const scopedEntries = fs.readdirSync(scopeDir, { withFileTypes: true });
      for (const scoped of scopedEntries) {
        if (scoped.isDirectory()) {
          processPackageDir(path.join(scopeDir, scoped.name), directNames, seen);
        }
      }
    } else if (entry.name !== '.bin' && entry.name !== '.pnpm') {
      processPackageDir(path.join(baseDir, entry.name), directNames, seen);
    }
  }
}

export function scanPnpmStore(pnpmDir: string, directNames: Set<string>, seen: Map<string, ScannedDependency>): void {
  if (!fs.existsSync(pnpmDir)) return;
  const entries = fs.readdirSync(pnpmDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidateModules = path.join(pnpmDir, entry.name, 'node_modules');
    if (fs.existsSync(candidateModules)) {
      scanSubdirectories(candidateModules, directNames, seen);
    }
  }
}

export function scanWithNativeFs(rootDir: string, options: ScanOptions = {}): ScannedDependency[] {
  const directNames = extractDirectDepNames(rootDir, options.productionOnly);
  const seen = new Map<string, ScannedDependency>();
  const nmDir = path.join(rootDir, 'node_modules');

  if (fs.existsSync(nmDir)) {
    scanSubdirectories(nmDir, directNames, seen);
    if (options.depth !== 'direct') {
      scanPnpmStore(path.join(nmDir, '.pnpm'), directNames, seen);
    }
  }

  const allDeps = Array.from(seen.values());
  if (options.depth === 'direct') {
    return allDeps.filter((d) => d.isDirect);
  }
  return allDeps.sort((a, b) => a.name.localeCompare(b.name));
}

export function scanWithTrivy(rootDir: string): { dependencies: ScannedDependency[]; executed: boolean } {
  if (!isToolAvailable('trivy')) {
    return { dependencies: [], executed: false };
  }
  try {
    const res = child_process.spawnSync(
      'trivy',
      ['fs', '--format', 'json', '--security-checks', 'license', rootDir],
      { encoding: 'utf-8', timeout: 30000 }
    );
    if (res.status !== 0 || !res.stdout) {
      return { dependencies: [], executed: false };
    }
    const data = JSON.parse(res.stdout);
    const deps: ScannedDependency[] = [];
    if (Array.isArray(data.Results)) {
      for (const r of data.Results) {
        if (Array.isArray(r.Packages)) {
          for (const p of r.Packages) {
            deps.push({
              name: p.Name,
              version: p.Version || 'unknown',
              spdxLicense: normalizeSpdxLicense(p.Licenses?.[0] || 'UNKNOWN'),
              purl: p.Identifier?.PURL || `pkg:npm/${p.Name}@${p.Version || 'unknown'}`,
            });
          }
        }
      }
    }
    return { dependencies: deps, executed: true };
  } catch {
    return { dependencies: [], executed: false };
  }
}

export function scanWithSyft(rootDir: string): { dependencies: ScannedDependency[]; executed: boolean } {
  if (!isToolAvailable('syft')) {
    return { dependencies: [], executed: false };
  }
  try {
    const res = child_process.spawnSync('syft', [`dir:${rootDir}`, '-o', 'json'], {
      encoding: 'utf-8',
      timeout: 30000,
    });
    if (res.status !== 0 || !res.stdout) {
      return { dependencies: [], executed: false };
    }
    const data = JSON.parse(res.stdout);
    const deps: ScannedDependency[] = [];
    if (Array.isArray(data.artifacts)) {
      for (const a of data.artifacts) {
        const lic = a.licenses?.[0]?.value || 'UNKNOWN';
        deps.push({
          name: a.name,
          version: a.version || 'unknown',
          spdxLicense: normalizeSpdxLicense(lic),
          purl: a.purl || `pkg:npm/${a.name}@${a.version || 'unknown'}`,
          author: a.metadata?.author,
        });
      }
    }
    return { dependencies: deps, executed: true };
  } catch {
    return { dependencies: [], executed: false };
  }
}

export function scanInstalledLicenses(rootDir: string, options: ScanOptions = {}): ScannedDependency[] {
  const selectedTool = options.tool || 'native';

  if (selectedTool === 'trivy') {
    const trivyResult = scanWithTrivy(rootDir);
    if (trivyResult.executed && trivyResult.dependencies.length > 0) {
      return trivyResult.dependencies;
    }
  }

  if (selectedTool === 'syft') {
    const syftResult = scanWithSyft(rootDir);
    if (syftResult.executed && syftResult.dependencies.length > 0) {
      return syftResult.dependencies;
    }
  }

  return scanWithNativeFs(rootDir, {
    depth: options.depth || 'transitive',
    productionOnly: options.productionOnly,
  });
}
