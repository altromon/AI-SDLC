/**
 * Cites: FR-046-NATIVE-SDK-CLI-AST-001, FR-031-WORKFLOW-AGENT-HANDOFF-001
 * Tag: @FR-046-NATIVE-SDK-CLI-AST-001 @FR-031-WORKFLOW-AGENT-HANDOFF-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const onMock = vi.fn();
const spawnMock = vi.fn(() => ({ on: onMock, unref: vi.fn() }));

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    spawn: spawnMock,
  };
});

describe('CLI report openInBrowser & sdd printIntegrationSuccess paths', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-cli-inc25-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('runReportDashboard with open: true invokes openInBrowser via spawn', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const { runReportDashboard } = await import('../src/commands/report.js');
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'a.ts'), 'export const x = 1;\n', 'utf-8');

    const ok = runReportDashboard({ root: tmpDir, open: true });
    expect(ok).toBe(true);
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(onMock).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('openInBrowser attaches error listener and handles spawn errors gracefully without throwing', async () => {
    const { openInBrowser } = await import('../src/commands/report.js');
    const targetFile = path.join(tmpDir, 'dash.html');

    openInBrowser(targetFile);
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const errorHandler = onMock.mock.calls.find((c) => c[0] === 'error')?.[1] as (() => void) | undefined;
    expect(errorHandler).toBeDefined();
    errorHandler!();

    spawnMock.mockImplementationOnce(() => {
      throw new Error('ENOENT');
    });
    openInBrowser(targetFile);
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it('runSddIntegrate prints integration success in text mode for a valid completed change', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { runSddIntegrate } = await import('../src/commands/sdd.js');

    const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001-ok');
    fs.mkdirSync(chgDir, { recursive: true });
    fs.writeFileSync(
      path.join(chgDir, 'handoff.yaml'),
      'id: HOF-001\nchangeId: chg-001-ok\nsubgraph:\n  requirements: [FR-1]\n  components: [CMP-1]\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(chgDir, 'tasks.md'),
      '---\ntasks:\n  - id: TSK-1\n    title: Done\n    status: completed\n---\n- [x] TSK-1: Done\n',
      'utf-8'
    );

    const ok = runSddIntegrate({ root: tmpDir, change: 'chg-001-ok', silent: false });
    expect(ok).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Integrated'));
  });
});
