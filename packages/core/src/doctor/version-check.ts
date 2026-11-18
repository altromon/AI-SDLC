/**
 * AI-SDLC: Repository Version Manifest Health Check (.aisdlc.json)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { CategoryReport, DiagnosticFinding, DoctorOptions, DoctorStatus } from '../types/doctor.js';
import { AISDLC_MANIFEST_FILENAME, getAisdlcVersion, readAisdlcManifest } from '../version.js';

const CATEGORY_TITLE = 'AI-SDLC Repository Version (.aisdlc.json)';

function makeFinding(
  id: string,
  status: DoctorStatus,
  message: string,
  details: Record<string, unknown>,
  remediation?: string
): DiagnosticFinding {
  return { id, category: 'aisdlc_version', status, message, remediation, details };
}

function compareManifestVersion(repoVersion: string, installedVersion: string): DiagnosticFinding {
  if (repoVersion === installedVersion) {
    return makeFinding(
      'PASS_AISDLC_VERSION_MATCH',
      'pass',
      `Repository AI-SDLC version (${repoVersion}) matches installed CLI (${installedVersion}).`,
      { repoVersion, installedVersion }
    );
  }
  return makeFinding(
    'WARN_AISDLC_VERSION_MISMATCH',
    'warn',
    `Repository AI-SDLC version (${repoVersion}) differs from installed CLI (${installedVersion}).`,
    { repoVersion, installedVersion },
    `Run 'aisdlc migrate' to align repository templates/policies with v${installedVersion}, or run with @aisdlc/cli@${repoVersion}.`
  );
}

function evaluateVersionFinding(rootDir: string, installedVersion: string): DiagnosticFinding {
  const manifestPath = path.join(rootDir, AISDLC_MANIFEST_FILENAME);
  if (!fs.existsSync(manifestPath)) {
    return makeFinding(
      'WARN_AISDLC_MANIFEST_MISSING',
      'warn',
      `Repository manifest '${AISDLC_MANIFEST_FILENAME}' not found (installed CLI: v${installedVersion}).`,
      { installedVersion },
      `Run 'aisdlc migrate' or 'aisdlc init' to record the repository's AI-SDLC version in '${AISDLC_MANIFEST_FILENAME}'.`
    );
  }

  const manifest = readAisdlcManifest(rootDir);
  if (!manifest) {
    return makeFinding(
      'WARN_AISDLC_MANIFEST_INVALID',
      'warn',
      `Repository manifest '${AISDLC_MANIFEST_FILENAME}' is missing a valid 'version' field (installed CLI: v${installedVersion}).`,
      { installedVersion },
      `Run 'aisdlc migrate' to repair '${AISDLC_MANIFEST_FILENAME}'.`
    );
  }

  return compareManifestVersion(manifest.version, installedVersion);
}

export class AisdlcVersionCheck {
  public async inspect(options: DoctorOptions): Promise<CategoryReport> {
    const rootDir = options.rootDir || process.cwd();
    const finding = evaluateVersionFinding(rootDir, getAisdlcVersion());
    return {
      category: 'aisdlc_version',
      title: CATEGORY_TITLE,
      status: finding.status,
      findings: [finding],
    };
  }
}
