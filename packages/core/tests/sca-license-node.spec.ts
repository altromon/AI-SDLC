import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveNodeLicense } from '../src/verifiers/sca/license-node.js';
import type { ScannedDependency } from '../src/types/index.js';

describe('CHG-055 TSK-008: Node.js offline license resolution', () => {
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

  it('reads license from node_modules/<pkg>/package.json locally without spawning npm/pnpm', () => {
    const rootDir = makeTmpDir('aisdlc-node-root-');
    const pkgDir = path.join(rootDir, 'node_modules', 'lodash');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'lodash', version: '4.17.21', license: 'MIT' }),
      'utf-8'
    );

    const spawnSpy = vi.spyOn(child_process, 'spawnSync');
    const dep: ScannedDependency = { name: 'lodash', version: '4.17.21', spdxLicense: 'UNKNOWN' };
    const license = resolveNodeLicense(dep, rootDir);

    expect(license).toBe('MIT');
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('falls back to npm ls --json --long --ignore-scripts --offline when node_modules package.json lacks license', () => {
    const rootDir = makeTmpDir('aisdlc-node-cli-');
    const sysBinDir = makeTmpDir('aisdlc-node-sysbin-');
    const fakeNpm = path.join(sysBinDir, process.platform === 'win32' ? 'npm.exe' : 'npm');
    fs.writeFileSync(fakeNpm, '');
    if (process.platform !== 'win32') fs.chmodSync(fakeNpm, 0o755);

    vi.stubEnv('PATH', sysBinDir);

    const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: JSON.stringify({
        dependencies: {
          chalk: { version: '5.3.0', license: 'MIT' },
        },
      }),
      stderr: '',
      pid: 99,
      output: [null, '{}', ''],
      signal: null,
    });

    const dep: ScannedDependency = { name: 'chalk', version: '5.3.0', spdxLicense: 'UNKNOWN' };
    const license = resolveNodeLicense(dep, rootDir);

    expect(license).toBe('MIT');
    expect(spawnSpy).toHaveBeenCalledTimes(1);
    const [, argv, opts] = spawnSpy.mock.calls[0];
    expect(argv).toEqual(['ls', '--json', '--long', '--ignore-scripts', '--offline']);
    expect((opts?.env as Record<string, string | undefined>)?.NODE_OPTIONS).toBeUndefined();
  });

  it('uses pnpm licenses list --json --ignore-scripts when pnpm-lock.yaml is present', () => {
    const rootDir = makeTmpDir('aisdlc-pnpm-cli-');
    fs.writeFileSync(path.join(rootDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n', 'utf-8');
    const sysBinDir = makeTmpDir('aisdlc-pnpm-sysbin-');
    const fakePnpm = path.join(sysBinDir, process.platform === 'win32' ? 'pnpm.exe' : 'pnpm');
    fs.writeFileSync(fakePnpm, '');
    if (process.platform !== 'win32') fs.chmodSync(fakePnpm, 0o755);

    vi.stubEnv('PATH', sysBinDir);

    const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: JSON.stringify({
        'ISC': [{ name: 'picocolors', version: '1.0.0', license: 'ISC' }],
      }),
      stderr: '',
      pid: 101,
      output: [null, '{}', ''],
      signal: null,
    });

    const dep: ScannedDependency = { name: 'picocolors', version: '1.0.0', spdxLicense: 'UNKNOWN' };
    const license = resolveNodeLicense(dep, rootDir);

    expect(license).toBe('ISC');
    expect(spawnSpy).toHaveBeenCalledTimes(1);
    expect(spawnSpy.mock.calls[0][1]).toEqual(['licenses', 'list', '--json', '--ignore-scripts']);
  });

  it.each([
    '.pnpmfile.cjs',
    '.npmrc',
  ])('blocks npm/pnpm CLI execution when %s exists in repository', (blockerFile) => {
    const rootDir = makeTmpDir('aisdlc-node-block-');
    fs.writeFileSync(path.join(rootDir, blockerFile), '// hook\n', 'utf-8');

    const spawnSpy = vi.spyOn(child_process, 'spawnSync');
    const dep: ScannedDependency = { name: 'chalk', version: '5.3.0', spdxLicense: 'UNKNOWN' };
    const license = resolveNodeLicense(dep, rootDir);

    expect(license).toBeUndefined();
    expect(spawnSpy).not.toHaveBeenCalled();
  });
});
