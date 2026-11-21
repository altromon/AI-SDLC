import { afterEach, describe, expect, it, vi } from 'vitest';

const startMcpServerMock = vi.fn();

vi.mock('@aisdlc/mcp', () => ({
  startMcpServer: startMcpServerMock,
}));

describe('CLI runMcpServer (Happy / Sad / Boundary)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('starts MCP server with explicit root and role and logs banner when not silent (happy)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    startMcpServerMock.mockResolvedValueOnce(undefined);

    const { runMcpServer } = await import('../src/commands/mcp.js');
    await runMcpServer({ root: '/tmp/ws', role: 'agent-developer', silent: false });

    expect(startMcpServerMock).toHaveBeenCalledWith({ rootDir: '/tmp/ws', role: 'agent-developer' });
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Starting native Model Context Protocol'));
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('agent-developer'));
  });

  it('uses process.cwd() default and suppresses logs when silent is true (boundary)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    startMcpServerMock.mockResolvedValueOnce(undefined);

    const { runMcpServer } = await import('../src/commands/mcp.js');
    await runMcpServer({ silent: true });

    expect(startMcpServerMock).toHaveBeenCalledWith({ rootDir: process.cwd(), role: undefined });
    expect(errSpy).not.toHaveBeenCalled();
  });

  it('logs empty role spacer when role is omitted and propagates server startup errors (happy/sad)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    startMcpServerMock.mockRejectedValueOnce(new Error('stdio transport closed'));

    const { runMcpServer } = await import('../src/commands/mcp.js');
    await expect(runMcpServer()).rejects.toThrow('stdio transport closed');

    expect(startMcpServerMock).toHaveBeenCalledWith({ rootDir: process.cwd(), role: undefined });
    expect(errSpy).toHaveBeenCalledWith('');
  });
});
