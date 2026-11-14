import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveDotnetLicense } from '../src/verifiers/sca/license-dotnet.js';
import type { ScannedDependency } from '../src/types/index.js';

describe('CHG-055 TSK-007: .NET/NuGet offline license resolution', () => {
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

  it('reads license from ~/.nuget/packages .nuspec locally without spawning dotnet', () => {
    const rootDir = makeTmpDir('aisdlc-dotnet-root-');
    const homeDir = makeTmpDir('aisdlc-dotnet-home-');
    const pkgDir = path.join(homeDir, '.nuget', 'packages', 'newtonsoft.json', '13.0.3');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'newtonsoft.json.nuspec'),
      `<?xml version="1.0" encoding="utf-8"?>
      <package>
        <metadata>
          <id>Newtonsoft.Json</id>
          <version>13.0.3</version>
          <license type="expression">MIT</license>
        </metadata>
      </package>`,
      'utf-8'
    );

    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);
    const spawnSpy = vi.spyOn(child_process, 'spawnSync');

    const dep: ScannedDependency = { name: 'Newtonsoft.Json', version: '13.0.3', spdxLicense: 'UNKNOWN' };
    const license = resolveDotnetLicense(dep, rootDir);

    expect(license).toBe('MIT');
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('rejects .nuspec containing DOCTYPE/ENTITY (XXE)', () => {
    const rootDir = makeTmpDir('aisdlc-dotnet-xxe-');
    const homeDir = makeTmpDir('aisdlc-dotnet-home-xxe-');
    const pkgDir = path.join(homeDir, '.nuget', 'packages', 'evil.pkg', '1.0.0');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(
      path.join(pkgDir, 'evil.pkg.nuspec'),
      `<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
       <package><metadata><license type="expression">&xxe;</license></metadata></package>`,
      'utf-8'
    );

    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);
    const dep: ScannedDependency = { name: 'Evil.Pkg', version: '1.0.0', spdxLicense: 'UNKNOWN' };
    const license = resolveDotnetLicense(dep, rootDir);
    expect(license).toBeUndefined();
  });

  it('falls back to dotnet list package --include-transitive without restore', () => {
    const rootDir = makeTmpDir('aisdlc-dotnet-cli-');
    const homeDir = makeTmpDir('aisdlc-dotnet-home-empty-');
    const sysBinDir = makeTmpDir('aisdlc-dotnet-sysbin-');
    const fakeDotnet = path.join(sysBinDir, process.platform === 'win32' ? 'dotnet.exe' : 'dotnet');
    fs.writeFileSync(fakeDotnet, '');
    if (process.platform !== 'win32') fs.chmodSync(fakeDotnet, 0o755);

    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);
    vi.stubEnv('PATH', sysBinDir);

    const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: 'Project has the following package references\n   > Serilog   3.1.1\n',
      stderr: '',
      pid: 66,
      output: [null, '', ''],
      signal: null,
    });

    const dep: ScannedDependency = { name: 'Serilog', version: '3.1.1', spdxLicense: 'UNKNOWN' };
    resolveDotnetLicense(dep, rootDir);

    expect(spawnSpy).toHaveBeenCalledTimes(1);
    const [, argv] = spawnSpy.mock.calls[0];
    expect(argv).toEqual(['list', 'package', '--include-transitive']);
    expect(argv).not.toContain('restore');
  });

  it.each([
    'Directory.Build.props',
    'Directory.Build.targets',
    'Directory.Packages.props',
    'nuget.config',
    'NuGet.Config',
  ])('blocks dotnet execution when %s exists in upward directory traversal', (blockerName) => {
    const parentDir = makeTmpDir('aisdlc-dotnet-parent-');
    const rootDir = path.join(parentDir, 'sub', 'project');
    fs.mkdirSync(rootDir, { recursive: true });
    fs.writeFileSync(path.join(parentDir, blockerName), '<Project/>', 'utf-8');

    const homeDir = makeTmpDir('aisdlc-dotnet-home-block-');
    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);

    const spawnSpy = vi.spyOn(child_process, 'spawnSync');
    const dep: ScannedDependency = { name: 'Serilog', version: '3.1.1', spdxLicense: 'UNKNOWN' };
    const license = resolveDotnetLicense(dep, rootDir);

    expect(license).toBeUndefined();
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('blocks dotnet execution when global.json declares msbuild-sdks', () => {
    const rootDir = makeTmpDir('aisdlc-dotnet-globaljson-');
    fs.writeFileSync(
      path.join(rootDir, 'global.json'),
      JSON.stringify({ 'msbuild-sdks': { 'Evil.Sdk': '1.0.0' } }),
      'utf-8'
    );
    const homeDir = makeTmpDir('aisdlc-dotnet-home-gj-');
    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);

    const spawnSpy = vi.spyOn(child_process, 'spawnSync');
    const dep: ScannedDependency = { name: 'Serilog', version: '3.1.1', spdxLicense: 'UNKNOWN' };
    const license = resolveDotnetLicense(dep, rootDir);

    expect(license).toBeUndefined();
    expect(spawnSpy).not.toHaveBeenCalled();
  });
});
