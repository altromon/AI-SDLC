import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileSystemJailAdapter } from '../src/migrate/fs-jail.js';

describe('FileSystemJailAdapter (Happy / Sad / Boundary / Malformed)', () => {
  let tmpRoot: string;
  let jail: FileSystemJailAdapter;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-fsjail-'));
    jail = new FileSystemJailAdapter();
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('resolveSafe: resolves valid relative paths and rejects empty, null-byte, traversal, and sibling paths (happy/sad/boundary/malformed)', () => {
    expect(jail.resolveSafe(tmpRoot, 'policies/quality.yaml')).toBe(path.resolve(tmpRoot, 'policies/quality.yaml'));
    expect(() => jail.resolveSafe('', 'a.txt')).toThrow('ERR_PATH_TRAVERSAL_DETECTED');
    expect(() => jail.resolveSafe(tmpRoot, '')).toThrow('ERR_PATH_TRAVERSAL_DETECTED');
    expect(() => jail.resolveSafe(tmpRoot, 'bad\0path.txt')).toThrow('ERR_PATH_TRAVERSAL_DETECTED');
    expect(() => jail.resolveSafe(tmpRoot, '../outside.txt')).toThrow('ERR_PATH_TRAVERSAL_DETECTED');
    expect(() => jail.resolveSafe(tmpRoot, `..${path.sep}${path.basename(tmpRoot)}-sibling${path.sep}x.txt`)).toThrow(
      'ERR_PATH_OUTSIDE_REPO_ROOT'
    );
  });

  it('writeFileSafe & readFileSafe & existsSafe: writes and reads governed paths, rejects ungoverned paths and missing files (happy/sad)', async () => {
    await jail.writeFileSafe(tmpRoot, 'quality-policy.yaml', 'version: "1.0"\n');
    expect(await jail.existsSafe(tmpRoot, 'quality-policy.yaml')).toBe(true);
    expect(await jail.readFileSafe(tmpRoot, 'quality-policy.yaml')).toBe('version: "1.0"\n');

    await jail.writeFileSafe(tmpRoot, 'schemas/custom/test.json', '{}');
    expect(await jail.existsSafe(tmpRoot, 'schemas/custom/test.json')).toBe(true);

    await expect(jail.writeFileSafe(tmpRoot, 'src/unmanaged.ts', 'code')).rejects.toThrow('ERR_UNGOVERNED_TARGET_PATH');
    expect(await jail.existsSafe(tmpRoot, 'missing.txt')).toBe(false);
    await expect(jail.existsSafe(tmpRoot, '../escape.txt')).rejects.toThrow('ERR_PATH_TRAVERSAL_DETECTED');
    await expect(jail.readFileSafe(tmpRoot, 'missing.txt')).rejects.toThrow();
  });
});
