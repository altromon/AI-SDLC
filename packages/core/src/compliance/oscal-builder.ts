/**
 * NIST OSCAL Assessment-Results v1.0 Builder (CMP-051)
 * Generates canonical NIST OSCAL documents with deterministic ordering
 */

import {
  OscalAssessmentResultsDocument,
  OscalFinding,
  OscalResult,
} from '../types/regulatory-compliance.js';

export interface OscalBuilderOptions {
  title: string;
  version: string;
  oscalVersion?: string;
  lastModified?: string;
}

export class OscalAssessmentBuilder {
  private title: string;
  private version: string;
  private oscalVersion: string;
  private lastModified: string;
  private results: OscalResult[] = [];

  constructor(options: OscalBuilderOptions) {
    this.title = options.title;
    this.version = options.version;
    this.oscalVersion = options.oscalVersion || '1.0.0';
    this.lastModified = options.lastModified || new Date().toISOString();
  }

  addResult(result: {
    gateId: string;
    verdict: string;
    findings?: OscalFinding[];
    [key: string]: unknown;
  }): void {
    const rawFindings = result.findings ? [...result.findings] : [];
    // Deterministic sorting of findings: by id, then ruleId
    const sortedFindings = rawFindings.sort((a, b) => {
      const idComp = (a.id || '').localeCompare(b.id || '');
      if (idComp !== 0) return idComp;
      return (a.ruleId || '').localeCompare(b.ruleId || '');
    });

    this.results.push({
      gateId: result.gateId,
      verdict: result.verdict,
      findings: sortedFindings,
    });
  }

  build(): OscalAssessmentResultsDocument {
    // Sort results deterministically by gateId
    const sortedResults = [...this.results].sort((a, b) =>
      a.gateId.localeCompare(b.gateId)
    );

    return {
      'assessment-results': {
        id: `assessment-results-${this.version}`,
        'oscal-version': this.oscalVersion,
        metadata: {
          title: this.title,
          version: this.version,
          'last-modified': this.lastModified,
        },
        results: sortedResults,
      },
    };
  }
}
