/**
 * AI-SDLC: CLI Polyglot Stack Detection & Manifest Precedence Test Suite (RED Phase)
 * Cites: FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001, CMP-072-POLYGLOT-REGISTRY-BDD-JVM-CPP, CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
 * Tag: @FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001 @CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  detectAuxiliaryLanguageInDir,
  detectDefaultScaffoldLanguage,
  detectPrimaryLanguageInDir,
  disambiguateCMake,
  disambiguateGradleKts,
  hasSubtreeExtension,
  matchesSubtreeEntry,
  normalizeScaffoldLanguage,
} from '../src/commands/check.js';

describe('@FR-072-POLYGLOT-REGISTRY-BDD-JVM-CPP-001 @CHG-072-POLYGLOT-REGISTRY-BDD-JVM-CPP: CLI Polyglot Stack Detection', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-polyglot-cli-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('normalizeScaffoldLanguage accepts kotlin alias and rejects unknown languages', () => {
    expect(normalizeScaffoldLanguage('kotlin')).toBe('kt');
    expect(normalizeScaffoldLanguage('kt')).toBe('kt');
    expect(normalizeScaffoldLanguage('java')).toBe('java');
    expect(normalizeScaffoldLanguage('c')).toBe('c');
    expect(normalizeScaffoldLanguage('cpp')).toBe('cpp');
    expect(normalizeScaffoldLanguage('fortran')).toBeNull();
  });

  it('detectDefaultScaffoldLanguage recognizes pom.xml and build.gradle as java', () => {
    const mavenDir = path.join(tmpDir, 'maven-app');
    fs.mkdirSync(mavenDir, { recursive: true });
    fs.writeFileSync(path.join(mavenDir, 'pom.xml'), '<project/>', 'utf-8');
    expect(detectDefaultScaffoldLanguage(mavenDir)).toBe('java');

    const gradleDir = path.join(tmpDir, 'gradle-app');
    fs.mkdirSync(gradleDir, { recursive: true });
    fs.writeFileSync(path.join(gradleDir, 'build.gradle'), 'plugins { id "java" }', 'utf-8');
    expect(detectDefaultScaffoldLanguage(gradleDir)).toBe('java');
  });

  it('detectDefaultScaffoldLanguage disambiguates build.gradle.kts between kt and java', () => {
    const ktDir = path.join(tmpDir, 'kt-gradle');
    fs.mkdirSync(path.join(ktDir, 'src', 'main', 'kotlin'), { recursive: true });
    fs.writeFileSync(path.join(ktDir, 'build.gradle.kts'), 'plugins { kotlin("jvm") }', 'utf-8');
    fs.writeFileSync(path.join(ktDir, 'src', 'main', 'kotlin', 'App.kt'), 'fun main() {}', 'utf-8');
    expect(detectDefaultScaffoldLanguage(ktDir)).toBe('kt');

    const javaKtsDir = path.join(tmpDir, 'java-gradle-kts');
    fs.mkdirSync(path.join(javaKtsDir, 'src', 'main', 'java'), { recursive: true });
    fs.writeFileSync(path.join(javaKtsDir, 'build.gradle.kts'), 'plugins { java }', 'utf-8');
    fs.writeFileSync(path.join(javaKtsDir, 'src', 'main', 'java', 'App.java'), 'class App {}', 'utf-8');
    expect(detectDefaultScaffoldLanguage(javaKtsDir)).toBe('java');
  });

  it('detectDefaultScaffoldLanguage disambiguates CMakeLists.txt between c and cpp', () => {
    const cDir = path.join(tmpDir, 'cmake-c');
    fs.mkdirSync(path.join(cDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(cDir, 'CMakeLists.txt'), 'project(app C)', 'utf-8');
    fs.writeFileSync(path.join(cDir, 'src', 'main.c'), 'int main(void) { return 0; }', 'utf-8');
    expect(detectDefaultScaffoldLanguage(cDir)).toBe('c');

    const cppDir = path.join(tmpDir, 'cmake-cpp');
    fs.mkdirSync(path.join(cppDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(cppDir, 'CMakeLists.txt'), 'project(app CXX)', 'utf-8');
    fs.writeFileSync(path.join(cppDir, 'src', 'main.cpp'), 'int main() { return 0; }', 'utf-8');
    expect(detectDefaultScaffoldLanguage(cppDir)).toBe('cpp');
  });

  it('preserves pyproject.toml > go.mod precedence and lets src/App/App.csproj beat root requirements.txt', () => {
    const pyOverGoDir = path.join(tmpDir, 'py-over-go');
    fs.mkdirSync(pyOverGoDir, { recursive: true });
    fs.writeFileSync(path.join(pyOverGoDir, 'pyproject.toml'), '[project]\nname = "app"\n', 'utf-8');
    fs.writeFileSync(path.join(pyOverGoDir, 'go.mod'), 'module example.com/app\n', 'utf-8');
    expect(detectDefaultScaffoldLanguage(pyOverGoDir)).toBe('py');

    const csOverReqDir = path.join(tmpDir, 'cs-over-root-req');
    fs.mkdirSync(path.join(csOverReqDir, 'src', 'App'), { recursive: true });
    fs.writeFileSync(path.join(csOverReqDir, 'requirements.txt'), 'pytest==8.0.0\n', 'utf-8');
    fs.writeFileSync(path.join(csOverReqDir, 'src', 'App', 'App.csproj'), '<Project Sdk="Microsoft.NET.Sdk" />', 'utf-8');
    expect(detectDefaultScaffoldLanguage(csOverReqDir)).toBe('cs');
  });

  it('ignores manifests inside unified excluded directories such as target, build, node_modules, and coverage', () => {
    const excludedDir = path.join(tmpDir, 'excluded-only');
    for (const sub of ['target', 'build', 'node_modules', 'coverage', 'reports', 'templates', 'examples']) {
      fs.mkdirSync(path.join(excludedDir, sub), { recursive: true });
    }
    fs.writeFileSync(path.join(excludedDir, 'target', 'pom.xml'), '<project/>', 'utf-8');
    fs.writeFileSync(path.join(excludedDir, 'build', 'CMakeLists.txt'), 'project(x)', 'utf-8');
    fs.writeFileSync(path.join(excludedDir, 'node_modules', 'package.json'), '{}', 'utf-8');
    fs.writeFileSync(path.join(excludedDir, 'coverage', 'go.mod'), 'module x', 'utf-8');

    expect(detectDefaultScaffoldLanguage(excludedDir)).toBeNull();
  });

  it('exposes modular helper functions for subtree extension matching, manifest disambiguation, and primary/auxiliary detection', () => {
    const helperDir = path.join(tmpDir, 'helper-dir');
    fs.mkdirSync(path.join(helperDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(helperDir, 'requirements.txt'), 'pytest\n', 'utf-8');
    fs.writeFileSync(path.join(helperDir, 'src', 'app.cpp'), 'int main() { return 0; }\n', 'utf-8');

    expect(detectPrimaryLanguageInDir(helperDir)).toBeNull();
    expect(detectAuxiliaryLanguageInDir(helperDir)).toBe('py');
    expect(hasSubtreeExtension(helperDir, ['.cpp'])).toBe(true);
    expect(hasSubtreeExtension(helperDir, ['.rs'])).toBe(false);

    const entries = fs.readdirSync(path.join(helperDir, 'src'), { withFileTypes: true });
    expect(entries.some((e) => matchesSubtreeEntry(path.join(helperDir, 'src'), e, ['.cpp'], [], 0))).toBe(true);

    expect(disambiguateCMake(helperDir)).toBe('cpp');
    expect(disambiguateGradleKts(helperDir)).toBe('kt');
  });
});
