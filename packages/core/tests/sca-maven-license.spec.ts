import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scanMavenDependencies } from '../src/verifiers/sca/scanner.js';
import type { ScannedDependency } from '../src/types/index.js';

describe('CHG-054 TSK-001: Maven pom.xml license & XML hardening', () => {
  const tmpDirs: string[] = [];

  function createPomDir(pomContent: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-maven-'));
    tmpDirs.push(dir);
    fs.writeFileSync(path.join(dir, 'pom.xml'), pomContent, 'utf-8');
    return dir;
  }

  afterEach(() => {
    vi.restoreAllMocks();
    for (const dir of tmpDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not inherit root project <licenses> when dependency has no license', () => {
    const dir = createPomDir(`
      <project>
        <groupId>com.example</groupId>
        <artifactId>app</artifactId>
        <version>1.0.0</version>
        <licenses>
          <license>
            <name>Apache-2.0</name>
          </license>
        </licenses>
        <dependencies>
          <dependency>
            <groupId>com.acme</groupId>
            <artifactId>lib</artifactId>
            <version>1.0.0</version>
          </dependency>
        </dependencies>
      </project>
    `);

    const seen = new Map<string, ScannedDependency>();
    scanMavenDependencies(dir, seen);

    const dep = Array.from(seen.values()).find((d) => d.name === 'com.acme:lib');
    expect(dep).toBeDefined();
    expect(dep?.spdxLicense).toBe('UNKNOWN');
  });

  it('discards XML comment license hints (<!-- license: MIT -->) and marks UNKNOWN', () => {
    const dir = createPomDir(`
      <project>
        <dependencies>
          <dependency>
            <groupId>com.acme</groupId>
            <artifactId>comment-lic</artifactId>
            <version>2.1.0</version>
            <!-- license: MIT -->
          </dependency>
        </dependencies>
      </project>
    `);

    const seen = new Map<string, ScannedDependency>();
    scanMavenDependencies(dir, seen);

    const dep = Array.from(seen.values()).find((d) => d.name === 'com.acme:comment-lic');
    expect(dep).toBeDefined();
    expect(dep?.spdxLicense).toBe('UNKNOWN');
  });

  it('marks unresolved property placeholders like ${project.version} as UNKNOWN', () => {
    const dir = createPomDir(`
      <project>
        <dependencies>
          <dependency>
            <groupId>com.acme</groupId>
            <artifactId>prop-ver</artifactId>
            <version>\${project.version}</version>
            <license>\${dep.license}</license>
          </dependency>
        </dependencies>
      </project>
    `);

    const seen = new Map<string, ScannedDependency>();
    scanMavenDependencies(dir, seen);

    const dep = Array.from(seen.values()).find((d) => d.name === 'com.acme:prop-ver');
    expect(dep).toBeDefined();
    expect(dep?.version).toBe('UNKNOWN');
    expect(dep?.spdxLicense).toBe('UNKNOWN');
  });

  it('rejects pom.xml with DOCTYPE/ENTITY without entity expansion or path leaks', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dir = createPomDir(`<?xml version="1.0" encoding="UTF-8"?>
      <!DOCTYPE foo [
        <!ENTITY xxe SYSTEM "file:///etc/passwd">
      ]>
      <project>
        <dependencies>
          <dependency>
            <groupId>com.evil</groupId>
            <artifactId>xxe-dep</artifactId>
            <version>&xxe;</version>
            <license>MIT</license>
          </dependency>
        </dependencies>
      </project>
    `);

    const seen = new Map<string, ScannedDependency>();
    scanMavenDependencies(dir, seen);

    expect(seen.size).toBe(0);
    const warningsText = warnSpy.mock.calls.flat().join(' ');
    expect(warningsText).not.toContain('/etc/passwd');
    expect(warningsText).not.toContain('root:x:');
  });

  it('is not fooled by CDATA or XML comments around <dependency> and <license>', () => {
    const dir = createPomDir(`
      <project>
        <dependencies>
          <!--
          <dependency>
            <groupId>com.fake</groupId>
            <artifactId>commented-dep</artifactId>
            <version>1.0.0</version>
            <license>MIT</license>
          </dependency>
          -->
          <![CDATA[
          <dependency>
            <groupId>com.fake</groupId>
            <artifactId>cdata-dep</artifactId>
            <version>1.0.0</version>
            <license>MIT</license>
          </dependency>
          ]]>
          <dependency>
            <groupId>com.real</groupId>
            <artifactId>real-dep</artifactId>
            <version>1.2.3</version>
            <license><!-- MIT --></license>
          </dependency>
        </dependencies>
      </project>
    `);

    const seen = new Map<string, ScannedDependency>();
    scanMavenDependencies(dir, seen);

    const names = Array.from(seen.values()).map((d) => d.name);
    expect(names).not.toContain('com.fake:commented-dep');
    expect(names).not.toContain('com.fake:cdata-dep');

    const realDep = Array.from(seen.values()).find((d) => d.name === 'com.real:real-dep');
    expect(realDep).toBeDefined();
    expect(realDep?.spdxLicense).toBe('UNKNOWN');
  });

  it('preserves valid inline <license> on a dependency', () => {
    const dir = createPomDir(`
      <project>
        <licenses>
          <license>
            <name>Apache-2.0</name>
          </license>
        </licenses>
        <dependencies>
          <dependency>
            <groupId>com.acme</groupId>
            <artifactId>inline-lic</artifactId>
            <version>3.0.0</version>
            <license>MIT</license>
          </dependency>
        </dependencies>
      </project>
    `);

    const seen = new Map<string, ScannedDependency>();
    scanMavenDependencies(dir, seen);

    const dep = Array.from(seen.values()).find((d) => d.name === 'com.acme:inline-lic');
    expect(dep).toBeDefined();
    expect(dep?.version).toBe('3.0.0');
    expect(dep?.spdxLicense).toBe('MIT');
  });

  it('strips <exclusions> before <groupId> and supports attributes on <dependency> and inner tags', () => {
    const dir = createPomDir(`
      <project>
        <dependencies>
          <dependency scope="compile">
            <exclusions>
              <exclusion>
                <groupId>com.excluded</groupId>
                <artifactId>bad-art</artifactId>
              </exclusion>
            </exclusions>
            <groupId xml:space="preserve">com.real</groupId>
            <artifactId>good-art</artifactId>
            <version>1.4.0</version>
          </dependency>
        </dependencies>
      </project>
    `);

    const seen = new Map<string, ScannedDependency>();
    scanMavenDependencies(dir, seen);

    const dep = Array.from(seen.values()).find((d) => d.name === 'com.real:good-art');
    expect(dep).toBeDefined();
    expect(dep?.version).toBe('1.4.0');
    expect(seen.has('maven:com.excluded:bad-art@1.4.0')).toBe(false);
  });

  it('combines multiple <license> entries conservatively (MIT AND GPL-3.0-only)', () => {
    const dir = createPomDir(`
      <project>
        <dependencies>
          <dependency>
            <groupId>com.dual</groupId>
            <artifactId>multi-lic</artifactId>
            <version>2.0.0</version>
            <licenses>
              <license><name>MIT</name></license>
              <license><name>GPL-3.0-only</name></license>
            </licenses>
          </dependency>
        </dependencies>
      </project>
    `);

    const seen = new Map<string, ScannedDependency>();
    scanMavenDependencies(dir, seen);

    const dep = Array.from(seen.values()).find((d) => d.name === 'com.dual:multi-lic');
    expect(dep).toBeDefined();
    expect(dep?.spdxLicense).toBe('MIT AND GPL-3.0-only');
  });

  it('treats empty property placeholder ${} as UNKNOWN', () => {
    const dir = createPomDir(`
      <project>
        <dependencies>
          <dependency>
            <groupId>com.acme</groupId>
            <artifactId>empty-prop</artifactId>
            <version>\${}</version>
            <license>\${}</license>
          </dependency>
        </dependencies>
      </project>
    `);

    const seen = new Map<string, ScannedDependency>();
    scanMavenDependencies(dir, seen);

    const dep = Array.from(seen.values()).find((d) => d.name === 'com.acme:empty-prop');
    expect(dep).toBeDefined();
    expect(dep?.version).toBe('UNKNOWN');
    expect(dep?.spdxLicense).toBe('UNKNOWN');
  });
});
