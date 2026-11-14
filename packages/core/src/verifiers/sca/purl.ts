/**
 * AI-SDLC: Package URL (PURL) Builder (CHG-054)
 * Implements strict PURL grammar, percent-encoding, and safe generic fallback.
 */

export interface BuildPurlInput {
  ecosystem: string;
  namespace?: string;
  name: string;
  version: string;
  warnings?: string[];
}

const ECOSYSTEM_TYPE_MAP: Record<string, string> = {
  npm: 'npm',
  node: 'npm',
  nodejs: 'npm',
  yarn: 'npm',
  pnpm: 'npm',
  pypi: 'pypi',
  python: 'pypi',
  'python-pkg': 'pypi',
  pip: 'pypi',
  poetry: 'pypi',
  wheel: 'pypi',
  maven: 'maven',
  pom: 'maven',
  java: 'maven',
  'java-archive': 'maven',
  gradle: 'maven',
  cargo: 'cargo',
  rust: 'cargo',
  'rust-crate': 'cargo',
  golang: 'golang',
  go: 'golang',
  gomod: 'golang',
  'go-module': 'golang',
  nuget: 'nuget',
  dotnet: 'nuget',
};

function encodePurlSegment(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function resolvePurlType(ecosystem: string, warnings?: string[]): string {
  const key = ecosystem.trim().toLowerCase();
  const mapped = ECOSYSTEM_TYPE_MAP[key];
  if (mapped) return mapped;

  const msg = `[SCA] Unknown ecosystem "${ecosystem || 'empty'}", falling back to pkg:generic`;
  console.warn(msg);
  warnings?.push(msg);
  return 'generic';
}

const NAMESPACE_SPLITTERS: Record<string, { sep: string; last?: boolean; prefix?: string }> = {
  npm: { sep: '/', prefix: '@' },
  maven: { sep: ':' },
  golang: { sep: '/', last: true },
};

function splitNamespaceAndName(
  type: string,
  namespace: string | undefined,
  name: string
): { namespace?: string; name: string } {
  const normalizedName = type === 'pypi' ? name.toLowerCase() : name;
  if (namespace) return { namespace, name: normalizedName };

  const rule = NAMESPACE_SPLITTERS[type];
  if (!rule || (rule.prefix && !normalizedName.startsWith(rule.prefix))) {
    return { name: normalizedName };
  }
  const idx = rule.last
    ? normalizedName.lastIndexOf(rule.sep)
    : normalizedName.indexOf(rule.sep);
  if (idx === -1) return { name: normalizedName };
  return { namespace: normalizedName.slice(0, idx), name: normalizedName.slice(idx + 1) };
}

export function buildPurl(input: BuildPurlInput): string {
  const type = resolvePurlType(input.ecosystem, input.warnings);
  const parts = splitNamespaceAndName(type, input.namespace, input.name);
  const encodedNs = parts.namespace
    ? parts.namespace.split('/').map(encodePurlSegment).join('/')
    : '';
  const encodedName = encodePurlSegment(parts.name);
  const encodedVer = input.version ? `@${encodePurlSegment(input.version)}` : '';
  return encodedNs
    ? `pkg:${type}/${encodedNs}/${encodedName}${encodedVer}`
    : `pkg:${type}/${encodedName}${encodedVer}`;
}
