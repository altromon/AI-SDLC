import * as fs from 'fs';
import * as path from 'path';

/**
 * Strict canonical sort function by Unicode UTF-8 codepoint.
 */
export function canonicalSort(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Normalizes file paths to POSIX forward slashes and Unicode NFC form.
 */
export function normalizePath(p: string): string {
  return p.normalize('NFC').replace(/\\/g, '/');
}

export function walkMdFiles(
  dir: string,
  fileList: string[] = [],
  excludeDirs: string[] = [
    'node_modules',
    '.git',
    'dist',
    'bin',
    'obj',
    'build',
    'out',
    'target',
    'coverage',
    '.changeset',
    'scratch',
    'test-scaffold',
    'fixtures',
    'templates',
    'examples',
    '.agent',
    '.agents',
    '.claude',
    '.cursor',
    '.github',
    '.vscode',
    '.vs',
    '.idea',
  ]
): string[] {
  try {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir).sort(canonicalSort);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        if (fs.statSync(fullPath).isDirectory()) {
          if (!excludeDirs.includes(file) && !file.startsWith('temp-') && !file.startsWith('.temp-')) {
            walkMdFiles(fullPath, fileList, excludeDirs);
          }
        } else if (file.endsWith('.md')) {
          fileList.push(fullPath);
        }
      } catch {
        // Ignore files unlinked concurrently
      }
    }
  } catch {
    // Ignore directories removed concurrently
  }
  return fileList.sort(canonicalSort);
}
