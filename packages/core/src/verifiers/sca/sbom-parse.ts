/**
 * AI-SDLC: CycloneDX 1.x & SPDX 2.x SBOM Parser (CHG-056 / TSK-002)
 * Strict PURL grammar parser (independent of buildPurl), root exclusion,
 * license precedence & sanitization, deduplication, and canonical ordering.
 */

import { ScaSbomError, type SbomDocument } from './sbom-ingest.js';

export interface SbomComponent {
  ecosystem: string;
  namespace?: string;
  name: string;
  version: string;
  spdxLicense: string;
  purl?: string;
}

export interface ParsedPurl {
  ecosystem: string;
  namespace?: string;
  name: string;
  version: string;
}

const MAX_LICENSE_LEN = 200;
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_RE = /[\x00-\x1f\x7f]/;

function safeDecode(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function splitPurlHead(rawPurl: string): { ecosystem: string; pathPart: string; version: string } | null {
  if (!rawPurl || typeof rawPurl !== 'string' || !rawPurl.startsWith('pkg:')) return null;
  const body = rawPurl.slice(4).split('#')[0].split('?')[0];
  const slashIdx = body.indexOf('/');
  if (slashIdx <= 0) return null;
  const ecosystem = body.slice(0, slashIdx).toLowerCase();
  const rest = body.slice(slashIdx + 1);
  const atIdx = rest.lastIndexOf('@');
  if (atIdx <= 0 || atIdx === rest.length - 1) return null;
  const version = safeDecode(rest.slice(atIdx + 1));
  if (!ecosystem || !version) return null;
  return { ecosystem, pathPart: rest.slice(0, atIdx), version };
}

export function parseStrictPurl(rawPurl: string): ParsedPurl | null {
  const head = splitPurlHead(rawPurl);
  if (!head) return null;
  const lastSlash = head.pathPart.lastIndexOf('/');
  const rawName = lastSlash >= 0 ? head.pathPart.slice(lastSlash + 1) : head.pathPart;
  const name = safeDecode(rawName);
  if (!name) return null;
  const rawNs = lastSlash > 0 ? head.pathPart.slice(0, lastSlash) : '';
  const namespace = rawNs ? safeDecode(rawNs) : undefined;
  if (rawNs && !namespace) return null;
  return { ecosystem: head.ecosystem, ...(namespace ? { namespace } : {}), name, version: head.version };
}

export function sanitizeSbomLicense(raw: unknown): string {
  if (typeof raw !== 'string') return 'UNKNOWN';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_LICENSE_LEN || CONTROL_CHAR_RE.test(trimmed)) {
    return 'UNKNOWN';
  }
  const upper = trimmed.toUpperCase();
  if (upper === 'NOASSERTION' || upper === 'NONE' || trimmed.startsWith('LicenseRef-')) {
    return 'UNKNOWN';
  }
  return trimmed;
}

function readCdxLicenseEntry(entry: unknown): string {
  if (!entry || typeof entry !== 'object') return 'UNKNOWN';
  const obj = entry as { expression?: unknown; license?: { id?: unknown; name?: unknown } };
  return sanitizeSbomLicense(obj.expression ?? obj.license?.id ?? obj.license?.name);
}

