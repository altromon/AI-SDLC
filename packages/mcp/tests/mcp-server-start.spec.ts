// Cites: FR-028-NATIVE-MCP-SERVER-001
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const connectMock = vi.fn();

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    tool: vi.fn(),
    resource: vi.fn(),
    connect: connectMock,
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({ kind: 'stdio' })),
}));

describe('MCP startMcpServer (Happy / Sad)', () => {
  beforeAll(async () => {
    await import('../src/server.js');
  }, 15_000);

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('connects McpServer to StdioServerTransport (happy)', async () => {
    connectMock.mockResolvedValueOnce(undefined);
    const { startMcpServer } = await import('../src/server.js');
    await expect(startMcpServer({ rootDir: process.cwd() })).resolves.toBeUndefined();
    expect(connectMock).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('propagates transport connection errors (sad)', async () => {
    connectMock.mockRejectedValueOnce(new Error('transport failed'));
    const { startMcpServer } = await import('../src/server.js');
    await expect(startMcpServer()).rejects.toThrow('transport failed');
  }, 15_000);
});
