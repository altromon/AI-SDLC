// BDD STEP DEFINITIONS (tests/features/uc-076-gherkin-resolver-mcp-parity.feature)
// Traceability: @UC-076-GHERKIN-RESOLVER-MCP-PARITY @FR-076-GHERKIN-RESOLVER-MCP-PARITY-001
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
  let resolvedLangs: string[] = [];
  let tsContent = '';
  let pyContent = '';
  let tsMatched: boolean | undefined;
  let pyMatched: boolean | undefined;

  function resetTmpDir(): string {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdd-uc076-'));
    return tmpDir;
  }

  registry.given('a repository with extracted ".feature" files and no "tests/steps/*" files at Checkpoint 1', () => {
    const dir = resetTmpDir();
    fs.mkdirSync(path.join(dir, 'tests', 'features'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'tests', 'features', 'uc076.feature'),
      '@UC-076-CP1\nFeature: UC076\n  Scenario: S\n    Given a\n',
      'utf-8'
    );
  });

  registry.when('MCP "sdd_check_fix" is called with "featuresOnly: true" and "verify_gherkin" is called with "featuresOnly: true"', () => {
    const res = core.checkGherkinInSync({ rootDir: tmpDir, featuresOnly: true });
    assert(res.inSync === true, 'Expected featuresOnly: true to pass');
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
    const dir = resetTmpDir();
    fs.mkdirSync(path.join(dir, 'tests', 'features'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'tests', 'features', 'fr-076-uc.feature'),
      '@FR-076-UC\nFeature: UC\n',
      'utf-8'
    );
    fs.mkdirSync(path.join(dir, 'specs', 'changes', 'active', 'chg-076-uc'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'specs', 'changes', 'active', 'chg-076-uc', 'tasks.md'),
      '---\nid: TSK-UC\nsatisfies-requirements: &ref_0\n  - FR-076-UC\ntasks:\n  - id: T1\n    satisfies-requirements: *ref_0\n    implements-contracts:\n      - MyUcContract\n---\n',
      'utf-8'
    );
    if (condition.includes('coverage')) {
      fs.mkdirSync(path.join(dir, 'scripts'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'scripts', 'gen.py'), '# FR-076-UC\n', 'utf-8');
    } else if (condition.includes('co-located')) {
      fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'src', 'uc.spec.ts'), '// FR-076-UC\n', 'utf-8');
    } else if (condition.includes('comment')) {
      fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'src', 'comment.py'), '# MyUcContract\n', 'utf-8');
    }
  });

  registry.when('"gherkin-language-resolver" resolves feature target languages', () => {
    resolvedLangs = resolver.resolveFeatureTargetLanguages(
      tmpDir,
      path.join(tmpDir, 'tests', 'features', 'fr-076-uc.feature')
    );
  });

  registry.then(/^it applies "([^"]*)" without false STEP_LANGUAGE_MISMATCH errors$/, () => {
    assert(resolvedLangs.length === 0, `RED: Expected no false language match, got [${resolvedLangs.join(', ')}]`);
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
}
