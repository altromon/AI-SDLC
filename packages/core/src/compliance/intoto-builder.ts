/**
 * in-toto Statement v1 Attestation Builder (CMP-051)
 * Generates in-toto Statement v1 with RFC 8785 Canonical JSON and Unix LF.
 */

import { InTotoStatementV1, InTotoSubject } from '../types/regulatory-compliance.js';

/**
 * RFC 8785 JSON Canonicalization Scheme (JCS)
 * Recursively canonicalizes object keys in lexicographical order.
 */
export function canonicalizeJson(val: unknown): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val);
  }

  if (Array.isArray(val)) {
    const items = val.map((item) => canonicalizeJson(item));
    return `[${items.join(',')}]`;
  }

  const keys = Object.keys(val as Record<string, unknown>).sort();
  const pairs = keys.map((key) => {
    const serializedVal = canonicalizeJson((val as Record<string, unknown>)[key]);
    return `${JSON.stringify(key)}:${serializedVal}`;
  });

  return `{${pairs.join(',')}}`;
}

export class InTotoAttestationBuilder {
  private subjects: Map<string, string> = new Map();
  private predicateType: string = 'https://ai-sdlc.dev/attestation/compliance/v1';
  private predicate: Record<string, unknown> = {};

  addSubject(name: string, sha256Digest: string): void {
    this.subjects.set(name, sha256Digest);
  }

  setPredicate(predicateType: string, predicate: Record<string, unknown>): void {
    this.predicateType = predicateType;
    this.predicate = { ...predicate };
  }

  build(): InTotoStatementV1 {
    // Sort subjects deterministically by name
    const sortedSubjects: InTotoSubject[] = Array.from(this.subjects.entries())
      .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
      .map(([name, sha256]) => ({
        name,
        digest: { sha256 },
      }));

    return {
      _type: 'https://in-toto.io/Statement/v1',
      predicateType: this.predicateType,
      subject: sortedSubjects,
      predicate: this.predicate,
    };
  }

  toCanonicalJson(): string {
    const statement = this.build();
    const jcs = canonicalizeJson(statement);
    // Ensure strict Unix LF termination
    return `${jcs}\n`;
  }
}
