/**
 * FileSystemJailAdapter: Confinement & Path Traversal Defense
 * Cites: SEC-REQ-053-PATH-TRAVERSAL-DEFENSE-001, CMP-053-MIGRATE-ENGINE
 */

import * as fs from 'fs';
import * as path from 'path';
import type { IFileSystemJail } from '../types/migrate.js';

const GOVERNED_DIR_PREFIXES = ['schemas' + path.sep, 'templates' + path.sep, '.backup' + path.sep];
const GOVERNED_ROOT_FILES = new Set([
  'quality-policy.yaml',
  'license-policy.yaml',
  'privacy-policy.yaml',
  'dlp-policy.yaml',
]);

function validateRawInputs(repoRoot: string, targetPath: string): void {
  if (!repoRoot) {
    throw new Error('ERR_PATH_TRAVERSAL_DETECTED: repoRoot is required');
  }
  if (!targetPath || typeof targetPath !== 'string' || targetPath.includes('\0')) {
    throw new Error('ERR_PATH_TRAVERSAL_DETECTED: targetPath is invalid or contains null byte');
  }
}

function checkSiblingAndEscape(resolvedRoot: string, resolvedTarget: string): void {
  const rel = path.relative(resolvedRoot, resolvedTarget);
  const escapes = rel.startsWith('..') || path.isAbsolute(rel);
  if (escapes) {
    if (resolvedTarget.startsWith(resolvedRoot) && !resolvedTarget.startsWith(resolvedRoot + path.sep)) {
      throw new Error('ERR_PATH_OUTSIDE_REPO_ROOT: Target path points to sibling directory');
    }
    throw new Error('ERR_PATH_TRAVERSAL_DETECTED: Target path escapes repository root');
  }

  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    throw new Error('ERR_PATH_OUTSIDE_REPO_ROOT: Target path is outside repository root');
  }
}

function resolveRealRoot(resolvedRoot: string): string {
  try {
    return fs.existsSync(resolvedRoot) ? fs.realpathSync(resolvedRoot) : resolvedRoot;
  } catch {
    return resolvedRoot;
  }
}

function checkSymlinkEscapesRealRoot(rootReal: string, absoluteTarget: string): void {
  if (!fs.existsSync(absoluteTarget)) return;
  try {
    const lstat = fs.lstatSync(absoluteTarget);
    if (!lstat.isSymbolicLink()) return;

    const real = fs.realpathSync(absoluteTarget);
    const rel = path.relative(rootReal, real);
    const isEscaping = rel.startsWith('..') || path.isAbsolute(rel) || (real !== rootReal && !real.startsWith(rootReal + path.sep));
    if (isEscaping) {
      throw new Error('ERR_SYMLINK_ESCAPE_DETECTED: Symlink targets path outside repository root');
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes('ERR_SYMLINK_ESCAPE_DETECTED')) {
      throw err;
    }
  }
}

export class FileSystemJailAdapter implements IFileSystemJail {
  public resolveSafe(repoRoot: string, targetPath: string): string {
    validateRawInputs(repoRoot, targetPath);
    const resolvedRoot = path.resolve(repoRoot);
    const resolvedTarget = path.resolve(resolvedRoot, targetPath);
    checkSiblingAndEscape(resolvedRoot, resolvedTarget);
    return resolvedTarget;
  }

  public async readFileSafe(repoRoot: string, relativePath: string): Promise<string> {
    const safePath = this.resolveSafe(repoRoot, relativePath);
    await this.verifySymlinkSafe(repoRoot, safePath);
    return fs.promises.readFile(safePath, 'utf-8');
  }

  public async writeFileSafe(repoRoot: string, relativePath: string, content: string): Promise<void> {
    const safePath = this.resolveSafe(repoRoot, relativePath);
    await this.verifySymlinkSafe(repoRoot, safePath);

    const resolvedRoot = path.resolve(repoRoot);
    const rel = path.relative(resolvedRoot, safePath);

    const isGovernedDir = GOVERNED_DIR_PREFIXES.some(p => rel.startsWith(p) || rel === p.slice(0, -1));
    const isGovernedFile = GOVERNED_ROOT_FILES.has(rel) || rel.startsWith('.backup' + path.sep);

    if (!isGovernedDir && !isGovernedFile) {
      throw new Error(`ERR_UNGOVERNED_TARGET_PATH: Path "${rel}" is not an allowed governed directory or policy file`);
    }

    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(safePath, content, 'utf-8');
  }

  public async existsSafe(repoRoot: string, relativePath: string): Promise<boolean> {
    const safePath = this.resolveSafe(repoRoot, relativePath);
    return fs.existsSync(safePath);
  }

  public async ensureDirectorySafe(repoRoot: string, relativeDir: string): Promise<void> {
    const safePath = this.resolveSafe(repoRoot, relativeDir);
    if (!fs.existsSync(safePath)) {
      fs.mkdirSync(safePath, { recursive: true });
    }
  }

  public async isSymlinkSafe(repoRoot: string, relativePath: string): Promise<boolean> {
    const safePath = this.resolveSafe(repoRoot, relativePath);
    try {
      const stat = await fs.promises.lstat(safePath);
      return stat.isSymbolicLink();
    } catch {
      return false;
    }
  }

  private async verifySymlinkSafe(repoRoot: string, absoluteTarget: string): Promise<void> {
    const resolvedRoot = path.resolve(repoRoot);
    const rootReal = resolveRealRoot(resolvedRoot);
    checkSymlinkEscapesRealRoot(rootReal, absoluteTarget);
  }
}