function extractCdxLicense(licenses: unknown): string {
  if (!Array.isArray(licenses) || licenses.length === 0) return 'UNKNOWN';
  const parts: string[] = [];
  for (const entry of licenses) {
    const normalized = readCdxLicenseEntry(entry);
    if (normalized !== 'UNKNOWN' && !parts.includes(normalized)) {
      parts.push(normalized);
    }
  }
  if (parts.length === 0) return 'UNKNOWN';
  return parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`;
}

function isCdxRootMatch(comp: Record<string, unknown>, rootComp?: Record<string, unknown>): boolean {
  if (!rootComp) return false;
  if (typeof comp['bom-ref'] === 'string' && comp['bom-ref'] === rootComp['bom-ref']) return true;
  if (typeof comp.purl === 'string' && comp.purl === rootComp.purl) return true;
  return comp.name === rootComp.name && comp.version === rootComp.version;
}

function buildComponentFromFields(
  name: string,
  version: string,
  spdxLicense: string,
  rawPurl?: unknown
): SbomComponent | null {
  const purlStr = typeof rawPurl === 'string' ? rawPurl.trim() : undefined;
  const parsed = purlStr ? parseStrictPurl(purlStr) : null;
  if (parsed) {
    return {
      ecosystem: parsed.ecosystem,
      ...(parsed.namespace ? { namespace: parsed.namespace } : {}),
      name: parsed.name,
      version: parsed.version,
      spdxLicense,
      purl: purlStr,
    };
  }
  if (!name || !version) return null;
  return { ecosystem: 'generic', name, version, spdxLicense, ...(purlStr ? { purl: purlStr } : {}) };
}

function parseCycloneDxComponents(doc: SbomDocument): SbomComponent[] {
  const metadata = doc.metadata as { component?: Record<string, unknown> } | undefined;
  const rootComp = metadata?.component;
  const rawList = Array.isArray(doc.components) ? doc.components : [];
  const results: SbomComponent[] = [];

  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    const comp = item as Record<string, unknown>;
    if (isCdxRootMatch(comp, rootComp)) continue;
    const name = typeof comp.name === 'string' ? comp.name.trim() : '';
    const version = typeof comp.version === 'string' ? comp.version.trim() : '';
    const lic = extractCdxLicense(comp.licenses);
    const built = buildComponentFromFields(name, version, lic, comp.purl);
    if (built) results.push(built);
  }
  return results;
}

function readSpdxDescribesTarget(rel: unknown): string | null {
  if (!rel || typeof rel !== 'object') return null;
  const r = rel as Record<string, unknown>;
  const isDocDescribe = r.spdxElementId === 'SPDXRef-DOCUMENT' && r.relationshipType === 'DESCRIBES';
  return isDocDescribe && typeof r.relatedSpdxElement === 'string' ? r.relatedSpdxElement : null;
}

function collectSpdxRootIds(doc: SbomDocument): Set<string> {
  const rootIds = new Set<string>();
  const describes = Array.isArray(doc.documentDescribes) ? doc.documentDescribes : [];
  for (const id of describes) {
    if (typeof id === 'string') rootIds.add(id);
  }
  const rels = Array.isArray(doc.relationships) ? doc.relationships : [];
  for (const rel of rels) {
    const target = readSpdxDescribesTarget(rel);
    if (target) rootIds.add(target);
  }
  return rootIds;
}

function extractSpdxPurl(externalRefs: unknown): string | undefined {
  if (!Array.isArray(externalRefs)) return undefined;
  for (const ref of externalRefs) {
    if (!ref || typeof ref !== 'object') continue;
    const r = ref as Record<string, unknown>;
    if (r.referenceType === 'purl' && typeof r.referenceLocator === 'string') {
      return r.referenceLocator;
    }
  }
  return undefined;
}

function extractSpdxLicense(pkg: Record<string, unknown>): string {
  const concluded = sanitizeSbomLicense(pkg.licenseConcluded);
  if (concluded !== 'UNKNOWN') return concluded;
  return sanitizeSbomLicense(pkg.licenseDeclared);
}

function parseSpdxPackages(doc: SbomDocument): SbomComponent[] {
  const rootIds = collectSpdxRootIds(doc);
  const rawList = Array.isArray(doc.packages) ? doc.packages : [];
  const results: SbomComponent[] = [];

  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    const pkg = item as Record<string, unknown>;
    if (typeof pkg.SPDXID === 'string' && rootIds.has(pkg.SPDXID)) continue;
    const name = typeof pkg.name === 'string' ? pkg.name.trim() : '';
    const version = typeof pkg.versionInfo === 'string' ? pkg.versionInfo.trim() : '';
    const lic = extractSpdxLicense(pkg);
    const purl = extractSpdxPurl(pkg.externalRefs);
    const built = buildComponentFromFields(name, version, lic, purl);
    if (built) results.push(built);
  }
  return results;
}

function componentKey(c: SbomComponent): string {
  return `${c.ecosystem}\0${c.namespace ?? ''}\0${c.name}\0${c.version}`;
}

function cmpAscii(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function deduplicateAndSort(components: SbomComponent[]): SbomComponent[] {
  const map = new Map<string, SbomComponent>();
  for (const comp of components) {
    const key = componentKey(comp);
    if (!map.has(key)) {
      map.set(key, comp);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    return (
      cmpAscii(a.ecosystem, b.ecosystem) ||
      cmpAscii(a.namespace ?? '', b.namespace ?? '') ||
      cmpAscii(a.name, b.name) ||
      cmpAscii(a.version, b.version)
    );
  });
}

export function parseIngestedSbom(doc: SbomDocument): SbomComponent[] {
  const isCdx = doc.bomFormat === 'CycloneDX';
  const rawComponents = isCdx ? parseCycloneDxComponents(doc) : parseSpdxPackages(doc);
  const result = deduplicateAndSort(rawComponents);
  if (result.length === 0) {
    throw new ScaSbomError('ERR_SBOM_EMPTY', 'SBOM contains zero non-root components');
  }
  return result;
}
