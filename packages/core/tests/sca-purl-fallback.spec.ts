import { afterEach, describe, expect, it, vi } from 'vitest';
import * as child_process from 'child_process';
import { scanWithSyft, scanWithTrivy } from '../src/verifiers/sca/scanner.js';

vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
  spawnSync: vi.fn(),
}));

describe('CHG-054 TSK-004: Trivy & Syft PURL fallback without changing CLI argv', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('uses buildPurl for Trivy packages lacking Identifier.PURL and preserves spawnSync argv', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(child_process.execFileSync).mockReturnValue(Buffer.from(''));
    vi.mocked(child_process.spawnSync).mockReturnValue({
      status: 0,
      stdout: JSON.stringify({
        Results: [
          {
            Target: 'go.mod',
            Type: 'gomod',
            Packages: [{ Name: 'github.com/gin-gonic/gin', Version: '1.9.1', Licenses: ['MIT'] }],
          },
          {
            Target: 'requirements.txt',
            Type: 'python-pkg',
            Packages: [{ Name: 'Requests', Version: '2.31.0', Licenses: ['Apache-2.0'] }],
          },
          {
            Target: 'custom.lock',
            Type: 'unknown-type',
            Packages: [{ Name: 'mystery-pkg', Version: '0.1.0', Licenses: ['MIT'] }],
          },
        ],
      }),
      stderr: '',
      pid: 1,
      output: [],
      signal: null,
    });

    const result = scanWithTrivy('/tmp/repo');

    expect(result.executed).toBe(true);
    expect(child_process.spawnSync).toHaveBeenCalledWith(
      'trivy',
      ['fs', '--format', 'json', '--security-checks', 'vuln,license', '/tmp/repo'],
      expect.objectContaining({ encoding: 'utf-8' })
    );

    const goDep = result.dependencies.find((d) => d.name === 'github.com/gin-gonic/gin');
    const pyDep = result.dependencies.find((d) => d.name === 'Requests');
    const unknownDep = result.dependencies.find((d) => d.name === 'mystery-pkg');

    expect(goDep?.purl).toMatch(/^pkg:golang\//);
    expect(pyDep?.purl).toBe('pkg:pypi/requests@2.31.0');
    expect(unknownDep?.purl).toBe('pkg:generic/mystery-pkg@0.1.0');
    expect(result.dependencies.some((d) => d.purl?.startsWith('pkg:npm/'))).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('uses buildPurl for Syft artifacts lacking purl and preserves spawnSync argv', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(child_process.execFileSync).mockReturnValue(Buffer.from(''));
    vi.mocked(child_process.spawnSync).mockReturnValue({
      status: 0,
      stdout: JSON.stringify({
        artifacts: [
          {
            name: 'github.com/gin-gonic/gin',
            version: '1.9.1',
            type: 'go-module',
            licenses: [{ value: 'MIT' }],
          },
          {
            name: 'Requests',
            version: '2.31.0',
            type: 'python',
            licenses: [{ value: 'Apache-2.0' }],
          },
          {
            name: 'mystery-pkg',
            version: '0.1.0',
            type: 'unknown-type',
            licenses: [{ value: 'MIT' }],
          },
        ],
      }),
      stderr: '',
      pid: 1,
      output: [],
      signal: null,
    });

    const result = scanWithSyft('/tmp/repo');

    expect(result.executed).toBe(true);
    expect(child_process.spawnSync).toHaveBeenCalledWith(
      'syft',
      ['dir:/tmp/repo', '-o', 'json'],
      expect.objectContaining({ encoding: 'utf-8' })
    );

    const goDep = result.dependencies.find((d) => d.name === 'github.com/gin-gonic/gin');
    const pyDep = result.dependencies.find((d) => d.name === 'Requests');
    const unknownDep = result.dependencies.find((d) => d.name === 'mystery-pkg');

    expect(goDep?.purl).toMatch(/^pkg:golang\//);
    expect(pyDep?.purl).toBe('pkg:pypi/requests@2.31.0');
    expect(unknownDep?.purl).toBe('pkg:generic/mystery-pkg@0.1.0');
    expect(result.dependencies.some((d) => d.purl?.startsWith('pkg:npm/'))).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });
});
