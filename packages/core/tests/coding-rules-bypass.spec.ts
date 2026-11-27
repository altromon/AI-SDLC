import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createRequire } from 'module';
import {
  ANGULAR_STRICT_TSCONFIG,
  CodingRuleStack,
  CPP_CLANG_TIDY,
  CPP_CMAKE_STRICT,
  DOTNET_DIRECTORY_BUILD_PROPS,
  GO_GOLANGCI_YML,
  GRADLE_STRICT_INIT_KTS,
  JAVA_PMD_RULESET_XML,
  JS_ESLINT_CONFIG_MJS,
  KOTLIN_DETEKT_YML,
  PROTECTED_CODING_RULES_FILES,
  PYTHON_MYPY_INI,
  PYTHON_RUFF_TOML,
  RUST_CARGO_CONFIG_TOML,
  RUST_CLIPPY_TOML,
  STARTER_GUARD_BRANCH_CJS,
  TS_ESLINT_CONFIG_MJS,
  TS_STRICT_TSCONFIG,
} from '../src/init/coding-rules-templates.js';
import {
  checkCargoConfig,
  checkCargoToml,
  checkCppFile,
  checkEslintFile,
  checkGoFile,
  checkJavaFile,
  checkKotlinFile,
  checkPythonFile,
  checkRustFile,
  checkTsconfigFile,
  collectCodingRulesBypassViolations,
  collectMissingCodingRuleViolations,
  collectSymlinkRuleViolations,
  isSymlinkPath,
  readTsconfigExtends,
  STACK_RULE_INSPECTORS,
  stripJsonc,
  tsconfigExtendsStrict,
} from '../src/verifiers/coding-rules-bypass.js';
import {
  isPathProtectedFromPatch,
  PROTECTED_BYPASS_PATTERNS,
  verifyProgressiveFriction,
} from '../src/verifiers/progressive-friction.js';

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(__dirname, '../../..');
const guardScriptPath = path.join(repoRoot, 'scripts', 'guard-branch.cjs');

const tempDirs: string[] = [];
function setup(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crb-'));
  tempDirs.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), content);
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

const STACK_RULE_CASES: { stack: CodingRuleStack; manifest: string; content: string; requiredFiles: Record<string, string> }[] = [
  {
    stack: 'dotnet',
    manifest: 'src/App/App.csproj',
    content: '<Project Sdk="Microsoft.NET.Sdk" />',
    requiredFiles: { 'Directory.Build.props': DOTNET_DIRECTORY_BUILD_PROPS },
  },
  {
    stack: 'typescript',
    manifest: 'frontend/tsconfig.json',
    content: '{"extends":"../tsconfig.strict.json"}',
    requiredFiles: { 'tsconfig.strict.json': TS_STRICT_TSCONFIG, 'eslint.config.mjs': TS_ESLINT_CONFIG_MJS },
  },
  {
    stack: 'javascript',
    manifest: 'web/package.json',
    content: '{}',
    requiredFiles: { 'eslint.config.mjs': JS_ESLINT_CONFIG_MJS },
  },
  {
    stack: 'angular',
    manifest: 'client/angular.json',
    content: '{}',
    requiredFiles: { 'tsconfig.strict.json': ANGULAR_STRICT_TSCONFIG, 'eslint.config.mjs': TS_ESLINT_CONFIG_MJS },
  },
  {
    stack: 'python',
    manifest: 'pyproject.toml',
    content: '[project]\nname = "svc"\n',
    requiredFiles: { 'ruff.toml': PYTHON_RUFF_TOML, 'mypy.ini': PYTHON_MYPY_INI },
  },
  {
    stack: 'java',
    manifest: 'backend/pom.xml',
    content: '<project />',
    requiredFiles: {
      'config/pmd/aisdlc-ruleset.xml': JAVA_PMD_RULESET_XML,
    },
  },
  {
    stack: 'kotlin',
    manifest: 'mobile/build.gradle.kts',
    content: 'plugins {}',
    requiredFiles: {
      'gradle/init.d/aisdlc-strict.init.gradle.kts': GRADLE_STRICT_INIT_KTS,
      'config/detekt/detekt.yml': KOTLIN_DETEKT_YML,
    },
  },
  {
    stack: 'rust',
    manifest: 'crates/core/Cargo.toml',
    content: '[package]\nname = "core"\n',
    requiredFiles: { '.cargo/config.toml': RUST_CARGO_CONFIG_TOML, '.clippy.toml': RUST_CLIPPY_TOML },
  },
  {
    stack: 'go',
    manifest: 'services/api/go.mod',
    content: 'module example.com/api\n',
    requiredFiles: { '.golangci.yml': GO_GOLANGCI_YML },
  },
  {
    stack: 'c',
    manifest: 'native/main.c',
    content: 'int main(void) { return 0; }\n',
    requiredFiles: { '.clang-tidy': CPP_CLANG_TIDY },
  },
  {
    stack: 'cpp',
    manifest: 'engine/CMakeLists.txt',
    content: 'cmake_minimum_required(VERSION 3.20)\nproject(engine)\ninclude(../cmake/AisdlcStrictCompiler.cmake)\n',
    requiredFiles: { '.clang-tidy': CPP_CLANG_TIDY, 'cmake/AisdlcStrictCompiler.cmake': CPP_CMAKE_STRICT },
  },
];

