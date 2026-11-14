import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPurl } from '../src/verifiers/sca/purl.js';

describe('CHG-054 TSK-002: buildPurl ecosystem & percent-encoding', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds npm PURLs including scoped packages (@scope -> %40scope)', () => {
    expect(buildPurl({ ecosystem: 'npm', name: 'lodash', version: '4.17.21' })).toBe(
      'pkg:npm/lodash@4.17.21'
    );
    expect(
      buildPurl({ ecosystem: 'npm', namespace: '@scope', name: 'pkg', version: '1.0.0' })
    ).toBe('pkg:npm/%40scope/pkg@1.0.0');
  });

  it('builds pypi PURLs with lowercase package name', () => {
    expect(buildPurl({ ecosystem: 'pypi', name: 'Requests', version: '2.0.0' })).toBe(
      'pkg:pypi/requests@2.0.0'
    );
  });

  it('builds maven PURLs with group/artifact format', () => {
    expect(
      buildPurl({ ecosystem: 'maven', namespace: 'com.acme', name: 'lib', version: '1.0' })
    ).toBe('pkg:maven/com.acme/lib@1.0');
  });

  it('builds cargo, golang, and nuget PURLs', () => {
    expect(buildPurl({ ecosystem: 'cargo', name: 'serde', version: '1.0.197' })).toBe(
      'pkg:cargo/serde@1.0.197'
    );
    expect(
      buildPurl({
        ecosystem: 'golang',
        namespace: 'github.com/gin-gonic',
        name: 'gin',
        version: '1.9.1',
      })
    ).toBe('pkg:golang/github.com/gin-gonic/gin@1.9.1');
    expect(
      buildPurl({ ecosystem: 'nuget', name: 'Newtonsoft.Json', version: '13.0.3' })
    ).toBe('pkg:nuget/Newtonsoft.Json@13.0.3');
  });

  it('percent-encodes +build metadata in versions (+ -> %2B)', () => {
    expect(
      buildPurl({ ecosystem: 'npm', name: 'semver-pkg', version: '1.0.0+build.1' })
    ).toBe('pkg:npm/semver-pkg@1.0.0%2Bbuild.1');
  });

  it('falls back to pkg:generic and emits a warning for unknown ecosystems (never pkg:npm)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const purl = buildPurl({ ecosystem: 'obscure-lang', name: 'foo', version: '1.0.0' });

    expect(purl).toBe('pkg:generic/foo@1.0.0');
    expect(purl.startsWith('pkg:npm')).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('normalizes pypi names per PEP 503 (typing_extensions -> typing-extensions)', () => {
    expect(
      buildPurl({ ecosystem: 'pypi', name: 'Typing__Extensions.Core', version: '4.11.0' })
    ).toBe('pkg:pypi/typing-extensions-core@4.11.0');
  });

  it('normalizes golang namespace and name to lowercase', () => {
    expect(
      buildPurl({
        ecosystem: 'golang',
        namespace: 'GitHub.com/Gin-Gonic',
        name: 'Gin',
        version: 'v1.9.1',
      })
    ).toBe('pkg:golang/github.com/gin-gonic/gin@v1.9.1');
    expect(
      buildPurl({ ecosystem: 'golang', name: 'GitHub.com/Org/Repo', version: 'v1.0.0' })
    ).toBe('pkg:golang/github.com/org/repo@v1.0.0');
  });

  it('does not throw URIError on lone surrogates and does not warn on explicit generic', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const purl = buildPurl({ ecosystem: 'generic', name: 'bad\uD800name', version: '1.0.0' });

    expect(purl).toBe('pkg:generic/bad%EF%BF%BDname@1.0.0');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
