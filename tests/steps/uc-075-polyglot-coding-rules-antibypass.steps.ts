// BDD STEP DEFINITIONS (tests/features/uc-075-polyglot-coding-rules-antibypass.feature)
// Traceability: @UC-075-POLYGLOT-CODING-RULES-ANTIBYPASS @FR-075-POLYGLOT-CODING-RULES-ANTIBYPASS-001 @CHG-075-POLYGLOT-CODING-RULES-ANTIBYPASS
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  BddStepRegistry,
  CodingRuleStack,
  CPP_CLANG_TIDY,
  CPP_CMAKE_STRICT,
  DOTNET_DIRECTORY_BUILD_PROPS,
  GO_GOLANGCI_YML,
  JAVA_PMD_RULESET_XML,
  KOTLIN_DETEKT_YML,
  PYTHON_MYPY_INI,
  PYTHON_RUFF_TOML,
  RUST_CARGO_CONFIG_TOML,
  RUST_CLIPPY_TOML,
  TS_ESLINT_CONFIG_MJS,
  TS_STRICT_TSCONFIG,
  VALID_CODING_RULE_STACKS,
  getCodingRulesFilesForStacks,
  isPathProtectedFromPatch,
  verifyProgressiveFriction,
} from '@aisdlc/core';
import { collectCodingRulesBypassViolations } from '../../packages/core/src/verifiers/coding-rules-bypass.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function writeRepoFiles(rootDir: string, files: Record<string, string>): void {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(rootDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf-8');
  }
}

function buildWeakeningContent(weakening: string): string {
  switch (weakening) {
    case 'missing extends tsconfig.strict.json':
      return JSON.stringify({ compilerOptions: { target: 'ES2022', strict: true } }, null, 2);
    case 'export default []':
      return 'export default [];\n';
    case '#![allow(warnings)]':
      return '#![allow(warnings)]\npub fn f() {}\n';
    case 'disable-all: true':
      return 'version: "2"\nlinters:\n  disable-all: true\n';
    case 'maxIssues: -1':
      return 'build:\n  maxIssues: -1\n';
    case 'missing include cmake/AisdlcStrictCompiler.cmake':
      return 'cmake_minimum_required(VERSION 3.20)\nproject(app)\n';
    case 'ignore = ["ALL"]':
      return 'ignore = ["ALL"]\n';
    default:
      return weakening;
  }
}

