/**
 * Direct Unit Tests for Polyglot Verify Parity (RED Phase)
 * Cites: FR-077-POLYGLOT-VERIFY-PARITY-001, UC-077-POLYGLOT-VERIFY-PARITY, CHG-077-POLYGLOT-VERIFY-PARITY, TSK-077-01
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { STARTER_QUALITY_POLICY } from '../../packages/core/src/init/index.js';
import { isSafeWithinRoot, safeRealpath } from '../../packages/core/src/utils/fs.js';
import {
  collectFilesToScan,
  createDefaultQualityPolicy,
  DEFAULT_EXTENSIONS,
  scanDotNetProjects,
  scanRustCrates,
  walkDir,
} from '../../packages/core/src/verifiers/quality-gate.js';
import {
  DEFAULT_UI_TEST_PATTERNS,
  hasModalityDriverSignature,
  isUiTestFile,
  MODALITY_DRIVER_SIGNATURES,
  nextAfter,
  readCommentToken,
  readQuotedLiteral,
  stripTestComments,
} from '../../packages/core/src/verifiers/test-discovery.js';
import { isTraceableTestFile, scanCodeTestFiles, verifyTraceability } from '../../packages/core/src/verifiers/traceability.js';

function writeFile(rootDir: string, relPath: string, content: string | Buffer): string {
  const fullPath = path.join(rootDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
  return fullPath;
}

function createMinimalTraceabilityRepo(
  rootDir: string,
  reqId: string,
  contracts: string[] = []
): void {
  writeFile(
    rootDir,
    'specs/handoffs/HOF-077.md',
    [
      '---',
      'id: HOF-077',
      'type: handoff',
      'requirements:',
      `  - ${reqId}`,
      '---',
      '# HOF-077',
    ].join('\n')
  );
  writeFile(
    rootDir,
    'specs/product/UC-077-TEST.md',
    [
      '---',
      'id: UC-077-TEST',
      'type: use-case',
      '---',
      '# UC-077-TEST',
    ].join('\n')
  );
  writeFile(
    rootDir,
    `specs/product/${reqId}.md`,
    [
      '---',
      `id: ${reqId}`,
      'type: functional-requirement',
      'derived-from:',
      '  - UC-077-TEST',
      '---',
      `# ${reqId}`,
    ].join('\n')
  );
  writeFile(
    rootDir,
    'specs/architecture/CMP-077-TEST.md',
    [
      '---',
      'id: CMP-077-TEST',
      'type: component',
      'satisfies-requirements:',
      `  - ${reqId}`,
      ...(contracts.length > 0 ? ['contracts:', ...contracts.map((c) => `  - ${c}`)] : []),
      '---',
      '# CMP-077-TEST',
    ].join('\n')
  );
}

describe('@FR-077-POLYGLOT-VERIFY-PARITY-001: Polyglot Verify Parity (RED Phase)', () => {
  let tmpDir: string;
  let outsideDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-chg077-'));
    outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-chg077-outside-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    if (fs.existsSync(outsideDir)) {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  describe('test-discovery.ts: modality driver signatures, Go/Rust UI tests, and string-safe stripTestComments', () => {
    it('matches C# Expect(page) / Expect(locator) case-insensitively for web modality', () => {
      const csPlaywright = `
        using Microsoft.Playwright;
        public class LoginTests {
          public async Task ShouldLogin(IPage page, ILocator locator) {
            await Expect(page).ToHaveTitleAsync("Home");
            await Expect(locator).ToBeVisibleAsync();
          }
        }
      `;
      expect(hasModalityDriverSignature(csPlaywright, 'web')).toBe(true);
      expect(hasModalityDriverSignature('await Expect(page).ToBeOKAsync();', 'web')).toBe(true);
      expect(hasModalityDriverSignature('await Expect(locator).ToContainTextAsync("ok");', 'web')).toBe(true);
    });

    it('matches Java and Kotlin Playwright signatures for web modality', () => {
      const javaPlaywright = `
        import com.microsoft.playwright.Page;
        import com.microsoft.playwright.Playwright;
        import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;
        public class AppE2ETest {
          void testHome() {
            try (Playwright pw = Playwright.create()) {
              assertThat(page).hasTitle("Dashboard");
            }
          }
        }
      `;
      expect(hasModalityDriverSignature('import com.microsoft.playwright.Browser;', 'web')).toBe(true);
      expect(hasModalityDriverSignature('val pw = Playwright.create()', 'web')).toBe(true);
      expect(hasModalityDriverSignature('assertThat(page).isVisible()', 'web')).toBe(true);
      expect(hasModalityDriverSignature(javaPlaywright, 'web')).toBe(true);
    });

    it('matches Go (exec.Command, cobra) and Rust (assert_cmd, Command::cargo_bin) signatures for console modality', () => {
      expect(hasModalityDriverSignature('cmd := exec.Command("mycli", "--help")', 'console')).toBe(true);
      expect(hasModalityDriverSignature('rootCmd := &cobra.Command{Use: "app"}', 'console')).toBe(true);
      expect(hasModalityDriverSignature('use assert_cmd::Command;', 'console')).toBe(true);
      expect(hasModalityDriverSignature('let mut cmd = Command::cargo_bin("mycli").unwrap();', 'console')).toBe(true);
    });

    it('classifies Go and Rust E2E/UI test files in isUiTestFile', () => {
      expect(isUiTestFile('app_e2e_test.go')).toBe(true);
      expect(isUiTestFile('cmd/cli/app_ui_test.go')).toBe(true);
      expect(isUiTestFile('tests/app_e2e_test.rs')).toBe(true);
      expect(isUiTestFile('crates/cli/tests/app_ui_test.rs')).toBe(true);
      expect(isUiTestFile('cmd/cli/app_test.go')).toBe(false);
      expect(isUiTestFile('crates/cli/src/main.rs')).toBe(false);
    });

    it('stripTestComments preserves XPath // in single, double, and multiline template strings while stripping real comments', () => {
      const input = [
        'const sel1 = page.locator("//button[@type=\'submit\']"); // trailing line comment',
        "const sel2 = page.locator('//div[@data-id=\"item\"]//span'); /* inline block */",
        'const sel3 = `',
        '  // xpath or template line preserved',
        '  <div>ok</div>',
        '`;',
        'const url = "https://example.com/api";',
        '<!-- html comment removed -->',
        '# python comment removed',
      ].join('\n');

      const stripped = stripTestComments(input);
      expect(stripped).toContain('"//button[@type=\'submit\']"');
      expect(stripped).toContain("'//div[@data-id=\"item\"]//span'");
      expect(stripped).toContain('// xpath or template line preserved');
      expect(stripped).toContain('https://example.com/api');
      expect(stripped).not.toContain('trailing line comment');
      expect(stripped).not.toContain('inline block');
      expect(stripped).not.toContain('html comment removed');
      expect(stripped).not.toContain('python comment removed');
    });
  });

  describe('traceability.ts: polyglot test indexing, binary exclusion, SOURCE_CODE_EXTS, and Python venv skips', () => {
    it('indexes pytest (test_*.py), C# (*Test.cs/*Tests.cs), Java (*Test.java/*Tests.java), Kotlin (*Test.kt/*Tests.kt), and Rust (*_test.rs, tests/**/*.rs) in codeTestMap and testCorpus', () => {
      const cases: Array<{ reqId: string; testFile: string; contract: string }> = [
        { reqId: 'FR-077-PYTEST', testFile: 'tests/test_auth.py', contract: 'verifyPyAuthToken' },
        { reqId: 'FR-077-CSHARP', testFile: 'tests/AuthTests.cs', contract: 'VerifyCsAuthToken' },
        { reqId: 'FR-077-CSHARP-SG', testFile: 'tests/BillingTest.cs', contract: 'VerifyCsBilling' },
        { reqId: 'FR-077-JAVA', testFile: 'src/test/java/AuthTest.java', contract: 'verifyJavaAuthToken' },
        { reqId: 'FR-077-JAVA-PL', testFile: 'src/test/java/OrderTests.java', contract: 'verifyJavaOrder' },
        { reqId: 'FR-077-KOTLIN', testFile: 'src/test/kotlin/AuthTest.kt', contract: 'verifyKtAuthToken' },
        { reqId: 'FR-077-KOTLIN-PL', testFile: 'src/test/kotlin/CartTests.kt', contract: 'verifyKtCart' },
        { reqId: 'FR-077-RUST-UNIT', testFile: 'src/auth_test.rs', contract: 'verify_rs_auth_token' },
        { reqId: 'FR-077-RUST-INT', testFile: 'tests/integration_auth.rs', contract: 'verify_rs_integration' },
      ];

      for (const c of cases) {
        const caseDir = path.join(tmpDir, c.reqId);
        createMinimalTraceabilityRepo(caseDir, c.reqId, [c.contract]);
        // Intentionally put contract ONLY in test file (not in prod) to prove it goes to testCorpus, NOT prodCorpus
        writeFile(caseDir, c.testFile, `// ${c.reqId}\n// calls ${c.contract}()\n`);

        const result = verifyTraceability({ rootDir: caseDir });
        const row = result.rows.find((r) => r.id === c.reqId);
        expect(row, `Row missing for ${c.reqId}`).toBeDefined();
        expect(row!.testStatus, `Expected testStatus COMPLIANT for ${c.testFile}`).toBe('COMPLIANT');
        expect(row!.testTraces).toContain(c.testFile);

        const audit = result.contractAudits?.find((a) => a.method === c.contract);
        expect(audit, `Contract audit missing for ${c.contract}`).toBeDefined();
        expect(audit!.testedInSuite, `Expected ${c.testFile} in testCorpus`).toBe(true);
        expect(audit!.implementedInCode, `Expected ${c.testFile} NOT in prodCorpus`).toBe(false);
      }
    });

    it('indexes code-extension UI tests under tests/e2e/ in testCorpus (not prodCorpus) and skips binary files like .png', () => {
      createMinimalTraceabilityRepo(tmpDir, 'FR-077-UITEST', ['launchUiFlow', 'binaryArtifactMarker']);
      writeFile(tmpDir, 'src/ui.ts', 'export function launchUiFlow() { return true; }\nexport function binaryArtifactMarker() { return true; }\n');
      writeFile(tmpDir, 'tests/e2e/app.e2e.ts', '// FR-077-UITEST\nlaunchUiFlow();\n');
      // Binary PNG containing ASCII bytes of 'binaryArtifactMarker' should NOT be read into testCorpus
      writeFile(
        tmpDir,
        'tests/e2e/screenshot.png',
        Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('binaryArtifactMarker')])
      );

      const result = verifyTraceability({ rootDir: tmpDir });
      const uiAudit = result.contractAudits?.find((a) => a.method === 'launchUiFlow');
      expect(uiAudit?.implementedInCode).toBe(true);
      expect(uiAudit?.testedInSuite).toBe(true);

      const pngAudit = result.contractAudits?.find((a) => a.method === 'binaryArtifactMarker');
      expect(pngAudit?.implementedInCode).toBe(true);
      expect(pngAudit?.testedInSuite).toBe(false);
    });

    it('includes .kt, .c, .cpp, .cc, .cxx, .hpp, .fs, .mjs, .cjs in SOURCE_CODE_EXTS for prodCorpus', () => {
      const exts = ['.kt', '.c', '.cpp', '.cc', '.cxx', '.hpp', '.fs', '.mjs', '.cjs'];
      const contracts = exts.map((ext, i) => `prodSymbol_${i}_${ext.slice(1)}`);
      createMinimalTraceabilityRepo(tmpDir, 'FR-077-EXTS', contracts);

      exts.forEach((ext, i) => {
        writeFile(tmpDir, `src/mod_${i}${ext}`, `// ${contracts[i]}\nfunction ${contracts[i]}() {}\n`);
      });
      writeFile(tmpDir, 'tests/ext.spec.ts', `// FR-077-EXTS\n${contracts.join('\n')}\n`);

      const result = verifyTraceability({ rootDir: tmpDir });
      for (const sym of contracts) {
        const audit = result.contractAudits?.find((a) => a.method === sym);
        expect(audit?.implementedInCode, `Expected ${sym} to be indexed in prodCorpus`).toBe(true);
      }
    });

    it('skips .venv, venv, __pycache__, and .pytest_cache directories during traceability scans', () => {
      const skippedDirs = ['.venv', 'venv', '__pycache__', '.pytest_cache'];
      createMinimalTraceabilityRepo(tmpDir, 'FR-077-SKIPDIRS', ['ghostProdSymbol', 'ghostTestSymbol']);

      for (const dir of skippedDirs) {
        writeFile(tmpDir, `${dir}/site-packages/pkg.py`, 'def ghostProdSymbol(): pass\n');
        writeFile(tmpDir, `${dir}/test_ghost.py`, '# FR-077-SKIPDIRS\nghostTestSymbol()\n');
      }

      const result = verifyTraceability({ rootDir: tmpDir });
      const row = result.rows.find((r) => r.id === 'FR-077-SKIPDIRS');
      expect(row?.testStatus).not.toBe('COMPLIANT');

      const prodAudit = result.contractAudits?.find((a) => a.method === 'ghostProdSymbol');
      const testAudit = result.contractAudits?.find((a) => a.method === 'ghostTestSymbol');
      expect(prodAudit?.implementedInCode).toBe(false);
      expect(testAudit?.testedInSuite).toBe(false);
    });
  });

  describe('quality-gate.ts & init/index.ts: extensions, idiomatic layouts, test filtering, and symlink containment', () => {
    it('DEFAULT_EXTENSIONS and STARTER_QUALITY_POLICY include .kt, .mjs, .cjs, .cc, .cxx, .hpp (and DEFAULT_EXTENSIONS excludes .fs)', () => {
      const requiredExts = ['.kt', '.mjs', '.cjs', '.cc', '.cxx', '.hpp'];
      for (const ext of requiredExts) {
        expect(DEFAULT_EXTENSIONS).toContain(ext);
        expect(STARTER_QUALITY_POLICY).toContain(`"${ext}"`);
      }
      expect(DEFAULT_EXTENSIONS).not.toContain('.fs');
    });

    it('collectFilesToScan discovers Go (cmd/internal/pkg), Rust (crates/*/src), Python (app/backend), and .NET level-1 .csproj subdirs', () => {
      writeFile(tmpDir, 'cmd/server/main.go', 'package main\nfunc main() {}\n');
      writeFile(tmpDir, 'internal/auth/service.go', 'package auth\nfunc Auth() {}\n');
      writeFile(tmpDir, 'pkg/util/hash.go', 'package util\nfunc Hash() {}\n');
      writeFile(tmpDir, 'crates/engine/src/lib.rs', 'pub fn run() {}\n');
      writeFile(tmpDir, 'app/routes.py', 'def get_routes(): return []\n');
      writeFile(tmpDir, 'backend/worker.py', 'def work(): return True\n');
      writeFile(tmpDir, 'MyApi/MyApi.csproj', '<Project Sdk="Microsoft.NET.Sdk"></Project>\n');
      writeFile(tmpDir, 'MyApi/Controllers/UsersController.cs', 'public class UsersController {}\n');

      const policy = createDefaultQualityPolicy();
      const files = collectFilesToScan(tmpDir, policy).map((f) => path.relative(tmpDir, f).replace(/\\/g, '/'));

      expect(files).toContain('cmd/server/main.go');
      expect(files).toContain('internal/auth/service.go');
      expect(files).toContain('pkg/util/hash.go');
      expect(files).toContain('crates/engine/src/lib.rs');
      expect(files).toContain('app/routes.py');
      expect(files).toContain('backend/worker.py');
      expect(files).toContain('MyApi/Controllers/UsersController.cs');
    });

    it('collectFilesToScan filters out both polyglot unit tests and UI test files', () => {
      writeFile(tmpDir, 'src/service.ts', 'export const ok = 1;\n');
      writeFile(tmpDir, 'src/service.e2e.ts', 'test("ui", () => {});\n');
      writeFile(tmpDir, 'cmd/cli/main.go', 'package main\nfunc main() {}\n');
      writeFile(tmpDir, 'cmd/cli/main_test.go', 'package main\nfunc TestMain() {}\n');
      writeFile(tmpDir, 'cmd/cli/main_e2e_test.go', 'package main\nfunc TestE2E() {}\n');
      writeFile(tmpDir, 'app/handler.py', 'def handle(): pass\n');
      writeFile(tmpDir, 'app/test_handler.py', 'def test_handle(): pass\n');
      writeFile(tmpDir, 'app/handler_ui_test.py', 'def test_ui(): pass\n');

      const policy = createDefaultQualityPolicy();
      const files = collectFilesToScan(tmpDir, policy).map((f) => path.relative(tmpDir, f).replace(/\\/g, '/'));

      expect(files).toContain('src/service.ts');
      expect(files).toContain('cmd/cli/main.go');
      expect(files).toContain('app/handler.py');
      expect(files).not.toContain('src/service.e2e.ts');
      expect(files).not.toContain('cmd/cli/main_test.go');
      expect(files).not.toContain('cmd/cli/main_e2e_test.go');
      expect(files).not.toContain('app/test_handler.py');
      expect(files).not.toContain('app/handler_ui_test.py');
    });

    it('walkDir and verifyTraceability skip symlinks/junctions escaping rootDir (security containment)', () => {
      writeFile(tmpDir, 'src/inside.ts', 'export const inside = 1;\n');
      writeFile(outsideDir, 'secret.ts', 'export function escapedSecretSymbol() { return 42; }\n');
      writeFile(outsideDir, 'secret_test.ts', '// FR-077-SYMLINK\nescapedSecretSymbol();\n');

      const junctionTarget = path.join(tmpDir, 'src', 'escaped-link');
      fs.symlinkSync(outsideDir, junctionTarget, 'junction');

      const walked = walkDir(path.join(tmpDir, 'src'), DEFAULT_EXTENSIONS, []).map((f) =>
        path.relative(tmpDir, f).replace(/\\/g, '/')
      );
      expect(walked).toContain('src/inside.ts');
      expect(walked.some((f) => f.includes('escaped-link') || f.includes('secret.ts'))).toBe(false);

      createMinimalTraceabilityRepo(tmpDir, 'FR-077-SYMLINK', ['escapedSecretSymbol']);
      const traceRes = verifyTraceability({ rootDir: tmpDir });
      const audit = traceRes.contractAudits?.find((a) => a.method === 'escapedSecretSymbol');
      expect(audit?.implementedInCode).toBe(false);

      const realTmp = safeRealpath(tmpDir)!;
      expect(isSafeWithinRoot(path.join(tmpDir, 'src', 'inside.ts'), realTmp)).toBe(true);
      expect(isSafeWithinRoot(junctionTarget, realTmp)).toBe(false);
      expect(isTraceableTestFile('tests/e2e/app.e2e.ts')).toBe(true);
      expect(DEFAULT_UI_TEST_PATTERNS).toContain('**/*_e2e_test.go');
      expect(MODALITY_DRIVER_SIGNATURES.web.test('assertThat(page)')).toBe(true);
      const codeMap = new Map<string, string[]>();
      scanCodeTestFiles(tmpDir, tmpDir, ['FR-077-SYMLINK'], codeMap);
      expect(codeMap.size).toBe(0);
      expect(readCommentToken('// comment\n', 0)?.text).toBe(' ');
      expect(readQuotedLiteral('"a\\"b"', 0).text).toBe('"a\\"b"');
      expect(nextAfter('abc\ndef', 0, '\n', false)).toBe(3);
      const policy = createDefaultQualityPolicy();
      const rustFiles = new Set<string>();
      scanRustCrates(tmpDir, policy, realTmp, rustFiles);
      const dotnetFiles = new Set<string>();
      scanDotNetProjects(tmpDir, policy, realTmp, dotnetFiles);
      expect(rustFiles.size).toBe(0);
      expect(dotnetFiles.size).toBe(0);
    });
  });
});
