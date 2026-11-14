import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolvePythonLicense } from '../src/verifiers/sca/license-python.js';
import type { ScannedDependency } from '../src/types/index.js';

vi.mock('child_process', async (importOriginal) => {
  const mod = await importOriginal<typeof import('child_process')>();
  return { ...mod };
});

describe('CHG-055 TSK-003: Python offline license resolution', () => {
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

  it('reads License-Expression, License, or Classifier from .venv dist-info/METADATA without spawning CLI', () => {
    const rootDir = makeTmpDir('aisdlc-py-');
    const distInfo = path.join(rootDir, '.venv', 'lib', 'python3.11', 'site-packages', 'requests-2.31.0.dist-info');
    fs.mkdirSync(distInfo, { recursive: true });
    fs.writeFileSync(
      path.join(distInfo, 'METADATA'),
      'Name: requests\nVersion: 2.31.0\nLicense-Expression: Apache-2.0\nLicense: Apache 2.0\n',
      'utf-8'
    );

    const spawnSpy = vi.spyOn(child_process, 'spawnSync');
    const dep: ScannedDependency = { name: 'requests', version: '2.31.0', spdxLicense: 'UNKNOWN' };

    const license = resolvePythonLicense(dep, rootDir);
    expect(license).toBe('Apache-2.0');
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('extracts license from Classifier when License header is absent', () => {
    const rootDir = makeTmpDir('aisdlc-py-cls-');
    const distInfo = path.join(rootDir, '.venv', 'Lib', 'site-packages', 'click-8.1.7.dist-info');
    fs.mkdirSync(distInfo, { recursive: true });
    fs.writeFileSync(
      path.join(distInfo, 'METADATA'),
      'Name: click\nVersion: 8.1.7\nClassifier: License :: OSI Approved :: BSD License\n',
      'utf-8'
    );

    const dep: ScannedDependency = { name: 'click', version: '8.1.7', spdxLicense: 'UNKNOWN' };
    const license = resolvePythonLicense(dep, rootDir);
    expect(license).toBeDefined();
    expect(license).not.toBe('UNKNOWN');
  });

  it('falls back to pip-licenses --format=json with PYTHONNOUSERSITE=1 and never spawns repo .venv python', () => {
    const rootDir = makeTmpDir('aisdlc-py-cli-');
    const sysBinDir = makeTmpDir('aisdlc-py-sysbin-');
    const venvBin = path.join(rootDir, '.venv', process.platform === 'win32' ? 'Scripts' : 'bin');
    fs.mkdirSync(venvBin, { recursive: true });
    fs.writeFileSync(path.join(venvBin, process.platform === 'win32' ? 'python.exe' : 'python'), '');

    const fakePipLic = path.join(sysBinDir, process.platform === 'win32' ? 'pip-licenses.exe' : 'pip-licenses');
    fs.writeFileSync(fakePipLic, '');
    if (process.platform !== 'win32') fs.chmodSync(fakePipLic, 0o755);
    vi.stubEnv('PATH', sysBinDir);

    const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: JSON.stringify([{ Name: 'urllib3', Version: '2.2.1', License: 'MIT' }]),
      stderr: '',
      pid: 42,
      output: [null, '[]', ''],
      signal: null,
    });

    const dep: ScannedDependency = { name: 'urllib3', version: '2.2.1', spdxLicense: 'UNKNOWN' };
    const license = resolvePythonLicense(dep, rootDir);

    expect(license).toBe('MIT');
    expect(spawnSpy).toHaveBeenCalledTimes(1);
    const [bin, argv, opts] = spawnSpy.mock.calls[0];
    expect(String(bin)).not.toContain('.venv');
    expect(argv).toEqual(['--format=json']);
    expect((opts?.env as Record<string, string | undefined>)?.PYTHONNOUSERSITE).toBe('1');
  });

  it('rejects oversized or symlink-escaped METADATA files', () => {
    const rootDir = makeTmpDir('aisdlc-py-cap-');
    const distInfo = path.join(rootDir, '.venv', 'lib', 'site-packages', 'huge-1.0.0.dist-info');
    fs.mkdirSync(distInfo, { recursive: true });
    fs.writeFileSync(path.join(distInfo, 'METADATA'), 'A'.repeat(2 * 1024 * 1024), 'utf-8');

    const dep: ScannedDependency = { name: 'huge', version: '1.0.0', spdxLicense: 'UNKNOWN' };
    const license = resolvePythonLicense(dep, rootDir);
    expect(license).toBeUndefined();
  });
});
