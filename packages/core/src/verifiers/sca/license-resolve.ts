/**
 * AI-SDLC: Unified Offline License Resolution Orchestrator (CHG-055, TSK-009)
 * Coordinates local-metadata -> hardened CLI -> UNRESOLVED with owned unresolvedReason.
 */

import type { ScannedDependency } from '../../types/index.js';
import type { EcosystemLicenseResolution } from './license-python.js';
import { resolvePythonLicenseDetailed } from './license-python.js';
import { resolveRustLicenseDetailed } from './license-rust.js';
import { resolveGoLicenseDetailed } from './license-go.js';
import { resolveJavaLicenseDetailed } from './license-java.js';
import { resolveDotnetLicenseDetailed } from './license-dotnet.js';
import { resolveNodeLicenseDetailed } from './license-node.js';

type EcosystemResolver = (dep: ScannedDependency, rootDir: string) => EcosystemLicenseResolution;

const ECOSYSTEM_RESOLVERS: Record<string, EcosystemResolver> = {
  npm: resolveNodeLicenseDetailed,
  pypi: resolvePythonLicenseDetailed,
  cargo: resolveRustLicenseDetailed,
  golang: resolveGoLicenseDetailed,
  maven: resolveJavaLicenseDetailed,
  nuget: resolveDotnetLicenseDetailed,
};

const PATH_ECOSYSTEM_SUFFIXES: ReadonlyArray<readonly [string, string]> = [
  ['cargo.lock', 'cargo'],
  ['cargo.toml', 'cargo'],
  ['go.mod', 'golang'],
  ['pom.xml', 'maven'],
  ['poetry.lock', 'pypi'],
  ['uv.lock', 'pypi'],
  ['pipfile.lock', 'pypi'],
  ['.csproj', 'nuget'],
  ['packages.lock.json', 'nuget'],
];

function detectEcosystem(dep: ScannedDependency): string {
  if (dep.purl?.startsWith('pkg:')) {
    const typeEnd = dep.purl.indexOf('/');
    if (typeEnd > 4) return dep.purl.slice(4, typeEnd).toLowerCase();
  }
  const p = (dep.path || '').toLowerCase();
  return PATH_ECOSYSTEM_SUFFIXES.find(([suffix]) => p.endsWith(suffix))?.[1] ?? 'npm';
}

export function resolveLicense(dep: ScannedDependency, rootDir: string): ScannedDependency {
  if (dep.spdxLicense && dep.spdxLicense !== 'UNKNOWN' && dep.spdxLicense !== 'UNRESOLVED') {
    return dep;
  }

  const ecosystem = detectEcosystem(dep);
  const resolver = ECOSYSTEM_RESOLVERS[ecosystem] ?? resolveNodeLicenseDetailed;
  const result = resolver(dep, rootDir);

  if (result.license && result.license !== 'UNKNOWN' && result.license !== 'UNRESOLVED') {
    return {
      ...dep,
      spdxLicense: result.license,
      provenance: result.provenance,
      unresolvedReason: undefined,
    };
  }

  return {
    ...dep,
    spdxLicense: 'UNRESOLVED',
    unresolvedReason: result.reason ?? 'cli_failed',
  };
}
