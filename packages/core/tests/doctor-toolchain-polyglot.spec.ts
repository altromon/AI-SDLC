// Traceability: FR-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS-001, UC-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS, CMP-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS, CHG-079-SCA-RECURSIVE-DOCTOR-TOOLCHAINS (TSK-002, TSK-003)
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  addMarkerTools,
  buildRequiredTools,
  collectBuildMarkers,
  probePythonToolchain,
  ToolchainHealthCheck,
} from '../src/doctor/toolchain-check.js';
import { SafeProcessRunnerAdapter } from '../src/doctor/process-runner.js';
import type { IProcessRunner, SafeProbeExecutable } from '../src/types/doctor.js';

describe('CHG-079 TSK-002: Stack-Aware ToolchainHealthCheck', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not require or probe pnpm when pnpm-lock.yaml is absent from rootDir (boundary)', async () => {
    const rootDir = makeTmpDir('aisdlc-doc-nopnpm-');
    const probed: string[] = [];
    const runner: IProcessRunner = {
      execSafe: async (bin) => {
        probed.push(bin);
        if (bin === 'pnpm') throw new Error('spawn pnpm ENOENT');
        return { exitCode: 0, stdout: '1.0.0\n', stderr: '' };
      },
    };

    const report = await new ToolchainHealthCheck(runner).inspect({ rootDir });
    expect(report.status).toBe('pass');
    expect(report.findings).toEqual([]);
    expect(probed).toContain('node');
    expect(probed).toContain('git');
    expect(probed).not.toContain('pnpm');
  });

  it('requires pnpm and emits ERR_TOOLCHAIN_PNPM_MISSING when pnpm-lock.yaml exists in rootDir', async () => {
    const rootDir = makeTmpDir('aisdlc-doc-pnpm-');
    fs.writeFileSync(path.join(rootDir, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n', 'utf-8');

    const runner: IProcessRunner = {
      execSafe: async (bin) => {
        if (bin === 'pnpm') throw new Error('spawn pnpm ENOENT');
        return { exitCode: 0, stdout: '1.0.0\n', stderr: '' };
      },
    };

    const report = await new ToolchainHealthCheck(runner).inspect({ rootDir });
    expect(report.status).toBe('fail');
    expect(report.findings.some((f) => f.id === 'ERR_TOOLCHAIN_PNPM_MISSING')).toBe(true);
  });

  it('probes native binaries for detected polyglot stacks (dotnet, go, cargo, java stderr, mvn, gradle, cmake, clang-tidy) up to depth 3', async () => {
    const rootDir = makeTmpDir('aisdlc-doc-polyglot-');
    fs.mkdirSync(path.join(rootDir, 'apps', 'net'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'apps', 'go'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'apps', 'rs'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'apps', 'jvm', 'sub'), { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'apps', 'cpp', 'sub'), { recursive: true });

    fs.writeFileSync(path.join(rootDir, 'apps', 'net', 'App.csproj'), '<Project/>', 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'apps', 'go', 'go.mod'), 'module example.com/app\n', 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'apps', 'rs', 'Cargo.toml'), '[package]\nname="app"\n', 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'apps', 'jvm', 'sub', 'pom.xml'), '<project/>', 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'apps', 'jvm', 'sub', 'build.gradle.kts'), 'plugins {}', 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'apps', 'cpp', 'sub', 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.20)', 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'apps', 'cpp', 'sub', '.clang-tidy'), 'Checks: "*"\n', 'utf-8');

    const probed: SafeProbeExecutable[] = [];
    const runner: IProcessRunner = {
      execSafe: async (bin) => {
        probed.push(bin);
        if (bin === 'java') {
          // java -version writes to stderr, stdout is empty
          return { exitCode: 0, stdout: '', stderr: 'openjdk version "21.0.3" 2024-04-16\n' };
        }
        return { exitCode: 0, stdout: '1.0.0\n', stderr: '' };
      },
    };

    const report = await new ToolchainHealthCheck(runner).inspect({ rootDir });
    expect(report.status).toBe('pass');
    expect(report.findings).toEqual([]);
    for (const expected of ['node', 'git', 'dotnet', 'go', 'cargo', 'java', 'mvn', 'gradle', 'cmake', 'clang-tidy'] as const) {
      expect(probed).toContain(expected);
    }
  });

  it('probes python first and falls back sequentially to python3 only when python fails', async () => {
    const rootDir = makeTmpDir('aisdlc-doc-py-fallback-');
    fs.writeFileSync(path.join(rootDir, 'requirements.txt'), 'requests==2.31.0\n', 'utf-8');

    // Case 1: python succeeds -> python3 is NOT probed
    const probed1: string[] = [];
    const runnerPyOk: IProcessRunner = {
      execSafe: async (bin) => {
        probed1.push(bin);
        return { exitCode: 0, stdout: 'Python 3.12.1\n', stderr: '' };
      },
    };
    const r1 = await new ToolchainHealthCheck(runnerPyOk).inspect({ rootDir });
    expect(r1.status).toBe('pass');
    expect(probed1).toContain('python');
    expect(probed1).not.toContain('python3');

    // Case 2: python missing -> falls back to python3 and passes
    const probed2: string[] = [];
    const runnerPy3Ok: IProcessRunner = {
      execSafe: async (bin) => {
        probed2.push(bin);
        if (bin === 'python') throw new Error('spawn python ENOENT');
        return { exitCode: 0, stdout: 'Python 3.11.8\n', stderr: '' };
      },
    };
    const r2 = await new ToolchainHealthCheck(runnerPy3Ok).inspect({ rootDir });
    expect(r2.status).toBe('pass');
    expect(probed2).toContain('python');
    expect(probed2).toContain('python3');

    // Case 3: both python and python3 missing -> ERR_TOOLCHAIN_PYTHON_MISSING
    const runnerBothFail: IProcessRunner = {
      execSafe: async (bin) => {
        if (bin === 'python' || bin === 'python3') throw new Error(`spawn ${bin} ENOENT`);
        return { exitCode: 0, stdout: '1.0.0\n', stderr: '' };
      },
    };
    const r3 = await new ToolchainHealthCheck(runnerBothFail).inspect({ rootDir });
    expect(r3.status).toBe('fail');
    expect(r3.findings.some((f) => f.id === 'ERR_TOOLCHAIN_PYTHON_MISSING' && Boolean(f.remediation))).toBe(true);
  });

  it('ignores stack manifests at depth 4 (boundary) and reports structured fail finding for missing detected binary (sad)', async () => {
    const rootDir = makeTmpDir('aisdlc-doc-depth4-');
    const depth4 = path.join(rootDir, 'a', 'b', 'c', 'd');
    fs.mkdirSync(depth4, { recursive: true });
    fs.writeFileSync(path.join(depth4, 'Cargo.toml'), '[package]\nname="too-deep"\n', 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'go.mod'), 'module example.com/ok\n', 'utf-8');

    const probed: string[] = [];
    const runner: IProcessRunner = {
      execSafe: async (bin) => {
        probed.push(bin);
        if (bin === 'go') throw new Error('spawn go ENOENT');
        return { exitCode: 0, stdout: '1.0.0\n', stderr: '' };
      },
    };

    const report = await new ToolchainHealthCheck(runner).inspect({ rootDir });
    expect(probed).not.toContain('cargo');
    expect(report.status).toBe('fail');
    const goFinding = report.findings.find((f) => f.id === 'ERR_TOOLCHAIN_GO_MISSING');
    expect(goFinding).toBeDefined();
    expect(goFinding?.status).toBe('fail');
    expect(goFinding?.remediation).toBeTruthy();
  });

  it('collectBuildMarkers, addMarkerTools, buildRequiredTools, and probePythonToolchain work as unit helpers', async () => {
    const rootDir = makeTmpDir('aisdlc-doc-helpers-');
    fs.writeFileSync(path.join(rootDir, 'pom.xml'), '<project/>', 'utf-8');
    const markers = collectBuildMarkers(rootDir, 3);
    expect(markers.has('pom.xml')).toBe(true);

    const tools = buildRequiredTools(rootDir, ['java'], markers);
    const map = new Map(tools.map((t) => [t.name, t]));
    addMarkerTools(map, ['java'], markers);
    expect(map.has('mvn')).toBe(true);

    const runner: IProcessRunner = { execSafe: async () => ({ exitCode: 0, stdout: 'Python 3.12', stderr: '' }) };
    expect(await probePythonToolchain(runner, rootDir)).toBeNull();
  });

  it('SafeProcessRunnerAdapter handles >1024 byte stdout without ERR_CHILD_PROCESS_STDOUT_MAXBUFFER and truncates to maxBytes', async () => {
    const runner = new SafeProcessRunnerAdapter();
    const res = await runner.execSafe('node', ['-e', 'process.stdout.write("x".repeat(2048))']);
    expect(res.exitCode).toBe(0);
    expect(res.stdout.length).toBe(1024);
  });
});
