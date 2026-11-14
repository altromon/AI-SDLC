import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveGoLicense } from '../src/verifiers/sca/license-go.js';
import type { ScannedDependency } from '../src/types/index.js';

vi.mock('child_process', async (importOriginal) => {
  const mod = await importOriginal<typeof import('child_process')>();
  return { ...mod };
});

describe('CHG-055 TSK-005: Go offline license resolution', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads LICENSE from GOMODCACHE locally without spawning go', () => {
    const rootDir = makeTmpDir('aisdlc-go-root-');
    const goModCache = makeTmpDir('aisdlc-gomodcache-');
    const modDir = path.join(goModCache, 'github.com', 'pkg', 'errors@v0.9.1');
    fs.mkdirSync(modDir, { recursive: true });
    fs.writeFileSync(
      path.join(modDir, 'LICENSE'),
      'MIT License\nPermission is hereby granted, free of charge, to any person obtaining a copy',
      'utf-8'
    );

    vi.stubEnv('GOMODCACHE', goModCache);
    const spawnSpy = vi.spyOn(child_process, 'spawnSync');

    const dep: ScannedDependency = { name: 'github.com/pkg/errors', version: 'v0.9.1', spdxLicense: 'UNKNOWN' };
    const license = resolveGoLicense(dep, rootDir);

    expect(license).toBe('MIT');
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('falls back to go list -m -json all with hardened offline env and leaves go.mod/go.sum byte-identical', () => {
    const rootDir = makeTmpDir('aisdlc-go-cli-');
    const goModCache = makeTmpDir('aisdlc-gomodcache-empty-');
    const sysBinDir = makeTmpDir('aisdlc-go-sysbin-');
    const fakeGo = path.join(sysBinDir, process.platform === 'win32' ? 'go.exe' : 'go');
    fs.writeFileSync(fakeGo, '');
    if (process.platform !== 'win32') fs.chmodSync(fakeGo, 0o755);

    const goModContent = 'module example.com/app\n\ngo 1.22\n';
    const goSumContent = 'github.com/pkg/errors v0.9.1 h1:abc=\n';
    fs.writeFileSync(path.join(rootDir, 'go.mod'), goModContent, 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'go.sum'), goSumContent, 'utf-8');

    vi.stubEnv('GOMODCACHE', goModCache);
    vi.stubEnv('PATH', sysBinDir);

    const modInCache = makeTmpDir('aisdlc-go-resolved-');
    fs.writeFileSync(
      path.join(modInCache, 'LICENSE'),
      'Apache License\nVersion 2.0, January 2004',
      'utf-8'
    );

    const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: JSON.stringify({
        Path: 'github.com/pkg/errors',
        Version: 'v0.9.1',
        Dir: modInCache,
      }),
      stderr: '',
      pid: 88,
      output: [null, '{}', ''],
      signal: null,
    });

    const dep: ScannedDependency = { name: 'github.com/pkg/errors', version: 'v0.9.1', spdxLicense: 'UNKNOWN' };
    const license = resolveGoLicense(dep, rootDir);

    expect(license).toBe('Apache-2.0');
    expect(spawnSpy).toHaveBeenCalledTimes(1);
    const [, argv, opts] = spawnSpy.mock.calls[0];
    expect(argv).toEqual(['list', '-m', '-json', 'all']);
    const env = opts?.env as Record<string, string | undefined>;
    expect(env.GOFLAGS).toBe('-mod=readonly');
    expect(env.GOPROXY).toBe('off');
    expect(env.GOTOOLCHAIN).toBe('local');
    expect(env.GOWORK).toBe('off');

    expect(fs.readFileSync(path.join(rootDir, 'go.mod'), 'utf-8')).toBe(goModContent);
    expect(fs.readFileSync(path.join(rootDir, 'go.sum'), 'utf-8')).toBe(goSumContent);
  });
});
