import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CodingRuleStack } from '../src/init/coding-rules-templates.js';
import { collectCodingRulesBypassViolations, collectMissingCodingRuleViolations } from '../src/verifiers/coding-rules-bypass.js';

let tmp = '';
function setup(files: Record<string, string>): string {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crb-'));
  for (const [rel, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true });
    fs.writeFileSync(path.join(tmp, rel), content);
  }
  return tmp;
}
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

const STACK_RULE_CASES: { stack: CodingRuleStack; manifest: string; content: string; requiredFiles: Record<string, string> }[] = [
  {
    stack: 'dotnet',
    manifest: 'src/App/App.csproj',
    content: '<Project Sdk="Microsoft.NET.Sdk" />',
    requiredFiles: { 'Directory.Build.props': '<Project/>' },
  },
  {
    stack: 'typescript',
    manifest: 'frontend/tsconfig.json',
    content: '{}',
    requiredFiles: { 'tsconfig.strict.json': '{}', 'eslint.config.mjs': 'export default [];\n' },
  },
  {
    stack: 'javascript',
    manifest: 'web/package.json',
    content: '{}',
    requiredFiles: { 'tsconfig.strict.json': '{}', 'eslint.config.mjs': 'export default [];\n' },
  },
  {
    stack: 'angular',
    manifest: 'client/angular.json',
    content: '{}',
    requiredFiles: { 'tsconfig.strict.json': '{}', 'eslint.config.mjs': 'export default [];\n' },
  },
  {
    stack: 'java',
    manifest: 'backend/pom.xml',
    content: '<project />',
    requiredFiles: {
      'gradle/init.d/aisdlc-strict.init.gradle.kts': '// strict\n',
      'config/pmd/aisdlc-ruleset.xml': '<ruleset />\n',
    },
  },
  {
    stack: 'kotlin',
    manifest: 'mobile/build.gradle.kts',
    content: 'plugins {}',
    requiredFiles: {
      'gradle/init.d/aisdlc-strict.init.gradle.kts': '// strict\n',
      'config/detekt/detekt.yml': 'build:\n  maxIssues: 0\n',
    },
  },
  {
    stack: 'rust',
    manifest: 'crates/core/Cargo.toml',
    content: '[package]\nname = "core"\n',
    requiredFiles: { '.cargo/config.toml': '[build]\n', '.clippy.toml': '' },
  },
  {
    stack: 'go',
    manifest: 'services/api/go.mod',
    content: 'module example.com/api\n',
    requiredFiles: { '.golangci.yml': 'linters: {}\n' },
  },
  {
    stack: 'c',
    manifest: 'native/main.c',
    content: 'int main(void) { return 0; }\n',
    requiredFiles: { '.clang-tidy': 'Checks: "*"\n', 'cmake/AisdlcStrictCompiler.cmake': '# strict\n' },
  },
  {
    stack: 'cpp',
    manifest: 'engine/CMakeLists.txt',
    content: 'cmake_minimum_required(VERSION 3.20)\n',
    requiredFiles: { '.clang-tidy': 'Checks: "*"\n', 'cmake/AisdlcStrictCompiler.cmake': '# strict\n' },
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
      'Directory.Build.props': '<Project/>',
      'src/Api/Api.csproj': '<Nullable>disable</Nullable>',
      'src/Api/Directory.Build.props': '<Project/>',
    });
    const v = collectCodingRulesBypassViolations(root);
    expect(v).toHaveLength(2);
  });

  it('accepts nested Directory.Build.props importing the parent', () => {
    const root = setup({
      'Directory.Build.props': '<Project/>',
      'src/Directory.Build.props': '<Import Project="$([MSBuild]::GetPathOfFileAbove(\'Directory.Build.props\', \'$(MSBuildThisFileDirectory)../\'))" />',
    });
    expect(collectCodingRulesBypassViolations(root)).toEqual([]);
  });

  it('flags tsconfig weakening when tsconfig.strict.json exists', () => {
    const root = setup({
      'tsconfig.strict.json': '{}',
      'eslint.config.mjs': 'export default [];\n',
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