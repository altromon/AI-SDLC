import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveRustLicense } from '../src/verifiers/sca/license-rust.js';
import type { ScannedDependency } from '../src/types/index.js';

describe('CHG-055 TSK-004: Rust offline license resolution', () => {
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

  it('reads license from ~/.cargo/registry Cargo.toml locally without spawning cargo', () => {
    const rootDir = makeTmpDir('aisdlc-rust-root-');
    const cargoHome = makeTmpDir('aisdlc-cargo-home-');
    const crateDir = path.join(cargoHome, 'registry', 'src', 'index.crates.io-abc', 'serde-1.0.200');
    fs.mkdirSync(crateDir, { recursive: true });
    fs.writeFileSync(
      path.join(crateDir, 'Cargo.toml'),
      '[package]\nname = "serde"\nversion = "1.0.200"\nlicense = "MIT OR Apache-2.0"\n',
      'utf-8'
    );

    vi.stubEnv('CARGO_HOME', cargoHome);
    const spawnSpy = vi.spyOn(child_process, 'spawnSync');

    const dep: ScannedDependency = { name: 'serde', version: '1.0.200', spdxLicense: 'UNKNOWN' };
    const license = resolveRustLicense(dep, rootDir);

    expect(license).toBe('MIT OR Apache-2.0');
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('falls back to cargo metadata --offline --locked --frozen --format-version 1', () => {
    const rootDir = makeTmpDir('aisdlc-rust-cli-');
    const cargoHome = makeTmpDir('aisdlc-cargo-empty-');
    const sysBinDir = makeTmpDir('aisdlc-rust-sysbin-');
    const fakeCargo = path.join(sysBinDir, process.platform === 'win32' ? 'cargo.exe' : 'cargo');
    fs.writeFileSync(fakeCargo, '');
    if (process.platform !== 'win32') fs.chmodSync(fakeCargo, 0o755);

    vi.stubEnv('CARGO_HOME', cargoHome);
    vi.stubEnv('PATH', sysBinDir);

    const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: JSON.stringify({
        packages: [{ name: 'tokio', version: '1.37.0', license: 'MIT' }],
      }),
      stderr: '',
      pid: 77,
      output: [null, '{}', ''],
      signal: null,
    });

    const dep: ScannedDependency = { name: 'tokio', version: '1.37.0', spdxLicense: 'UNKNOWN' };
    const license = resolveRustLicense(dep, rootDir);

    expect(license).toBe('MIT');
    expect(spawnSpy).toHaveBeenCalledTimes(1);
    expect(spawnSpy.mock.calls[0][1]).toEqual([
      'metadata',
      '--offline',
      '--locked',
      '--frozen',
      '--format-version',
      '1',
    ]);
  });

  it.each([
    '.cargo/config.toml',
    '.cargo/config',
    'rust-toolchain.toml',
  ])('blocks cargo execution when %s exists in repository', (blockerRel) => {
    const rootDir = makeTmpDir('aisdlc-rust-block-');
    const cargoHome = makeTmpDir('aisdlc-cargo-empty2-');
    vi.stubEnv('CARGO_HOME', cargoHome);

    const blockerPath = path.join(rootDir, blockerRel);
    fs.mkdirSync(path.dirname(blockerPath), { recursive: true });
    fs.writeFileSync(blockerPath, '[build]\nrustc-wrapper = "evil"\n', 'utf-8');

    const spawnSpy = vi.spyOn(child_process, 'spawnSync');
    const dep: ScannedDependency = { name: 'tokio', version: '1.37.0', spdxLicense: 'UNKNOWN' };
    const license = resolveRustLicense(dep, rootDir);

    expect(license).toBeUndefined();
    expect(spawnSpy).not.toHaveBeenCalled();
  });
});
