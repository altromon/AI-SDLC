/**
 * Regulatory Compliance Engine Types & Contracts
 * Satisfies: FR-051-REGULATORY-COMPLIANCE-BUNDLE-001,
 * SEC-REQ-051-TAMPER-RESISTANT-ATTESTATION-001,
 * SEC-REQ-051-SENSITIVE-DATA-FILTER-001,
 * SEC-REQ-051-KEYLESS-IDENTITY-VERIFICATION-001
 */

export type QualityGateId =
  | 'quality'
  | 'traceability'
  | 'governance'
  | 'testing'
  | 'gherkin'
  | 'licenses'
  | 'pdac'
  | 'schemas'
  | 'duplicates'
  | 'security'
  | 'privacy'
  | 'friction';

export const ALL_QUALITY_GATES: readonly QualityGateId[] = [
  'quality',
  'traceability',
  'governance',
  'testing',
  'gherkin',
  'licenses',
  'pdac',
  'schemas',
  'duplicates',
  'security',
  'privacy',
  'friction',
] as const;

export interface RegulatoryGateMapping {
  gateId: QualityGateId;
  euAiAct: string;
  iso42001: string;
  nistSsdf: string;
  description: string;
}

export interface GateFinding {
  id: string;
  ruleId: string;
  message: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location?: string;
  rawOutput?: string;
  [key: string]: unknown;
}


export interface GateEvidenceReport {
  gateId: QualityGateId | string;
  verdict: 'PASS' | 'FAIL' | 'WARN';
  commitSha?: string;
  executedAt?: string;
  findings?: GateFinding[];
  diagnostics?: string[];
  metrics?: Record<string, unknown>;
}

export interface OscalFinding {
  id: string;
  ruleId: string;
  message: string;
  [key: string]: unknown;
}

export interface OscalResult {
  gateId: string;
  verdict: string;
  findings: OscalFinding[];
  [key: string]: unknown;
}

export interface OscalAssessmentResultsDocument {
  'assessment-results': {
    id?: string;
    'oscal-version': string;
    metadata: {
      title: string;
      version: string;
      'last-modified': string;
      [key: string]: unknown;
    };
    results: OscalResult[];
    [key: string]: unknown;
  };
}

export interface InTotoSubject {
  name: string;
  digest: {
    sha256: string;
    [key: string]: string;
  };
}

export interface InTotoStatementV1 {
  _type: 'https://in-toto.io/Statement/v1';
  predicateType: string;
  subject: InTotoSubject[];
  predicate: Record<string, unknown>;
}

export interface RegulatoryMatrixSection {
  euAiActCoverage: string[];
  iso42001Coverage: string[];
  nistSsdfCoverage: string[];
  gateMappings: Record<string, RegulatoryGateMapping>;
}

export interface ComplianceBundlePayload {
  schemaVersion: '1.0.0';
  generatedAt: string;
  generator: {
    name: 'AI-SDLC Regulatory Compliance Engine';
    component: 'CMP-051-REGULATORY-COMPLIANCE-ENGINE';
    version: string;
  };
  oscalAssessmentResults: OscalAssessmentResultsDocument;
  inTotoAttestation: InTotoStatementV1;
  regulatoryMatrix: RegulatoryMatrixSection;
}

export interface ComplianceBundleOptions {
  rootDir: string;
  outputPath?: string;
  keyless?: boolean;
  strict?: boolean;
  offline?: boolean;
  dryRun?: boolean;
  currentCommit?: string;
  evidenceReports?: GateEvidenceReport[];
}

export interface ComplianceBundleResult {
  success: boolean;
  outputPath: string;
  bundleDigest: string;
  findingsCount: number;
  coveredGatesCount: number;
  regulatoryCoverage: {
    euAiActArticles: string[];
    iso42001Clauses: string[];
    nistSsdfPractices: string[];
  };
  diagnostics: string[];
}
