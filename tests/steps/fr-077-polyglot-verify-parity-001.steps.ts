// BDD STEP DEFINITIONS (tests/features/fr-077-polyglot-verify-parity-001.feature)
// Traceability: @FR-077-POLYGLOT-VERIFY-PARITY-001 @UC-077-POLYGLOT-VERIFY-PARITY @CHG-077-POLYGLOT-VERIFY-PARITY
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { BddStepRegistry } from '@aisdlc/core';
import { STARTER_QUALITY_POLICY } from '../../packages/core/src/init/index.js';
import {
  collectFilesToScan,
  createDefaultQualityPolicy,
  DEFAULT_EXTENSIONS,
} from '../../packages/core/src/verifiers/quality-gate.js';
import {
  hasModalityDriverSignature,
  isUiTestFile,
  stripTestComments,
} from '../../packages/core/src/verifiers/test-discovery.js';
import { verifyTraceability } from '../../packages/core/src/verifiers/traceability.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function registerSteps(registry: BddStepRegistry): void {
  let tmpDir = '';
  let artifactCase = '';
  let evaluatedOutcome = '';
  let rawTestContent = '';
  let strippedContent = '';
  let traceResult: ReturnType<typeof verifyTraceability> | undefined;

  function resetTmpDir(): string {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdd-fr077-'));
    return tmpDir;
  }

  registry.given(
    'a polyglot repository with tests like "test_auth.py", "AuthTests.cs", "AuthTest.kt", and "tests/auth_test.rs"',
    () => {
      const dir = resetTmpDir();
      fs.mkdirSync(path.join(dir, 'specs', 'handoffs'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'specs', 'product'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'specs', 'architecture'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'tests'), { recursive: true });

      fs.writeFileSync(
        path.join(dir, 'specs', 'handoffs', 'HOF-077.md'),
        '---\nid: HOF-077\ntype: handoff\nrequirements:\n  - FR-077-BDD\n---\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(dir, 'specs', 'product', 'UC-077-BDD.md'),
        '---\nid: UC-077-BDD\ntype: use-case\n---\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(dir, 'specs', 'product', 'FR-077-BDD.md'),
        '---\nid: FR-077-BDD\ntype: functional-requirement\nderived-from:\n  - UC-077-BDD\n---\n',
        'utf-8'
      );
      fs.writeFileSync(
        path.join(dir, 'specs', 'architecture', 'CMP-077-BDD.md'),
        '---\nid: CMP-077-BDD\ntype: component\nsatisfies-requirements:\n  - FR-077-BDD\ncontracts:\n  - authPolyglotContract\n---\n',
        'utf-8'
      );
      fs.writeFileSync(path.join(dir, 'tests', 'test_auth.py'), '# FR-077-BDD\nauthPolyglotContract()\n', 'utf-8');
      fs.writeFileSync(path.join(dir, 'tests', 'AuthTests.cs'), '// FR-077-BDD\nauthPolyglotContract();\n', 'utf-8');
      fs.writeFileSync(path.join(dir, 'tests', 'AuthTest.kt'), '// FR-077-BDD\nauthPolyglotContract()\n', 'utf-8');
      fs.writeFileSync(path.join(dir, 'tests', 'auth_test.rs'), '// FR-077-BDD\nauthPolyglotContract();\n', 'utf-8');
    }
  );

  registry.when('"verify traceability", "verify quality", and "test-discovery" execute', () => {
    traceResult = verifyTraceability({ rootDir: tmpDir });
  });

  registry.then(
    'polyglot unit and UI tests are indexed in "codeTestMap" and "testCorpus" rather than "prodCorpus"',
    () => {
      const row = traceResult?.rows.find((r) => r.id === 'FR-077-BDD');
      assert(row?.testStatus === 'COMPLIANT', 'RED: Expected polyglot tests in codeTestMap');
      const audit = traceResult?.contractAudits?.find((a) => a.method === 'authPolyglotContract');
      assert(audit?.testedInSuite === true && audit?.implementedInCode === false, 'RED: Expected polyglot tests in testCorpus, not prodCorpus');
    }
  );

  registry.given(
    '"DEFAULT_EXTENSIONS" and "STARTER_QUALITY_POLICY" include ".kt", ".mjs", ".cjs", ".cc", ".cxx", and ".hpp"',
    () => {
      for (const ext of ['.kt', '.mjs', '.cjs', '.cc', '.cxx', '.hpp']) {
        assert(DEFAULT_EXTENSIONS.includes(ext), `RED: DEFAULT_EXTENSIONS missing ${ext}`);
        assert(STARTER_QUALITY_POLICY.includes(`"${ext}"`), `RED: STARTER_QUALITY_POLICY missing ${ext}`);
      }
    }
  );

  registry.given(/^a repository artifact matching "([^"]*)"$/, (input: string) => {
    artifactCase = input;
    resetTmpDir();
  });

  registry.when('"collectFilesToScan", "isUiTestFile", or "hasModalityDriverSignature" evaluates it', () => {
    if (artifactCase.includes('Go cmd/internal/pkg')) {
      fs.mkdirSync(path.join(tmpDir, 'cmd', 'cli'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'cmd', 'cli', 'main.go'), 'package main\nfunc main() {}\n', 'utf-8');
      const files = collectFilesToScan(tmpDir, createDefaultQualityPolicy());
      evaluatedOutcome = files.some((f) => f.endsWith('main.go')) ? 'collectFilesToScan discovers production source files' : 'missed';
    } else if (artifactCase.includes('app_e2e_test.go')) {
      evaluatedOutcome = isUiTestFile('app_e2e_test.go') && isUiTestFile('app_ui_test.rs')
        ? 'isUiTestFile classifies the file as a UI test'
        : 'missed';
    } else if (artifactCase.includes('Expect(page)')) {
      evaluatedOutcome =
        hasModalityDriverSignature('await Expect(page).ToBeVisibleAsync();', 'web') &&
        hasModalityDriverSignature('import com.microsoft.playwright.Page;', 'web')
          ? 'hasModalityDriverSignature matches web modality'
          : 'missed';
    } else {
      evaluatedOutcome =
        hasModalityDriverSignature('exec.Command("cli")', 'console') &&
        hasModalityDriverSignature('Command::cargo_bin("cli")', 'console')
          ? 'hasModalityDriverSignature matches console modality'
          : 'missed';
    }
  });

  registry.then(/^the verifier produces "([^"]*)"$/, (expected: string) => {
    assert(evaluatedOutcome === expected, `RED: Expected "${expected}", got "${evaluatedOutcome}"`);
  });

  registry.given('a UI test containing \'page.locator("//button[@type=\\\'submit\\\']") // click submit\'', () => {
    rawTestContent = 'page.locator("//button[@type=\'submit\']") // click submit';
  });

  registry.when('"stripTestComments" processes the content', () => {
    strippedContent = stripTestComments(rawTestContent);
  });

  registry.then('the string literal \'"//button[@type=\\\'submit\\\']"\' is preserved intact', () => {
    assert(
      strippedContent.includes('"//button[@type=\'submit\']"'),
      `RED: XPath string literal was truncated: ${strippedContent}`
    );
  });

  registry.given("the trailing line comment '// click submit' is stripped", () => {
    assert(!strippedContent.includes('click submit'), `RED: Comment was not stripped: ${strippedContent}`);
  });
}
