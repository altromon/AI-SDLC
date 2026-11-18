import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

export const AISDLC_MANIFEST_FILENAME = '.aisdlc.json';

export interface AisdlcRepoManifest {
  version: string;
  [key: string]: unknown;
}

/**
 * Returns the installed @aisdlc/core (and monorepo CLI) version from package.json.
 */
export function getAisdlcVersion(): string {
  try {
    const req = createRequire(import.meta.url);
    const pkg = req('../package.json') as { version?: string };
    if (pkg?.version) return pkg.version;
  } catch {
    // Fallback when package.json cannot be resolved
  }
  return '0.0.0';
}

/**
 * Reads and parses `.aisdlc.json` from `rootDir`, returning null if missing or invalid.
 */
export function readAisdlcManifest(rootDir: string): AisdlcRepoManifest | null {
  const manifestPath = path.join(rootDir, AISDLC_MANIFEST_FILENAME);
  if (!fs.existsSync(manifestPath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    if (typeof record.version !== 'string' || !record.version.trim()) return null;
    return { ...record, version: record.version.trim() };
  } catch {
    return null;
  }
}

/**
 * Writes or updates `.aisdlc.json` in `rootDir`, preserving any existing extra metadata keys.
 */
export function writeAisdlcManifest(rootDir: string, version: string = getAisdlcVersion()): void {
  const manifestPath = path.join(rootDir, AISDLC_MANIFEST_FILENAME);
  let data: Record<string, unknown> = {};

  if (fs.existsSync(manifestPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as unknown;
      if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
        data = existing as Record<string, unknown>;
      }
    } catch {
      // Overwrite invalid JSON with a clean manifest
    }
  }

  data.version = version;
  fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * Formats the CLI version string, including the repository version from `.aisdlc.json` when present.
 */
export function formatAisdlcVersionOutput(rootDir: string = process.cwd()): string {
  const installed = getAisdlcVersion();
  const manifest = readAisdlcManifest(rootDir);
  if (!manifest) return installed;
  if (manifest.version === installed) {
    return `${installed} (repo: ${manifest.version})`;
  }
  return `${installed} (repo: ${manifest.version} — differs from installed CLI)`;
}
