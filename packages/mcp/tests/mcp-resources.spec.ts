/**
 * Unit & Integration Tests for AI-SDLC MCP Server Resources
 * Cites: FR-028-NATIVE-MCP-SERVER-001, FR-047-MCP-SERVER-HARDENING-DLP-001, FR-050-IDE-AGENT-TOOLS-MCP-001
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  getActiveChanges,
  getCompletedChanges,
  registerAllResources,
  registerChangeResources,
  registerPolicyResources,
  registerSinglePolicyResource,
  registerStatusResources,
} from '../src/resources/index.js';

type ResourceHandler = () => Promise<{ contents: Array<{ uri: string; mimeType?: string; text: string }> }>;

function createResourceSpyServer() {
  const resources = new Map<string, { name: string; uri: string; handler: ResourceHandler }>();
  const spy = {
    resource(name: string, uri: string, handler: ResourceHandler) {
      resources.set(uri, { name, uri, handler });
    },
  };
  return { server: spy as unknown as McpServer, resources };
}

describe('MCP Server Resources Unit Tests', () => {
  let tmpDir: string;
  const closers: Array<() => Promise<void>> = [];

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-mcp-res-'));
  });

  afterEach(async () => {
    for (const close of closers.splice(0)) {
      await close();
    }
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });

  describe('registerSinglePolicyResource', () => {
    it('reads existing policy YAML with UTF-8 content and text/yaml mimeType (happy)', async () => {
      const { server, resources } = createResourceSpyServer();
      const yamlContent = 'version: "1.0"\n# Política de calidad — café\nenforcement_mode: STRICT\n';
      fs.writeFileSync(path.join(tmpDir, 'quality-policy.yaml'), yamlContent, 'utf-8');

      registerSinglePolicyResource(server, tmpDir, 'quality-policy', 'aisdlc://policies/quality', 'quality-policy.yaml');
      const entry = resources.get('aisdlc://policies/quality');
      expect(entry).toBeDefined();
      expect(entry!.name).toBe('quality-policy');

      const res = await entry!.handler();
      expect(res.contents).toEqual([
        { uri: 'aisdlc://policies/quality', mimeType: 'text/yaml', text: yamlContent },
      ]);
    });

    it('returns fallback comment when policy file does not exist (sad)', async () => {
      const { server, resources } = createResourceSpyServer();
      registerSinglePolicyResource(server, tmpDir, 'missing-policy', 'aisdlc://policies/missing', 'missing.yaml');

      const res = await resources.get('aisdlc://policies/missing')!.handler();
      expect(res.contents[0].text).toBe('# missing.yaml not found at project root');
      expect(res.contents[0].mimeType).toBe('text/yaml');
    });

    it('handles empty 0-byte policy file (boundary)', async () => {
      const { server, resources } = createResourceSpyServer();
      fs.writeFileSync(path.join(tmpDir, 'empty.yaml'), '', 'utf-8');
      registerSinglePolicyResource(server, tmpDir, 'empty-policy', 'aisdlc://policies/empty', 'empty.yaml');

      const res = await resources.get('aisdlc://policies/empty')!.handler();
      expect(res.contents[0].text).toBe('');
    });

    it('rejects path traversal filename and avoids EISDIR crash when policy path is a directory (malformed/bugfix)', async () => {
      const { server, resources } = createResourceSpyServer();
      expect(() =>
        registerSinglePolicyResource(server, tmpDir, 'evil', 'aisdlc://policies/evil', '../../etc/passwd')
      ).toThrow(/Security violation: filename .* escapes workspace root/);

      fs.mkdirSync(path.join(tmpDir, 'dir-policy.yaml'));
      registerSinglePolicyResource(server, tmpDir, 'dir-policy', 'aisdlc://policies/dir', 'dir-policy.yaml');
      const res = await resources.get('aisdlc://policies/dir')!.handler();
      expect(res.contents[0].text).toBe('# dir-policy.yaml not found at project root');
    });
  });

  describe('registerPolicyResources', () => {
    it('registers all 3 canonical policy URIs and handles missing/directory policies safely', async () => {
      const { server, resources } = createResourceSpyServer();
      fs.writeFileSync(path.join(tmpDir, 'quality-policy.yaml'), 'version: "1.0"\n', 'utf-8');
      fs.mkdirSync(path.join(tmpDir, 'license-policy.yaml'));

      registerPolicyResources(server, tmpDir);
      expect([...resources.keys()]).toEqual([
        'aisdlc://policies/quality',
        'aisdlc://policies/licenses',
        'aisdlc://policies/privacy',
      ]);

      const qual = await resources.get('aisdlc://policies/quality')!.handler();
      const lic = await resources.get('aisdlc://policies/licenses')!.handler();
      const priv = await resources.get('aisdlc://policies/privacy')!.handler();
      expect(qual.contents[0].text).toBe('version: "1.0"\n');
      expect(lic.contents[0].text).toBe('# license-policy.yaml not found at project root');
      expect(priv.contents[0].text).toBe('# privacy-policy.yaml not found at project root');
    });
  });

  describe('getActiveChanges', () => {
    it('returns deterministically sorted active change entries with accurate hasHandoff/hasTasks flags (happy)', () => {
      const activeDir = path.join(tmpDir, 'specs', 'changes', 'active');
      fs.mkdirSync(path.join(activeDir, 'chg-020-zeta'), { recursive: true });
      fs.mkdirSync(path.join(activeDir, 'chg-001-alpha'), { recursive: true });
      fs.writeFileSync(path.join(activeDir, 'chg-001-alpha', 'handoff.yaml'), 'id: HOF-1\n');
      fs.writeFileSync(path.join(activeDir, 'chg-020-zeta', 'tasks.md'), '- [ ] Task\n');
      fs.writeFileSync(path.join(activeDir, 'stray-file.md'), 'ignore me');

      const result = getActiveChanges(activeDir);
      expect(result).toEqual([
        {
          changeId: 'chg-001-alpha',
          directory: path.join(activeDir, 'chg-001-alpha'),
          hasHandoff: true,
          hasTasks: false,
        },
        {
          changeId: 'chg-020-zeta',
          directory: path.join(activeDir, 'chg-020-zeta'),
          hasHandoff: false,
          hasTasks: true,
        },
      ]);
    });

    it('returns empty array for missing directory, empty directory, or regular file (sad/boundary/ENOTDIR bugfix)', () => {
      expect(getActiveChanges(path.join(tmpDir, 'nonexistent'))).toEqual([]);
      expect(getActiveChanges('')).toEqual([]);

      const emptyDir = path.join(tmpDir, 'empty-active');
      fs.mkdirSync(emptyDir);
      fs.writeFileSync(path.join(emptyDir, 'README.md'), 'only file');
      expect(getActiveChanges(emptyDir)).toEqual([]);

      const fileNotDir = path.join(tmpDir, 'active-as-file');
      fs.writeFileSync(fileNotDir, 'not a dir');
      expect(getActiveChanges(fileNotDir)).toEqual([]);
    });
  });

  describe('getCompletedChanges', () => {
    it('returns sorted directory names and ignores regular files (happy/boundary)', () => {
      const completedDir = path.join(tmpDir, 'specs', 'changes', 'completed');
      fs.mkdirSync(path.join(completedDir, 'chg-010-b'), { recursive: true });
      fs.mkdirSync(path.join(completedDir, 'chg-002-a'), { recursive: true });
      fs.writeFileSync(path.join(completedDir, 'README.md'), 'ignore');

      expect(getCompletedChanges(completedDir)).toEqual(['chg-002-a', 'chg-010-b']);
    });

    it('returns empty array when missing or when path is a regular file (sad/ENOTDIR bugfix)', () => {
      expect(getCompletedChanges(path.join(tmpDir, 'missing'))).toEqual([]);
      const fileNotDir = path.join(tmpDir, 'completed-file');
      fs.writeFileSync(fileNotDir, 'not a dir');
      expect(getCompletedChanges(fileNotDir)).toEqual([]);
    });
  });

  describe('registerChangeResources', () => {
    it('registers active and completed change JSON resources and handles missing/file dirs safely', async () => {
      const { server, resources } = createResourceSpyServer();
      fs.mkdirSync(path.join(tmpDir, 'specs', 'changes', 'active', 'chg-100'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'specs', 'changes', 'completed', 'chg-050'), { recursive: true });

      registerChangeResources(server, tmpDir);
      const activeRes = await resources.get('aisdlc://changes/active')!.handler();
      const completedRes = await resources.get('aisdlc://changes/completed')!.handler();

      expect(activeRes.contents[0].mimeType).toBe('application/json');
      expect(JSON.parse(activeRes.contents[0].text)).toHaveLength(1);
      expect(JSON.parse(completedRes.contents[0].text)).toEqual(['chg-050']);

      const emptyRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-empty-chg-'));
      try {
        const emptySpy = createResourceSpyServer();
        registerChangeResources(emptySpy.server, emptyRoot);
        const emptyActive = await emptySpy.resources.get('aisdlc://changes/active')!.handler();
        expect(JSON.parse(emptyActive.contents[0].text)).toEqual([]);
      } finally {
        fs.rmSync(emptyRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
    });

    it('returns "[]" safely when specs/changes/active or completed is a regular file (ENOTDIR)', async () => {
      const fileRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-enotdir-chg-'));
      try {
        const changesDir = path.join(fileRoot, 'specs', 'changes');
        fs.mkdirSync(changesDir, { recursive: true });
        fs.writeFileSync(path.join(changesDir, 'active'), 'not a directory', 'utf-8');
        fs.writeFileSync(path.join(changesDir, 'completed'), 'not a directory', 'utf-8');

        const spy = createResourceSpyServer();
        registerChangeResources(spy.server, fileRoot);
        const activeRes = await spy.resources.get('aisdlc://changes/active')!.handler();
        const completedRes = await spy.resources.get('aisdlc://changes/completed')!.handler();

        expect(activeRes.contents[0].text).toBe('[]');
        expect(completedRes.contents[0].text).toBe('[]');
      } finally {
        fs.rmSync(fileRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
    });
  });

  describe('registerStatusResources', () => {
    it('computes policy booleans, handoff counts, and survives malformed handoff.yaml', async () => {
      const { server, resources } = createResourceSpyServer();
      fs.writeFileSync(path.join(tmpDir, 'quality-policy.yaml'), 'version: "1.0"\n');
      const chgDir = path.join(tmpDir, 'specs', 'changes', 'active', 'chg-good');
      fs.mkdirSync(chgDir, { recursive: true });
      fs.writeFileSync(
        path.join(chgDir, 'handoff.yaml'),
        'id: HOF-GOOD\ntype: handoff\ntitle: Good\nchangeId: chg-good\nversion: "1.0.0"\ncreatedAt: "2026-01-01T00:00:00Z"\nsubgraph:\n  requirements: [FR-1]\n  useCases: [UC-1]\n'
      );

      registerStatusResources(server, tmpDir);
      const res = await resources.get('aisdlc://status/summary')!.handler();
      const summary = JSON.parse(res.contents[0].text);
      expect(summary.projectRoot).toBe(tmpDir);
      expect(summary.totalHandoffs).toBeGreaterThanOrEqual(1);
      expect(summary.qualityPolicyExists).toBe(true);
      expect(summary.licensePolicyExists).toBe(false);
      expect(summary.privacyPolicyExists).toBe(false);
      expect(Date.parse(summary.timestamp)).not.toBeNaN();

      // Malformed handoff YAML in an empty root should not crash status resource
      const badRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-bad-status-'));
      try {
        fs.mkdirSync(path.join(badRoot, 'specs', 'changes', 'active', 'chg-bad'), { recursive: true });
        fs.writeFileSync(path.join(badRoot, 'specs', 'changes', 'active', 'chg-bad', 'handoff.yaml'), ':::invalid: [unclosed');
        const badSpy = createResourceSpyServer();
        registerStatusResources(badSpy.server, badRoot);
        const badRes = await badSpy.resources.get('aisdlc://status/summary')!.handler();
        const badSummary = JSON.parse(badRes.contents[0].text);
        expect(badSummary.qualityPolicyExists).toBe(false);
        expect(typeof badSummary.totalHandoffs).toBe('number');
      } finally {
        fs.rmSync(badRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
      }
    });
  });

  describe('registerAllResources', () => {
    it('registers all 6 resources end-to-end over InMemoryTransport and normalizes relative rootDir', async () => {
      fs.writeFileSync(path.join(tmpDir, 'privacy-policy.yaml'), 'version: "1.0"\n');
      const relRoot = path.relative(process.cwd(), tmpDir);

      const server = new McpServer({ name: 'res-test', version: '1.0.0' });
      registerAllResources(server, { rootDir: relRoot });

      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      await server.connect(serverTransport);
      const client = new Client({ name: 'res-client', version: '1.0.0' }, { capabilities: {} });
      await client.connect(clientTransport);
      closers.push(async () => {
        await client.close();
        await server.close();
      });

      const list = await client.listResources();
      expect(list.resources.map((r) => r.uri)).toHaveLength(6);

      const statusRes = await client.readResource({ uri: 'aisdlc://status/summary' });
      const parsed = JSON.parse(String((statusRes.contents[0] as { text?: unknown })?.text ?? ''));
      expect(parsed.projectRoot).toBe(path.resolve(tmpDir));
      expect(parsed.privacyPolicyExists).toBe(true);

      // Default options fallback
      const defaultSpy = createResourceSpyServer();
      registerAllResources(defaultSpy.server);
      expect(defaultSpy.resources.size).toBe(6);
    });
  });
});
