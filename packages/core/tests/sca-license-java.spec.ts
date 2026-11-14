import * as child_process from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveJavaLicense } from '../src/verifiers/sca/license-java.js';
import type { ScannedDependency } from '../src/types/index.js';

describe('CHG-055 TSK-006: Java/Maven offline license resolution', () => {
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

  it('reads license from ~/.m2 repository pom.xml locally without spawning mvn', () => {
    const rootDir = makeTmpDir('aisdlc-java-root-');
    const homeDir = makeTmpDir('aisdlc-java-home-');
    const pomDir = path.join(homeDir, '.m2', 'repository', 'com', 'acme', 'lib', '1.2.3');
    fs.mkdirSync(pomDir, { recursive: true });
    fs.writeFileSync(
      path.join(pomDir, 'lib-1.2.3.pom'),
      `<project>
        <groupId>com.acme</groupId>
        <artifactId>lib</artifactId>
        <version>1.2.3</version>
        <licenses>
          <license><name>Apache-2.0</name></license>
        </licenses>
      </project>`,
      'utf-8'
    );

    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);
    const spawnSpy = vi.spyOn(child_process, 'spawnSync');

    const dep: ScannedDependency = { name: 'com.acme:lib', version: '1.2.3', spdxLicense: 'UNKNOWN' };
    const license = resolveJavaLicense(dep, rootDir);

    expect(license).toBe('Apache-2.0');
    expect(spawnSpy).not.toHaveBeenCalled();
  });

  it('rejects path traversal in dependency coordinates outside ~/.m2', () => {
    const rootDir = makeTmpDir('aisdlc-java-trav-');
    const homeDir = makeTmpDir('aisdlc-java-home-trav-');
    fs.mkdirSync(path.join(homeDir, '.m2', 'repository'), { recursive: true });
    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);

    const dep: ScannedDependency = { name: '../../etc:passwd', version: '1.0.0', spdxLicense: 'UNKNOWN' };
    const license = resolveJavaLicense(dep, rootDir);
    expect(license).toBeUndefined();
  });

  it('rejects ~/.m2 pom.xml containing DOCTYPE/ENTITY (XXE)', () => {
    const rootDir = makeTmpDir('aisdlc-java-xxe-');
    const homeDir = makeTmpDir('aisdlc-java-home-xxe-');
    const pomDir = path.join(homeDir, '.m2', 'repository', 'com', 'evil', 'xxe', '1.0.0');
    fs.mkdirSync(pomDir, { recursive: true });
    fs.writeFileSync(
      path.join(pomDir, 'xxe-1.0.0.pom'),
      `<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
       <project><licenses><license><name>&xxe;</name></license></licenses></project>`,
      'utf-8'
    );

    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);
    const dep: ScannedDependency = { name: 'com.evil:xxe', version: '1.0.0', spdxLicense: 'UNKNOWN' };
    const license = resolveJavaLicense(dep, rootDir);
    expect(license).toBeUndefined();
  });

  it('falls back to mvn -o -B -ntp -q dependency:list and never invokes license:download-licenses', () => {
    const rootDir = makeTmpDir('aisdlc-java-cli-');
    const homeDir = makeTmpDir('aisdlc-java-home-empty-');
    const sysBinDir = makeTmpDir('aisdlc-java-sysbin-');
    const fakeMvn = path.join(sysBinDir, process.platform === 'win32' ? 'mvn.exe' : 'mvn');
    fs.writeFileSync(fakeMvn, '');
    if (process.platform !== 'win32') fs.chmodSync(fakeMvn, 0o755);

    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);
    vi.stubEnv('PATH', sysBinDir);

    const spawnSpy = vi.spyOn(child_process, 'spawnSync').mockReturnValue({
      status: 0,
      stdout: '[INFO]    com.acme:lib:jar:1.2.3:compile\n',
      stderr: '',
      pid: 55,
      output: [null, '', ''],
      signal: null,
    });

    const dep: ScannedDependency = { name: 'com.acme:lib', version: '1.2.3', spdxLicense: 'UNKNOWN' };
    resolveJavaLicense(dep, rootDir);

    expect(spawnSpy).toHaveBeenCalledTimes(1);
    const [, argv] = spawnSpy.mock.calls[0];
    expect(argv).toEqual(['-o', '-B', '-ntp', '-q', 'dependency:list']);
    expect(argv).not.toContain('license:download-licenses');
  });

  it.each([
    '.mvn/extensions.xml',
    '.mvn/maven.config',
  ])('blocks mvn execution when %s exists in repository', (blockerRel) => {
    const rootDir = makeTmpDir('aisdlc-java-block-');
    const homeDir = makeTmpDir('aisdlc-java-home-block-');
    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);

    const blockerPath = path.join(rootDir, blockerRel);
    fs.mkdirSync(path.dirname(blockerPath), { recursive: true });
    fs.writeFileSync(blockerPath, '<extensions/>', 'utf-8');

    const spawnSpy = vi.spyOn(child_process, 'spawnSync');
    const dep: ScannedDependency = { name: 'com.acme:lib', version: '1.2.3', spdxLicense: 'UNKNOWN' };
    const license = resolveJavaLicense(dep, rootDir);

    expect(license).toBeUndefined();
    expect(spawnSpy).not.toHaveBeenCalled();
  });
});
