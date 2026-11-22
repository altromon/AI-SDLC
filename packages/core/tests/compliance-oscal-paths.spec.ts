import { describe, expect, it } from 'vitest';
import { OscalAssessmentBuilder } from '../src/compliance/oscal-builder.js';

describe('OscalAssessmentBuilder (Happy / Sad / Boundary / Malformed)', () => {
  it('builds deterministic OSCAL assessment-results sorted by gateId and finding id/ruleId (happy)', () => {
    const builder = new OscalAssessmentBuilder({
      title: 'Release Audit',
      version: '1.2.3',
      oscalVersion: '1.0.4',
      lastModified: '2026-01-01T00:00:00.000Z',
    });

    builder.addResult({
      gateId: 'gate-z',
      verdict: 'fail',
      findings: [
        { id: 'F-2', ruleId: 'R-B', severity: 'high', message: 'msg2' },
        { id: 'F-1', ruleId: 'R-A', severity: 'low', message: 'msg1' },
        { id: 'F-1', ruleId: 'R-0', severity: 'medium', message: 'msg0' },
      ],
    });
    builder.addResult({ gateId: 'gate-a', verdict: 'pass' });

    const doc = builder.build();
    const ar = doc['assessment-results'];
    expect(ar.id).toBe('assessment-results-1.2.3');
    expect(ar['oscal-version']).toBe('1.0.4');
    expect(ar.metadata['last-modified']).toBe('2026-01-01T00:00:00.000Z');
    expect(ar.results.map((r) => r.gateId)).toEqual(['gate-a', 'gate-z']);
    expect(ar.results[0].findings).toEqual([]);
    expect(ar.results[1].findings.map((f) => `${f.id}:${f.ruleId}`)).toEqual(['F-1:R-0', 'F-1:R-A', 'F-2:R-B']);
  });

  it('defaults oscalVersion and lastModified and handles empty results or missing finding ids (boundary/malformed)', () => {
    const builder = new OscalAssessmentBuilder({ title: '', version: '0.0.0' });
    builder.addResult({
      gateId: 'g1',
      verdict: 'warn',
      findings: [
        { id: '', ruleId: 'R-2', severity: 'low', message: 'a' },
        { id: '', ruleId: 'R-1', severity: 'low', message: 'b' },
      ],
    });

    const doc = builder.build();
    expect(doc['assessment-results']['oscal-version']).toBe('1.0.0');
    expect(Date.parse(doc['assessment-results'].metadata['last-modified'])).not.toBeNaN();
    expect(doc['assessment-results'].results[0].findings.map((f) => f.ruleId)).toEqual(['R-1', 'R-2']);

    const emptyDoc = new OscalAssessmentBuilder({ title: 'Empty', version: '1.0.0' }).build();
    expect(emptyDoc['assessment-results'].results).toEqual([]);
  });
});
