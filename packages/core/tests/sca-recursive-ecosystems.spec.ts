// Traceability: FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001, UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS, CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS, CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS (TSK-001, TSK-003)
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scanInstalledLicenses, scanWithNativeFs } from '../src/verifiers/sca/scanner.js';
import { resolvePythonLicenseDetailed } from '../src/verifiers/sca/license-python.js';
import type { ScannedDependency } from '../src/types/index.js';

vi.mock('os', async (importOriginal) => {
  const mod = await importOriginal<typeof import('os')>();
  return { ...mod };
});

describe('CHG-079 TSK-001: Bounded Recursive Multi-Ecosystem SCA Scanning', () => {
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

  describe('Bounded Traversal (maxDepth = 3, SKIPPED_SCAN_DIRS, symlinks)', () => {
    it('scans manifests at depth 3 and skips manifests at depth 4 (boundary)', () => {
      const rootDir = makeTmpDir('aisdlc-sca-depth-');
      const depth3Dir = path.join(rootDir, 'd1', 'd2', 'd3');
      const depth4Dir = path.join(depth3Dir, 'd4');
      fs.mkdirSync(depth4Dir, { recursive: true });

      fs.writeFileSync(path.join(depth3Dir, 'requirements.txt'), 'requests==2.31.0\n', 'utf-8');
      fs.writeFileSync(path.join(depth4Dir, 'requirements.txt'), 'flask==3.0.0\n', 'utf-8');

      const deps = scanWithNativeFs(rootDir);
      expect(deps.some((d) => d.name === 'requests' && d.version === '2.31.0')).toBe(true);
      expect(deps.some((d) => d.name === 'flask')).toBe(false);
    });

    it('skips artifact/build directories (node_modules, .git, dist, target, bin, obj, .venv, venv)', () => {
      const rootDir = makeTmpDir('aisdlc-sca-skipdirs-');
      const skippedDirs = ['node_modules', '.git', 'dist', 'target', 'bin', 'obj', '.venv', 'venv'];
      for (const dirName of skippedDirs) {
        const sub = path.join(rootDir, 'services', dirName);
        fs.mkdirSync(sub, { recursive: true });
        fs.writeFileSync(path.join(sub, 'requirements.txt'), `ignored-${dirName.replace(/\./g, '')}==1.0.0\n`, 'utf-8');
      }

      const validDir = path.join(rootDir, 'services', 'api');
      fs.mkdirSync(validDir, { recursive: true });
      fs.writeFileSync(path.join(validDir, 'requirements.txt'), 'httpx==0.27.0\n', 'utf-8');

      const deps = scanWithNativeFs(rootDir);
      expect(deps.some((d) => d.name === 'httpx' && d.version === '0.27.0')).toBe(true);
      for (const dirName of skippedDirs) {
        const pkgName = `ignored-${dirName.replace(/\./g, '')}`;
        expect(deps.some((d) => d.name === pkgName)).toBe(false);
      }
    });

    it('skips symlinked directories without escaping rootDir or looping', () => {
      const rootDir = makeTmpDir('aisdlc-sca-sym-root-');
      const outsideDir = makeTmpDir('aisdlc-sca-sym-outside-');
      fs.writeFileSync(path.join(outsideDir, 'requirements.txt'), 'secret-pkg==9.9.9\n', 'utf-8');

      const linkPath = path.join(rootDir, 'linked-outside');
      fs.symlinkSync(outsideDir, linkPath, process.platform === 'win32' ? 'junction' : 'dir');

      const deps = scanWithNativeFs(rootDir);
      expect(deps.some((d) => d.name === 'secret-pkg')).toBe(false);
    });
  });

  describe('.NET Native Extraction (*.csproj, Directory.Packages.props, packages.lock.json)', () => {
    it('extracts PackageReference from nested *.csproj and Central Package Management Directory.Packages.props', () => {
      const rootDir = makeTmpDir('aisdlc-sca-dotnet-');
      const svcDir = path.join(rootDir, 'src', 'MyService');
      fs.mkdirSync(svcDir, { recursive: true });

      fs.writeFileSync(
        path.join(rootDir, 'Directory.Packages.props'),
        `<Project>
          <PropertyGroup>
            <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
          </PropertyGroup>
          <ItemGroup>
            <PackageVersion Include="Serilog" Version="3.1.1" />
            <PackageVersion Include="IgnoredProp" Version="$(DynamicVer)" />
          </ItemGroup>
        </Project>`,
        'utf-8'
      );

      fs.writeFileSync(
        path.join(svcDir, 'MyService.csproj'),
        `<Project Sdk="Microsoft.NET.Sdk">
          <ItemGroup>
            <PackageReference Include="Newtonsoft.Json" Version="13.0.3" />
            <PackageReference Include="Serilog" />
            <PackageReference Include="Unresolved.Prop" Version="$(SomeProp)" />
            <!-- <PackageReference Include="Commented.Out" Version="1.0.0" /> -->
            <![CDATA[ <PackageReference Include="Cdata.Pkg" Version="1.0.0" /> ]]>
          </ItemGroup>
        </Project>`,
        'utf-8'
      );

      const deps = scanWithNativeFs(rootDir);
      const newtonsoft = deps.find((d) => d.name === 'Newtonsoft.Json' && d.version === '13.0.3');
      const serilog = deps.find((d) => d.name === 'Serilog' && d.version === '3.1.1');

      expect(newtonsoft).toBeDefined();
      expect(newtonsoft?.purl).toMatch(/^pkg:nuget\//i);
      expect(newtonsoft?.path).toBe(path.join(svcDir, 'MyService.csproj'));

      expect(serilog).toBeDefined();
      expect(serilog?.purl).toMatch(/^pkg:nuget\//i);

      expect(deps.some((d) => d.name === 'Unresolved.Prop')).toBe(false);
      expect(deps.some((d) => d.name === 'IgnoredProp')).toBe(false);
      expect(deps.some((d) => d.name === 'Commented.Out')).toBe(false);
      expect(deps.some((d) => d.name === 'Cdata.Pkg')).toBe(false);
    });

    it('extracts resolved packages from packages.lock.json', () => {
      const rootDir = makeTmpDir('aisdlc-sca-dotnet-lock-');
      const svcDir = path.join(rootDir, 'apps', 'worker');
      fs.mkdirSync(svcDir, { recursive: true });

      const lockPath = path.join(svcDir, 'packages.lock.json');
      fs.writeFileSync(
        lockPath,
        JSON.stringify({
          version: 1,
          dependencies: {
            'net8.0': {
              'Dapper': { type: 'Direct', resolved: '2.1.35' },
              'System.Data.SqlClient': { type: 'Transitive', resolved: '4.8.6' },
            },
          },
        }),
        'utf-8'
      );

      const deps = scanWithNativeFs(rootDir);
      const dapper = deps.find((d) => d.name === 'Dapper' && d.version === '2.1.35');
      const sql = deps.find((d) => d.name === 'System.Data.SqlClient' && d.version === '4.8.6');

      expect(dapper).toBeDefined();
      expect(dapper?.purl).toMatch(/^pkg:nuget\//i);
      expect(dapper?.path).toBe(lockPath);
      expect(sql).toBeDefined();
    });

    it('rejects *.csproj / Directory.Packages.props with DOCTYPE/ENTITY and degrades gracefully on malformed JSON', () => {
      const rootDir = makeTmpDir('aisdlc-sca-dotnet-sad-');
      fs.writeFileSync(
        path.join(rootDir, 'Evil.csproj'),
        `<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
        <Project><ItemGroup><PackageReference Include="Evil.Pkg" Version="1.0.0" /></ItemGroup></Project>`,
        'utf-8'
      );
      fs.writeFileSync(path.join(rootDir, 'packages.lock.json'), '{not-valid-json', 'utf-8');

      expect(() => scanWithNativeFs(rootDir)).not.toThrow();
      const deps = scanWithNativeFs(rootDir);
      expect(deps.some((d) => d.name === 'Evil.Pkg')).toBe(false);
    });
  });

  describe('Gradle Native Extraction (build.gradle, build.gradle.kts, gradle.lockfile)', () => {
    it('extracts Groovy, Kotlin DSL, and gradle.lockfile dependencies while stripping comments and interpolated versions', () => {
      const rootDir = makeTmpDir('aisdlc-sca-gradle-');
      const groovyDir = path.join(rootDir, 'services', 'groovy-app');
      const ktsDir = path.join(rootDir, 'services', 'kts-app');
      fs.mkdirSync(groovyDir, { recursive: true });
      fs.mkdirSync(ktsDir, { recursive: true });

      fs.writeFileSync(
        path.join(groovyDir, 'build.gradle'),
        `dependencies {
          // implementation 'com.fake:line-comment:1.0.0'
          /* implementation 'com.fake:block-comment:1.0.0' */
          implementation 'com.google.guava:guava:33.0.0-jre'
          api "org.slf4j:slf4j-api:2.0.12"
          implementation "com.example:dynamic:$myVersion"
        }`,
        'utf-8'
      );

      fs.writeFileSync(
        path.join(ktsDir, 'build.gradle.kts'),
        `dependencies {
          implementation("io.ktor:ktor-server-core:2.3.10")
          testImplementation("org.junit.jupiter:junit-jupiter:\${junitVersion}")
        }`,
        'utf-8'
      );

      fs.writeFileSync(
        path.join(ktsDir, 'gradle.lockfile'),
        `# This is a Gradle generated file for dependency locking.
org.apache.commons:commons-lang3:3.14.0=compileClasspath,runtimeClasspath
empty=
`,
        'utf-8'
      );

      const deps = scanWithNativeFs(rootDir);
      const guava = deps.find((d) => d.name === 'com.google.guava:guava' && d.version === '33.0.0-jre');
      const slf4j = deps.find((d) => d.name === 'org.slf4j:slf4j-api' && d.version === '2.0.12');
      const ktor = deps.find((d) => d.name === 'io.ktor:ktor-server-core' && d.version === '2.3.10');
      const commons = deps.find((d) => d.name === 'org.apache.commons:commons-lang3' && d.version === '3.14.0');

      expect(guava?.purl).toBe('pkg:maven/com.google.guava/guava@33.0.0-jre');
      expect(guava?.path).toBe(path.join(groovyDir, 'build.gradle'));
      expect(slf4j?.purl).toBe('pkg:maven/org.slf4j/slf4j-api@2.0.12');
      expect(ktor?.purl).toBe('pkg:maven/io.ktor/ktor-server-core@2.3.10');
      expect(ktor?.path).toBe(path.join(ktsDir, 'build.gradle.kts'));
      expect(commons?.purl).toBe('pkg:maven/org.apache.commons/commons-lang3@3.14.0');

      expect(deps.some((d) => d.name.includes('com.fake'))).toBe(false);
      expect(deps.some((d) => d.name === 'com.example:dynamic')).toBe(false);
      expect(deps.some((d) => d.name === 'org.junit.jupiter:junit-jupiter')).toBe(false);
    });

    it('degrades gracefully on malformed Gradle files without throwing', () => {
      const rootDir = makeTmpDir('aisdlc-sca-gradle-sad-');
      fs.writeFileSync(path.join(rootDir, 'build.gradle.kts'), 'dependencies { ((( broken syntax', 'utf-8');
      fs.writeFileSync(path.join(rootDir, 'gradle.lockfile'), 'invalid-line-without-colons\n', 'utf-8');

      expect(() => scanWithNativeFs(rootDir)).not.toThrow();
    });
  });

  describe('Python requirements.txt & Nested .venv License Resolution', () => {
    it('parses requirements.txt with line continuations, inline comments, env markers, --hash, and -r', () => {
      const rootDir = makeTmpDir('aisdlc-sca-py-req-');
      const pyDir = path.join(rootDir, 'services', 'ml');
      fs.mkdirSync(pyDir, { recursive: true });

      const reqPath = path.join(pyDir, 'requirements.txt');
      fs.writeFileSync(
        reqPath,
        [
          '# top comment',
          '-r base.txt',
          '--index-url https://pypi.org/simple',
          'pydantic==2.7.1 ; python_version >= "3.10" # inline comment',
          'uvicorn==0.29.0 \\',
          '  --hash=sha256:abcdef123456',
          'numpy>=1.26.0',
          '',
        ].join('\n'),
        'utf-8'
      );

      const deps = scanWithNativeFs(rootDir);
      const pydantic = deps.find((d) => d.name === 'pydantic' && d.version === '2.7.1');
      const uvicorn = deps.find((d) => d.name === 'uvicorn' && d.version === '0.29.0');

      expect(pydantic).toBeDefined();
      expect(pydantic?.purl).toBe('pkg:pypi/pydantic@2.7.1');
      expect(pydantic?.path).toBe(reqPath);
      expect(uvicorn).toBeDefined();
      expect(uvicorn?.purl).toBe('pkg:pypi/uvicorn@0.29.0');
      expect(deps.some((d) => d.name === '-r' || d.name === '--index-url')).toBe(false);
    });

    it('resolves Python license from nested <manifestDir>/.venv/site-packages METADATA when dep.path is inside rootDir', () => {
      const rootDir = makeTmpDir('aisdlc-sca-py-nested-venv-');
      const svcDir = path.join(rootDir, 'services', 'billing');
      const distInfo = path.join(svcDir, '.venv', 'lib', 'python3.11', 'site-packages', 'pydantic-2.7.1.dist-info');
      fs.mkdirSync(distInfo, { recursive: true });
      fs.writeFileSync(
        path.join(distInfo, 'METADATA'),
        'Name: pydantic\nVersion: 2.7.1\nLicense-Expression: MIT\n',
        'utf-8'
      );
      const reqPath = path.join(svcDir, 'requirements.txt');
      fs.writeFileSync(reqPath, 'pydantic==2.7.1\n', 'utf-8');

      const dep: ScannedDependency = {
        name: 'pydantic',
        version: '2.7.1',
        spdxLicense: 'UNKNOWN',
        purl: 'pkg:pypi/pydantic@2.7.1',
        path: reqPath,
      };

      const res = resolvePythonLicenseDetailed(dep, rootDir);
      expect(res.license).toBe('MIT');
      expect(res.provenance).toBe('local-metadata');
    });

    it('rejects nested .venv resolution if dep.path escapes rootDir (sad/security)', () => {
      const rootDir = makeTmpDir('aisdlc-sca-py-escape-root-');
      const outsideDir = makeTmpDir('aisdlc-sca-py-escape-out-');
      const distInfo = path.join(outsideDir, '.venv', 'lib', 'python3.11', 'site-packages', 'evil-1.0.0.dist-info');
      fs.mkdirSync(distInfo, { recursive: true });
      fs.writeFileSync(path.join(distInfo, 'METADATA'), 'Name: evil\nVersion: 1.0.0\nLicense-Expression: MIT\n', 'utf-8');

      const dep: ScannedDependency = {
        name: 'evil',
        version: '1.0.0',
        spdxLicense: 'UNKNOWN',
        purl: 'pkg:pypi/evil@1.0.0',
        path: path.join(outsideDir, 'requirements.txt'),
      };

      const res = resolvePythonLicenseDetailed(dep, rootDir);
      expect(res.provenance).not.toBe('local-metadata');
    });

    it('resolves licenses end-to-end via scanInstalledLicenses across nested .NET, Gradle, and Python', () => {
      const rootDir = makeTmpDir('aisdlc-sca-polyglot-e2e-');
      const homeDir = makeTmpDir('aisdlc-sca-polyglot-home-');
      vi.spyOn(os, 'homedir').mockReturnValue(homeDir);

      // Nested .NET + ~/.nuget/packages
      const dotnetDir = path.join(rootDir, 'apps', 'dotnet-api');
      fs.mkdirSync(dotnetDir, { recursive: true });
      fs.writeFileSync(
        path.join(dotnetDir, 'Api.csproj'),
        '<Project><ItemGroup><PackageReference Include="Newtonsoft.Json" Version="13.0.3" /></ItemGroup></Project>',
        'utf-8'
      );
      const nugetPkg = path.join(homeDir, '.nuget', 'packages', 'newtonsoft.json', '13.0.3');
      fs.mkdirSync(nugetPkg, { recursive: true });
      fs.writeFileSync(
        path.join(nugetPkg, 'newtonsoft.json.nuspec'),
        '<package><metadata><id>Newtonsoft.Json</id><version>13.0.3</version><license type="expression">MIT</license></metadata></package>',
        'utf-8'
      );

      // Nested Gradle + ~/.m2/repository
      const gradleDir = path.join(rootDir, 'apps', 'jvm-svc');
      fs.mkdirSync(gradleDir, { recursive: true });
      fs.writeFileSync(path.join(gradleDir, 'build.gradle.kts'), 'dependencies { implementation("com.google.guava:guava:33.0.0-jre") }\n', 'utf-8');
      const m2Pkg = path.join(homeDir, '.m2', 'repository', 'com', 'google', 'guava', 'guava', '33.0.0-jre');
      fs.mkdirSync(m2Pkg, { recursive: true });
      fs.writeFileSync(
        path.join(m2Pkg, 'guava-33.0.0-jre.pom'),
        '<project><licenses><license><name>Apache-2.0</name></license></licenses></project>',
        'utf-8'
      );

      // Nested Python + nested .venv
      const pyDir = path.join(rootDir, 'apps', 'py-svc');
      const distInfo = path.join(pyDir, '.venv', 'lib', 'python3.12', 'site-packages', 'httpx-0.27.0.dist-info');
      fs.mkdirSync(distInfo, { recursive: true });
      fs.writeFileSync(path.join(pyDir, 'requirements.txt'), 'httpx==0.27.0\n', 'utf-8');
      fs.writeFileSync(path.join(distInfo, 'METADATA'), 'Name: httpx\nVersion: 0.27.0\nLicense-Expression: BSD-3-Clause\n', 'utf-8');

      const resolved = scanInstalledLicenses(rootDir, { tool: 'native' });
      expect(resolved.find((d) => d.name === 'Newtonsoft.Json')?.spdxLicense).toBe('MIT');
      expect(resolved.find((d) => d.name === 'com.google.guava:guava')?.spdxLicense).toBe('Apache-2.0');
      expect(resolved.find((d) => d.name === 'httpx')?.spdxLicense).toBe('BSD-3-Clause');
    });
  });
});
