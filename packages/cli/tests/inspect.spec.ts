import * as path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { runInspect } from '../src/commands/inspect.js';

describe('@aisdlc/cli inspect command suite', () => {
  const rootDir = path.resolve(__dirname, '../../..');

  it('should inspect an existing FR element and return true', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const success = runInspect('FR-047-MCP-SERVER-HARDENING-DLP-001', { root: rootDir });
      expect(success).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      expect(output).toContain('FR-047-MCP-SERVER-HARDENING-DLP-001');
      expect(output).toContain('Relaciones');
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('should emit structured JSON when json option is true', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const success = runInspect('CMP-CORE', { root: rootDir, json: true });
      expect(success).toBe(true);
      const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
      const parsed = JSON.parse(output);
      expect(parsed.found).toBe(true);
      expect(parsed.id).toBe('CMP-CORE');
      expect(parsed.relatedItems.length).toBeGreaterThan(0);
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it('should return false when element does not exist', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const success = runInspect('NON_EXISTENT_ID_999999', { root: rootDir });
      expect(success).toBe(false);
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
