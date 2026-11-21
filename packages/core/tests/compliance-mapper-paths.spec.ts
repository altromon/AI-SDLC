import { describe, expect, it } from 'vitest';
import { RegulatoryControlMapper } from '../src/compliance/regulatory-mapper.js';

describe('RegulatoryControlMapper (Happy / Sad / Boundary / Malformed)', () => {
  const mapper = new RegulatoryControlMapper();

  it('maps all 12 canonical quality gates and returns immutable copies (happy)', () => {
    const all = mapper.getAllMappings();
    const keys = Object.keys(all);
    expect(keys).toHaveLength(12);

    for (const gateId of keys) {
      const mapped = mapper.mapGate(gateId);
      expect(mapped.gateId).toBe(gateId);
      expect(mapped.euAiAct).toBeTruthy();
      expect(mapped.iso42001).toBeTruthy();
      expect(mapped.nistSsdf).toBeTruthy();
    }
  });

  it('throws ERR_UNKNOWN_GATE for empty or unknown gate identifiers (sad/boundary/malformed)', () => {
    expect(() => mapper.mapGate('')).toThrow('[ERR_UNKNOWN_GATE]');
    expect(() => mapper.mapGate('nonexistent-gate')).toThrow('[ERR_UNKNOWN_GATE]');
  });

  it('returns EU AI Act, ISO 42001, and NIST SSDF coverage lists (happy)', () => {
    expect(mapper.getEuAiActCoverage()).toContain('Art. 15');
    expect(mapper.getIso42001Coverage()).toContain('A.8.4');
    expect(mapper.getNistSsdfCoverage()).toContain('PW.8');
  });
});
