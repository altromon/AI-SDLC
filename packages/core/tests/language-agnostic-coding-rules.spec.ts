/**
 * Language-Agnostic Coding Rules Detection, Migration, and Verification Tests
 * Cites: FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001, UC-069-LANGUAGE-AGNOSTIC-CODING-RULES
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CodingRuleStack,
  MigrationService,
  detectProjectStacks,
  getRequiredCodingRulesFiles,
} from '../src/index.js';

const tempDirs: string[] = [];

function createWorkspace(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lacr-'));
  tempDirs.push(dir);
  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
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

const STACK_NESTED_MANIFESTS: { stack: CodingRuleStack; manifest: string; content: string; requiredFiles: string[] }[] = [
  {
    stack: 'dotnet',
    manifest: 'src/App/App.csproj',
    content: '<Project Sdk="Microsoft.NET.Sdk" />',
    requiredFiles: ['Directory.Build.props'],
  },
  {
    stack: 'typescript',
    manifest: 'frontend/tsconfig.json',
    content: '{}',
    requiredFiles: ['tsconfig.strict.json', 'eslint.config.mjs'],
  },
  {
    stack: 'javascript',
    manifest: 'web/package.json',
    content: '{}',
    requiredFiles: ['tsconfig.strict.json', 'eslint.config.mjs'],
  },
  {
    stack: 'angular',
    manifest: 'client/angular.json',
    content: '{}',
    requiredFiles: ['tsconfig.strict.json', 'eslint.config.mjs'],
  },
  {
    stack: 'java',
    manifest: 'backend/pom.xml',
    content: '<project />',
    requiredFiles: ['gradle/init.d/aisdlc-strict.init.gradle.kts', 'config/pmd/aisdlc-ruleset.xml'],
  },
  {
    stack: 'kotlin',
    manifest: 'mobile/build.gradle.kts',
    content: 'plugins {}',
    requiredFiles: ['gradle/init.d/aisdlc-strict.init.gradle.kts', 'config/detekt/detekt.yml'],
  },
  {
    stack: 'rust',
    manifest: 'crates/core/Cargo.toml',
    content: '[package]\nname = "core"\n',
    requiredFiles: ['.cargo/config.toml', '.clippy.toml'],
  },
  {
    stack: 'go',
    manifest: 'services/api/go.mod',
    content: 'module example.com/api\n',
    requiredFiles: ['.golangci.yml'],
  },
  {
    stack: 'c',
    manifest: 'native/main.c',
    content: 'int main(void) { return 0; }\n',
    requiredFiles: ['.clang-tidy', 'cmake/AisdlcStrictCompiler.cmake'],
  },
  {
    stack: 'cpp',
    manifest: 'engine/CMakeLists.txt',
    content: 'cmake_minimum_required(VERSION 3.20)\n',
    requiredFiles: ['.clang-tidy', 'cmake/AisdlcStrictCompiler.cmake'],
  },
];

describe('FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001: Recursive Stack Detection & Migration', () => {
  it.each(STACK_NESTED_MANIFESTS)(
    'detects $stack in nested subdirectory ($manifest) and returns its required coding-rules files',
    ({ stack, manifest, content, requiredFiles }) => {
      const root = createWorkspace({ [manifest]: content });
      const detected = detectProjectStacks(root);
      expect(detected).toContain(stack);
      expect(getRequiredCodingRulesFiles(stack)).toEqual(requiredFiles);
    }
  );

  it('detects all stacks independently in a polyglot monorepo without shadowing', () => {
    const root = createWorkspace({
      'client/angular.json': '{}',
      'services/api/tsconfig.json': '{}',
      'scripts/package.json': '{}',
    });

    const detected = detectProjectStacks(root);
    expect(detected).toEqual(expect.arrayContaining(['angular', 'typescript', 'javascript']));
  });

  it('disambiguates c vs cpp and ignores bare Makefiles without C/C++ sources', () => {
    const cRoot = createWorkspace({ 'native/main.c': 'int main(void) { return 0; }\n' });
    expect(detectProjectStacks(cRoot)).toContain('c');
    expect(detectProjectStacks(cRoot)).not.toContain('cpp');

    const cppRoot = createWorkspace({ 'engine/CMakeLists.txt': 'cmake_minimum_required(VERSION 3.20)\n' });
    expect(detectProjectStacks(cppRoot)).toContain('cpp');

    const bareMakefileRoot = createWorkspace({ Makefile: 'all:\n\techo ok\n' });
    expect(detectProjectStacks(bareMakefileRoot)).toEqual([]);
  });

  it('skips ignored directories and stops recursion beyond maxDepth (depth > 3)', () => {
    const ignoredDirs = [
      'node_modules',
      '.git',
      'bin',
      'obj',
      'dist',
      'build',
      'target',
      '.venv',
      'venv',
      '__pycache__',
      'reports',
      'templates',
    ];

    const ignoredFiles: Record<string, string> = {};
    for (const dir of ignoredDirs) {
      ignoredFiles[`${dir}/pkg/package.json`] = '{}';
      ignoredFiles[`${dir}/sub/go.mod`] = 'module ignored\n';
    }
    const ignoredRoot = createWorkspace(ignoredFiles);
    expect(detectProjectStacks(ignoredRoot)).toEqual([]);

    const deepRoot = createWorkspace({
      'd1/d2/d3/d4/Cargo.toml': '[package]\nname = "too-deep"\n',
    });
    expect(detectProjectStacks(deepRoot)).toEqual([]);
  });

  it('MigrationService.discoverGovernedFiles deploys missing strict coding-rules files for nested stacks without overwriting existing ones', async () => {
    const customGoRules = '# custom human golangci rules\nrun:\n  timeout: 10m\n';
    const root = createWorkspace({
      'src/App/App.csproj': '<Project Sdk="Microsoft.NET.Sdk" />',
      'services/api/go.mod': 'module example.com/api\n',
      '.golangci.yml': customGoRules,
    });

    const service = new MigrationService();
    const preview = await service.preview({ root });
    const policyItems = preview.details.filter((d) => d.category === 'policy');

    expect(policyItems.some((d) => d.file === 'Directory.Build.props' && d.status === 'CLEAN_UPDATE')).toBe(true);

    const result = await service.migrate({ root, backup: false });
    expect(result.exitCode).not.toBe(2);
    expect(fs.existsSync(path.join(root, 'Directory.Build.props'))).toBe(true);
    expect(fs.readFileSync(path.join(root, '.golangci.yml'), 'utf-8')).toBe(customGoRules);
  });
});
