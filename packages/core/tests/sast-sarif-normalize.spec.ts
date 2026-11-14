import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { afterEach, describe, expect, it } from 'vitest';
import type { SarifDocument } from '../src/types/index.js';
import { SarifIngestionError } from '../src/verifiers/sarif-ingest.js';
import { parseSarifDocument } from '../src/verifiers/sarif-sast.js';
import { verifySast } from '../src/verifiers/sast.js';

describe('CHG-057 TSK-002: SARIF v2.1.0 normalization, URI confinement & sanitization', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix = 'aisdlc-sarif-norm-'): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  function makeDoc(results: unknown[], rules: unknown[] = [], originalUriBaseIds?: Record<string, { uri: string }>): SarifDocument {
    return {
      version: '2.1.0',
      runs: [
        {
          tool: { driver: { name: 'bandit', rules } },
          ...(originalUriBaseIds ? { originalUriBaseIds } : {}),
          results,
        },
      ],
    } as unknown as SarifDocument;
  }

  afterEach(() => {
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('applies strict security-severity precedence and numeric/string [0,10] validation', () => {
    const rootDir = makeTmpDir();
    const doc = makeDoc(
      [
        {
          ruleId: 'R-RESULT-SEC',
          level: 'note',
          properties: { 'security-severity': '9.5' },
          message: { text: 'Critical via result security-severity' },
          locations: [{ physicalLocation: { artifactLocation: { uri: 'src/a.ts' }, region: { startLine: 1 } } }],
        },
        {
          ruleId: 'R-RULE-SEC',
          ruleIndex: 0,
          level: 'note',
          message: { text: 'High via rule security-severity' },
          locations: [{ physicalLocation: { artifactLocation: { uri: 'src/b.ts' }, region: { startLine: 2 } } }],
        },
        {
          ruleId: 'R-INVALID-SEC',
          level: 'warning',
          properties: { 'security-severity': '' },
          message: { text: 'Empty string must not coerce to 0 (LOW)' },
          locations: [{ physicalLocation: { artifactLocation: { uri: 'src/c.ts' }, region: { startLine: 3 } } }],
        },
        {
          ruleId: 'R-OOB-SEC',
          level: 'error',
          properties: { 'security-severity': '12.0' },
          message: { text: 'Out-of-range must fall back to level error -> HIGH' },
          locations: [{ physicalLocation: { artifactLocation: { uri: 'src/d.ts' }, region: { startLine: 4 } } }],
        },
        {
          ruleId: 'R-NONE',
          level: 'none',
          message: { text: 'Informational none level excluded' },
          locations: [{ physicalLocation: { artifactLocation: { uri: 'src/e.ts' }, region: { startLine: 5 } } }],
        },
      ],
      [
        {
          id: 'R-RULE-SEC',
          properties: { 'security-severity': 7.5 },
          defaultConfiguration: { level: 'note' },
        },
      ]
    );

    const violations = parseSarifDocument(rootDir, doc);
    expect(violations).toHaveLength(4);
    expect(violations.find((v) => v.ruleId === 'R-RESULT-SEC')?.severity).toBe('CRITICAL');
    expect(violations.find((v) => v.ruleId === 'R-RULE-SEC')?.severity).toBe('HIGH');
    expect(violations.find((v) => v.ruleId === 'R-INVALID-SEC')?.severity).toBe('MEDIUM');
    expect(violations.find((v) => v.ruleId === 'R-OOB-SEC')?.severity).toBe('HIGH');
    expect(violations.find((v) => v.ruleId === 'R-NONE')).toBeUndefined();
  });

  it('resolves file:// URIs and uriBaseId (%SRCROOT%) inside rootDir', () => {
    const rootDir = makeTmpDir();
    const realRoot = fs.realpathSync(rootDir);
    const insideFileUri = pathToFileURL(path.join(realRoot, 'src', 'app.ts')).href;

    const doc = makeDoc(
      [
        {
          ruleId: 'R1',
          level: 'error',
          message: { text: 'file uri' },
          locations: [{ physicalLocation: { artifactLocation: { uri: insideFileUri }, region: { startLine: 12 } } }],
        },
        {
          ruleId: 'R2',
          level: 'warning',
          message: { text: 'srcroot uri' },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: 'lib/util.py', uriBaseId: '%SRCROOT%' },
                region: { startLine: 5 },
              },
            },
          ],
        },
      ],
      [],
      { '%SRCROOT%': { uri: pathToFileURL(realRoot).href } }
    );

    const violations = parseSarifDocument(rootDir, doc);
    expect(violations.map((v) => v.relPath)).toEqual(['lib/util.py', 'src/app.ts']);
    expect(violations[0].lineNumber).toBe(5);
    expect(violations[1].lineNumber).toBe(12);
  });

  it.each([
    'file:///etc/passwd',
    'src/../../../etc/shadow',
    '../outside/secret.ts',
    'src/%2e%2e/%2e%2e/outside.ts',
    '\\\\server\\share\\secret.ts',
    'file://remote-host/share/secret.ts',
  ])('rejects escaping or UNC artifactLocation.uri "%s" with ERR_SARIF_PATH_OUTSIDE_ROOT', (badUri) => {
    const rootDir = makeTmpDir();
    const doc = makeDoc([
      {
        ruleId: 'R1',
        level: 'error',
        message: { text: 'bad uri' },
        locations: [{ physicalLocation: { artifactLocation: { uri: badUri }, region: { startLine: 1 } } }],
      },
    ]);

    try {
      parseSarifDocument(rootDir, doc);
      expect.fail(`Expected SarifIngestionError for ${badUri}`);
    } catch (err) {
      expect(err).toBeInstanceOf(SarifIngestionError);
      expect((err as SarifIngestionError).code).toBe('ERR_SARIF_PATH_OUTSIDE_ROOT');
    }
  });

  it('rejects malformed percent-encoding in URI with ERR_SARIF_MALFORMED', () => {
    const rootDir = makeTmpDir();
    const doc = makeDoc([
      {
        ruleId: 'R1',
        level: 'error',
        message: { text: 'bad encoding' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/%E0%A4%A.ts' }, region: { startLine: 1 } } }],
      },
    ]);

    try {
      parseSarifDocument(rootDir, doc);
      expect.fail('Expected SarifIngestionError');
    } catch (err) {
      expect(err).toBeInstanceOf(SarifIngestionError);
      expect((err as SarifIngestionError).code).toBe('ERR_SARIF_MALFORMED');
    }
  });

  it('emits relPath "<unknown>" and lineNumber 1 when result.locations is missing or empty', () => {
    const rootDir = makeTmpDir();
    const doc = makeDoc([
      {
        ruleId: 'R-NO-LOC',
        level: 'error',
        message: { text: 'Finding without locations' },
      },
    ]);

    const violations = parseSarifDocument(rootDir, doc);
    expect(violations).toHaveLength(1);
    expect(violations[0].relPath).toBe('<unknown>');
    expect(violations[0].filePath).toBe('<unknown>');
    expect(violations[0].lineNumber).toBe(1);
  });

  it('sanitizes ANSI, C0/C1 control chars, Markdown, and HTML in untrusted SARIF fields', () => {
    const rootDir = makeTmpDir();
    const doc = makeDoc([
      {
        ruleId: 'RULE\x1b[31m-1\x07',
        level: 'error',
        message: { text: 'Bad\x1b[2J\x9bmsg\n# Injected Heading\n[click](https://evil.test)<script>alert(1)</script>' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/app.ts' }, region: { startLine: 3 } } }],
      },
    ]);

    const violations = parseSarifDocument(rootDir, doc);
    expect(violations).toHaveLength(1);
    const v = violations[0];
    expect(v.ruleId).not.toMatch(/\x1b|\x07/);
    expect(v.message).not.toMatch(/\x1b|\x9b|\r|\n/);
    expect(v.message).not.toContain('<script>');
    expect(v.message).not.toContain('](');
  });

  it('sorts canonically by relPath, lineNumber, ruleId and deduplicates multi-file findings keeping highest severity', () => {
    const rootDir = makeTmpDir();
    const s1 = {
      version: '2.1.0',
      runs: [
        {
          tool: { driver: { name: 'bandit' } },
          results: [
            {
              ruleId: 'B101',
              level: 'warning',
              message: { text: 'Assert used' },
              locations: [{ physicalLocation: { artifactLocation: { uri: 'src/b.py' }, region: { startLine: 20 } } }],
            },
            {
              ruleId: 'B102',
              level: 'note',
              message: { text: 'Note' },
              locations: [{ physicalLocation: { artifactLocation: { uri: 'src/a.py' }, region: { startLine: 10 } } }],
            },
          ],
        },
      ],
    };
    const s2 = {
      version: '2.1.0',
      runs: [
        {
          tool: { driver: { name: 'semgrep' } },
          results: [
            {
              ruleId: 'B101',
              level: 'error',
              properties: { 'security-severity': '9.2' },
              message: { text: 'Assert used (critical override)' },
              locations: [{ physicalLocation: { artifactLocation: { uri: 'src/b.py' }, region: { startLine: 20 } } }],
            },
          ],
        },
      ],
    };

    fs.writeFileSync(path.join(rootDir, 's1.sarif'), JSON.stringify(s1), 'utf-8');
    fs.writeFileSync(path.join(rootDir, 's2.sarif'), JSON.stringify(s2), 'utf-8');

    const res = verifySast({ rootDir, sarifPaths: ['s1.sarif', 's2.sarif'] });
    expect(res.violations).toHaveLength(2);
    expect(res.violations[0].relPath).toBe('src/a.py');
    expect(res.violations[1].relPath).toBe('src/b.py');
    expect(res.violations[1].severity).toBe('CRITICAL');
  });

  it.each([null, 'string-entry', 42, ['nested-array']])(
    'rejects non-object entry %j in run.results with ERR_SARIF_MALFORMED',
    (badEntry) => {
      const rootDir = makeTmpDir();
      const doc = makeDoc([badEntry]);

      try {
        parseSarifDocument(rootDir, doc);
        expect.fail('Expected SarifIngestionError');
      } catch (err) {
        expect(err).toBeInstanceOf(SarifIngestionError);
        expect((err as SarifIngestionError).code).toBe('ERR_SARIF_MALFORMED');
      }
    }
  );
});
