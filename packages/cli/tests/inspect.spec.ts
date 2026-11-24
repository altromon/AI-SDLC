import * as path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { runInspect } from '../src/commands/inspect.js';
import { parseSearchTypes, runSearch } from '../src/commands/search.js';

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

  it('parseSearchTypes & runSearch should execute semantic search in text and JSON formats', () => {
    expect(parseSearchTypes(undefined)).toBeUndefined();
    expect(parseSearchTypes('FR-, UC-')).toEqual(['FR-', 'UC-']);
    expect(parseSearchTypes(['FR-', 'CMP-'])).toEqual(['FR-', 'CMP-']);
    expect(parseSearchTypes(' , ')).toBeUndefined();

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      expect(runSearch('resolucion de licencias maven purl sbom', { root: rootDir, limit: 3 })).toBe(true);
      expect(String(consoleSpy.mock.calls.at(-1)?.[0])).toContain('Búsqueda Semántica de Especificaciones');

      consoleSpy.mockClear();
      expect(
        runSearch('reasoning effort trailer dashboard', {
          root: rootDir,
          limit: '2',
          minScore: '0.15',
          type: 'FR-,UC-',
          json: true,
        })
      ).toBe(true);
      const parsed = JSON.parse(String(consoleSpy.mock.calls.at(-1)?.[0]));
      expect(parsed.matches.length).toBeGreaterThan(0);
      expect(parsed.matches[0].id).toContain('064');
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
