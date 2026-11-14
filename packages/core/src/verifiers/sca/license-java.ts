/**
 * AI-SDLC: Java/Maven Offline License Resolver (CHG-055, TSK-006)
 * Reads ~/.m2 repository .pom with strict XML (no DOCTYPE/ENTITY); falls back to mvn via runSafe.
 */

import * as os from 'os';
import * as path from 'path';
import type { ScannedDependency } from '../../types/index.js';
import type { EcosystemLicenseResolution } from './license-python.js';
import { readConfinedText, runSafe, safeRealpath } from './safe-exec.js';

const MAX_POM_BYTES = 1024 * 1024;
const DISALLOWED_DTD_RE = /<!(?:DOCTYPE|ENTITY)\b/i;
const SAFE_SEGMENT_RE = /^[a-zA-Z0-9._-]+$/;

function isSafeCoordSegment(seg: string): boolean {
  return Boolean(seg) && !seg.includes('..') && SAFE_SEGMENT_RE.test(seg);
}

function stripXmlCommentsAndCdata(xml: string): string {
  return xml.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
}

function parsePomOwnLicenses(xml: string): string | undefined {
  if (DISALLOWED_DTD_RE.test(xml)) return undefined;
  const clean = stripXmlCommentsAndCdata(xml)
    .replace(/<dependencies(?:\s[^>]*)?>[\s\S]*?<\/dependencies\s*>/gi, '')
    .replace(/<dependencyManagement(?:\s[^>]*)?>[\s\S]*?<\/dependencyManagement\s*>/gi, '');

  const licensesBlock = clean.match(/<licenses(?:\s[^>]*)?>([\s\S]*?)<\/licenses\s*>/i)?.[1];
  if (!licensesBlock) return undefined;

  const names: string[] = [];
  const licRe = /<license(?:\s[^>]*)?>([\s\S]*?)<\/license\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = licRe.exec(licensesBlock)) !== null) {
    const nameMatch = m[1].match(/<name(?:\s[^>]*)?>([\s\S]*?)<\/name\s*>/i);
    const val = nameMatch?.[1]?.trim();
    if (val && !/\$\{[^}]*\}/.test(val)) names.push(val);
  }
  return names.length > 0 ? Array.from(new Set(names)).join(' AND ') : undefined;
}

function findLocalM2PomLicense(dep: ScannedDependency): { license?: string; rejected?: boolean } {
  const parts = dep.name.split(':');
  if (parts.length !== 2) return { rejected: true };
  const [groupId, artifactId] = parts;
  if (!isSafeCoordSegment(groupId) || !isSafeCoordSegment(artifactId) || !isSafeCoordSegment(dep.version)) {
    return { rejected: true };
  }

  const m2Repo = safeRealpath(path.join(os.homedir(), '.m2', 'repository'));
  if (!m2Repo) return {};
  const pomPath = path.join(m2Repo, ...groupId.split('.'), artifactId, dep.version, `${artifactId}-${dep.version}.pom`);
  const content = readConfinedText(pomPath, m2Repo, MAX_POM_BYTES);
  if (!content) return {};
  return { license: parsePomOwnLicenses(content) };
}

export function resolveJavaLicenseDetailed(dep: ScannedDependency, rootDir: string): EcosystemLicenseResolution {
  const local = findLocalM2PomLicense(dep);
  if (local.rejected) return { reason: 'path_rejected' };
  if (local.license) return { license: local.license, provenance: 'local-metadata' };

  const res = runSafe('mvn', rootDir, rootDir);
  if (!res.ok) return { reason: res.reason };
  return { reason: 'cache_missing' };
}

export function resolveJavaLicense(dep: ScannedDependency, rootDir: string): string | undefined {
  return resolveJavaLicenseDetailed(dep, rootDir).license;
}
