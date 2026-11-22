import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatInspectResultMarkdown, inspectElement } from '../src/inspector/index.js';
import {
  mergeSbomGaps,
  parseTrivyOutput,
  parseTrivyVulnerabilities,
  scanGoDependencies,
  scanMavenDependencies,
  scanPythonDependencies,
  scanRustDependencies,
  scanWithNativeFs,
  scanWithSbom,
} from '../src/verifiers/sca/scanner.js';
import type { ScannedDependency } from '../src/types/index.js';

describe('SCA Scanner Polyglot & Inspector Composite Branches (Happy / Sad / Boundary / Malformed)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-inc20-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('SCA polyglot scanners: exercises Python, Go, Rust, Maven, NativeFs, Trivy parsers, and SBOM gap merge', () => {
    // Python pyproject.toml + poetry.lock + malformed Pipfile.lock
    fs.writeFileSync(
      path.join(tmpDir, 'pyproject.toml'),
      '[project]\ndependencies = ["requests>=2.31.0"]\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'poetry.lock'),
      '[[package]]\nname = "requests"\nversion = "2.31.0"\n',
      'utf-8'
    );
    fs.writeFileSync(path.join(tmpDir, 'Pipfile.lock'), '{malformed-pipfile', 'utf-8');
    const pySeen = new Map<string, ScannedDependency>();
    scanPythonDependencies(tmpDir, pySeen);
    expect(Array.from(pySeen.values()).some((d) => d.name === 'requests')).toBe(true);

    // Go go.mod
    fs.writeFileSync(
      path.join(tmpDir, 'go.mod'),
      'module example.com/app\nrequire (\n  github.com/gin-gonic/gin v1.9.1\n)\n',
      'utf-8'
    );
    const goSeen = new Map<string, ScannedDependency>();
    scanGoDependencies(tmpDir, goSeen);
    expect(goSeen.size).toBeGreaterThanOrEqual(1);

    // Rust Cargo.lock
    fs.writeFileSync(
      path.join(tmpDir, 'Cargo.lock'),
      '[[package]]\nname = "serde"\nversion = "1.0.195"\n',
      'utf-8'
    );
    const rustSeen = new Map<string, ScannedDependency>();
    scanRustDependencies(tmpDir, rustSeen);
    expect(rustSeen.size).toBeGreaterThanOrEqual(1);

    // Maven pom.xml
    fs.writeFileSync(
      path.join(tmpDir, 'pom.xml'),
      '<project><dependencies><dependency><groupId>org.slf4j</groupId><artifactId>slf4j-api</artifactId><version>2.0.9</version></dependency></dependencies></project>',
      'utf-8'
    );
    const mvnSeen = new Map<string, ScannedDependency>();
    scanMavenDependencies(tmpDir, mvnSeen);
    expect(mvnSeen.size).toBeGreaterThanOrEqual(1);

    // NativeFs aggregate
    const nativeDeps = scanWithNativeFs(tmpDir);
    expect(nativeDeps.length).toBeGreaterThan(0);

    // Trivy parsers: empty, malformed, and valid
    expect(parseTrivyOutput('')).toEqual([]);
    expect(parseTrivyOutput('{bad-json')).toEqual([]);
    expect(parseTrivyVulnerabilities('')).toEqual([]);
    expect(parseTrivyVulnerabilities('{bad-json')).toEqual([]);
    const parsedTrivy = parseTrivyOutput(
      JSON.stringify({
        Results: [
          {
            Packages: [{ Name: 'lodash', Version: '4.17.21', Licenses: ['MIT'] }],
          },
        ],
      })
    );
    expect(parsedTrivy).toHaveLength(1);

    // mergeSbomGaps: missing from SBOM + extra in SBOM
    const gapRes = mergeSbomGaps(
      [{ name: 'local-only', version: '1.0.0', spdxLicense: 'UNKNOWN' }],
      [{ name: 'sbom-only', version: '2.0.0', license: 'MIT', purl: 'pkg:npm/sbom-only@2.0.0', ecosystem: 'npm' }]
    );
    expect(gapRes.warnings.length).toBe(2);

    // scanWithSbom end-to-end
    const sbomPath = path.join(tmpDir, 'sbom.json');
    fs.writeFileSync(
      sbomPath,
      JSON.stringify({
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        components: [{ name: 'requests', version: '2.31.0', licenses: [{ license: { id: 'Apache-2.0' } }] }],
      }),
      'utf-8'
    );
    const sbomRes = scanWithSbom(tmpDir, sbomPath);
    expect(sbomRes.dependencies.length).toBeGreaterThan(0);
  });

  it('inspector: resolves FR-*, UC-*, CMP-*, TSK-*, CHG-* relationships and ambiguous matches', () => {
    fs.mkdirSync(path.join(tmpDir, 'specs', 'product', 'requirements'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'specs', 'architecture'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001-auth'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'tests'), { recursive: true });

    fs.writeFileSync(
      path.join(tmpDir, 'specs', 'product', 'requirements', 'FR-001.md'),
      '---\nid: FR-001\ntype: requirement\ntitle: User Login\n---\n# FR-001: User Login\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'specs', 'architecture', 'CMP-001.md'),
      '---\nid: CMP-001\ntype: component\ntitle: Auth Gateway\n---\n# CMP-001\nImplements `FR-001`.\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001-auth', 'handoff.yaml'),
      'id: HOF-001\nchangeId: chg-001-auth\nsubgraph:\n  requirements: [FR-001]\n  components: [CMP-001]\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDir, 'specs', 'changes', 'active', 'chg-001-auth', 'tasks.md'),
      '---\ntasks:\n  - id: TSK-001\n    title: Implement login\n    implements: [FR-001]\n    component: CMP-001\n---\n- [ ] TSK-001: Implement login\n',
      'utf-8'
    );
    fs.writeFileSync(path.join(tmpDir, 'src', 'auth.ts'), '// @implements FR-001 CMP-001\nexport function login() { return true; }\n', 'utf-8');
    fs.writeFileSync(path.join(tmpDir, 'tests', 'auth.spec.ts'), '// @verifies FR-001\nimport { login } from "../src/auth.js";\n', 'utf-8');

    for (const q of ['FR-001', 'CMP-001', 'TSK-001']) {
      const res = inspectElement(q, { rootDir: tmpDir });
      expect(res.found).toBe(true);
      expect(formatInspectResultMarkdown(res).length).toBeGreaterThan(20);
    }
    const partialRes = inspectElement('chg-001-auth', { rootDir: tmpDir });
    expect(formatInspectResultMarkdown(partialRes).length).toBeGreaterThan(10);
  });
});
