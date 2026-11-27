// BDD STEP DEFINITIONS (tests/features/fr-076-gherkin-resolver-mcp-parity-001.feature)
// Traceability: @FR-076-GHERKIN-RESOLVER-MCP-PARITY-001 @UC-076-GHERKIN-RESOLVER-MCP-PARITY @CHG-076-GHERKIN-RESOLVER-MCP-PARITY
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
  let pyContent = '';
  let tsContent = '';
  let idPatterns: RegExp[] = [];
  let symbolPatterns: RegExp[] = [];
  let pySymbolMatched: boolean | undefined;
  let tsIdMatched: boolean | undefined;
  let scenarioInput = '';
  let resolverOutcome = '';

  function resetTmpDir(): string {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdd-fr076-'));
    return tmpDir;
  }

  registry.given('a project with extracted ".feature" files and no "tests/steps/*" files yet', () => {
    const dir = resetTmpDir();
    fs.mkdirSync(path.join(dir, 'tests', 'features'), { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'tests', 'features', 'sample.feature'),
      '@FR-076-SAMPLE\nFeature: Sample\n  Scenario: S\n    Given a\n    When b\n    Then c\n',
      'utf-8'
    );
  });

  registry.when(
    'MCP "sdd_check_fix" is invoked with "featuresOnly: true" and MCP "verify_gherkin" is invoked with "featuresOnly: true"',
    () => {
      const checkFix = core.checkGherkinInSync({ rootDir: tmpDir, featuresOnly: true });
      assert(checkFix.inSync === true, 'Expected featuresOnly: true to report inSync: true');
    }
  );

  registry.then('"sdd_check_fix" skips step scaffolding and succeeds', () => {
    const stepsDir = path.join(tmpDir, 'tests', 'steps');
    assert(!fs.existsSync(stepsDir), 'Expected tests/steps not to be created when featuresOnly: true');
  });

  registry.given(
    '"verify_gherkin" returns "inSync: true" with "totalFeatures", "missingFiles", "outOfSyncFiles", "orphanFeatureFiles", "missingStepFiles", and "stepLanguageMismatches"',
    () => {
      const syncRes = core.checkGherkinInSync({ rootDir: tmpDir, featuresOnly: true });
      assert(syncRes.inSync === true, 'Expected inSync: true');
      assert(typeof syncRes.totalFeatures === 'number', 'Expected totalFeatures');
    }
  );

  registry.given(
    'when "sdd_check_fix" is invoked with "featuresOnly: false", it invokes "autoScaffoldMissingSteps" from "@aisdlc/core" before checking sync',
    () => {
      const fn = (core as Record<string, unknown>).autoScaffoldMissingSteps;
      assert(typeof fn === 'function', 'RED: autoScaffoldMissingSteps must be exported from @aisdlc/core');
    }
  );

  registry.given(/^a workspace containing "([^"]*)"$/, (input: string) => {
    scenarioInput = input;
    resetTmpDir();
  });

  registry.when('"parseChangeSpecMetadata", "walkProductionSourceFiles", or "fileMatchesFeature" executes', () => {
    if (scenarioInput.includes('YAML anchors')) {
      const meta = resolver.parseChangeSpecMetadata(
        '---\nid: TSK-076-1\ntasks:\n  - id: T1\n    satisfies-requirements: &ref_0\n      - FR-076-A\n  - id: T2\n    satisfies-requirements: *ref_0\n---\n'
      );
      resolverOutcome = meta.referencedIds.includes('FR-076-A') ? 'anchored-ok' : 'anchored-missing';
    } else if (scenarioInput.includes('DesignContractDeclaration')) {
      const meta = resolver.parseChangeSpecMetadata(
        '---\nid: DSG-076\ntasks:\n  - id: T1\n    implements-contracts:\n      - interface: MySvc\n        methods:\n          - doWork\n---\n'
      );
      resolverOutcome = meta.contracts.includes('doWork') ? 'contract-ok' : 'contract-missing';
    } else if (scenarioInput.includes('coverage')) {
      fs.mkdirSync(path.join(tmpDir, 'coverage'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'coverage', 'cov.ts'), 'export const c = 1;\n', 'utf-8');
      const walked = resolver.walkProductionSourceFiles(tmpDir);
      resolverOutcome = walked.some((f) => f.includes('coverage')) ? 'dir-leaked' : 'dir-excluded';
    } else if (scenarioInput.includes('co-located')) {
      fs.mkdirSync(path.join(tmpDir, 'src', 'app'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'src', 'app', 'foo.spec.ts'), 'export const t = 1;\n', 'utf-8');
      const walked = resolver.walkProductionSourceFiles(tmpDir);
      resolverOutcome = walked.some((f) => f.endsWith('foo.spec.ts')) ? 'test-leaked' : 'test-excluded';
    } else {
      const stripFn = (resolver as Record<string, unknown>).stripCodeComments as ((s: string) => string) | undefined;
      assert(typeof stripFn === 'function', 'RED: stripCodeComments must be exported');
      const stripped = stripFn('const s = "a // b"; // dropMe');
      resolverOutcome = stripped.includes('a // b') && !stripped.includes('dropMe') ? 'literal-ok' : 'literal-failed';
    }
  });

  registry.then(/^the resolver produces "([^"]*)"$/, (_expected: string) => {
    assert(
      resolverOutcome.endsWith('-ok') || resolverOutcome.endsWith('-excluded'),
      `RED: Resolver failed for "${scenarioInput}" (got ${resolverOutcome})`
    );
  });

  registry.given(
    'a ".feature" file with contract symbol "autoScaffoldMissingSteps" and ID "FR-076-GHERKIN-RESOLVER-MCP-PARITY-001"',
    () => {
      idPatterns = [/\bFR-076-GHERKIN-RESOLVER-MCP-PARITY-001\b/i];
      symbolPatterns = [/\bautoScaffoldMissingSteps\b/];
    }
  );

  registry.given('a Python file containing "# autoScaffoldMissingSteps" in a comment without calling it in code', () => {
    pyContent = '# autoScaffoldMissingSteps\ndef helper():\n    return 1\n';
  });

  registry.given('a TypeScript file containing "// Cites: FR-076-GHERKIN-RESOLVER-MCP-PARITY-001"', () => {
    tsContent = '// Cites: FR-076-GHERKIN-RESOLVER-MCP-PARITY-001\nexport const ok = true;\n';
  });

  registry.when('"fileMatchesFeature" evaluates both files', () => {
    pySymbolMatched = resolver.fileMatchesFeature(pyContent, [], symbolPatterns);
    tsIdMatched = resolver.fileMatchesFeature(tsContent, idPatterns, []);
  });

  registry.then('the Python file returns false for "symbolPatterns" matching', () => {
    assert(pySymbolMatched === false, 'RED: Expected comment-only Python symbol not to match symbolPatterns');
  });

  registry.given('the TypeScript file returns true for "idPatterns" matching', () => {
    assert(tsIdMatched === true, 'Expected comment ID citation to match idPatterns');
  });
}
