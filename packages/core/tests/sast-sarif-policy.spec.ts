import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SarifIngestionError } from '../src/verifiers/sarif-ingest.js';
import { verifySast } from '../src/verifiers/sast.js';

describe('CHG-057 TSK-003: verifySast SARIF mode, quality-policy.yaml & suppressions', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(prefix = 'aisdlc-sarif-policy-'): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tmpDirs.push(dir);
    return dir;
  }

  function writeSarif(rootDir: string, filename: string, results: unknown[]): string {
    const fullPath = path.join(rootDir, filename);
    fs.writeFileSync(
      fullPath,
      JSON.stringify({
        version: '2.1.0',
        runs: [{ tool: { driver: { name: 'gosec' } }, results }],
      }),
      'utf-8'
    );
    return filename;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('skips regex/Semgrep scanning in SARIF mode and sets totalFilesScanned = sarifPaths.length', () => {
    const rootDir = makeTmpDir();
    fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
    // This would trigger SAST-003-UNSAFE-EVAL in normal mode, but must be skipped in SARIF mode
    fs.writeFileSync(path.join(rootDir, 'src', 'vuln.ts'), 'const x = eval(userInput);\n', 'utf-8');

    const s1 = writeSarif(rootDir, 'a.sarif', []);
    const s2 = writeSarif(rootDir, 'b.sarif', []);

    const res = verifySast({ rootDir, sarifPaths: [s1, s2], semgrep: true });
    expect(res.success).toBe(true);
    expect(res.totalFilesScanned).toBe(2);
    expect(res.violationsCount).toBe(0);
  });

  it('renders distinct severity badges for CRITICAL, HIGH, MEDIUM, LOW in reportMarkdown', () => {
    const rootDir = makeTmpDir();
    const s = writeSarif(rootDir, 'sev.sarif', [
      {
        ruleId: 'R-CRIT',
        properties: { 'security-severity': '9.5' },
        message: { text: 'crit' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/a.ts' }, region: { startLine: 1 } } }],
      },
      {
        ruleId: 'R-HIGH',
        level: 'error',
        message: { text: 'high' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/a.ts' }, region: { startLine: 2 } } }],
      },
      {
        ruleId: 'R-MED',
        level: 'warning',
        message: { text: 'med' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/a.ts' }, region: { startLine: 3 } } }],
      },
      {
        ruleId: 'R-LOW',
        level: 'note',
        message: { text: 'low' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/a.ts' }, region: { startLine: 4 } } }],
      },
    ]);

    const res = verifySast({ rootDir, sarifPaths: [s], minSeverity: 'LOW' });
    expect(res.reportMarkdown).toContain('CRITICAL');
    expect(res.reportMarkdown).toContain('HIGH');
    expect(res.reportMarkdown).toContain('MEDIUM');
    expect(res.reportMarkdown).toContain('LOW');
    expect(res.reportMarkdown).not.toMatch(/\| \*\*⚠️ HIGH\*\* \| `R-MED`/);
    expect(res.reportMarkdown).not.toMatch(/\| \*\*⚠️ HIGH\*\* \| `R-LOW`/);
  });

  it('evaluates quality-policy.yaml fail_on_severity, max_vulnerabilities, and PERMISSIVE mode', () => {
    const rootDir = makeTmpDir();
    const s = writeSarif(rootDir, 'findings.sarif', [
      {
        ruleId: 'R-MED',
        level: 'warning',
        message: { text: 'Medium finding' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/a.ts' }, region: { startLine: 1 } } }],
      },
    ]);

    // STRICT with default fail_on_severity -> falls back to options.minSeverity ('HIGH') => passes on MEDIUM
    fs.writeFileSync(
      path.join(rootDir, 'quality-policy.yaml'),
      'enforcement_mode: "STRICT"\nrelease_thresholds:\n  sast_analysis:\n    max_vulnerabilities: 0\n',
      'utf-8'
    );
    const resHigh = verifySast({ rootDir, sarifPaths: [s] });
    expect(resHigh.success).toBe(true);

    // STRICT with fail_on_severity: MEDIUM and max_vulnerabilities: 0 => fails
    fs.writeFileSync(
      path.join(rootDir, 'quality-policy.yaml'),
      'enforcement_mode: "STRICT"\nrelease_thresholds:\n  sast_analysis:\n    fail_on_severity: "MEDIUM"\n    max_vulnerabilities: 0\n',
      'utf-8'
    );
    const resMedFail = verifySast({ rootDir, sarifPaths: [s] });
    expect(resMedFail.success).toBe(false);

    // PERMISSIVE with fail_on_severity: MEDIUM => warns without failing success
    fs.writeFileSync(
      path.join(rootDir, 'quality-policy.yaml'),
      'enforcement_mode: "PERMISSIVE"\nrelease_thresholds:\n  sast_analysis:\n    fail_on_severity: "MEDIUM"\n    max_vulnerabilities: 0\n',
      'utf-8'
    );
    const resPermissive = verifySast({ rootDir, sarifPaths: [s] });
    expect(resPermissive.success).toBe(true);
    expect(resPermissive.violationsCount).toBe(1);
  });

  it('honors active ai-sdlc:allow-sast with matching rule and fails on expired/invalid suppressions even in PERMISSIVE mode', () => {
    const rootDir = makeTmpDir();
    fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, 'src', 'app.py'),
      [
        'assert True # ai-sdlc:allow-sast rule="B101" reason="Safe test" expires="2099-12-31" approved-by="sec@test.dev"',
        'eval("x") # ai-sdlc:allow-prompt-injection rule="B102" reason="Wrong kind" expires="2099-12-31" approved-by="sec@test.dev"',
        'exec("y") # ai-sdlc:allow-sast rule="B103" reason="Expired" expires="2020-01-01" approved-by="sec@test.dev"',
      ].join('\n'),
      'utf-8'
    );

    // 1. Active suppression for B101 exempts finding
    const sActive = writeSarif(rootDir, 'active.sarif', [
      {
        ruleId: 'B101',
        level: 'error',
        message: { text: 'Assert' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/app.py' }, region: { startLine: 1 } } }],
      },
    ]);
    const resActive = verifySast({ rootDir, sarifPaths: [sActive] });
    expect(resActive.success).toBe(true);
    expect(resActive.violationsCount).toBe(0);

    // 2. allow-prompt-injection does NOT suppress SARIF SAST finding
    const sWrongKind = writeSarif(rootDir, 'wrong-kind.sarif', [
      {
        ruleId: 'B102',
        level: 'error',
        message: { text: 'Eval' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/app.py' }, region: { startLine: 2 } } }],
      },
    ]);
    const resWrongKind = verifySast({ rootDir, sarifPaths: [sWrongKind] });
    expect(resWrongKind.success).toBe(false);
    expect(resWrongKind.violationsCount).toBe(1);

    // 3. Expired suppression forces success: false even under PERMISSIVE mode
    fs.writeFileSync(
      path.join(rootDir, 'quality-policy.yaml'),
      'enforcement_mode: "PERMISSIVE"\nrelease_thresholds:\n  sast_analysis:\n    max_vulnerabilities: 10\n',
      'utf-8'
    );
    const sExpired = writeSarif(rootDir, 'expired.sarif', [
      {
        ruleId: 'B103',
        level: 'error',
        message: { text: 'Exec' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/app.py' }, region: { startLine: 3 } } }],
      },
    ]);
    const resExpired = verifySast({ rootDir, sarifPaths: [sExpired] });
    expect(resExpired.success).toBe(false);
    expect(resExpired.suppressions?.some((sup) => sup.status === 'expired')).toBe(true);
  });

  it('safely handles lineNumber exceeding file line count during suppression lookup', () => {
    const rootDir = makeTmpDir();
    fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(rootDir, 'src', 'short.ts'), 'const a = 1;\n', 'utf-8');

    const s = writeSarif(rootDir, 'oob-line.sarif', [
      {
        ruleId: 'R1',
        level: 'error',
        message: { text: 'Out of bounds line' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/short.ts' }, region: { startLine: 999 } } }],
      },
    ]);

    const res = verifySast({ rootDir, sarifPaths: [s] });
    expect(res.success).toBe(false);
    expect(res.violationsCount).toBe(1);
  });

  it('fails closed with ERR_SARIF_MALFORMED when quality-policy.yaml is malformed YAML', () => {
    const rootDir = makeTmpDir();
    fs.writeFileSync(path.join(rootDir, 'quality-policy.yaml'), 'enforcement_mode: [unterminated\n', 'utf-8');
    const s = writeSarif(rootDir, 'clean.sarif', []);

    try {
      verifySast({ rootDir, sarifPaths: [s] });
      expect.fail('Expected SarifIngestionError');
    } catch (err) {
      expect(err).toBeInstanceOf(SarifIngestionError);
      expect((err as SarifIngestionError).code).toBe('ERR_SARIF_MALFORMED');
    }
  });

  it('enforces invalid suppression status (missing approved-by / invalid expires) even in PERMISSIVE mode', () => {
    const rootDir = makeTmpDir();
    fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, 'src', 'app.py'),
      [
        'assert True # ai-sdlc:allow-sast rule="B101" reason="Missing approver" expires="2099-12-31"',
        'eval("x") # ai-sdlc:allow-sast rule="B102" reason="Bad date" expires="not-a-date" approved-by="sec@test.dev"',
      ].join('\n'),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(rootDir, 'quality-policy.yaml'),
      'enforcement_mode: "PERMISSIVE"\nrelease_thresholds:\n  sast_analysis:\n    max_vulnerabilities: 10\n',
      'utf-8'
    );

    const sMissingApprover = writeSarif(rootDir, 'missing-approver.sarif', [
      {
        ruleId: 'B101',
        level: 'error',
        message: { text: 'Assert' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/app.py' }, region: { startLine: 1 } } }],
      },
    ]);
    const res1 = verifySast({ rootDir, sarifPaths: [sMissingApprover] });
    expect(res1.success).toBe(false);
    expect(res1.suppressions?.some((sup) => sup.status === 'invalid')).toBe(true);

    const sBadDate = writeSarif(rootDir, 'bad-date.sarif', [
      {
        ruleId: 'B102',
        level: 'error',
        message: { text: 'Eval' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/app.py' }, region: { startLine: 2 } } }],
      },
    ]);
    const res2 = verifySast({ rootDir, sarifPaths: [sBadDate] });
    expect(res2.success).toBe(false);
    expect(res2.suppressions?.some((sup) => sup.status === 'invalid')).toBe(true);
  });

  it('enforces ai-sdlc:allow-sast rule matching (rule="OTHER" does not suppress B101; rule="*" does suppress)', () => {
    const rootDir = makeTmpDir();
    fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
    fs.writeFileSync(
      path.join(rootDir, 'src', 'rules.py'),
      [
        'assert True # ai-sdlc:allow-sast rule="OTHER" reason="Wrong rule" expires="2099-12-31" approved-by="sec@test.dev"',
        'assert True # ai-sdlc:allow-sast rule="*" reason="Wildcard" expires="2099-12-31" approved-by="sec@test.dev"',
      ].join('\n'),
      'utf-8'
    );

    const sOther = writeSarif(rootDir, 'other.sarif', [
      {
        ruleId: 'B101',
        level: 'error',
        message: { text: 'Assert' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/rules.py' }, region: { startLine: 1 } } }],
      },
    ]);
    const resOther = verifySast({ rootDir, sarifPaths: [sOther] });
    expect(resOther.success).toBe(false);
    expect(resOther.violationsCount).toBe(1);

    const sWildcard = writeSarif(rootDir, 'wildcard.sarif', [
      {
        ruleId: 'B101',
        level: 'error',
        message: { text: 'Assert' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/rules.py' }, region: { startLine: 2 } } }],
      },
    ]);
    const resWildcard = verifySast({ rootDir, sarifPaths: [sWildcard] });
    expect(resWildcard.success).toBe(true);
    expect(resWildcard.violationsCount).toBe(0);
  });

  it('blocks CRITICAL findings via zero_tolerance_severities even when max_vulnerabilities is 5 in STRICT mode', () => {
    const rootDir = makeTmpDir();
    fs.writeFileSync(
      path.join(rootDir, 'quality-policy.yaml'),
      [
        'enforcement_mode: "STRICT"',
        'release_thresholds:',
        '  sast_analysis:',
        '    max_vulnerabilities: 5',
        '    zero_tolerance_severities: ["CRITICAL"]',
      ].join('\n'),
      'utf-8'
    );
    const s = writeSarif(rootDir, 'crit.sarif', [
      {
        ruleId: 'R-CRIT',
        properties: { 'security-severity': '9.5' },
        message: { text: 'Critical vuln' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/a.ts' }, region: { startLine: 1 } } }],
      },
    ]);

    const res = verifySast({ rootDir, sarifPaths: [s] });
    expect(res.success).toBe(false);
    expect(res.violationsCount).toBe(1);
  });

  it('refuses symlinked source file escaping rootDir during suppression lookup', () => {
    const parentDir = makeTmpDir();
    const rootDir = path.join(parentDir, 'project');
    fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });

    const outsideFile = path.join(parentDir, 'outside.py');
    fs.writeFileSync(
      outsideFile,
      'assert True # ai-sdlc:allow-sast rule="B101" reason="Escaped" expires="2099-12-31" approved-by="sec@test.dev"\n',
      'utf-8'
    );

    const linkPath = path.join(rootDir, 'src', 'escaped.py');
    try {
      fs.symlinkSync(outsideFile, linkPath, 'file');
    } catch {
      fs.writeFileSync(
        linkPath,
        'assert True # ai-sdlc:allow-sast rule="B101" reason="Escaped" expires="2099-12-31" approved-by="sec@test.dev"\n',
        'utf-8'
      );
      const realpathOrig = fs.realpathSync;
      vi.spyOn(fs, 'realpathSync').mockImplementation((p: fs.PathLike) => {
        if (path.resolve(String(p)) === path.resolve(linkPath)) {
          return outsideFile;
        }
        return realpathOrig(p);
      });
    }

    const s = writeSarif(rootDir, 'symlink-supp.sarif', [
      {
        ruleId: 'B101',
        level: 'error',
        message: { text: 'Assert' },
        locations: [{ physicalLocation: { artifactLocation: { uri: 'src/escaped.py' }, region: { startLine: 1 } } }],
      },
    ]);

    const res = verifySast({ rootDir, sarifPaths: [s] });
    expect(res.success).toBe(false);
    expect(res.violationsCount).toBe(1);
    expect(res.suppressions).toHaveLength(0);
  });
});
