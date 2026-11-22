/**
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001
 * Tag: @FR-028-NATIVE-MCP-SERVER-001 @FR-047-MCP-SERVER-HARDENING-DLP-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runInspect } from '../src/commands/inspect.js';
import { parseSearchTypes, runSearch } from '../src/commands/search.js';

describe('@aisdlc/cli inspect command suite', () => {
  const rootDir = path.resolve(__dirname, '../../..');
  const origFormat = process.env.AISDLC_FORMAT;
  const origOutput = process.env.AISDLC_OUTPUT;

  afterEach(() => {
    if (origFormat !== undefined) process.env.AISDLC_FORMAT = origFormat;
    else delete process.env.AISDLC_FORMAT;
    if (origOutput !== undefined) process.env.AISDLC_OUTPUT = origOutput;
    else delete process.env.AISDLC_OUTPUT;
    vi.restoreAllMocks();
  });

  it('should inspect an existing FR element and return true', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const success = runInspect('FR-047-MCP-SERVER-HARDENING-DLP-001', { root: rootDir });
    expect(success).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(output).toContain('FR-047-MCP-SERVER-HARDENING-DLP-001');
    expect(output).toContain('Relaciones');
  });

  it('should emit structured JSON when json option is true', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const success = runInspect('CMP-CORE', { root: rootDir, json: true });
    expect(success).toBe(true);
    const output = consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    const parsed = JSON.parse(output);
    expect(parsed.found).toBe(true);
    expect(parsed.id).toBe('CMP-CORE');
    expect(parsed.relatedItems.length).toBeGreaterThan(0);
  });

  it('should return false when element does not exist', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const success = runInspect('NON_EXISTENT_ID_999999', { root: rootDir });
    expect(success).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Elemento no encontrado'));
  });

  it('should return false and emit not-found result for empty or whitespace queries even when workspace has graph nodes', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-inspect-empty-'));
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      fs.mkdirSync(path.join(tmpDir, 'product'), { recursive: true });
      fs.writeFileSync(
        path.join(tmpDir, 'product', 'FR-001.md'),
        '---\nid: FR-001\ntitle: Sample Requirement\n---\n# Sample\n',
        'utf-8'
      );

      expect(runInspect('', { root: tmpDir, json: true })).toBe(false);
      const emptyPayload = JSON.parse(String(consoleSpy.mock.calls.at(-1)?.[0]));
      expect(emptyPayload.found).toBe(false);
      expect(emptyPayload.query).toBe('');

      consoleSpy.mockClear();
      expect(runInspect('   ', { root: tmpDir })).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Elemento no encontrado'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
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

  it('should respect --format json, AISDLC_FORMAT, and AISDLC_OUTPUT env vars with explicit format precedence', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(runInspect('CMP-CORE', { root: rootDir, format: ' JSON ' })).toBe(true);
    expect(JSON.parse(String(consoleSpy.mock.calls.at(-1)?.[0])).id).toBe('CMP-CORE');

    consoleSpy.mockClear();
    process.env.AISDLC_FORMAT = 'json';
    expect(runInspect('CMP-CORE', { root: rootDir })).toBe(true);
    expect(JSON.parse(String(consoleSpy.mock.calls.at(-1)?.[0])).found).toBe(true);

    consoleSpy.mockClear();
    expect(runInspect('CMP-CORE', { root: rootDir, format: 'text' })).toBe(true);
    expect(String(consoleSpy.mock.calls.at(-1)?.[0])).toContain('CMP-CORE');
    expect(() => JSON.parse(String(consoleSpy.mock.calls.at(-1)?.[0]))).toThrow();

    delete process.env.AISDLC_FORMAT;
    process.env.AISDLC_OUTPUT = 'json';
    consoleSpy.mockClear();
    expect(runInspect('CMP-CORE', { root: rootDir })).toBe(true);
    expect(JSON.parse(String(consoleSpy.mock.calls.at(-1)?.[0])).id).toBe('CMP-CORE');
  });
});
