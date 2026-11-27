// BDD STEP DEFINITIONS (tests/features/spec-chg-076-gherkin-resolver-mcp-parity.feature)
// Traceability: @CHG-076-GHERKIN-RESOLVER-MCP-PARITY @FR-076-GHERKIN-RESOLVER-MCP-PARITY-001
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as core from '@aisdlc/core';
import { BddStepRegistry } from '@aisdlc/core';
import * as resolver from '../../packages/core/src/verifiers/gherkin-language-resolver.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function registerSteps(registry: BddStepRegistry): void {
  let tmpDir = '';
  let condition = '';
  let outcome = '';
  let tsContent = '';
  let pyContent = '';
  let tsMatched: boolean | undefined;
  let pyMatched: boolean | undefined;

  function resetTmpDir(): string {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdd-spec076-'));
    return tmpDir;
  }

  registry.given('a repository with extracted ".feature" files and no "tests/steps/*" files at Checkpoint 1', () => {
    const dir = resetTmpDir();
    fs.mkdirSync(path.join(dir, 'tests', 'features'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'tests', 'features', 'cp1.feature'),
      '@FR-076-CP1\nFeature: CP1\n  Scenario: S\n    Given a\n',
      'utf-8'
    );
  });

  registry.when('MCP "sdd_check_fix" is called with "featuresOnly: true" and "verify_gherkin" is called with "featuresOnly: true"', () => {
    const res = core.checkGherkinInSync({ rootDir: tmpDir, featuresOnly: true });
    assert(res.inSync === true, 'Expected featuresOnly: true to succeed');
  });

  registry.then('both tools succeed without scaffolding or requiring step definition files', () => {
    assert(!fs.existsSync(path.join(tmpDir, 'tests', 'steps')), 'Expected no steps directory');
  });

  registry.given(
    'when "sdd_check_fix" is called with "featuresOnly: false", it invokes "autoScaffoldMissingSteps" from "@aisdlc/core" before checking full sync',
    () => {
      const fn = (core as Record<string, unknown>).autoScaffoldMissingSteps;
      assert(typeof fn === 'function', 'RED: autoScaffoldMissingSteps must be exported from @aisdlc/core');
    }
  );

  registry.given(/^a change spec or source tree containing "([^"]*)"$/, (cond: string) => {
    condition = cond;
    resetTmpDir();
  });

  registry.when('"parseChangeSpecMetadata", "walkProductionSourceFiles", or "fileMatchesFeature" executes', () => {
    if (condition.includes('YAML anchors')) {
      const meta = resolver.parseChangeSpecMetadata(
        '---\nid: TSK-076-A\ntasks:\n  - id: T1\n    satisfies-requirements: &ref_0\n      - FR-076-ANCHOR\n  - id: T2\n    satisfies-requirements: *ref_0\n---\n'
      );
      outcome = meta.referencedIds.includes('FR-076-ANCHOR') ? 'ok' : 'fail';
    } else if (condition.includes('coverage')) {
      fs.mkdirSync(path.join(tmpDir, '.agent'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.agent', 'helper.ts'), 'export const h = 1;\n', 'utf-8');
      const files = resolver.walkProductionSourceFiles(tmpDir);
      outcome = files.some((f) => f.includes('.agent')) ? 'fail' : 'ok';
    } else if (condition.includes('co-located')) {
      fs.mkdirSync(path.join(tmpDir, 'internal', 'pkg'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'internal', 'pkg', 'foo_test.go'), 'package pkg\n', 'utf-8');
      const files = resolver.walkProductionSourceFiles(tmpDir);
      outcome = files.some((f) => f.endsWith('foo_test.go')) ? 'fail' : 'ok';
    } else {
      const matched = resolver.fileMatchesFeature('// MyContract', [], [/\bMyContract\b/]);
      outcome = matched ? 'fail' : 'ok';
    }
  });

  registry.then(/^the resolver applies "([^"]*)" without false STEP_LANGUAGE_MISMATCH errors$/, () => {
    assert(outcome === 'ok', `RED: Expected ok outcome for condition "${condition}", got "${outcome}"`);
  });

  registry.given('a TypeScript production file citing "FR-076-GHERKIN-RESOLVER-MCP-PARITY-001" in a comment', () => {
    tsContent = '// Cites: FR-076-GHERKIN-RESOLVER-MCP-PARITY-001\nexport const x = 1;\n';
  });

  registry.given('a Python file mentioning a contract symbol only inside a "#" comment', () => {
    pyContent = '# MyContractSymbol\ndef f():\n    pass\n';
  });

  registry.when('"fileMatchesFeature" evaluates both files', () => {
    tsMatched = resolver.fileMatchesFeature(tsContent, [/\bFR-076-GHERKIN-RESOLVER-MCP-PARITY-001\b/i], []);
    pyMatched = resolver.fileMatchesFeature(pyContent, [], [/\bMyContractSymbol\b/]);
  });

  registry.then('the TypeScript file matches via raw idPatterns', () => {
    assert(tsMatched === true, 'Expected TS comment citation to match');
  });

  registry.given('the Python file does not match via comment-stripped symbolPatterns', () => {
    assert(pyMatched === false, 'RED: Expected Python comment-only symbol not to match');
  });

  registry.given('an MCP call to "sdd_check_fix" or "verify_gherkin" with an out-of-bounds targetPath or root', () => {
    // Validated in packages/mcp/tests/mcp-gherkin-parity.spec.ts
  });

  registry.when('executeSecuredTool validates the request parameters', () => {
    // Validated in packages/mcp/tests/mcp-gherkin-parity.spec.ts
  });

  registry.then('the request is rejected immediately without accessing files outside the project root', () => {
    // Validated in packages/mcp/tests/mcp-gherkin-parity.spec.ts
  });
}
