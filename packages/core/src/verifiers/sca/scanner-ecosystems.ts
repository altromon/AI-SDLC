/**
 * AI-SDLC: Bounded Recursive Multi-Ecosystem SCA Extractors (CHG-079, TSK-001)
 * Native extractors for .NET, Gradle, and Python (requirements.txt) with symlink & depth bounds.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ScannedDependency } from '../../types/index.js';
import { buildPurl } from './purl.js';
import { isPathInside, readConfinedText, safeRealpath } from './safe-exec.js';

const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;

export const SKIPPED_SCAN_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'target',
  'bin',
  'obj',
  '.venv',
  'venv',
]);

const DISALLOWED_DTD_RE = /<!(?:DOCTYPE|ENTITY)\b/i;

export function collectManifestDirs(rootDir: string, maxDepth = 3): string[] {
  const dirs: string[] = [];
  if (!fs.existsSync(rootDir)) return dirs;
  const queue: { dir: string; depth: number }[] = [{ dir: rootDir, depth: 0 }];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    dirs.push(current.dir);
    if (current.depth >= maxDepth) continue;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(current.dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      if (!entry.isSymbolicLink() && entry.isDirectory() && !SKIPPED_SCAN_DIRS.has(entry.name)) {
        queue.push({ dir: path.join(current.dir, entry.name), depth: current.depth + 1 });
      }
    }
  }
  return dirs;
}

export function readUtf8Safe(filePath: string, rootDir?: string): string | null {
  const realRoot = safeRealpath(rootDir ?? path.dirname(filePath));
  if (!realRoot) return null;
  const realFile = safeRealpath(filePath);
  if (!realFile || !isPathInside(realRoot, realFile)) return null;
  return readConfinedText(realFile, realRoot, MAX_MANIFEST_BYTES);
}

export function stripXmlCommentsAndCdata(xml: string): string {
  return xml.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
}

export function extractXmlAttr(attrs: string, name: string): string | undefined {
  const match = attrs.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match?.[1]?.trim();
}

export function parseNugetXmlElements(
  content: string,
  tagName: 'PackageVersion' | 'PackageReference'
): Array<{ include: string; version?: string }> {
  if (DISALLOWED_DTD_RE.test(content)) return [];
  const clean = stripXmlCommentsAndCdata(content);
  const re = new RegExp(`<${tagName}\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/${tagName}\\s*>)`, 'gi');
  const items: Array<{ include: string; version?: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    const include = extractXmlAttr(m[1], 'Include');
    if (!include || include.includes('$(')) continue;
    const verAttr = extractXmlAttr(m[1], 'Version');
    const verElem = m[2]?.match(/<Version\s*>([\s\S]*?)<\/Version\s*>/i)?.[1]?.trim();
    items.push({ include, version: verAttr || verElem });
  }
  return items;
}

export function parseDirectoryPackagesProps(content: string, out: Map<string, string>): void {
  for (const item of parseNugetXmlElements(content, 'PackageVersion')) {
    if (item.version && !item.version.includes('$(')) {
      out.set(item.include.toLowerCase(), item.version);
    }
  }
}

export function collectCpmVersions(dirs: string[], rootDir?: string): Map<string, string> {
  const cpmVersions = new Map<string, string>();
  for (const dir of dirs) {
    const content = readUtf8Safe(path.join(dir, 'Directory.Packages.props'), rootDir);
    if (content) parseDirectoryPackagesProps(content, cpmVersions);
  }
  return cpmVersions;
}

export function addNugetDep(
  name: string,
  version: string,
  manifestPath: string,
  isDirect: boolean,
  seen: Map<string, ScannedDependency>
): void {
  const key = `nuget:${name.toLowerCase()}@${version}`;
  if (seen.has(key)) return;
  seen.set(key, {
    name,
    version,
    spdxLicense: 'UNKNOWN',
    purl: buildPurl({ ecosystem: 'nuget', name, version }),
    path: manifestPath,
    isDirect,
  });
}

export function parseCsprojContent(
  content: string,
  csprojPath: string,
  cpmVersions: Map<string, string>,
  seen: Map<string, ScannedDependency>
): void {
  for (const item of parseNugetXmlElements(content, 'PackageReference')) {
    const version = item.version || cpmVersions.get(item.include.toLowerCase());
    if (version && !version.includes('$(')) {
      addNugetDep(item.include, version, csprojPath, true, seen);
    }
  }
}

export function scanPackagesLockJson(dir: string, seen: Map<string, ScannedDependency>, rootDir?: string): void {
  const lockPath = path.join(dir, 'packages.lock.json');
  const raw = readUtf8Safe(lockPath, rootDir);
  if (!raw) return;
  try {
    const data = JSON.parse(raw) as { dependencies?: Record<string, Record<string, { type?: string; resolved?: string }>> };
    for (const tfm of Object.values(data.dependencies || {})) {
      if (!tfm || typeof tfm !== 'object') continue;
      for (const [name, meta] of Object.entries(tfm)) {
        const version = typeof meta?.resolved === 'string' ? meta.resolved.trim() : '';
        if (version) addNugetDep(name, version, lockPath, meta?.type === 'Direct', seen);
      }
    }
  } catch {
    // Ignore malformed packages.lock.json
  }
}

export function scanDotnetDependencies(
  dir: string,
  cpmVersions: Map<string, string>,
  seen: Map<string, ScannedDependency>,
  rootDir?: string
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.csproj')) {
      const csprojPath = path.join(dir, entry.name);
      const content = readUtf8Safe(csprojPath, rootDir);
      if (content) parseCsprojContent(content, csprojPath, cpmVersions, seen);
    }
  }
  scanPackagesLockJson(dir, seen, rootDir);
}

export function addGradleDep(
  group: string,
  artifact: string,
  version: string,
  filePath: string,
  seen: Map<string, ScannedDependency>
): void {
  if (!group || !artifact || !version) return;
  if (group.includes('$') || artifact.includes('$') || version.includes('$')) return;
  const name = `${group}:${artifact}`;
  const key = `maven:${name}@${version}`;
  if (seen.has(key)) return;
  seen.set(key, {
    name,
    version,
    spdxLicense: 'UNKNOWN',
    purl: buildPurl({ ecosystem: 'maven', namespace: group, name: artifact, version }),
    path: filePath,
    isDirect: true,
  });
}

export function stripGradleVersionSuffix(rawVersion: string): string {
  return rawVersion.split(':')[0]?.split('@')[0]?.trim() ?? '';
}

export function parseGradleBuildScript(content: string, filePath: string, seen: Map<string, ScannedDependency>): void {
  const clean = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\r\n]*/g, '$1');
  const strRe = /\b(?:implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly|annotationProcessor|kapt|ksp)\s*\(?\s*['"]([^:'"\s]+):([^:'"\s]+):([^'"\s]+)['"]\s*\)?/g;
  let m: RegExpExecArray | null;
  while ((m = strRe.exec(clean)) !== null) {
    addGradleDep(m[1], m[2], stripGradleVersionSuffix(m[3]), filePath, seen);
  }
  const mapRe = /\bgroup\s*:\s*['"]([^'"]+)['"]\s*,\s*name\s*:\s*['"]([^'"]+)['"]\s*,\s*version\s*:\s*['"]([^'"]+)['"]/g;
  while ((m = mapRe.exec(clean)) !== null) {
    addGradleDep(m[1], m[2], stripGradleVersionSuffix(m[3]), filePath, seen);
  }
}

export function parseGradleLockfile(content: string, filePath: string, seen: Map<string, ScannedDependency>): void {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('empty=')) continue;
    const coord = line.split('=')[0]?.trim() ?? '';
    const parts = coord.split(':');
    if (parts.length === 3) addGradleDep(parts[0], parts[1], parts[2], filePath, seen);
  }
}