describe('coding rules bypass scanner', () => {
  it('returns nothing for an empty directory with no stack manifests or rules', () => {
    expect(collectCodingRulesBypassViolations(setup({}))).toEqual([]);
  });

  it('emits [CODING-RULES-MISSING] for Directory.Build.props when a csproj exists without strict rules', () => {
    const v = collectCodingRulesBypassViolations(
      setup({ 'a/x.csproj': '<TreatWarningsAsErrors>false</TreatWarningsAsErrors>' })
    );
    expect(v.some((msg) => msg.includes('[CODING-RULES-MISSING]') && msg.includes('Directory.Build.props'))).toBe(true);
  });

  it.each(STACK_RULE_CASES)(
    'enforces [CODING-RULES-MISSING] for $stack when rules are missing and passes when all required files exist',
    ({ manifest, content, requiredFiles }) => {
      const missingRoot = setup({ [manifest]: content });
      const missingViolations = collectCodingRulesBypassViolations(missingRoot);
      for (const relPath of Object.keys(requiredFiles)) {
        expect(
          missingViolations.some((msg) => msg.includes('[CODING-RULES-MISSING]') && msg.includes(relPath)),
          `Expected [CODING-RULES-MISSING] for ${relPath}`
        ).toBe(true);
      }

      const intactRoot = setup({ [manifest]: content, ...requiredFiles });
      expect(collectCodingRulesBypassViolations(intactRoot)).toEqual([]);
    }
  );

  it('flags csproj weakening and nested Directory.Build.props without parent import', () => {
    const root = setup({
      'Directory.Build.props': DOTNET_DIRECTORY_BUILD_PROPS,
      'src/Api/Api.csproj': '<Nullable>disable</Nullable>',
      'src/Api/Directory.Build.props': '<Project/>',
    });
    const v = collectCodingRulesBypassViolations(root);
    expect(v).toHaveLength(2);
  });

  it('flags csproj weakening when MSBuild tags have Condition attributes', () => {
    const root = setup({
      'Directory.Build.props': DOTNET_DIRECTORY_BUILD_PROPS,
      'src/Api/Api.csproj': '<PropertyGroup><TreatWarningsAsErrors Condition="true">false</TreatWarningsAsErrors></PropertyGroup>',
    });
    const v = collectCodingRulesBypassViolations(root);
    expect(v.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes('src/Api/Api.csproj'))).toBe(true);
  });

  it('accepts nested Directory.Build.props importing the parent', () => {
    const root = setup({
      'Directory.Build.props': DOTNET_DIRECTORY_BUILD_PROPS,
      'src/Directory.Build.props': '<Import Project="$([MSBuild]::GetPathOfFileAbove(\'Directory.Build.props\', \'$(MSBuildThisFileDirectory)../\'))" />',
    });
    expect(collectCodingRulesBypassViolations(root)).toEqual([]);
  });

  it('flags tsconfig weakening when tsconfig.strict.json exists', () => {
    const root = setup({
      'tsconfig.strict.json': TS_STRICT_TSCONFIG,
      'eslint.config.mjs': TS_ESLINT_CONFIG_MJS,
      'tsconfig.json': '{"extends":"./tsconfig.strict.json","compilerOptions":{"strict": false}}',
    });
    expect(collectCodingRulesBypassViolations(root)).toHaveLength(1);
  });

  it('collectMissingCodingRuleViolations deduplicates shared rule files across detected stacks', () => {
    const root = setup({
      'frontend/tsconfig.json': '{}',
      'web/package.json': '{}',
    });
    const missing = collectMissingCodingRuleViolations(root);
    expect(missing).toHaveLength(2);
  });
});

