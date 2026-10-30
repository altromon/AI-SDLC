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

/**
 * Normalizes report text by stripping or standardizing volatile temporal metadata
 * (e.g., Generation Date, Generated at, Fecha, Audit Date, Date in markdown headers
 * and Generated: <span>...</span> in HTML headers) so semantic content comparison
 * is not invalidated by timestamps or dates.
 */
export function stripVolatileReportMetadata(content: string, _ext = ''): string {
  let normalized = content.replace(/\r\n/g, '\n');

  // Strip markdown date/timestamp metadata lines:
  normalized = normalized.replace(/(?:^|\n)>\s*\*\*(?:Generation Date|Generated at|Fecha|Audit Date|Date):\*\*.*$/gim, '');

  // Strip HTML dashboard header timestamp:
  normalized = normalized.replace(/Generated:\s*<span>[\s\S]*?<\/span>/gi, 'Generated: <span>[STRIPPED]</span>');

  return normalized.trim();
}

function areCycloneDxSbomsEqual(existingContent: string, newContent: string): boolean {
  try {
    const a = JSON.parse(existingContent);
    const b = JSON.parse(newContent);
    return (
      a.serialNumber === b.serialNumber &&
      JSON.stringify(a.components) === JSON.stringify(b.components) &&
      JSON.stringify(a.vulnerabilities || []) === JSON.stringify(b.vulnerabilities || [])
    );
  } catch {
    return false;
  }
}

function areSarifReportsEqual(existingContent: string, newContent: string): boolean {
  try {
    const a = JSON.parse(existingContent);
    const b = JSON.parse(newContent);
    return JSON.stringify(a.runs?.[0]?.results || []) === JSON.stringify(b.runs?.[0]?.results || []);
  } catch {
    return false;
  }
}

/**
 * Checks whether an existing report file on disk is semantically identical to new content,
 * ignoring volatile temporal metadata (timestamps, generation dates).
 */
export function isReportContentSemanticallyEqual(
  existingContent: string,
  newContent: string,
  filePath: string
): boolean {
  if (existingContent === newContent) return true;

  if (filePath.endsWith('.cdx.json') || filePath.endsWith('sbom.json')) {
    if (areCycloneDxSbomsEqual(existingContent, newContent)) return true;
  }

  if (filePath.endsWith('.sarif')) {
    if (areSarifReportsEqual(existingContent, newContent)) return true;
  }

  const ext = path.extname(filePath).toLowerCase();
  return stripVolatileReportMetadata(existingContent, ext) === stripVolatileReportMetadata(newContent, ext);
}

function atomicWriteFile(filePath: string, content: string): void {
  const tempPath = `${filePath}.${process.pid}.${Math.random().toString(36).substring(2)}.tmp`;
  try {
    fs.writeFileSync(tempPath, content, 'utf-8');
    try {
      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { force: true });
      }
      fs.renameSync(tempPath, filePath);
    } catch {
      fs.copyFileSync(tempPath, filePath);
      fs.unlinkSync(tempPath);
    }
  } catch {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

/**
 * Writes a report file to disk only if its semantic content has changed,
 * preventing spurious diffs and Git merge conflicts in PRs caused solely by volatile metadata.
 * Returns true if the file was written, false if it was skipped (no-op).
 */
export function writeReportFileIfChanged(
  filePath: string,
  content: string
): boolean {
  try {
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, 'utf-8');
      if (isReportContentSemanticallyEqual(existing, content, filePath)) {
        return false;
      }
    }
  } catch {
    // If reading or comparison fails, proceed with safe write
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  atomicWriteFile(filePath, content);
  return true;
}
