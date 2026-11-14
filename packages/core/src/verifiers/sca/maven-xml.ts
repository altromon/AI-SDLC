/**
 * AI-SDLC: Hardened Maven pom.xml Tokenizer & Dependency Extractor (CHG-054)
 * Rejects DOCTYPE/ENTITY, strips comments/CDATA linearly, and avoids license inheritance.
 */

export interface MavenDependencyRaw {
  groupId: string;
  artifactId: string;
  version: string;
  license: string;
}

const UNRESOLVED_PROP_RE = /\$\{[^}]+\}/;
const DISALLOWED_DTD_RE = /<!(?:DOCTYPE|ENTITY)\b/i;

function hasDisallowedDtd(xml: string): boolean {
  return DISALLOWED_DTD_RE.test(xml);
}

function stripCommentsAndCdata(xml: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < xml.length) {
    if (xml.startsWith('<!--', i)) {
      const end = xml.indexOf('-->', i + 4);
      i = end === -1 ? xml.length : end + 3;
    } else if (xml.startsWith('<![CDATA[', i)) {
      const end = xml.indexOf(']]>', i + 9);
      i = end === -1 ? xml.length : end + 3;
    } else {
      out.push(xml[i]);
      i += 1;
    }
  }
  return out.join('');
}

function readTagText(block: string, tag: string): string | undefined {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const start = block.indexOf(open);
  if (start === -1) return undefined;
  const contentStart = start + open.length;
  const end = block.indexOf(close, contentStart);
  if (end === -1) return undefined;
  const text = block.slice(contentStart, end).trim();
  return text.length > 0 ? text : undefined;
}

function resolveField(raw: string | undefined): string {
  if (!raw || UNRESOLVED_PROP_RE.test(raw)) return 'UNKNOWN';
  return raw;
}

function resolveLicenseField(block: string): string {
  const raw = readTagText(block, 'license');
  if (!raw) return 'UNKNOWN';
  const nested = raw.includes('<') ? readTagText(raw, 'name') : raw;
  return resolveField(nested);
}

function extractSingleMavenDep(block: string): MavenDependencyRaw | null {
  const groupId = readTagText(block, 'groupId');
  const artifactId = readTagText(block, 'artifactId');
  if (!groupId || !artifactId) return null;
  if (UNRESOLVED_PROP_RE.test(groupId) || UNRESOLVED_PROP_RE.test(artifactId)) return null;

  return {
    groupId,
    artifactId,
    version: resolveField(readTagText(block, 'version')),
    license: resolveLicenseField(block),
  };
}

export function parseMavenPomDependencies(xml: string): MavenDependencyRaw[] {
  if (hasDisallowedDtd(xml)) {
    console.warn('[SCA] Rejected pom.xml containing disallowed DOCTYPE or ENTITY declaration');
    return [];
  }

  const sanitized = stripCommentsAndCdata(xml);
  const deps: MavenDependencyRaw[] = [];
  let cursor = 0;

  while (cursor < sanitized.length) {
    const start = sanitized.indexOf('<dependency>', cursor);
    if (start === -1) break;
    const end = sanitized.indexOf('</dependency>', start + 12);
    if (end === -1) break;

    const dep = extractSingleMavenDep(sanitized.slice(start + 12, end));
    if (dep) deps.push(dep);
    cursor = end + 13;
  }

  return deps;
}