describe('CHG-075: Polyglot Coding Rules Anti-Bypass Detection', () => {
  describe('TypeScript & Angular tsconfig extends chain (JSONC + monorepo)', () => {
    it('passes when monorepo packages/core/tsconfig.json transitively extends tsconfig.strict.json via JSONC tsconfig.base.json', () => {
      const root = setup({
        'tsconfig.strict.json': TS_STRICT_TSCONFIG,
        'eslint.config.mjs': TS_ESLINT_CONFIG_MJS,
        'tsconfig.base.json': `{\n  // base config comment\n  "extends": "./tsconfig.strict.json",\n  /* block comment */\n  "compilerOptions": { "target": "ES2022" }\n}\n`,
        'packages/core/tsconfig.json': `{\n  "extends": "../../tsconfig.base.json",\n  "include": ["src/**/*.ts"]\n}\n`,
      });
      expect(collectCodingRulesBypassViolations(root)).toEqual([]);
    });

    it('passes when tsconfig.json uses array extends reaching tsconfig.strict.json', () => {
      const root = setup({
        'tsconfig.strict.json': TS_STRICT_TSCONFIG,
        'eslint.config.mjs': TS_ESLINT_CONFIG_MJS,
        'tsconfig.json': JSON.stringify({ extends: ['./tsconfig.strict.json'], compilerOptions: { outDir: 'dist' } }),
      });
      expect(collectCodingRulesBypassViolations(root)).toEqual([]);
    });

    it('flags [CODING-RULES-BYPASS] when tsconfig.json omits extends to tsconfig.strict.json', () => {
      const root = setup({
        'tsconfig.strict.json': TS_STRICT_TSCONFIG,
        'eslint.config.mjs': TS_ESLINT_CONFIG_MJS,
        'packages/app/tsconfig.json': JSON.stringify({ compilerOptions: { target: 'ES2022', strict: true } }),
      });
      const v = collectCodingRulesBypassViolations(root);
      expect(v.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes('packages/app/tsconfig.json'))).toBe(true);
    });

    it.each([
      ['"noImplicitAny": false', '{"extends":"./tsconfig.strict.json","compilerOptions":{"noImplicitAny": false}}'],
      ['"strictNullChecks": false', '{"extends":"./tsconfig.strict.json","compilerOptions":{"strictNullChecks": false}}'],
    ])('flags [CODING-RULES-BYPASS] for tsconfig disabling %s', (_label, tsconfigContent) => {
      const root = setup({
        'tsconfig.strict.json': TS_STRICT_TSCONFIG,
        'eslint.config.mjs': TS_ESLINT_CONFIG_MJS,
        'tsconfig.json': tsconfigContent,
      });
      const v = collectCodingRulesBypassViolations(root);
      expect(v.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes('tsconfig.json'))).toBe(true);
    });
  });

  describe('JavaScript / ESLint anti-bypass', () => {
    it.each([
      ['empty array', 'eslint.config.mjs', 'export default [];\n'],
      ['empty object array', 'eslint.config.mjs', 'export default [{}];\n'],
      ['empty tseslint.config()', 'eslint.config.mjs', 'export default tseslint.config();\n'],
      ['global ignores **/*', 'eslint.config.mjs', 'export default [{ ignores: ["**/*"] }];\n'],
      ['global ignores **/* with extra', 'eslint.config.mjs', 'export default [{ ignores: ["**/*", "extra"] }];\n'],
      ['global ignores **', 'eslint.config.mjs', 'export default [{ ignores: ["**"] }];\n'],
      ['rule turned off', 'eslint.config.mjs', 'export default [{ rules: { "no-unused-vars": "off" } }];\n'],
      ['rule turned off array syntax', 'eslint.config.mjs', 'export default [{ rules: { "no-unused-vars": ["off"] } }];\n'],
      ['wildcard .eslintignore', '.eslintignore', '*\n'],
    ])('flags [CODING-RULES-BYPASS] for ESLint weakening (%s)', (_label, relPath, content) => {
      const files: Record<string, string> = {
        'web/package.json': '{}',
        'eslint.config.mjs': JS_ESLINT_CONFIG_MJS,
        [relPath]: content,
      };
      const v = collectCodingRulesBypassViolations(setup(files));
      expect(v.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes(relPath))).toBe(true);
    });
  });

  describe('Rust anti-bypass', () => {
    it.each([
      ['Cargo.toml [lints.rust] warnings allow', 'Cargo.toml', '[package]\nname = "x"\n[lints.rust]\nwarnings = "allow"\n'],
      ['Cargo.toml [workspace.lints.rust] warnings allow', 'Cargo.toml', '[workspace.lints.rust]\nwarnings = "allow"\n'],
      ['Cargo.toml [lints.clippy] all allow', 'Cargo.toml', '[package]\nname = "x"\n[lints.clippy]\nall = "allow"\n'],
      ['.cargo/config.toml --cap-lints allow', '.cargo/config.toml', '[build]\nrustflags = ["--cap-lints", "allow"]\n'],
      ['src/lib.rs #![allow(warnings)]', 'src/lib.rs', '#![allow(warnings)]\npub fn f() {}\n'],
      ['src/lib.rs #![allow(warnings, unused)]', 'src/lib.rs', '#![allow(warnings, unused)]\npub fn f() {}\n'],
      ['src/lib.rs whitespace-tolerant #! [ allow ( warnings ) ]', 'src/lib.rs', '#! [ allow ( warnings ) ]\npub fn f() {}\n'],
      ['src/lib.rs #![allow(clippy::all)]', 'src/lib.rs', '#![allow(clippy::all)]\npub fn f() {}\n'],
    ])('flags [CODING-RULES-BYPASS] for Rust (%s)', (_label, relPath, content) => {
      const files: Record<string, string> = {
        'Cargo.toml': '[package]\nname = "app"\n',
        '.cargo/config.toml': RUST_CARGO_CONFIG_TOML,
        '.clippy.toml': RUST_CLIPPY_TOML,
        [relPath]: content,
      };
      const v = collectCodingRulesBypassViolations(setup(files));
      expect(v.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes(relPath))).toBe(true);
    });
  });

  describe('Go anti-bypass', () => {
    it.each([
      ['disable: all', '.golangci.yml', 'version: "2"\nlinters:\n  disable: all\n'],
      ['disable-all: true', '.golangci.yml', 'version: "2"\nlinters:\n  disable-all: true\n'],
      ['default: none without enable', '.golangci.yml', 'version: "2"\nlinters:\n  default: none\n'],
      ['default: none with empty enable: []', '.golangci.yml', 'version: "2"\nlinters:\n  default: none\n  enable: []\n'],
      ['.golangci.toml disable = ["all"]', '.golangci.toml', '[linters]\ndisable = ["all"]\n'],
      ['.golangci.toml disable-all = true', '.golangci.toml', '[linters]\ndisable-all = true\n'],
    ])('flags [CODING-RULES-BYPASS] for %s (%s)', (_label, relPath, content) => {
      const v = collectCodingRulesBypassViolations(
        setup({
          'go.mod': 'module example.com/svc\n',
          [relPath]: content,
        })
      );
      expect(v.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes(relPath))).toBe(true);
    });
  });

  describe('Java & Kotlin anti-bypass', () => {
    it.each([
      ['empty aisdlc-ruleset.xml', 'config/pmd/aisdlc-ruleset.xml', '<ruleset />\n'],
      ['wildcard exclude-pattern', 'config/pmd/aisdlc-ruleset.xml', '<ruleset><rule ref="a"/><exclude-pattern>.*</exclude-pattern></ruleset>\n'],
      ['pom.xml maven.pmd.skip', 'pom.xml', '<project><properties><maven.pmd.skip>true</maven.pmd.skip></properties></project>\n'],
      ['build.gradle.kts ignoreFailures = true', 'build.gradle.kts', 'tasks.withType<Pmd> { ignoreFailures = true }\n'],
    ])('flags [CODING-RULES-BYPASS] for Java (%s)', (_label, relPath, content) => {
      const files: Record<string, string> = {
        'pom.xml': '<project />',
        'config/pmd/aisdlc-ruleset.xml': JAVA_PMD_RULESET_XML,
        [relPath]: content,
      };
      const v = collectCodingRulesBypassViolations(setup(files));
      expect(v.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes(relPath))).toBe(true);
    });

    it.each([
      ['detekt.yml maxIssues: -1', 'config/detekt/detekt.yml', 'build:\n  maxIssues: -1\n'],
      ['detekt.yml maxIssues: 5', 'config/detekt/detekt.yml', 'build:\n  maxIssues: 5\n'],
      ['detekt.yml active: false', 'config/detekt/detekt.yml', 'complexity:\n  active: false\n'],
      ['build.gradle.kts allWarningsAsErrors = false', 'build.gradle.kts', 'kotlin { compilerOptions { allWarningsAsErrors = false } }\n'],
      ['build.gradle.kts allWarningsAsErrors.set(false)', 'build.gradle.kts', 'kotlinOptions { allWarningsAsErrors.set(false) }\n'],
      ['build.gradle.kts ignoreFailures = true', 'build.gradle.kts', 'detekt { ignoreFailures = true }\n'],
    ])('flags [CODING-RULES-BYPASS] for Kotlin (%s)', (_label, relPath, content) => {
      const files: Record<string, string> = {
        'build.gradle.kts': 'plugins {}',
        'gradle/init.d/aisdlc-strict.init.gradle.kts': GRADLE_STRICT_INIT_KTS,
        'config/detekt/detekt.yml': KOTLIN_DETEKT_YML,
        [relPath]: content,
      };
      const v = collectCodingRulesBypassViolations(setup(files));
      expect(v.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes(relPath))).toBe(true);
    });
  });

  describe('Python, C, and C++ anti-bypass', () => {
    it.each([
      ['ruff.toml ignore = ["ALL"]', 'ruff.toml', 'ignore = ["ALL"]\n'],
      ['.ruff.toml select = []', '.ruff.toml', 'select = []\n'],
      ['pyproject.toml disallow_any_explicit = false', 'pyproject.toml', '[tool.mypy]\ndisallow_any_explicit = false\n'],
      ['pyproject.toml ruff ignore = ["ALL"]', 'pyproject.toml', '[tool.ruff.lint]\nignore = ["ALL"]\n'],
    ])('flags [CODING-RULES-BYPASS] for Python (%s)', (_label, relPath, content) => {
      const files: Record<string, string> = {
        'src/app.py': 'x = 1\n',
        'ruff.toml': PYTHON_RUFF_TOML,
        'mypy.ini': PYTHON_MYPY_INI,
        [relPath]: content,
      };
      const v = collectCodingRulesBypassViolations(setup(files));
      expect(v.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes(relPath))).toBe(true);
    });

    it('flags [CODING-RULES-BYPASS] for .clang-tidy WarningsAsErrors empty or Checks -* (including trailing comments)', () => {
      const v1 = collectCodingRulesBypassViolations(
        setup({ 'src/main.c': 'int main(){return 0;}', '.clang-tidy': "WarningsAsErrors: '' # disabled\nChecks: '*'\n" })
      );
      expect(v1.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes('.clang-tidy'))).toBe(true);

      const v2 = collectCodingRulesBypassViolations(
        setup({ 'src/main.c': 'int main(){return 0;}', '.clang-tidy': "Checks: '-*' # none\n" })
      );
      expect(v2.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes('.clang-tidy'))).toBe(true);
    });

    it('flags root CMakeLists.txt missing or commented include(cmake/AisdlcStrictCompiler.cmake) but ignores src/CMakeLists.txt without project()', () => {
      const missingInclude = setup({
        'CMakeLists.txt': 'cmake_minimum_required(VERSION 3.20)\nproject(app)\nadd_subdirectory(src)\n',
        'src/main.cpp': 'int main() { return 0; }\n',
        '.clang-tidy': CPP_CLANG_TIDY,
        'cmake/AisdlcStrictCompiler.cmake': CPP_CMAKE_STRICT,
      });
      const v = collectCodingRulesBypassViolations(missingInclude);
      expect(v.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes('CMakeLists.txt'))).toBe(true);

      const commentedInclude = setup({
        'CMakeLists.txt': 'cmake_minimum_required(VERSION 3.20)\nproject(app)\n# include(cmake/AisdlcStrictCompiler.cmake)\n',
        'src/main.cpp': 'int main() { return 0; }\n',
        '.clang-tidy': CPP_CLANG_TIDY,
        'cmake/AisdlcStrictCompiler.cmake': CPP_CMAKE_STRICT,
      });
      const vCommented = collectCodingRulesBypassViolations(commentedInclude);
      expect(vCommented.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes('CMakeLists.txt'))).toBe(true);

      const validWithSubdir = setup({
        'CMakeLists.txt': 'cmake_minimum_required(VERSION 3.20)\nproject(app)\ninclude(cmake/AisdlcStrictCompiler.cmake)\nadd_subdirectory(src)\n',
        'src/CMakeLists.txt': 'add_library(core STATIC core.cpp)\n',
        'src/core.cpp': 'int f() { return 1; }\n',
        '.clang-tidy': CPP_CLANG_TIDY,
        'cmake/AisdlcStrictCompiler.cmake': CPP_CMAKE_STRICT,
      });
      expect(collectCodingRulesBypassViolations(validWithSubdir)).toEqual([]);
    });
  });

  describe('Symlink safety and unified POLYGLOT_EXCLUDED_DIR_SET', () => {
    it.each(['.venv', 'venv', '__pycache__'])('skips excluded directory %s', (excludedDir) => {
      const root = setup({
        'tsconfig.strict.json': TS_STRICT_TSCONFIG,
        'eslint.config.mjs': TS_ESLINT_CONFIG_MJS,
        'tsconfig.json': JSON.stringify({ extends: './tsconfig.strict.json' }),
        [`${excludedDir}/tsconfig.json`]: JSON.stringify({ compilerOptions: { strict: false } }),
      });
      expect(collectCodingRulesBypassViolations(root)).toEqual([]);
    });

    it('skips symlinked directories pointing outside the repository root', () => {
      const external = setup({
        'tsconfig.json': JSON.stringify({ compilerOptions: { strict: false } }),
      });
      const root = setup({
        'tsconfig.strict.json': TS_STRICT_TSCONFIG,
        'eslint.config.mjs': TS_ESLINT_CONFIG_MJS,
        'tsconfig.json': JSON.stringify({ extends: './tsconfig.strict.json' }),
      });
      fs.symlinkSync(external, path.join(root, 'linked-dir'), process.platform === 'win32' ? 'junction' : 'dir');
      expect(collectCodingRulesBypassViolations(root)).toEqual([]);
    });

    it('flags [CODING-RULES-BYPASS] when a required root coding-rules file is a symbolic link', () => {
      const external = setup({
        'tsconfig.strict.json': TS_STRICT_TSCONFIG,
      });
      const root = setup({
        'eslint.config.mjs': TS_ESLINT_CONFIG_MJS,
        'tsconfig.json': JSON.stringify({ extends: './tsconfig.strict.json' }),
      });
      fs.symlinkSync(
        path.join(external, 'tsconfig.strict.json'),
        path.join(root, 'tsconfig.strict.json'),
        'file'
      );
      const v = collectCodingRulesBypassViolations(root);
      expect(v.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes('tsconfig.strict.json'))).toBe(true);
    });

    it('flags [CODING-RULES-BYPASS] when a protected parent directory (e.g., .cargo) is a symbolic link', () => {
      const external = setup({
        'config.toml': '[build]\nrustflags = ["--cap-lints", "allow"]\n',
      });
      const root = setup({
        'Cargo.toml': '[package]\nname = "app"\n',
        '.clippy.toml': RUST_CLIPPY_TOML,
      });
      fs.symlinkSync(external, path.join(root, '.cargo'), process.platform === 'win32' ? 'junction' : 'dir');
      const v = collectCodingRulesBypassViolations(root);
      expect(v.some((m) => m.includes('[CODING-RULES-BYPASS]') && m.includes('.cargo'))).toBe(true);
    });
  });

  describe('PROTECTED_BYPASS_PATTERNS and guard-branch.cjs parity', () => {
    it('aligns isPathProtectedFromPatch for privacy, security, CODEOWNERS, coding-rules files, and ./ or .. normalization', () => {
      const protectedCases = [
        'specs/privacy/PRIV-REQ-001.md',
        './specs/privacy/PRIV-REQ-001.md',
        'foo/../privacy-policy.yaml',
        'packages/security/src/auth.ts',
        'privacy-policy.yaml',
        'privacy-policy.yml',
        '.github/CODEOWNERS',
        '.github/codeowners',
        'templates/coding-rules/ts/tsconfig.strict.json',
        ...PROTECTED_CODING_RULES_FILES,
        'ESLint.Config.MJS',
        './.golangci.yml',
      ];
      for (const p of protectedCases) {
        expect(isPathProtectedFromPatch(p), `Expected isPathProtectedFromPatch('${p}') === true`).toBe(true);
      }
      expect(isPathProtectedFromPatch('src/app.ts')).toBe(false);
    });

    it('verifyProgressiveFriction blocks patch changes to aligned protected paths with [ANTI-PATCH-BYPASS]', () => {
      const root = setup({
        'specs/changes/active/patch-075-test/spec.md': '---\nid: SPEC-PATCH-075\nprofile: patch\n---\n',
      });
      const res = verifyProgressiveFriction({
        rootDir: root,
        changeId: 'patch-075-test',
        diffFiles: [
          'specs/privacy/PRIV-REQ-001.md',
          'packages/security/src/auth.ts',
          'privacy-policy.yaml',
          'eslint.config.mjs',
          '.golangci.yml',
        ],
      });
      expect(res.success).toBe(false);
      expect(res.bypassedRules.length).toBeGreaterThanOrEqual(5);
      expect(res.bypassedRules.every((r) => r.includes('[ANTI-PATCH-BYPASS]'))).toBe(true);
    });

    it('maintains parity across progressive-friction.ts, scripts/guard-branch.cjs, and STARTER_GUARD_BRANCH_CJS', () => {
      const guard = require(guardScriptPath) as {
        isProtectedBypassPath: (p: string) => boolean;
      };
      const scriptContent = fs.readFileSync(guardScriptPath, 'utf-8').replace(/\r\n/g, '\n').trim();
      expect(scriptContent).toBe(STARTER_GUARD_BRANCH_CJS.replace(/\r\n/g, '\n').trim());
      expect(scriptContent).toContain('/^\\.github\\/CODEOWNERS$/i');
      expect(PROTECTED_BYPASS_PATTERNS.some((re) => re.test('specs/privacy/PRIV-REQ-001.md'))).toBe(true);
      expect(PROTECTED_BYPASS_PATTERNS.some((re) => re.test('packages/security/src/auth.ts'))).toBe(true);
      expect(PROTECTED_BYPASS_PATTERNS.some((re) => re.test('privacy-policy.yaml'))).toBe(true);

      for (const sharedPath of [
        'specs/privacy/PRIV-REQ-001.md',
        'packages/security/src/auth.ts',
        'privacy-policy.yaml',
        '.github/CODEOWNERS',
        '.github/codeowners',
      ]) {
        expect(guard.isProtectedBypassPath(sharedPath)).toBe(true);
        expect(isPathProtectedFromPatch(sharedPath)).toBe(true);
      }
    });
  });

  describe('StackRuleInspector unit helpers', () => {
    it('exposes declarative STACK_RULE_INSPECTORS and helper functions for all stacks', () => {
      expect(STACK_RULE_INSPECTORS.length).toBeGreaterThanOrEqual(9);
      expect(JSON.parse(stripJsonc('{\n// c\n"a": 1, /* b */\n}'))).toEqual({ a: 1 });

      const tsRoot = setup({
        'tsconfig.strict.json': TS_STRICT_TSCONFIG,
        'tsconfig.json': '{"extends":"./tsconfig.strict.json"}',
      });
      expect(readTsconfigExtends('tsconfig.json', tsRoot)).toEqual(['./tsconfig.strict.json']);
      expect(tsconfigExtendsStrict('tsconfig.json', tsRoot, new Set())).toBe(true);
      expect(checkTsconfigFile('tsconfig.json', '{"extends":"./tsconfig.strict.json"}', tsRoot)).toEqual([]);
      expect(checkEslintFile('eslint.config.mjs', JS_ESLINT_CONFIG_MJS)).toEqual([]);
      expect(checkPythonFile('mypy.ini', PYTHON_MYPY_INI)).toEqual([]);
      expect(checkJavaFile('config/pmd/aisdlc-ruleset.xml', JAVA_PMD_RULESET_XML)).toEqual([]);
      expect(checkKotlinFile('config/detekt/detekt.yml', KOTLIN_DETEKT_YML)).toEqual([]);
      expect(checkCargoToml('Cargo.toml', '[package]\nname = "x"\n')).toEqual([]);
      expect(checkCargoConfig('.cargo/config.toml', RUST_CARGO_CONFIG_TOML)).toEqual([]);
      expect(checkRustFile('.cargo/config.toml', RUST_CARGO_CONFIG_TOML)).toEqual([]);
      expect(checkGoFile('.golangci.yml', GO_GOLANGCI_YML)).toEqual([]);
      expect(checkCppFile('.clang-tidy', CPP_CLANG_TIDY, tsRoot)).toEqual([]);
      expect(isSymlinkPath(path.join(tsRoot, 'tsconfig.json'))).toBe(false);
      expect(collectSymlinkRuleViolations(tsRoot)).toEqual([]);
    });

    it('blocks AI agents from modifying quality-policy.yaml in guard-branch.cjs', () => {
      const guard = require(guardScriptPath) as {
        evaluateGuardDecision: (payload: { toolCall: { args: { Path: string } }; workspacePaths: string[] }) => {
          decision: string;
          reason?: string;
        };
      };
      const root = setup({ 'quality-policy.yaml': 'version: "1.0"\n' });
      const res = guard.evaluateGuardDecision({
        toolCall: { args: { Path: path.join(root, 'quality-policy.yaml') } },
        workspacePaths: [root],
      });
      expect(res.decision).toBe('deny');
      expect(res.reason).toContain('Immutable Policy Guard');
    });
  });
});