export function scanGradleDependencies(dir: string, seen: Map<string, ScannedDependency>, rootDir?: string): void {
  for (const name of ['build.gradle', 'build.gradle.kts']) {
    const filePath = path.join(dir, name);
    const content = readUtf8Safe(filePath, rootDir);
    if (content) parseGradleBuildScript(content, filePath, seen);
  }
  const lockPath = path.join(dir, 'gradle.lockfile');
  const lockContent = readUtf8Safe(lockPath, rootDir);
  if (lockContent) parseGradleLockfile(lockContent, lockPath, seen);
}

export function parseRequirementLine(rawLine: string, reqPath: string): ScannedDependency | null {
  const noComment = rawLine.replace(/(?:^|\s)#.*$/, '').trim();
  if (!noComment || noComment.startsWith('-')) return null;
  const noMarker = noComment.split(';')[0]?.trim() ?? '';
  const spec = noMarker.replace(/\s+--\S+/g, '').trim();
  const match = spec.match(/^([A-Za-z0-9_.-]+)(?:\[[^\]]*\])?\s*(?:===|==|~=|>=|<=)\s*([A-Za-z0-9_.*+-]+)/);
  if (!match) return null;
  const [, name, version] = match;
  return {
    name,
    version,
    spdxLicense: 'UNKNOWN',
    purl: buildPurl({ ecosystem: 'pypi', name, version }),
    path: reqPath,
    isDirect: true,
  };
}

export function scanRequirementsTxt(dir: string, seen: Map<string, ScannedDependency>, rootDir?: string): void {
  const reqPath = path.join(dir, 'requirements.txt');
  const content = readUtf8Safe(reqPath, rootDir);
  if (!content) return;
  const joined = content.replace(/\\\r?\n/g, ' ');
  for (const line of joined.split(/\r?\n/)) {
    const dep = parseRequirementLine(line, reqPath);
    if (!dep) continue;
    const normName = dep.name.trim().toLowerCase().replace(/[-_.]+/g, '-');
    const key = `pypi:${normName}@${dep.version}`;
    if (!seen.has(key)) {
      seen.set(key, dep);
    }
  }
}
