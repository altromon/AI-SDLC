import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  inspectElement,
  formatInspectResultMarkdown,
  tokenizeSemanticQuery,
} from '../src/inspector/index.js';

describe('AI-SDLC Element Inspector Suite', () => {
  const rootDir = path.resolve(__dirname, '../../..');

  it('should inspect a functional requirement (FR-*) by ID', async () => {
    // We inspect a known requirement, e.g. FR-047-MCP-SERVER-HARDENING-DLP-001 or any existing FR
    const result = await inspectElement('FR-047-MCP-SERVER-HARDENING-DLP-001', { rootDir });

    expect(result.found).toBe(true);
    expect(result.id).toBe('FR-047-MCP-SERVER-HARDENING-DLP-001');
    expect(result.layer).toBe('requirement');
    expect(result.summary).toBeTruthy();
    expect(result.relatedItems.length).toBeGreaterThan(0);

    // Verify upstream & downstream are populated
    const hasUpstreamOrDownstream = result.upstream.length > 0 || result.downstream.length > 0;
    expect(hasUpstreamOrDownstream).toBe(true);

    // Formatter check
    const md = formatInspectResultMarkdown(result);
    expect(md).toContain('FR-047-MCP-SERVER-HARDENING-DLP-001');
    expect(md).toContain('Relaciones');
  });

  it('should inspect a component (CMP-*) by ID', async () => {
    const result = await inspectElement('CMP-CORE', { rootDir });

    expect(result.found).toBe(true);
    expect(result.id).toBe('CMP-CORE');
    expect(result.type).toBe('component');
    expect(result.layer).toBe('architecture');
    expect(result.relatedItems.length).toBeGreaterThan(0);
  });

  it('should inspect a source code file by relative path', async () => {
    const result = await inspectElement('packages/mcp/src/tools/index.ts', { rootDir });

    expect(result.found).toBe(true);
    expect(result.layer).toBe('code');
    expect(result.filePath).toContain('packages/mcp/src/tools/index.ts');
    expect(result.summary).toBeTruthy();
    // It cites FR-028 and FR-047 in lines 5-6!
    expect(result.upstream.length).toBeGreaterThan(0);
    const hasFr = result.upstream.some((r) => r.id.includes('FR-028') || r.id.includes('FR-047'));
    expect(hasFr).toBe(true);
  });

  it('should inspect a task (TSK-*) by ID', async () => {
    const result = await inspectElement('TSK-001', { rootDir });

    expect(result.found).toBe(true);
    expect(result.type).toBe('task');
    expect(result.relatedItems.length).toBeGreaterThan(0);
  });

  it('should tokenize camelCase and multi-word semantic queries while stripping stop words', () => {
    expect(tokenizeSemanticQuery('sanitizeDlpText in the workspace')).toEqual([
      'sanitize',
      'dlp',
      'text',
      'in',
      'workspace',
    ]);
    expect(tokenizeSemanticQuery('')).toEqual([]);
  });

  it('should resolve a source file by exported AST symbol name (semantic symbol search)', async () => {
    const result = await inspectElement('sanitizeDlpText', { rootDir });

    expect(result.found).toBe(true);
    expect(result.type).toBe('source-file');
    expect(result.filePath).toContain('dlp-sanitizer.ts');
    expect(result.semanticMatches).toBeDefined();
    expect(result.semanticMatches!.length).toBeGreaterThan(0);
    expect(result.semanticMatches![0].matchedSymbols).toContain('sanitizeDlpText');

    const md = formatInspectResultMarkdown(result);
    expect(md).toContain('dlp-sanitizer.ts');
  });

  it('should resolve multi-token natural-language semantic queries across AST symbols and PDaC graph', async () => {
    const result = await inspectElement('dlp sanitizer policy', { rootDir });

    expect(result.found).toBe(true);
    expect(result.semanticMatches).toBeDefined();
    expect(result.semanticMatches!.length).toBeGreaterThan(1);

    const md = formatInspectResultMarkdown(result);
    expect(md).toContain('Ranking Semántico y de Símbolos');
  });

  it('should return found: false with suggestions when an unknown element is queried', async () => {
    const result = await inspectElement('NON-EXISTENT-XYZ-12345', { rootDir });

    expect(result.found).toBe(false);
    expect(result.summary).toContain('No se encontró');
  });
});
