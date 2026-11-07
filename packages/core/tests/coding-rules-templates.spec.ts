import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  detectProjectStacks,
  getCodingRulesFilesForStacks,
  initProject,
  isProtectedCodingRulesFile,
  PRE_COMMIT_SCRIPT,
  PROTECTED_CODING_RULES_FILES,
  resolveCodingRuleStacks,
} from '../src/index.js';

describe('Polyglot Immutable Coding Rules & Agent Guardrails Suite', () => {
  const tempDir = path.join(os.tmpdir(), 'test-core-coding-rules-' + process.pid);

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('always scaffolds reference coding rules templates under templates/coding-rules/', () => {
    const result = initProject({ targetDir: tempDir });
    expect(result.success).toBe(true);

    expect(fs.existsSync(path.join(tempDir, 'templates/coding-rules/dotnet/Directory.Build.props'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates/coding-rules/typescript/tsconfig.strict.json'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates/coding-rules/typescript/eslint.config.mjs'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates/coding-rules/jvm/aisdlc-strict.init.gradle.kts'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates/coding-rules/java/aisdlc-ruleset.xml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates/coding-rules/kotlin/detekt.yml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates/coding-rules/rust/config.toml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates/coding-rules/rust/.clippy.toml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates/coding-rules/go/.golangci.yml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates/coding-rules/cpp/.clang-tidy'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates/coding-rules/cpp/AisdlcStrictCompiler.cmake'))).toBe(true);
  });

  it('deploys multiple technology stack coding rules simultaneously when stack option is comma-separated', () => {
    const result = initProject({
      targetDir: tempDir,
      stack: 'dotnet,angular,rust,go,java,kotlin,cpp',
    });
    expect(result.success).toBe(true);
    expect(result.stacksConfigured).toEqual(
      expect.arrayContaining(['dotnet', 'angular', 'rust', 'go', 'java', 'kotlin', 'cpp'])
    );

    const expectedFiles = PROTECTED_CODING_RULES_FILES.filter((f) => f !== '.github/CODEOWNERS');
    for (const relPath of expectedFiles) {
      expect(fs.existsSync(path.join(tempDir, relPath)), `Missing ${relPath}`).toBe(true);
    }

    const propsContent = fs.readFileSync(path.join(tempDir, 'Directory.Build.props'), 'utf-8');
    expect(propsContent).toContain('<TreatWarningsAsErrors>true</TreatWarningsAsErrors>');
    expect(propsContent).toContain('SonarAnalyzer.CSharp');
    expect(propsContent).toContain('S2699');
    expect(propsContent).toContain('MSTEST0006');
  });

  it('auto-detects project stacks from existing project files when stack option is omitted', () => {
    fs.writeFileSync(path.join(tempDir, 'App.sln'), '', 'utf-8');
    fs.writeFileSync(path.join(tempDir, 'angular.json'), '{}', 'utf-8');
    fs.writeFileSync(path.join(tempDir, 'Cargo.toml'), '[package]', 'utf-8');
    fs.writeFileSync(path.join(tempDir, 'go.mod'), 'module example.com/m', 'utf-8');

    const detected = detectProjectStacks(tempDir);
    expect(detected).toEqual(expect.arrayContaining(['dotnet', 'angular', 'rust', 'go']));

    const result = initProject({ targetDir: tempDir });
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'Directory.Build.props'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'tsconfig.strict.json'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'eslint.config.mjs'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.cargo/config.toml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.golangci.yml'))).toBe(true);
  });

  it('never overwrites human-customized root coding rules files even when force is true', () => {
    const customProps = '<Project><!-- Custom Human Rules --></Project>\n';
    fs.writeFileSync(path.join(tempDir, 'Directory.Build.props'), customProps, 'utf-8');

    const result = initProject({
      targetDir: tempDir,
      stack: 'dotnet',
      force: true,
    });
    expect(result.success).toBe(true);
    expect(fs.readFileSync(path.join(tempDir, 'Directory.Build.props'), 'utf-8')).toBe(customProps);
  });

  it('validates stack aliases and rejects unknown stack names', () => {
    const valid = resolveCodingRuleStacks('c#,ts,kt,c++', tempDir);
    expect(valid.valid).toBe(true);
    expect(valid.stacks).toEqual(['dotnet', 'typescript', 'kotlin', 'cpp']);

    const invalid = resolveCodingRuleStacks('dotnet,cobol', tempDir);
    expect(invalid.valid).toBe(false);
    expect(invalid.error).toContain('cobol');
  });

  it('identifies protected coding rules files and blocks AI agent edits in guard-branch.cjs', () => {
    expect(isProtectedCodingRulesFile('Directory.Build.props')).toBe(true);
    expect(isProtectedCodingRulesFile('.golangci.yml')).toBe(true);
    expect(isProtectedCodingRulesFile('src/Program.cs')).toBe(false);

    const result = initProject({ targetDir: tempDir, stack: 'dotnet', agents: 'antigravity' });
    expect(result.success).toBe(true);

    const guardScript = path.join(tempDir, 'scripts/guard-branch.cjs');
    expect(fs.existsSync(guardScript)).toBe(true);

    const payload = JSON.stringify({
      workspacePaths: [tempDir],
      toolCall: {
        args: {
          Path: path.join(tempDir, 'Directory.Build.props'),
        },
      },
    });

    const proc = spawnSync(process.execPath, [guardScript], {
      input: payload,
      encoding: 'utf-8',
    });
    expect(proc.status).toBe(0);
    const decision = JSON.parse(proc.stdout.trim());
    expect(decision.decision).toBe('deny');
    expect(decision.reason).toContain('Immutable Coding Rules Guard');
  });

  it('includes agent coding rules immutability guard in PRE_COMMIT_SCRIPT', () => {
    expect(PRE_COMMIT_SCRIPT).toContain('Immutable Coding Rules Guard');
    expect(PRE_COMMIT_SCRIPT).toContain('Directory\\.Build\\.props');
    expect(PRE_COMMIT_SCRIPT).toContain('--diff-filter=AMDR');
    expect(PRE_COMMIT_SCRIPT).toContain('\\.github/CODEOWNERS');
  });
});
