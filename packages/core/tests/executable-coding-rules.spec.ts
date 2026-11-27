import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ESLint } from 'eslint';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CodingRuleStack,
  CPP_CLANG_TIDY,
  detectProjectStacks,
  getCodingRulesFilesForStacks,
  GO_GOLANGCI_YML,
  isProtectedCodingRulesFile,
  JAVA_PMD_RULESET_XML,
  JS_ESLINT_CONFIG_MJS,
  PROTECTED_CODING_RULES_FILES,
  resolveCodingRuleStacks,
  TS_ESLINT_CONFIG_MJS,
  VALID_CODING_RULE_STACKS,
} from '../src/init/coding-rules-templates.js';
import { initProject } from '../src/init/index.js';
import {
  collectCodingRulesBypassViolations,
  collectMissingCodingRuleViolations,
} from '../src/verifiers/coding-rules-bypass.js';

const tempDirs: string[] = [];

function setupTempRepo(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecr-073-'));
  tempDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf-8');
  }
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('CHG-073: Executable Strict Coding Rules Per Stack', () => {
  describe('TSK-073-01: Python stack (py alias), ruff.toml, mypy.ini, and bypass checks', () => {
    it('includes python in VALID_CODING_RULE_STACKS and resolves py alias', () => {
      expect(VALID_CODING_RULE_STACKS).toContain('python' as CodingRuleStack);
      const dir = setupTempRepo({});
      expect(resolveCodingRuleStacks('py', dir)).toEqual({ valid: true, stacks: ['python'] });
      expect(resolveCodingRuleStacks('python', dir)).toEqual({ valid: true, stacks: ['python'] });
    });

    it.each([
      ['pyproject.toml', '[project]\nname = "app"\n'],
      ['requirements.txt', 'fastapi==0.115.0\n'],
      ['setup.py', 'from setuptools import setup\nsetup(name="app")\n'],
      ['src/main.py', 'def main() -> None:\n    pass\n'],
    ])('detectProjectStacks detects python for %s', (manifest, content) => {
      const root = setupTempRepo({ [manifest]: content });
      expect(detectProjectStacks(root)).toContain('python' as CodingRuleStack);
    });

    it('deploys and protects standalone strict ruff.toml and mypy.ini without excluding tests or allowing Any', () => {
      expect(PROTECTED_CODING_RULES_FILES).toContain('ruff.toml');
      expect(PROTECTED_CODING_RULES_FILES).toContain('mypy.ini');
      expect(isProtectedCodingRulesFile('ruff.toml')).toBe(true);
      expect(isProtectedCodingRulesFile('mypy.ini')).toBe(true);

      const files = getCodingRulesFilesForStacks(['python' as CodingRuleStack]);
      const ruff = files.find((f) => f.relPath === 'ruff.toml');
      const mypy = files.find((f) => f.relPath === 'mypy.ini');

      expect(ruff, 'Expected ruff.toml to be deployed for python').toBeDefined();
      expect(mypy, 'Expected mypy.ini to be deployed for python').toBeDefined();

      expect(mypy!.content).toMatch(/strict\s*=\s*true/i);
      expect(mypy!.content).toMatch(/disallow_any_explicit\s*=\s*true/i);
      expect(mypy!.content).not.toMatch(/exclude\s*=.*tests/i);
      expect(ruff!.content).not.toMatch(/exclude\s*=.*tests/i);

      const initDir = setupTempRepo({ 'pyproject.toml': '[project]\nname = "svc"\n' });
      const res = initProject({ targetDir: initDir, stack: 'py' });
      expect(res.success).toBe(true);
      expect(fs.existsSync(path.join(initDir, 'ruff.toml'))).toBe(true);
      expect(fs.existsSync(path.join(initDir, 'mypy.ini'))).toBe(true);
    });

    it('flags [CODING-RULES-MISSING] when Python files lack ruff.toml/mypy.ini and [CODING-RULES-BYPASS] on weakened pyproject.toml', () => {
      const missingRoot = setupTempRepo({ 'src/app.py': 'x = 1\n' });
      const missing = collectCodingRulesBypassViolations(missingRoot);
      expect(missing.some((v) => v.includes('[CODING-RULES-MISSING]') && v.includes('ruff.toml'))).toBe(true);
      expect(missing.some((v) => v.includes('[CODING-RULES-MISSING]') && v.includes('mypy.ini'))).toBe(true);

      const weakStrictRoot = setupTempRepo({
        'src/app.py': 'x = 1\n',
        'ruff.toml': 'line-length = 100\n',
        'mypy.ini': '[mypy]\nstrict = True\ndisallow_any_explicit = True\n',
        'pyproject.toml': '[tool.mypy]\nstrict = false\n',
      });
      const weakStrictViolations = collectCodingRulesBypassViolations(weakStrictRoot);
      expect(weakStrictViolations.some((v) => v.includes('[CODING-RULES-BYPASS]'))).toBe(true);

      const weakIgnoreRoot = setupTempRepo({
        'src/app.py': 'x = 1\n',
        'ruff.toml': 'line-length = 100\n',
        'mypy.ini': '[mypy]\nstrict = True\ndisallow_any_explicit = True\n',
        'pyproject.toml': '[tool.mypy]\nignore_errors = true\n',
      });
      const weakIgnoreViolations = collectCodingRulesBypassViolations(weakIgnoreRoot);
      expect(weakIgnoreViolations.some((v) => v.includes('[CODING-RULES-BYPASS]'))).toBe(true);

      const cleanRoot = setupTempRepo({
        'src/app.py': 'x = 1\n',
        'ruff.toml': 'line-length = 100\n',
        'mypy.ini': '[mypy]\nstrict = True\ndisallow_any_explicit = True\n',
        'pyproject.toml': '[tool.mypy]\nstrict = true\n',
      });
      expect(collectCodingRulesBypassViolations(cleanRoot)).toEqual([]);
    });
  });

  describe('TSK-073-02: Separate JS/TS/Angular configs, precedence, and AI-SDLC monorepo wiring', () => {
    it('javascript deploys ONLY eslint.config.mjs with zero external imports and no tsconfig.strict.json', () => {
      const files = getCodingRulesFilesForStacks(['javascript']);
      expect(files.map((f) => f.relPath)).toEqual(['eslint.config.mjs']);

      const eslintContent = files[0].content;
      expect(eslintContent).not.toContain('typescript-eslint');
      expect(eslintContent).not.toContain('@eslint/js');
      expect(eslintContent).not.toMatch(/^\s*import\s+/m);
    });

    it('typescript deploys tsconfig.strict.json WITHOUT angularCompilerOptions + eslint.config.mjs', () => {
      const files = getCodingRulesFilesForStacks(['typescript']);
      const paths = files.map((f) => f.relPath).sort();
      expect(paths).toEqual(['eslint.config.mjs', 'tsconfig.strict.json']);

      const tsconfig = files.find((f) => f.relPath === 'tsconfig.strict.json')!;
      expect(tsconfig.content).not.toContain('angularCompilerOptions');

      const eslint = files.find((f) => f.relPath === 'eslint.config.mjs')!;
      expect(eslint.content).toContain('typescript-eslint');
    });

    it('angular deploys tsconfig.strict.json WITH angularCompilerOptions + eslint.config.mjs', () => {
      const files = getCodingRulesFilesForStacks(['angular']);
      const paths = files.map((f) => f.relPath).sort();
      expect(paths).toEqual(['eslint.config.mjs', 'tsconfig.strict.json']);

      const tsconfig = files.find((f) => f.relPath === 'tsconfig.strict.json')!;
      expect(tsconfig.content).toContain('angularCompilerOptions');
    });

    it('mixed JS+TS repo gives typescript precedence over javascript for eslint.config.mjs regardless of directory depth', () => {
      const root = setupTempRepo({
        'package.json': '{"name":"mixed-monorepo"}',
        'packages/a/tsconfig.json': '{"compilerOptions":{"strict":true}}',
      });
      const detected = detectProjectStacks(root);
      expect(detected).toContain('javascript');
      expect(detected).toContain('typescript');

      const filesFromDetected = getCodingRulesFilesForStacks(detected, root);
      const eslintFromDetected = filesFromDetected.find((f) => f.relPath === 'eslint.config.mjs');
      expect(eslintFromDetected).toBeDefined();
      expect(eslintFromDetected!.content).toContain('typescript-eslint');

      const filesExplicitOrder = getCodingRulesFilesForStacks(['javascript', 'typescript']);
      const eslintExplicit = filesExplicitOrder.find((f) => f.relPath === 'eslint.config.mjs');
      expect(eslintExplicit!.content).toContain('typescript-eslint');
    });

    it('AI-SDLC root tsconfig.base.json and tsconfig.json extend tsconfig.strict.json and package.json declares typescript-eslint', () => {
      const repoRoot = path.resolve(__dirname, '../../..');
      const tsconfigBase = JSON.parse(
        fs.readFileSync(path.join(repoRoot, 'tsconfig.base.json'), 'utf-8')
      ) as { extends?: string };
      const tsconfigRoot = JSON.parse(
        fs.readFileSync(path.join(repoRoot, 'tsconfig.json'), 'utf-8')
      ) as { extends?: string | string[] };
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf-8')
      ) as { devDependencies?: Record<string, string>; dependencies?: Record<string, string> };

      expect(tsconfigBase.extends).toContain('tsconfig.strict.json');
      const rootExtends = Array.isArray(tsconfigRoot.extends)
        ? tsconfigRoot.extends
        : [tsconfigRoot.extends ?? ''];
      expect(rootExtends.some((e) => e.includes('tsconfig.strict.json'))).toBe(true);
      expect(
        Boolean(pkgJson.devDependencies?.['typescript-eslint'] ?? pkgJson.dependencies?.['typescript-eslint'])
      ).toBe(true);
    });

    it('executes ESLint with JS_ESLINT_CONFIG_MJS on src/index.js and ignores dist/index.js with 0 errors', async () => {
      const root = setupTempRepo({
        'eslint.config.mjs': JS_ESLINT_CONFIG_MJS,
        'src/index.js': 'console.log(1);\nexport const a = 1;\n',
        'dist/index.js': 'var unlinted = unknownGlobal;\n',
      });

      const eslint = new ESLint({ cwd: root });
      const results = await eslint.lintFiles(['.']);
      const errorCount = results.reduce((sum, r) => sum + r.errorCount, 0);
      expect(errorCount).toBe(0);
    });

    it('executes ESLint with TS_ESLINT_CONFIG_MJS on tsconfig.json + src/index.ts and ignores dist/index.js with 0 errors', async () => {
      const root = setupTempRepo({
        'eslint.config.mjs': TS_ESLINT_CONFIG_MJS,
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            strict: true,
          },
          include: ['src/**/*.ts'],
        }),
        'src/index.ts': 'export const x: number = 1;\n',
        'dist/index.js': 'var builtArtifact = unknownGlobal;\n',
      });

      const repoNodeModules = path.resolve(__dirname, '../../../node_modules');
      fs.symlinkSync(repoNodeModules, path.join(root, 'node_modules'), 'junction');

      const eslint = new ESLint({ cwd: root });
      const results = await eslint.lintFiles(['.']);
      const errorCount = results.reduce((sum, r) => sum + r.errorCount, 0);
      expect(errorCount).toBe(0);
    });
  });

  describe('TSK-073-03: JVM Maven vs Gradle differentiation and GO_GOLANGCI_YML v2', () => {
    it('Maven project (backend/pom.xml without build.gradle*) requires config/pmd/aisdlc-ruleset.xml and NOT gradle/init.d/aisdlc-strict.init.gradle.kts', () => {
      const mavenMissing = setupTempRepo({
        'backend/pom.xml': '<project />',
      });
      const filesForMaven = getCodingRulesFilesForStacks(['java'], mavenMissing);
      expect(filesForMaven.map((f) => f.relPath)).toEqual(['config/pmd/aisdlc-ruleset.xml']);

      const missingViolations = collectMissingCodingRuleViolations(mavenMissing);
      expect(missingViolations.some((v) => v.includes('config/pmd/aisdlc-ruleset.xml'))).toBe(true);
      expect(missingViolations.some((v) => v.includes('aisdlc-strict.init.gradle.kts'))).toBe(false);

      const mavenIntact = setupTempRepo({
        'backend/pom.xml': '<project />',
        'config/pmd/aisdlc-ruleset.xml': JAVA_PMD_RULESET_XML,
      });
      expect(collectCodingRulesBypassViolations(mavenIntact)).toEqual([]);
    });

    it.each([
      ['<project><build><plugins><plugin><configuration><skip>true</skip></configuration></plugin></plugins></build></project>'],
      ['<project><build><plugins><plugin><configuration><failOnViolation>false</failOnViolation></configuration></plugin></plugins></build></project>'],
      ['<project><build><plugins><plugin><configuration><showWarnings>false</showWarnings></configuration></plugin></plugins></build></project>'],
    ])('flags [CODING-RULES-BYPASS] when pom.xml weakens checks: %s', (pomXml) => {
      const root = setupTempRepo({
        'backend/pom.xml': pomXml,
        'config/pmd/aisdlc-ruleset.xml': JAVA_PMD_RULESET_XML,
      });
      const violations = collectCodingRulesBypassViolations(root);
      expect(violations.some((v) => v.includes('[CODING-RULES-BYPASS]'))).toBe(true);
    });

    it('Gradle project (build.gradle.kts) still requires gradle/init.d/aisdlc-strict.init.gradle.kts', () => {
      const gradleMissing = setupTempRepo({
        'build.gradle.kts': 'plugins { java }\n',
      });
      const filesForGradle = getCodingRulesFilesForStacks(['java'], gradleMissing);
      expect(filesForGradle.map((f) => f.relPath)).toContain('gradle/init.d/aisdlc-strict.init.gradle.kts');

      const missing = collectMissingCodingRuleViolations(gradleMissing);
      expect(missing.some((v) => v.includes('gradle/init.d/aisdlc-strict.init.gradle.kts'))).toBe(true);
    });

    it('GO_GOLANGCI_YML uses golangci-lint v2 schema (version: "2", linters.settings, forbidigo pattern:)', () => {
      expect(GO_GOLANGCI_YML).toMatch(/^version:\s*"2"/m);
      expect(GO_GOLANGCI_YML).not.toContain('linters-settings:');
      expect(GO_GOLANGCI_YML).toMatch(/^\s*settings:\s*$/m);
      expect(GO_GOLANGCI_YML).toMatch(/pattern:\s*/);
      expect(GO_GOLANGCI_YML).not.toMatch(/^\s*-\s*p:\s*/m);
    });
  });

  describe('TSK-073-04: Tree-level C vs C++ detection and conditional CMake requirement', () => {
    it('repo with CMakeLists.txt at root and src/main.c (no C++ files) detects ["c"] only and requires .clang-tidy + cmake/AisdlcStrictCompiler.cmake', () => {
      const root = setupTempRepo({
        'CMakeLists.txt': 'cmake_minimum_required(VERSION 3.20)\nproject(capp C)\n',
        'src/main.c': 'int main(void) { return 0; }\n',
      });
      const detected = detectProjectStacks(root);
      expect(detected).toContain('c');
      expect(detected).not.toContain('cpp');

      const deployed = getCodingRulesFilesForStacks(detected, root).map((f) => f.relPath).sort();
      expect(deployed).toEqual(['.clang-tidy', 'cmake/AisdlcStrictCompiler.cmake']);

      const missing = collectMissingCodingRuleViolations(root);
      expect(missing.some((v) => v.includes('.clang-tidy'))).toBe(true);
      expect(missing.some((v) => v.includes('cmake/AisdlcStrictCompiler.cmake'))).toBe(true);
    });

    it('repo with native/main.c and NO CMakeLists.txt detects ["c"] and requires .clang-tidy WITHOUT cmake/AisdlcStrictCompiler.cmake', () => {
      const root = setupTempRepo({
        'native/main.c': 'int main(void) { return 0; }\n',
      });
      const detected = detectProjectStacks(root);
      expect(detected).toEqual(['c']);

      const deployed = getCodingRulesFilesForStacks(['c'], root).map((f) => f.relPath);
      expect(deployed).toEqual(['.clang-tidy']);

      const missing = collectMissingCodingRuleViolations(root);
      expect(missing.some((v) => v.includes('.clang-tidy'))).toBe(true);
      expect(missing.some((v) => v.includes('cmake/AisdlcStrictCompiler.cmake'))).toBe(false);

      const intact = setupTempRepo({
        'native/main.c': 'int main(void) { return 0; }\n',
        '.clang-tidy': CPP_CLANG_TIDY,
      });
      expect(collectCodingRulesBypassViolations(intact)).toEqual([]);
    });
  });
});
