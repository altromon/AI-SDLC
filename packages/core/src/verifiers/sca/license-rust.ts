/**
 * AI-SDLC: Rust/Cargo Offline License Resolver (CHG-055, TSK-004)
 * Reads ~/.cargo/registry Cargo.toml first; falls back to cargo metadata via runSafe.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { ScannedDependency } from '../../types/index.js';
import type { EcosystemLicenseResolution } from './license-python.js';
import { isPathInside, readConfinedText, runSafe, safeRealpath } from './safe-exec.js';

const MAX_CARGO_TOML_BYTES = 512 * 1024;

function extractCargoTomlLicense(content: string): string | undefined {
  let inPkg = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('[')) {
      inPkg = line === '[package]';
      continue;
    }
    if (!inPkg) continue;
    const match = line.match(/^license\s*=\s*["']([^"']+)["']/);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return undefined;
}

function findLocalCargoLicense(dep: ScannedDependency): string | undefined {
  const cargoHome = process.env.CARGO_HOME || path.join(os.homedir(), '.cargo');
  const realHome = safeRealpath(cargoHome);
  if (!realHome) return undefined;
  const srcDir = safeRealpath(path.join(realHome, 'registry', 'src'));
  if (!srcDir || !isPathInside(realHome, srcDir)) return undefined;

  const crateFolder = `${dep.name}-${dep.version}`;
  for (const idxEntry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (!idxEntry.isDirectory()) continue;
    const tomlPath = path.join(srcDir, idxEntry.name, crateFolder, 'Cargo.toml');
    const content = readConfinedText(tomlPath, realHome, MAX_CARGO_TOML_BYTES);
    if (!content) continue;
    const lic = extractCargoTomlLicense(content);
    if (lic) return lic;
  }
  return undefined;
}

function resolveFromCargoCli(dep: ScannedDependency, rootDir: string): EcosystemLicenseResolution {
  const res = runSafe('cargo', rootDir, rootDir);
  if (!res.ok) return { reason: res.reason };
  try {
    const parsed = JSON.parse(res.stdout) as {
      packages?: Array<{ name?: string; version?: string; license?: string | null }>;
    };
    if (!Array.isArray(parsed?.packages)) return { reason: 'invalid_output' };
    const found = parsed.packages.find(
      (p) => p.name === dep.name && (dep.version === 'unknown' || p.version === dep.version)
    );
    const lic = found?.license?.trim();
    if (lic && lic !== 'UNKNOWN') return { license: lic, provenance: 'cli' };
    return { reason: 'cache_missing' };
  } catch {
    return { reason: 'invalid_output' };
  }
}

export function resolveRustLicenseDetailed(dep: ScannedDependency, rootDir: string): EcosystemLicenseResolution {
  const localLic = findLocalCargoLicense(dep);
  if (localLic) return { license: localLic, provenance: 'local-metadata' };
  return resolveFromCargoCli(dep, rootDir);
}

export function resolveRustLicense(dep: ScannedDependency, rootDir: string): string | undefined {
  return resolveRustLicenseDetailed(dep, rootDir).license;
}
