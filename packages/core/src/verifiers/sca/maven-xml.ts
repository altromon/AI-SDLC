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

const UNRESOLVED_PROP_RE = /\$\{[^}]*\}/;
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
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}\\s*>`, 'i');
  const match = re.exec(block);
  if (!match) return undefined;
  const text = match[1].trim();
  return text.length > 0 ? text : undefined;
}

function readAllTagTexts(block: string, tag: string): string[] {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}\\s*>`, 'gi');
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(block)) !== null) {
    const text = match[1].trim();
    if (text.length > 0) results.push(text);
  }
  return results;
}

function resolveField(raw: string | undefined): string {
  if (!raw || UNRESOLVED_PROP_RE.test(raw)) return 'UNKNOWN';
  return raw;
}

function resolveLicenseField(block: string): string {
  const rawLicenses = readAllTagTexts(block, 'license');
  if (rawLicenses.length === 0) return 'UNKNOWN';
  const resolved = rawLicenses
    .map((raw) => resolveField(raw.includes('<') ? readTagText(raw, 'name') : raw))
    .filter((lic) => lic !== 'UNKNOWN');
  if (resolved.length === 0) return 'UNKNOWN';
  return Array.from(new Set(resolved)).join(' AND ');
}

function extractSingleMavenDep(block: string): MavenDependencyRaw | null {
  const cleanBlock = block.replace(/<exclusions(?:\s[^>]*)?>[\s\S]*?<\/exclusions\s*>/gi, '');
  const groupId = readTagText(cleanBlock, 'groupId');
  const artifactId = readTagText(cleanBlock, 'artifactId');
  if (!groupId || !artifactId) return null;
  if (UNRESOLVED_PROP_RE.test(groupId) || UNRESOLVED_PROP_RE.test(artifactId)) return null;

  return {
    groupId,
    artifactId,
    version: resolveField(readTagText(cleanBlock, 'version')),
    license: resolveLicenseField(cleanBlock),
  };
}

export function parseMavenPomDependencies(xml: string): MavenDependencyRaw[] {
  if (hasDisallowedDtd(xml)) {
    console.warn('[SCA] Rejected pom.xml containing disallowed DOCTYPE or ENTITY declaration');
    return [];
  }

  const sanitized = stripCommentsAndCdata(xml);
  const deps: MavenDependencyRaw[] = [];
  const depRe = /<dependency(?:\s[^>]*)?>([\s\S]*?)<\/dependency\s*>/gi;
  let match: RegExpExecArray | null;

  while ((match = depRe.exec(sanitized)) !== null) {
    const dep = extractSingleMavenDep(match[1]);
    if (dep) deps.push(dep);
  }

  return deps;
}
