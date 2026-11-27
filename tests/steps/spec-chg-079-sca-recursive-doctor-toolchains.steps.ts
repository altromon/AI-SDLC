// BDD STEP DEFINITIONS (tests/features/spec-chg-079-sca-recursive-doctor-toolchains.feature)
// Traceability: @CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS @FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BddStepRegistry } from '@aisdlc/core';
import { scanInstalledLicenses, scanWithNativeFs } from '../../packages/core/src/verifiers/sca/scanner.js';
import { ToolchainHealthCheck } from '../../packages/core/src/doctor/toolchain-check.js';
import type { IProcessRunner } from '../../packages/core/src/types/doctor.js';
import type { ScannedDependency } from '../../packages/core/src/types/index.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export function registerSteps(registry: BddStepRegistry): void {
  let tmpDir = '';
  let outsideDir = '';
  let rawDeps: ScannedDependency[] = [];
  let resolvedDeps: ScannedDependency[] = [];
  let probedBins: string[] = [];
  let doctorStatus = '';
  let doctorFindingIds: string[] = [];
  let doctorFindingsHaveRemediation = false;
  let scanThrew = false;

  function resetTmpDir(): string {
    if (tmpDir && fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    if (outsideDir && fs.existsSync(outsideDir)) fs.rmSync(outsideDir, { recursive: true, force: true });
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdd-chg079-'));
    return tmpDir;
  }

  registry.given(
    'a polyglot repository containing nested ".NET" ("*.csproj", "Directory.Packages.props", "packages.lock.json"), "Gradle" ("build.gradle.kts", "gradle.lockfile"), and "Python" ("requirements.txt") manifests within depth 3',
    () => {
      const dir = resetTmpDir();
      const netDir = path.join(dir, 'apps', 'net');
      const gradleDir = path.join(dir, 'apps', 'jvm');
      const pyDir = path.join(dir, 'apps', 'py');
      const distInfo = path.join(pyDir, '.venv', 'lib', 'python3.11', 'site-packages', 'httpx-0.27.0.dist-info');
      fs.mkdirSync(netDir, { recursive: true });
      fs.mkdirSync(gradleDir, { recursive: true });
      fs.mkdirSync(distInfo, { recursive: true });

      fs.writeFileSync(path.join(dir, 'Directory.Packages.props'), '<Project><ItemGroup><PackageVersion Include="Serilog" Version="3.1.1" /></ItemGroup></Project>', 'utf-8');
      fs.writeFileSync(path.join(netDir, 'App.csproj'), '<Project><ItemGroup><PackageReference Include="Serilog" /></ItemGroup></Project>', 'utf-8');
      fs.writeFileSync(path.join(netDir, 'packages.lock.json'), JSON.stringify({ version: 1, dependencies: { 'net8.0': { Dapper: { type: 'Direct', resolved: '2.1.35' } } } }), 'utf-8');
      fs.writeFileSync(path.join(gradleDir, 'build.gradle.kts'), 'dependencies { implementation("io.ktor:ktor-server-core:2.3.10") }\n', 'utf-8');
      fs.writeFileSync(path.join(gradleDir, 'gradle.lockfile'), 'org.apache.commons:commons-lang3:3.14.0=compileClasspath\n', 'utf-8');
      fs.writeFileSync(path.join(pyDir, 'requirements.txt'), 'httpx==0.27.0\n', 'utf-8');
      fs.writeFileSync(path.join(distInfo, 'METADATA'), 'Name: httpx\nVersion: 0.27.0\nLicense-Expression: BSD-3-Clause\n', 'utf-8');
    }
  );

  registry.when('"scanWithNativeFs" and "scanDependencies" run on the repository root and "ToolchainHealthCheck.inspect" runs on the repository', async () => {
    rawDeps = scanWithNativeFs(tmpDir);
    resolvedDeps = scanInstalledLicenses(tmpDir, { tool: 'native' });
    probedBins = [];
    const runner: IProcessRunner = {
      execSafe: async (bin) => {
        probedBins.push(bin);
        return { exitCode: 0, stdout: '1.0.0\n', stderr: '' };
      },
    };
    const report = await new ToolchainHealthCheck(runner).inspect({ rootDir: tmpDir });
    doctorStatus = report.status;
  });

  registry.then(
    '"scanWithNativeFs" emits raw "pkg:nuget/", "pkg:maven/", and "pkg:pypi/" dependencies with "path" pointing to the discovered manifest/lockfile and "scanDependencies" resolves their licenses via "resolveLicense" (including nested ".venv"/"venv" "site-packages")',
    () => {
      assert(rawDeps.some((d) => d.purl?.startsWith('pkg:nuget/') && Boolean(d.path)), 'RED: Expected raw pkg:nuget/ with path');
      assert(rawDeps.some((d) => d.purl?.startsWith('pkg:maven/') && Boolean(d.path)), 'RED: Expected raw pkg:maven/ with path');
      assert(rawDeps.some((d) => d.purl?.startsWith('pkg:pypi/') && Boolean(d.path)), 'RED: Expected raw pkg:pypi/ with path');
      assert(resolvedDeps.find((d) => d.name === 'httpx')?.spdxLicense === 'BSD-3-Clause', 'RED: Expected nested .venv httpx license resolved');
    }
  );

  registry.given('"ToolchainHealthCheck.inspect" probes the native binaries for the stacks returned by "detectProjectStacks"', () => {
    assert(doctorStatus === 'pass', `RED: Expected pass, got ${doctorStatus}`);
    assert(probedBins.includes('dotnet') && probedBins.includes('java') && probedBins.includes('gradle') && probedBins.includes('python'), 'RED: Expected stack binaries probed');
  });

  registry.given('a repository state with "<condition>"', (condition: string) => {
    const dir = resetTmpDir();
    if (condition.includes('depth 3 and depth 4')) {
      const d3 = path.join(dir, 'a', 'b', 'c');
      const d4 = path.join(d3, 'd');
      fs.mkdirSync(d4, { recursive: true });
      fs.writeFileSync(path.join(d3, 'requirements.txt'), 'depth3-pkg==1.0.0\n', 'utf-8');
      fs.writeFileSync(path.join(d4, 'requirements.txt'), 'depth4-pkg==1.0.0\n', 'utf-8');
    } else if (condition.includes('node_modules')) {
      const nm = path.join(dir, 'node_modules', 'pkg');
      fs.mkdirSync(nm, { recursive: true });
      fs.writeFileSync(path.join(nm, 'requirements.txt'), 'ignored-nm==1.0.0\n', 'utf-8');
    }
  });

  registry.when('"<operation>" executes on the repository', async (operation: string) => {
    if (operation === 'scanWithNativeFs') {
      rawDeps = scanWithNativeFs(tmpDir);
    } else {
      const runner: IProcessRunner = {
        execSafe: async (bin) => {
          if (bin === 'pnpm') throw new Error('spawn pnpm ENOENT');
          return { exitCode: 0, stdout: '1.0.0\n', stderr: '' };
        },
      };
      const report = await new ToolchainHealthCheck(runner).inspect({ rootDir: tmpDir });
      doctorFindingIds = report.findings.map((f) => f.id);
    }
  });

  registry.then('the outcome satisfies "<expected_behavior>"', (expected: string) => {
    if (expected.includes('depth 3')) {
      assert(rawDeps.some((d) => d.name === 'depth3-pkg'), 'RED: Expected depth3-pkg');
      assert(!rawDeps.some((d) => d.name === 'depth4-pkg'), 'RED: Expected depth4-pkg skipped');
    } else if (expected.includes('artifact directory')) {
      assert(!rawDeps.some((d) => d.name === 'ignored-nm'), 'RED: Expected artifact dir skipped');
    } else if (expected.includes('ERR_TOOLCHAIN_PNPM_MISSING')) {
      assert(!doctorFindingIds.includes('ERR_TOOLCHAIN_PNPM_MISSING'), 'RED: Expected pnpm not flagged');
    }
  });

  registry.given('a repository with a malformed manifest or a detected stack whose native binary is missing from PATH', () => {
    const dir = resetTmpDir();
    fs.writeFileSync(path.join(dir, 'packages.lock.json'), '{bad-json', 'utf-8');
    fs.writeFileSync(path.join(dir, 'go.mod'), 'module example.com/bad\n', 'utf-8');
  });

  registry.when('"scanWithNativeFs" and "ToolchainHealthCheck.inspect" run', async () => {
    scanThrew = false;
    try {
      rawDeps = scanWithNativeFs(tmpDir);
    } catch {
      scanThrew = true;
    }
    const runner: IProcessRunner = {
      execSafe: async (bin) => {
        if (bin === 'go') throw new Error('spawn go ENOENT');
        return { exitCode: 0, stdout: '1.0.0\n', stderr: '' };
      },
    };
    const report = await new ToolchainHealthCheck(runner).inspect({ rootDir: tmpDir });
    doctorStatus = report.status;
    doctorFindingIds = report.findings.map((f) => f.id);
    doctorFindingsHaveRemediation = report.findings.every((f) => Boolean(f.remediation));
  });

  registry.then('"scanWithNativeFs" completes without throwing on malformed manifests', () => {
    assert(!scanThrew, 'RED: Expected no throw on malformed manifest');
  });

  registry.given('"ToolchainHealthCheck.inspect" reports a structured "fail" finding with remediation for the missing binary', () => {
    assert(doctorStatus === 'fail', `RED: Expected fail, got ${doctorStatus}`);
    assert(doctorFindingIds.includes('ERR_TOOLCHAIN_GO_MISSING'), 'RED: Expected ERR_TOOLCHAIN_GO_MISSING');
    assert(doctorFindingsHaveRemediation, 'RED: Expected remediation');
  });

  registry.given('a repository containing a symlinked directory pointing outside rootDir and detected native stacks', () => {
    const dir = resetTmpDir();
    outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdd-chg079-outside-'));
    fs.writeFileSync(path.join(outsideDir, 'requirements.txt'), 'escaped-pkg==1.0.0\n', 'utf-8');
    fs.symlinkSync(outsideDir, path.join(dir, 'ext-link'), process.platform === 'win32' ? 'junction' : 'dir');
    fs.writeFileSync(path.join(dir, 'go.mod'), 'module example.com/sec\n', 'utf-8');
  });

  registry.when('"scanWithNativeFs" traverses the directory tree and "ToolchainHealthCheck.inspect" probes stack binaries via "SafeProcessRunnerAdapter"', async () => {
    rawDeps = scanWithNativeFs(tmpDir);
    probedBins = [];
    const runner: IProcessRunner = {
      execSafe: async (bin) => {
        probedBins.push(bin);
        return { exitCode: 0, stdout: '1.0.0\n', stderr: '' };
      },
    };
    await new ToolchainHealthCheck(runner).inspect({ rootDir: tmpDir });
  });

  registry.then('symlinks are skipped without escaping rootDir or entering infinite loops', () => {
    assert(!rawDeps.some((d) => d.name === 'escaped-pkg'), 'RED: Expected symlinked outside dir skipped');
  });

  registry.given('only allowlisted stack executables are invoked with "shell: false" and sanitized environment', () => {
    assert(probedBins.includes('go'), 'RED: Expected go probed via allowlisted runner');
  });
}