export function registerSteps(registry: BddStepRegistry): void {
  let tmpDir = '';
  let diffFiles: string[] = [];
  let changeId = 'patch-075-uc';
  let bypassViolations: string[] = [];
  let frictionResult: ReturnType<typeof verifyProgressiveFriction> | undefined;

  function resetTmpDir(): string {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdd-uc075-'));
    diffFiles = [];
    bypassViolations = [];
    frictionResult = undefined;
    return tmpDir;
  }

  registry.given(
    'a repository with active strict coding rules across supported stacks in "VALID_CODING_RULE_STACKS"',
    () => {
      const root = resetTmpDir();
      assert(VALID_CODING_RULE_STACKS.length === 11, 'Expected 11 supported coding rule stacks');
      writeRepoFiles(root, {
        'Directory.Build.props': DOTNET_DIRECTORY_BUILD_PROPS,
        'tsconfig.strict.json': TS_STRICT_TSCONFIG,
        'eslint.config.mjs': TS_ESLINT_CONFIG_MJS,
        'ruff.toml': PYTHON_RUFF_TOML,
        'mypy.ini': PYTHON_MYPY_INI,
        'config/pmd/aisdlc-ruleset.xml': JAVA_PMD_RULESET_XML,
        'config/detekt/detekt.yml': KOTLIN_DETEKT_YML,
        '.cargo/config.toml': RUST_CARGO_CONFIG_TOML,
        '.clippy.toml': RUST_CLIPPY_TOML,
        '.golangci.yml': GO_GOLANGCI_YML,
        '.clang-tidy': CPP_CLANG_TIDY,
        'cmake/AisdlcStrictCompiler.cmake': CPP_CMAKE_STRICT,
      });
    }
  );

  registry.given('all project configuration files preserve strict compiler and linter rules', () => {
    writeRepoFiles(tmpDir, {
      'tsconfig.json': JSON.stringify({ extends: './tsconfig.strict.json', include: ['src/**/*.ts'] }),
      'src/app.ts': 'export const ok = true;\n',
      'CMakeLists.txt': 'cmake_minimum_required(VERSION 3.20)\nproject(app)\ninclude(cmake/AisdlcStrictCompiler.cmake)\n',
    });
  });

  registry.given('a "patch" change modifies only non-protected application files', () => {
    changeId = 'patch-075-uc';
    writeRepoFiles(tmpDir, {
      [`specs/changes/active/${changeId}/spec.md`]: `---\nid: SPEC-PATCH-075\ntype: delivery-spec\nchange-id: PATCH-075\nprofile: patch\n---\n# Patch\n`,
    });
    diffFiles = ['src/app.ts'];
  });

  registry.when('"aisdlc verify friction" executes', () => {
    bypassViolations = collectCodingRulesBypassViolations(tmpDir);
    frictionResult = verifyProgressiveFriction({
      rootDir: tmpDir,
      changeId,
      diffFiles,
    });
  });

  registry.then('"collectCodingRulesBypassViolations" reports zero "[CODING-RULES-BYPASS]" violations', () => {
    const codingRuleBypasses = bypassViolations.filter((v) => v.includes('[CODING-RULES-BYPASS]'));
    assert(
      codingRuleBypasses.length === 0,
      `Expected 0 [CODING-RULES-BYPASS] violations, got: ${codingRuleBypasses.join('; ')}`
    );
  });

  registry.then('"aisdlc verify friction" passes as "COMPLIANT"', () => {
    assert(frictionResult !== undefined, 'Expected verifyProgressiveFriction result');
    assert(
      frictionResult!.success === true,
      `Expected friction to pass as COMPLIANT, got violations: ${frictionResult!.bypassedRules.join('; ')}`
    );
  });

  registry.given('a repository with active strict coding rules', () => {
    const root = resetTmpDir();
    writeRepoFiles(root, {
      'tsconfig.strict.json': TS_STRICT_TSCONFIG,
      'eslint.config.mjs': TS_ESLINT_CONFIG_MJS,
      'tsconfig.json': JSON.stringify({ extends: './tsconfig.strict.json' }),
    });
  });

  registry.given(
    /^a "(symlink|excluded-dir)" named "([^"]+)" containing a weakening config file$/,
    (args) => {
      const [entryType, entryName] = args;
      const weakConfig = JSON.stringify({ compilerOptions: { strict: false } });
      if (entryType === 'symlink') {
        const externalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bdd-uc075-ext-'));
        fs.writeFileSync(path.join(externalDir, 'tsconfig.json'), weakConfig, 'utf-8');
        fs.symlinkSync(externalDir, path.join(tmpDir, entryName), process.platform === 'win32' ? 'junction' : 'dir');
      } else {
        writeRepoFiles(tmpDir, {
          [`${entryName}/tsconfig.json`]: weakConfig,
        });
      }
    }
  );

  registry.when('"collectCodingRulesBypassViolations" scans the repository', () => {
    bypassViolations = collectCodingRulesBypassViolations(tmpDir);
  });

  registry.then(/^the scanner skips "([^"]+)" without reporting a bypass violation$/, (args) => {
    const [entryName] = args;
    const matched = bypassViolations.filter((v) => v.includes(entryName));
    assert(
      matched.length === 0,
      `Expected scanner to skip '${entryName}', but got violations: ${matched.join('; ')}`
    );
  });

  registry.given(/^a repository with active strict coding rules for stack "([^"]+)"$/, (args) => {
    const [stack] = args;
    const root = resetTmpDir();
    const files = getCodingRulesFilesForStacks([stack as CodingRuleStack]);
    const record: Record<string, string> = {};
    for (const f of files) {
      record[f.relPath] = f.content;
    }
    writeRepoFiles(root, record);
  });

  registry.given(/^file "([^"]+)" contains weakening configuration "([^"]+)"$/, (args) => {
    const [filePath, weakening] = args;
    writeRepoFiles(tmpDir, {
      [filePath]: buildWeakeningContent(weakening),
    });
  });

  registry.then(/^a "\[CODING-RULES-BYPASS\]" violation is reported for "([^"]+)"$/, (args) => {
    const [filePath] = args;
    const matched = bypassViolations.some((v) => v.includes('[CODING-RULES-BYPASS]') && v.includes(filePath));
    assert(
      matched,
      `Expected [CODING-RULES-BYPASS] violation for '${filePath}', got: ${bypassViolations.join('; ')}`
    );
  });

  registry.given('an active change with profile "patch"', () => {
    const root = resetTmpDir();
    changeId = 'patch-075-uc';
    writeRepoFiles(root, {
      [`specs/changes/active/${changeId}/spec.md`]: `---\nid: SPEC-PATCH-075\ntype: delivery-spec\nchange-id: PATCH-075\nprofile: patch\n---\n# Patch\n`,
    });
  });

  registry.given(/^the change modifies protected path "([^"]+)"$/, (args) => {
    const [protectedPath] = args;
    diffFiles = [protectedPath];
  });

  registry.then(/^an "\[ANTI-PATCH-BYPASS\]" violation is reported for "([^"]+)"$/, (args) => {
    const [protectedPath] = args;
    assert(frictionResult !== undefined, 'Expected verifyProgressiveFriction result');
    assert(
      isPathProtectedFromPatch(protectedPath) === true,
      `Expected isPathProtectedFromPatch('${protectedPath}') to be true`
    );
    const matched = frictionResult!.bypassedRules.some(
      (v) => v.includes('[ANTI-PATCH-BYPASS]') && v.includes(protectedPath)
    );
    assert(
      matched,
      `Expected [ANTI-PATCH-BYPASS] violation for '${protectedPath}', got: ${frictionResult!.bypassedRules.join('; ')}`
    );
  });

  registry.then('"aisdlc verify friction" fails as "BLOCKED"', () => {
    assert(frictionResult !== undefined, 'Expected verifyProgressiveFriction result');
    assert(frictionResult!.success === false, 'Expected verifyProgressiveFriction to fail as BLOCKED');
  });
}
