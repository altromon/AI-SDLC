/**
 * AI-SDLC: .NET/NuGet Offline License Resolver (CHG-055, TSK-007)
 * Reads ~/.nuget/packages .nuspec with strict XML (no DOCTYPE/ENTITY); falls back to dotnet via runSafe.
 */

import * as os from 'os';
import * as path from 'path';
import type { ScannedDependency } from '../../types/index.js';
import type { EcosystemLicenseResolution } from './license-python.js';
import { readConfinedText, runSafe, safeRealpath } from './safe-exec.js';

const MAX_NUSPEC_BYTES = 1024 * 1024;
const DISALLOWED_DTD_RE = /<!(?:DOCTYPE|ENTITY)\b/i;
const SAFE_NUGET_ID_RE = /^[a-zA-Z0-9._-]+$/;

function isSafeNugetSegment(seg: string): boolean {
  return Boolean(seg) && !seg.includes('..') && SAFE_NUGET_ID_RE.test(seg);
}

function parseNuspecLicense(xml: string): string | undefined {
  if (DISALLOWED_DTD_RE.test(xml)) return undefined;
  const clean = xml.replace(/<!--[\s\S]*?-->/g, '').replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  const expMatch = clean.match(/<license\b[^>]*type=["']expression["'][^>]*>([\s\S]*?)<\/license\s*>/i);
  if (expMatch?.[1]?.trim()) return expMatch[1].trim();
  const genericMatch = clean.match(/<license\b[^>]*>([\s\S]*?)<\/license\s*>/i);
  const val = genericMatch?.[1]?.trim();
  return val && !val.includes('<') ? val : undefined;
}

function findLocalNuspecLicense(dep: ScannedDependency): { license?: string; rejected?: boolean } {
  if (!isSafeNugetSegment(dep.name) || !isSafeNugetSegment(dep.version)) {
    return { rejected: true };
  }
  const nugetCache = safeRealpath(path.join(os.homedir(), '.nuget', 'packages'));
  if (!nugetCache) return {};

  const pkgLower = dep.name.toLowerCase();
  const verLower = dep.version.toLowerCase();
  const nuspecPath = path.join(nugetCache, pkgLower, verLower, `${pkgLower}.nuspec`);
  const content = readConfinedText(nuspecPath, nugetCache, MAX_NUSPEC_BYTES);
  if (!content) return {};
  return { license: parseNuspecLicense(content) };
}

export function resolveDotnetLicenseDetailed(dep: ScannedDependency, rootDir: string): EcosystemLicenseResolution {
  const local = findLocalNuspecLicense(dep);
  if (local.rejected) return { reason: 'path_rejected' };
  if (local.license) return { license: local.license, provenance: 'local-metadata' };

  const res = runSafe('dotnet', rootDir, rootDir);
  if (!res.ok) return { reason: res.reason };
  return { reason: 'cache_missing' };
}

export function resolveDotnetLicense(dep: ScannedDependency, rootDir: string): string | undefined {
  return resolveDotnetLicenseDetailed(dep, rootDir).license;
}
