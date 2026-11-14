import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import {
  BddStepRegistry,
  executeBddFeature,
  readCodeCoverageSummary,
  readNormalizedCoverage,
  scanAllTestArtifacts,
  verifyBddReportAttestation,
  verifyQualityGate,
  verifyTestingCoverage,
} from '../src/index.js';

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(root: string, rel: string, content: string): string {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
  return full;
}

describe('ENT-07: Universal Multi-Format Coverage Normalizer, Polyglot Test Discovery & BDD Attestation', () => {
  describe('1. Polyglot Test Discovery & Policy Customization', () => {
    it('discovers .NET xUnit (*Tests.cs), Pytest (test_*.py), JUnit (*Test.java), and Rust (tests/*.rs) in scanAllTestArtifacts', () => {
      const tmp = makeTempDir('aisdlc-poly-disc-');
      try {
        writeFile(tmp, 'tests/OrderServiceTests.cs', '// Verifies FR-NET-001\n[Fact] public void ShouldCreateOrder() {}');
        writeFile(tmp, 'tests/test_billing.py', '# FR-PY-001\ndef test_charge(): assert True');
        writeFile(tmp, 'src/test/java/com/acme/PaymentTest.java', '// FR-JAVA-001\n@Test void shouldPay() {}');
        writeFile(tmp, 'tests/integration_flow.rs', '// FR-RS-001\n#[test] fn works() {}');

        const map = scanAllTestArtifacts(tmp);
        expect(map.get('FR-NET-001')).toEqual(['tests/OrderServiceTests.cs']);
        expect(map.get('FR-PY-001')).toEqual(['tests/test_billing.py']);
        expect(map.get('FR-JAVA-001')).toEqual(['src/test/java/com/acme/PaymentTest.java']);
        expect(map.get('FR-RS-001')).toEqual(['tests/integration_flow.rs']);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('supports custom test_patterns in quality-policy.yaml for verifyTestingCoverage and verifyQualityGate', () => {
      const tmp = makeTempDir('aisdlc-policy-pats-');
      try {
        writeFile(
          tmp,
          'quality-policy.yaml',
          [
            'version: "1.0"',
            'project: "DotNetPolicy"',
            'enforcement_mode: "STRICT"',
            'scope:',
            '  target_directories: ["src"]',
            '  supported_extensions: [".cs"]',
            '  test_patterns: ["**/*IntegrationCheck.cs"]',
            'release_thresholds:',
            '  cyclomatic_complexity: { max_per_function: 10, action_on_breach: "BLOCK_MERGE" }',
            '  cognitive_complexity: { max_per_function: 15, action_on_breach: "BLOCK_MERGE" }',
            '  maintainability_index: { min_acceptable_score: 50, action_on_breach: "BLOCK_MERGE" }',
            '  code_duplication: { max_percentage: 3, action_on_breach: "BLOCK_MERGE" }',
            '  test_coverage: { min_line_coverage_percent: 80, min_branch_coverage_percent: 70, min_function_coverage_percent: 80, action_on_breach: "BLOCK_MERGE" }',
            'coding_rules: { standards: ["Clean Code"], enforce_formatting: true, rules: {} }',
            'agent_guardrails: {}',
          ].join('\n')
        );
        writeFile(
          tmp,
          'specs/product/FR-NET-002.md',
          ['---', 'id: FR-NET-002', 'title: DotNet Tax Calculation', '---', '# FR-NET-002'].join('\n')
        );
        writeFile(tmp, 'src/TaxCalculator.cs', 'public class TaxCalculator { public decimal CalculateTax(decimal x) { return x * 0.21m; } }');
        writeFile(tmp, 'src/TaxCalculatorIntegrationCheck.cs', '// FR-NET-002\npublic class TaxCalculatorIntegrationCheck { void Run() { new TaxCalculator().CalculateTax(10m); } }');

        const covRes = verifyTestingCoverage({ rootDir: tmp });
        expect(covRes.success).toBe(true);
        expect(covRes.requirements[0].testRefs).toContain('TaxCalculatorIntegrationCheck.cs');

        const gateRes = verifyQualityGate({ rootDir: tmp, requireFunctionUnitTests: true });
        expect(gateRes.untestedFunctions).toEqual([]);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  describe('2. Universal Multi-Format Coverage Normalizer', () => {
    it('ingests .NET Coverlet Cobertura XML from TestResults/<guid>/coverage.cobertura.xml and enforces thresholds', () => {
      const tmp = makeTempDir('aisdlc-dotnet-cov-');
      try {
        writeFile(
          tmp,
          'TestResults/a1b2c3d4/coverage.cobertura.xml',
          [
            '<?xml version="1.0" encoding="utf-8"?>',
            '<coverage line-rate="0.90" branch-rate="0.85" lines-covered="90" lines-valid="100" branches-covered="17" branches-valid="20">',
            '  <packages><package name="App"><classes><class name="Svc"><methods>',
            '    <method name="Run" line-rate="1.0" />',
            '    <method name="Helper" line-rate="1.0" />',
            '  </methods></class></classes></package></packages>',
            '</coverage>',
          ].join('\n')
        );
        writeFile(tmp, 'src/Svc.cs', 'public class Svc { public int Run() => 1; }');

        const norm = readNormalizedCoverage(tmp);
        expect(norm).toEqual({
          linesPct: 90,
          branchesPct: 85,
          functionsPct: 100,
          source: 'TestResults/a1b2c3d4/coverage.cobertura.xml',
          format: 'cobertura',
        });
        expect(readCodeCoverageSummary(tmp)).toEqual(norm);

        const passGate = verifyQualityGate({ rootDir: tmp, requireCoverageReport: true });
        expect(passGate.coverageViolations).toEqual([]);
        expect(passGate.success).toBe(true);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('blocks Quality Gate when Pytest Cobertura XML is below threshold', () => {
      const tmp = makeTempDir('aisdlc-py-cov-');
      try {
        writeFile(
          tmp,
          'coverage.xml',
          '<coverage line-rate="0.5" branch-rate="0.4" lines-covered="50" lines-valid="100" branches-covered="8" branches-valid="20"></coverage>'
        );
        writeFile(tmp, 'src/app.py', 'def ok():\n    return 1\n');

        const gate = verifyQualityGate({ rootDir: tmp, requireCoverageReport: true });
        expect(gate.success).toBe(false);
        expect(gate.coverageViolations.some((v) => v.includes('Line coverage 50%'))).toBe(true);
        expect(gate.coverageViolations.some((v) => v.includes('Branch coverage 40%'))).toBe(true);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('ingests JaCoCo XML using report-level counters without double-counting package counters', () => {
      const tmp = makeTempDir('aisdlc-jacoco-cov-');
      try {
        writeFile(
          tmp,
          'target/site/jacoco/jacoco.xml',
          [
            '<report name="demo">',
            '  <package name="com/acme">',
            '    <counter type="LINE" missed="5" covered="45"/>',
            '    <counter type="BRANCH" missed="2" covered="8"/>',
            '    <counter type="METHOD" missed="1" covered="9"/>',
            '  </package>',
            '  <counter type="LINE" missed="10" covered="90"/>',
            '  <counter type="BRANCH" missed="4" covered="16"/>',
            '  <counter type="METHOD" missed="1" covered="19"/>',
            '</report>',
          ].join('\n')
        );

        const norm = readNormalizedCoverage(tmp);
        expect(norm).toEqual({
          linesPct: 90,
          branchesPct: 80,
          functionsPct: 95,
          source: 'target/site/jacoco/jacoco.xml',
          format: 'jacoco',
        });
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('ingests Go coverprofile (coverage.out)', () => {
      const tmp = makeTempDir('aisdlc-go-cov-');
      try {
        writeFile(
          tmp,
          'coverage.out',
          [
            'mode: set',
            'github.com/acme/app/calc.go:10.2,14.12 8 1',
            'github.com/acme/app/calc.go:16.2,18.5 2 0',
          ].join('\n')
        );

        const norm = readNormalizedCoverage(tmp);
        expect(norm?.format).toBe('go-coverprofile');
        expect(norm?.linesPct).toBe(80);
        expect(norm?.statementsPct).toBe(80);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });

    it('ingests LLVM-cov JSON (llvm-cov.json)', () => {
      const tmp = makeTempDir('aisdlc-llvm-cov-');
      try {
        writeFile(
          tmp,
          'coverage/llvm-cov.json',
          JSON.stringify({
            type: 'llvm.coverage.json.export',
            version: '2.0.1',
            data: [
              {
                totals: {
                  lines: { count: 200, covered: 180 },
                  branches: { count: 40, covered: 34 },
                  functions: { count: 20, covered: 19 },
                },
              },
            ],
          })
        );

        const norm = readNormalizedCoverage(tmp);
        expect(norm).toEqual({
          linesPct: 90,
          branchesPct: 85,
          functionsPct: 95,
          source: 'coverage/llvm-cov.json',
          format: 'llvm-cov',
        });
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  describe('3. BDD SHA-256 Cryptographic Attestation', () => {
    it('seals cucumber-report.json with SHA-256 attestation and detects feature drift or report tampering', async () => {
      const tmp = makeTempDir('aisdlc-bdd-att-');
      try {
        const featurePath = writeFile(
          tmp,
          'tests/features/fr-att-001.feature',
          [
            '@FR-ATT-001 @automated',
            'Feature: Attested Checkout',
            '  Scenario: Successful checkout',
            '    Given cart has 1 item',
            '    Then checkout succeeds',
          ].join('\n')
        );

        const registry = new BddStepRegistry()
          .given('cart has 1 item', () => undefined)
          .then('checkout succeeds', () => undefined);

        const reportPath = path.join(tmp, 'reports', 'cucumber-report.json');
        await executeBddFeature(featurePath, registry, { rootDir: tmp, writeReportPath: reportPath });

        const validCheck = verifyBddReportAttestation(reportPath, tmp, { requireAttestation: true });
        expect(validCheck.valid).toBe(true);
        expect(validCheck.verifiedFeatures).toBe(1);

        const covPass = verifyTestingCoverage({
          rootDir: tmp,
          enforceCucumberExecution: true,
          enforceBddAttestation: true,
        });
        expect(covPass.success).toBe(true);
        expect(covPass.cucumberExecution?.attestationValid).toBe(true);

        // 1) Tamper with the .feature file after execution -> drift must be detected
        fs.appendFileSync(featurePath, '\n    And an extra unattested step\n', 'utf-8');
        const driftCheck = verifyBddReportAttestation(reportPath, tmp, { requireAttestation: true });
        expect(driftCheck.valid).toBe(false);
        expect(driftCheck.errors.some((e) => e.includes('SHA-256 drift'))).toBe(true);

        const covDrift = verifyTestingCoverage({
          rootDir: tmp,
          enforceCucumberExecution: true,
          enforceBddAttestation: true,
        });
        expect(covDrift.success).toBe(false);
        expect(covDrift.cucumberExecution?.attestationValid).toBe(false);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  });
});
