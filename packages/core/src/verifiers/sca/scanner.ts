/**
 * AI-SDLC: Dynamic Software Composition Analysis (SCA) Scanner
 * Inspects installed dependencies in node_modules, lockfiles, or external SCA tools (Trivy, Syft).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { ScannedDependency, ScaTool, ScaVulnerability, VexStatement, VulnerabilityThresholds } from '../../types/index.js';

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

function normalizeArrayLicense(raw: unknown[]): string {
  const parts = raw.map((item) => normalizeSpdxLicense(item)).filter((id) => id !== 'UNKNOWN');
  if (parts.length === 0) return 'UNKNOWN';
  if (parts.length === 1) return parts[0];
  return `(${parts.join(' OR ')})`;
}

function normalizeObjectLicense(raw: Record<string, unknown>): string {
  if (typeof raw.type === 'string') return raw.type.trim();
  if (typeof raw.name === 'string') return raw.name.trim();
  if (typeof raw.license === 'string') return raw.license.trim();
  return 'UNKNOWN';
}

export function normalizeSpdxLicense(raw: unknown): string {
  if (!raw) return 'UNKNOWN';
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : 'UNKNOWN';
  }
  if (Array.isArray(raw)) return normalizeArrayLicense(raw);
  if (typeof raw === 'object') return normalizeObjectLicense(raw as Record<string, unknown>);
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

const LICENSE_FILE_PATTERNS: readonly [predicate: (text: string) => boolean, spdx: string][] = [
  [(t) => t.includes('Apache License') && t.includes('Version 2.0'), 'Apache-2.0'],
  [(t) => t.includes('MIT License') || t.includes('Permission is hereby granted, free of charge'), 'MIT'],
  [(t) => t.includes('Blue Oak Model License 1.0.0'), 'BlueOak-1.0.0'],
  [(t) => t.includes('Python Software Foundation License') || t.includes('PSF LICENSE AGREEMENT'), 'Python-2.0'],
  [(t) => t.includes('Redistribution and use in source and binary forms') && t.includes('Neither the name'), 'BSD-3-Clause'],
  [(t) => t.includes('ISC License'), 'ISC'],
  [(t) => t.includes('Microsoft Public License') || t.includes('MS-PL'), 'MS-PL'],
  [(t) => t.includes('Microsoft Reciprocal License') || t.includes('MS-RL'), 'MS-RL'],
];

export function resolveLicenseFromFile(licenseFilePath?: string): string | undefined {
  if (!licenseFilePath || !fs.existsSync(licenseFilePath)) return undefined;
  try {
    const text = fs.readFileSync(licenseFilePath, 'utf-8');
    for (const [matches, spdx] of LICENSE_FILE_PATTERNS) {
      if (matches(text)) return spdx;
    }
  } catch {
    // Ignore read error
  }
  return undefined;
}

export interface PackageJsonInfo {
  name?: string;
  version?: string;
  license?: unknown;
  licenses?: unknown;
  repository?: string | { url?: string };
  author?: string | { name?: string };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export function readPackageJson(filePath: string): PackageJsonInfo | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PackageJsonInfo;
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

function resolveSpdxForPackage(pkg: PackageJsonInfo, licFile?: string): string {
  let spdx = normalizeSpdxLicense(pkg.license || pkg.licenses);
  if (spdx === 'UNKNOWN' || spdx.toUpperCase().includes('SEE LICENSE')) {
    const inferred = resolveLicenseFromFile(licFile);
    if (inferred) spdx = inferred;
  }
  return spdx;
}

export function processPackageDir(pkgDir: string, directNames: Set<string>, seen: Map<string, ScannedDependency>): void {
  const pkg = readPackageJson(path.join(pkgDir, 'package.json'));
  if (!pkg?.name || !pkg.version) return;

  const key = `${pkg.name}@${pkg.version}`;
  if (seen.has(key)) return;

  const licFile = findLicenseFile(pkgDir);
  const spdx = resolveSpdxForPackage(pkg, licFile);
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

function scanScopeSubdirectory(scopeDir: string, directNames: Set<string>, seen: Map<string, ScannedDependency>): void {
  const scopedEntries = fs.readdirSync(scopeDir, { withFileTypes: true });
  for (const scoped of scopedEntries) {
    if (scoped.isDirectory()) {
      processPackageDir(path.join(scopeDir, scoped.name), directNames, seen);
    }
  }
}

export function scanSubdirectories(baseDir: string, directNames: Set<string>, seen: Map<string, ScannedDependency>): void {
  if (!fs.existsSync(baseDir)) return;
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('@')) {
      scanScopeSubdirectory(path.join(baseDir, entry.name), directNames, seen);
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

function readTextIfExists(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function extractTomlField(block: string, key: string): string | undefined {
  const m = block.match(new RegExp(`^\\s*${key}\\s*=\\s*["']([^"']+)["']`, 'm'));
  return m ? m[1].trim() : undefined;
}

function extractPyprojectDirectDeps(content: string): Set<string> {
  const direct = new Set<string>();
  const matches = content.matchAll(/^([a-zA-Z0-9_.-]+)\s*=\s*(?:["'{]|true)/gm);
  for (const m of matches) {
    const key = m[1].toLowerCase();
    if (!['name', 'version', 'description', 'license', 'python', 'readme'].includes(key)) {
      direct.add(key);
    }
  }
  return direct;
}

function parseTomlPackageBlocks(
  content: string,
  lockPath: string,
  directNames: Set<string>,
  seen: Map<string, ScannedDependency>
): void {
  const blocks = content.split(/\[\[package\]\]/g).slice(1);
  for (const block of blocks) {
    const name = extractTomlField(block, 'name');
    const version = extractTomlField(block, 'version');
    if (!name || !version) continue;
    const spdx = normalizeSpdxLicense(extractTomlField(block, 'license') || 'UNKNOWN');
    const key = `pypi:${name}@${version}`;
    if (!seen.has(key)) {
      seen.set(key, {
        name,
        version,
        spdxLicense: spdx,
        purl: `pkg:pypi/${name.toLowerCase()}@${version}`,
        path: lockPath,
        isDirect: directNames.size === 0 || directNames.has(name.toLowerCase()),
      });
    }
  }
}

function parsePipfileSection(
  pkgs: Record<string, Record<string, unknown>>,
  isDirect: boolean,
  lockPath: string,
  seen: Map<string, ScannedDependency>
): void {
  for (const [name, meta] of Object.entries(pkgs)) {
    const rawVer = String(meta.version || '').replace(/^==/, '') || 'unknown';
    const spdx = normalizeSpdxLicense(meta.license || 'UNKNOWN');
    const key = `pypi:${name}@${rawVer}`;
    if (!seen.has(key)) {
      seen.set(key, {
        name,
        version: rawVer,
        spdxLicense: spdx,
        purl: `pkg:pypi/${name.toLowerCase()}@${rawVer}`,
        path: lockPath,
        isDirect,
      });
    }
  }
}

export function scanPythonDependencies(rootDir: string, seen: Map<string, ScannedDependency>): void {
  const pyproject = readTextIfExists(path.join(rootDir, 'pyproject.toml')) || '';
  const directNames = extractPyprojectDirectDeps(pyproject);

  for (const lockName of ['poetry.lock', 'uv.lock']) {
    const lockPath = path.join(rootDir, lockName);
    const content = readTextIfExists(lockPath);
    if (content) parseTomlPackageBlocks(content, lockPath, directNames, seen);
  }

  const pipfileLockPath = path.join(rootDir, 'Pipfile.lock');
  const pipfileRaw = readTextIfExists(pipfileLockPath);
  if (!pipfileRaw) return;
  try {
    const data = JSON.parse(pipfileRaw) as Record<string, Record<string, Record<string, unknown>>>;
    parsePipfileSection(data.default || {}, true, pipfileLockPath, seen);
    parsePipfileSection(data.develop || {}, false, pipfileLockPath, seen);
  } catch {
    // Ignore malformed Pipfile.lock
  }
}

function parseGoRequireLine(line: string, goModPath: string): ScannedDependency | null {
  const cleaned = line.replace(/^require\s+/, '').trim();
  const commentIdx = cleaned.indexOf('//');
  const codePart = (commentIdx >= 0 ? cleaned.slice(0, commentIdx) : cleaned).trim();
  const commentPart = commentIdx >= 0 ? cleaned.slice(commentIdx + 2).trim() : '';
  const parts = codePart.split(/\s+/);
  if (parts.length < 2) return null;

  const modName = parts[0];
  const rawVer = parts[1].replace(/^v/, '');
  const isIndirect = /\bindirect\b/i.test(commentPart);
  const licenseMatch = commentPart.match(/(?:spdx|license)\s*:\s*([A-Za-z0-9.+-]+)/i);
  const spdx = licenseMatch ? normalizeSpdxLicense(licenseMatch[1]) : 'UNKNOWN';

  return {
    name: modName,
    version: rawVer,
    spdxLicense: spdx,
    purl: `pkg:golang/${modName}@v${rawVer}`,
    path: goModPath,
    isDirect: !isIndirect,
  };
}

export function scanGoDependencies(rootDir: string, seen: Map<string, ScannedDependency>): void {
  const goModPath = path.join(rootDir, 'go.mod');
  const content = readTextIfExists(goModPath);
  if (!content) return;

  let inRequireBlock = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    if (/^require\s*\($/.test(trimmed)) {
      inRequireBlock = true;
    } else if (inRequireBlock && trimmed === ')') {
      inRequireBlock = false;
    } else if (inRequireBlock || trimmed.startsWith('require ')) {
      const dep = parseGoRequireLine(trimmed, goModPath);
      if (dep && !seen.has(`golang:${dep.name}@${dep.version}`)) {
        seen.set(`golang:${dep.name}@${dep.version}`, dep);
      }
    }
  }
}

function extractCargoDirectDeps(cargoToml: string): Map<string, string> {
  const map = new Map<string, string>();
  let inDeps = false;
  for (const line of cargoToml.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[')) {
      inDeps = /^\[(?:dev-|build-)?dependencies\]$/.test(trimmed);
      continue;
    }
    if (!inDeps || !trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.+)$/);
    if (m) {
      const licMatch = m[2].match(/license\s*=\s*["']([^"']+)["']/);
      map.set(m[1], licMatch ? licMatch[1] : 'UNKNOWN');
    }
  }
  return map;
}

export function scanRustDependencies(rootDir: string, seen: Map<string, ScannedDependency>): void {
  const cargoLockPath = path.join(rootDir, 'Cargo.lock');
  const lockContent = readTextIfExists(cargoLockPath);
  if (!lockContent) return;

  const cargoToml = readTextIfExists(path.join(rootDir, 'Cargo.toml')) || '';
  const directMeta = extractCargoDirectDeps(cargoToml);
  const rootName = extractTomlField(cargoToml, 'name');

  const blocks = lockContent.split(/\[\[package\]\]/g).slice(1);
  for (const block of blocks) {
    const name = extractTomlField(block, 'name');
    const version = extractTomlField(block, 'version');
    if (!name || !version || name === rootName) continue;
    const blockLic = extractTomlField(block, 'license') || directMeta.get(name) || 'UNKNOWN';
    const key = `cargo:${name}@${version}`;
    if (!seen.has(key)) {
      seen.set(key, {
        name,
        version,
        spdxLicense: normalizeSpdxLicense(blockLic),
        purl: `pkg:cargo/${name}@${version}`,
        path: cargoLockPath,
        isDirect: directMeta.size === 0 || directMeta.has(name),
      });
    }
  }
}

function extractXmlTag(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`));
  return m ? m[1].trim() : undefined;
}

function resolveMavenBlockLicense(block: string, defaultLic: string): string {
  const tagLic = extractXmlTag(block, 'license');
  if (tagLic) return tagLic;
  const commentLic = block.match(/<!--\s*(?:spdx|license)\s*:\s*([A-Za-z0-9.+-]+)\s*-->/i)?.[1];
  return commentLic || defaultLic;
}

export function scanMavenDependencies(rootDir: string, seen: Map<string, ScannedDependency>): void {
  const pomPath = path.join(rootDir, 'pom.xml');
  const content = readTextIfExists(pomPath);
  if (!content) return;

  const projectLicBlock = content.match(/<licenses>([\s\S]*?)<\/licenses>/)?.[1] || '';
  const projectDefaultLic = extractXmlTag(projectLicBlock, 'name') || 'UNKNOWN';
  const depBlocks = content.match(/<dependency>[\s\S]*?<\/dependency>/g) || [];

  for (const block of depBlocks) {
    const groupId = extractXmlTag(block, 'groupId');
    const artifactId = extractXmlTag(block, 'artifactId');
    const version = extractXmlTag(block, 'version') || 'unknown';
    if (!groupId || !artifactId) continue;

    const inlineLic = resolveMavenBlockLicense(block, projectDefaultLic);
    const fullName = `${groupId}:${artifactId}`;
    const key = `maven:${fullName}@${version}`;
    if (!seen.has(key)) {
      seen.set(key, {
        name: fullName,
        version,
        spdxLicense: normalizeSpdxLicense(inlineLic),
        purl: `pkg:maven/${groupId}/${artifactId}@${version}`,
        path: pomPath,
        isDirect: true,
      });
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

  scanPythonDependencies(rootDir, seen);
  scanGoDependencies(rootDir, seen);
  scanRustDependencies(rootDir, seen);
  scanMavenDependencies(rootDir, seen);

  const allDeps = Array.from(seen.values());
  if (options.depth === 'direct') {
    return allDeps.filter((d) => d.isDirect);
  }
  return allDeps.sort((a, b) => a.name.localeCompare(b.name));
}

function extractCvssV3Score(cvss: unknown): number | undefined {
  if (!cvss || typeof cvss !== 'object') return undefined;
  const dict = cvss as Record<string, Record<string, unknown>>;
  for (const source of ['nvd', 'ghsa', 'redhat']) {
    if (dict[source]?.V3Score !== undefined) {
      return Number(dict[source].V3Score);
    }
  }
  return undefined;
}

function extractCvssV3Vector(cvss: unknown): string | undefined {
  if (!cvss || typeof cvss !== 'object') return undefined;
  const dict = cvss as Record<string, Record<string, unknown>>;
  for (const source of ['nvd', 'ghsa', 'redhat']) {
    if (dict[source]?.V3Vector) {
      return String(dict[source].V3Vector);
    }
  }
  return undefined;
}

function normalizeVulnerabilitySeverity(raw?: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' {
  if (!raw) return 'UNKNOWN';
  const upper = raw.toUpperCase().trim();
  if (upper === 'CRITICAL' || upper === 'HIGH' || upper === 'MEDIUM' || upper === 'LOW') {
    return upper;
  }
  return 'UNKNOWN';
}

function parseSingleVulnerability(v: Record<string, unknown>): ScaVulnerability {
  return {
    id: (v.VulnerabilityID as string) || 'UNKNOWN',
    packageName: (v.PkgName as string) || 'UNKNOWN',
    installedVersion: (v.InstalledVersion as string) || 'unknown',
    fixedVersion: (v.FixedVersion as string) || undefined,
    severity: normalizeVulnerabilitySeverity(v.Severity as string | undefined),
    cvssV3Score: extractCvssV3Score(v.CVSS),
    cvssV3Vector: extractCvssV3Vector(v.CVSS),
    title: (v.Title as string) || undefined,
    description: (v.Description as string) || undefined,
    primaryUrl: (v.PrimaryURL as string) || undefined,
  };
}

export function parseTrivyVulnerabilities(stdout: string): ScaVulnerability[] {
  try {
    const data = JSON.parse(stdout);
    const vulns: ScaVulnerability[] = [];
    for (const r of data.Results || []) {
      for (const v of r.Vulnerabilities || []) {
        vulns.push(parseSingleVulnerability(v as Record<string, unknown>));
      }
    }
    return vulns;
  } catch {
    return [];
  }
}

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  UNKNOWN: 0,
};

function isExemptByVex(v: ScaVulnerability, vexStatements?: VexStatement[]): boolean {
  if (!vexStatements || vexStatements.length === 0) return false;
  return vexStatements.some(
    (stmt) =>
      stmt.id === v.id &&
      (stmt.state === 'not_affected' || stmt.state === 'fixed') &&
      (!stmt.package || stmt.package === v.packageName)
  );
}

export function evaluateVulnerabilityThresholds(
  vulnerabilities: ScaVulnerability[],
  options?: VulnerabilityThresholds & { vexStatements?: VexStatement[] }
): { blocked: boolean; failingVulnerabilities: ScaVulnerability[] } {
  const minRank = options?.failOnSeverity ? (SEVERITY_RANK[options.failOnSeverity] ?? 3) : undefined;
  const maxScore = options?.maxCvssScore;

  const failing = vulnerabilities.filter((v) => {
    if (isExemptByVex(v, options?.vexStatements)) return false;
    const rankMatch = minRank !== undefined && SEVERITY_RANK[v.severity] >= minRank;
    const scoreMatch = maxScore !== undefined && v.cvssV3Score !== undefined && v.cvssV3Score >= maxScore;
    return rankMatch || scoreMatch;
  });

  return {
    blocked: failing.length > 0,
    failingVulnerabilities: failing,
  };
}

function parseTrivyOutput(stdout: string): ScannedDependency[] {
  const data = JSON.parse(stdout);
  const deps: ScannedDependency[] = [];
  for (const r of data.Results || []) {
    for (const p of r.Packages || []) {
      deps.push({
        name: p.Name,
        version: p.Version || 'unknown',
        spdxLicense: normalizeSpdxLicense(p.Licenses?.[0] || 'UNKNOWN'),
        purl: p.Identifier?.PURL || `pkg:npm/${p.Name}@${p.Version || 'unknown'}`,
      });
    }
  }
  return deps;
}

function execTrivyCli(rootDir: string, checkTypes: string): string | null {
  try {
    const res = child_process.spawnSync(
      'trivy',
      ['fs', '--format', 'json', '--security-checks', checkTypes, rootDir],
      { encoding: 'utf-8', timeout: 30000 }
    );
    return res.status === 0 && res.stdout ? res.stdout : null;
  } catch {
    return null;
  }
}

export function scanWithTrivy(
  rootDir: string,
  options?: { scanVulnerabilities?: boolean }
): { dependencies: ScannedDependency[]; vulnerabilities: ScaVulnerability[]; executed: boolean } {
  if (!isToolAvailable('trivy')) {
    return { dependencies: [], vulnerabilities: [], executed: false };
  }
  const checkTypes = options?.scanVulnerabilities !== false ? 'vuln,license' : 'license';
  const stdout = execTrivyCli(rootDir, checkTypes);
  if (!stdout) {
    return { dependencies: [], vulnerabilities: [], executed: false };
  }
  return {
    dependencies: parseTrivyOutput(stdout),
    vulnerabilities: parseTrivyVulnerabilities(stdout),
    executed: true,
  };
}

function parseSyftOutput(stdout: string): ScannedDependency[] {
  const data = JSON.parse(stdout);
  const deps: ScannedDependency[] = [];
  for (const a of data.artifacts || []) {
    const lic = a.licenses?.[0]?.value || 'UNKNOWN';
    deps.push({
      name: a.name,
      version: a.version || 'unknown',
      spdxLicense: normalizeSpdxLicense(lic),
      purl: a.purl || `pkg:npm/${a.name}@${a.version || 'unknown'}`,
      author: a.metadata?.author,
    });
  }
  return deps;
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
    return { dependencies: parseSyftOutput(res.stdout), executed: true };
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
