/**
 * Direct Unit Tests for Gherkin Resolver Hardening & Shared Auto-Scaffolding (RED Phase)
 * Cites: FR-076-GHERKIN-RESOLVER-MCP-PARITY-001, UC-076-GHERKIN-RESOLVER-MCP-PARITY, DSG-CHG-076-GHERKIN-RESOLVER-MCP-PARITY, TSK-076-001
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as core from '../../packages/core/src/index.js';
import * as resolver from '../../packages/core/src/verifiers/gherkin-language-resolver.js';

describe('@FR-076-GHERKIN-RESOLVER-MCP-PARITY-001: gherkin-language-resolver & core autoScaffoldMissingSteps', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-unit-chg076-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('parseChangeSpecMetadata (js-yaml, anchors, DesignContractDeclaration, tasks[*], malformed fallback)', () => {
    it('resolves YAML anchors (&ref_0 / *ref_0) across citations and tasks[*].satisfies-requirements', () => {
      const content = [
        '---',
        'id: TSK-PLAN-076',
        'change-id: CHG-076-TEST',
        'citations:',
        '  - id: FR-076-CITE-1',
        '  - FR-076-CITE-2',
        'satisfies-requirements: &req_anchor',
        '  - FR-076-ANCHOR-1',
        '  - FR-076-ANCHOR-2',
        'tasks:',
        '  - id: TSK-076-A',
        '    satisfies-requirements: *req_anchor',
        '    implements-contracts:',
        '      - ValidContractSym',
        '      - abc',
        '  - id: TSK-076-B',
        '    satisfies-requirements:',
        '      - FR-076-TASK-ONLY',
        '    implements-contracts:',
        '      - interface: IParityService',
        '        methods:',
        '          - verifySync',
        '          - run',
        '---',
        '# Body',
      ].join('\n');

      const meta = resolver.parseChangeSpecMetadata(content);
      expect(meta.ids).toEqual(expect.arrayContaining(['TSK-PLAN-076', 'CHG-076-TEST', 'TSK-076-A', 'TSK-076-B']));
      expect(meta.referencedIds).toEqual(
        expect.arrayContaining(['FR-076-CITE-1', 'FR-076-CITE-2', 'FR-076-ANCHOR-1', 'FR-076-ANCHOR-2', 'FR-076-TASK-ONLY'])
      );
      expect(meta.contracts).toContain('ValidContractSym');
      expect(meta.contracts).toContain('IParityService');
      expect(meta.contracts).toContain('verifySync');
      expect(meta.contracts).not.toContain('abc');
      expect(meta.contracts).not.toContain('run');
    });

    it('expands top-level DesignContractDeclaration { interface, methods } with length >= 4', () => {
      const content = [
        '---',
        'id: DSG-076-TEST',
        'contracts:',
        '  - PlainContract',
        '  - interface: IRaw',
        '    methods:',
        '      - executeParity',
        '      - fn',
        '---',
      ].join('\n');

      const meta = resolver.parseChangeSpecMetadata(content);
      expect(meta.contracts).toEqual(expect.arrayContaining(['PlainContract', 'IRaw', 'executeParity']));
      expect(meta.contracts).not.toContain('fn');
    });

    it('falls back gracefully to empty metadata on malformed YAML without throwing', () => {
      const malformed = [
        '---',
        'id: DSG-BROKEN',
        'tasks: [unclosed bracket',
        '  invalid: : : yaml',
        '---',
      ].join('\n');

      expect(() => resolver.parseChangeSpecMetadata(malformed)).not.toThrow();
      expect(resolver.parseChangeSpecMetadata(malformed)).toEqual({
        ids: [],
        referencedIds: [],
        contracts: [],
      });
    });
  });

  describe('walkProductionSourceFiles (excluded dirs & rootDir-relative co-located test filtering)', () => {
    const excludedDirs = [
      'htmlcov',
      'coverage',
      'TestResults',
      'out',
      'examples',
      'fixtures',
      'scratch',
      '.pytest_cache',
      'scripts',
      '.agent',
      '.claude',
      '.cursor',
    ];

    it('excludes all non-production directories including coverage, htmlcov, TestResults, scripts, .agent, .claude, .cursor', () => {
      fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'real.ts'), 'export const ok = 1;\n', 'utf-8');

      for (const dir of excludedDirs) {
        const dirPath = path.join(tmpDir, dir);
        fs.mkdirSync(dirPath, { recursive: true });
        fs.writeFileSync(path.join(dirPath, 'ignored.py'), '# FR-076-IGNORED\n', 'utf-8');
        fs.writeFileSync(path.join(dirPath, 'ignored.ts'), '// FR-076-IGNORED\n', 'utf-8');
      }

      const walked = resolver.walkProductionSourceFiles(tmpDir);
      expect(walked.some((f) => f.endsWith(path.join('src', 'real.ts')))).toBe(true);
      for (const dir of excludedDirs) {
        expect(walked.some((f) => f.includes(`${path.sep}${dir}${path.sep}`))).toBe(false);
      }
    });

    it('excludes co-located polyglot unit and UI test files using rootDir-relative paths', () => {
      const testFiles = [
        path.join('internal', 'pkg', 'foo_test.go'),
        path.join('src', 'app', 'foo.spec.ts'),
        path.join('tests', 'e2e', 'foo.spec.ts'),
        path.join('src', 'app', 'bar_test.py'),
      ];
      for (const rel of testFiles) {
        const abs = path.join(tmpDir, rel);
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, '// test file\n', 'utf-8');
      }
      fs.mkdirSync(path.join(tmpDir, 'internal', 'pkg'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'internal', 'pkg', 'foo.go'), 'package pkg\n', 'utf-8');

      const walked = resolver.walkProductionSourceFiles(tmpDir);
      expect(walked.some((f) => f.endsWith(path.join('internal', 'pkg', 'foo.go')))).toBe(true);
      expect(walked.some((f) => f.endsWith('foo_test.go'))).toBe(false);
      expect(walked.some((f) => f.endsWith('foo.spec.ts'))).toBe(false);
      expect(walked.some((f) => f.endsWith('bar_test.py'))).toBe(false);
    });
  });

  describe('stripCodeComments & comment-aware fileMatchesFeature', () => {
    it('exports stripCodeComments and strips //, /* */, #, and Python """...""" while preserving string literals and token boundaries', () => {
      const stripCodeComments = (resolver as Record<string, unknown>).stripCodeComments as
        | ((content: string) => string)
        | undefined;
      expect(typeof stripCodeComments).toBe('function');

      const sample = [
        'const a = "foo // bar"; // lineCommentSymbol',
        'const b = "escaped \\"quote\\" # kept"; # pythonCommentSymbol',
        'const c = `template /* kept */`; /* blockCommentSymbol */',
        'const d = foo/*x*/bar;',
        '"""',
        'docstringSymbol',
        '"""',
      ].join('\n');

      const stripped = stripCodeComments!(sample);
      expect(stripped).toContain('"foo // bar"');
      expect(stripped).toContain('\\"quote\\" # kept');
      expect(stripped).toContain('`template /* kept */`');
      expect(stripped).not.toContain('lineCommentSymbol');
      expect(stripped).not.toContain('pythonCommentSymbol');
      expect(stripped).not.toContain('blockCommentSymbol');
      expect(stripped).not.toContain('docstringSymbol');
      // Adjacent tokens separated by block comment must NOT merge into "foobar"
      expect(stripped).not.toContain('foobar');
      expect(stripped).toMatch(/\bfoo\s+bar\b/);
    });

    it('matches idPatterns inside comments while ignoring symbolPatterns inside comments', () => {
      const idPatterns = [/\bFR-076-GHERKIN-RESOLVER-MCP-PARITY-001\b/i];
      const symbolPatterns = [/\bautoScaffoldMissingSteps\b/];

      const commentOnlySymbol = '# autoScaffoldMissingSteps\ndef noop():\n    return 0\n';
      const commentIdCitation = '// Cites: FR-076-GHERKIN-RESOLVER-MCP-PARITY-001\nexport const x = 1;\n';
      const codeSymbol = 'export function run() { return autoScaffoldMissingSteps("."); }\n';

      expect(resolver.fileMatchesFeature(commentOnlySymbol, [], symbolPatterns)).toBe(false);
      expect(resolver.fileMatchesFeature(commentIdCitation, idPatterns, [])).toBe(true);
      expect(resolver.fileMatchesFeature(codeSymbol, [], symbolPatterns)).toBe(true);
    });
  });

  describe('autoScaffoldMissingSteps export from @aisdlc/core', () => {
    it('is exported from @aisdlc/core and scaffolds missing step files', () => {
      const autoScaffold = (core as Record<string, unknown>).autoScaffoldMissingSteps as
        | ((rootDir: string) => number)
        | undefined;
      expect(typeof autoScaffold).toBe('function');

      const productDir = path.join(tmpDir, 'specs', 'product');
      fs.mkdirSync(productDir, { recursive: true });
      fs.writeFileSync(
        path.join(productDir, 'FR-076-AUTO.md'),
        '---\nid: FR-076-AUTO\n---\n```gherkin\n@FR-076-AUTO\nFeature: Auto\n  Scenario: S\n    Given x\n    When y\n    Then z\n```\n',
        'utf-8'
      );
      core.extractGherkinFeatures({ rootDir: tmpDir });

      const scaffolded = autoScaffold!(tmpDir);
      expect(scaffolded).toBe(1);
      expect(fs.existsSync(path.join(tmpDir, 'tests', 'steps', 'fr-076-auto.steps.ts'))).toBe(true);
    });
  });
});
