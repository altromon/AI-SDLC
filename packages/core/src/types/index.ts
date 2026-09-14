/**
 * AI-SDLC Core Domain Types and Interfaces
 */

// --- Quality Gate Types ---
export interface QualityPolicy {
  max_cyclomatic: number;
  max_cognitive: number;
  min_maintainability: number;
  max_function_lines: number;
  enforce_mode: 'STRICT' | 'PERMISSIVE' | string;
  target_directories: string[];
  supported_extensions: string[];
  exclude_patterns: string[];
}

export interface FunctionMetrics {
  functionName: string;
  filePath: string;
  loc: number;
  cyclomatic: number;
  cognitive: number;
  maintainability: number;
  codeSmells: string[];
}

export interface AnalysisResult extends FunctionMetrics {
  relPath: string;
  status: 'PASS' | 'FAIL';
  violations: string[];
}

export interface QualityThresholds {
  max_cyclomatic?: number;
  max_cognitive?: number;
  min_maintainability?: number;
  max_function_lines?: number;
  enforce_mode?: 'STRICT' | 'PERMISSIVE' | string;
}

export interface QualityGateOptions {
  rootDir?: string;
  policyPath?: string;
  policy?: QualityPolicy;
  thresholds?: QualityThresholds;
}

export interface QualityGateResult {
  success: boolean;
  totalFiles: number;
  totalFunctions: number;
  passCount: number;
  failCount: number;
  violationsCount: number;
  results: AnalysisResult[];
  policy: QualityPolicy;
  reportMarkdown?: string;
}

// --- Traceability Types ---
export interface ArtifactFrontmatter {
  id?: string;
  type?: string;
  title?: string;
  'satisfies-requirements'?: string[];
  'derives-from'?: string | string[];
  'mitigates-abuse-case'?: string | string[];
  'implemented-by-services'?: string | string[];
  'enforced-in-enclave'?: string;
  'cucumber-feature-file'?: string;
  'verified-by-tests'?: string[];
  [key: string]: unknown;
}

export interface TraceabilityRow {
  id: string;
  title: string;
  type?: string;
  productTraces: string;
  productStatus: 'CONFORME' | 'HUÉRFANO';
  archTraces: string;
  archStatus: 'CONFORME' | 'HUÉRFANO';
  testTraces: string;
  testStatus: 'CONFORME' | 'HUÉRFANO';
}

export interface TraceabilityOptions {
  rootDir?: string;
  examplesDir?: string;
  testsDir?: string;
}

export interface TraceabilityResult {
  success: boolean;
  rows: TraceabilityRow[];
  orphans: TraceabilityRow[];
  orphanCount: number;
  totalRequirements: number;
  reportMarkdown: string;
}

// --- Tasks Governance Types ---
export type AutonomyMode = 'AUTONOMOUS' | 'HUMAN_REVIEW_PLAN' | 'AMBIGUOUS' | 'HIGH_RISK_MANUAL';

export const VALID_AUTONOMY_MODES: readonly AutonomyMode[] = [
  'AUTONOMOUS',
  'HUMAN_REVIEW_PLAN',
  'AMBIGUOUS',
  'HIGH_RISK_MANUAL'
] as const;

export interface TaskVerification {
  method?: string;
  criteria?: string;
}

export interface TaskItem {
  id: string;
  title?: string;
  complexity?: string;
  riskLevel?: string;
  autonomyMode?: string;
  assignedTo?: string;
  status?: string;
  blockingReason?: string;
  verification: TaskVerification;
}

export interface TaskSummary {
  file: string;
  task: TaskItem;
  hasVerification: boolean;
  validAutonomy: boolean;
  riskAnomaly: boolean;
}

export interface GovernanceOptions {
  rootDir?: string;
  specsDir?: string;
}

export interface GovernanceResult {
  success: boolean;
  totalTasks: number;
  verifiedCount: number;
  unverifiedCount: number;
  riskCounts: Record<string, number>;
  modeCounts: Record<string, number>;
  tasks: TaskSummary[];
  violations: string[];
  reportMarkdown: string;
}

// --- Testing Coverage Types ---
export interface RequirementAuditItem {
  id: string;
  title: string;
  file: string;
  isTemplate: boolean;
  method: string;
  testRefs: string;
  existingCount: number;
  status: 'VERIFICADO_CON_PRUEBA' | 'FALLO_SIN_PRUEBA';
}

export interface TaskAuditItem {
  id: string;
  title: string;
  file: string;
  method: string;
  commandOrCriteria: string;
  status: 'VERIFICADO_CON_PRUEBA' | 'FALLO_SIN_PRUEBA';
}

export interface TestingCoverageOptions {
  rootDir?: string;
}

export interface TestingCoverageResult {
  success: boolean;
  totalRequirements: number;
  passedRequirements: number;
  failedRequirements: number;
  totalTasks: number;
  passedTasks: number;
  failedTasks: number;
  requirements: RequirementAuditItem[];
  tasks: TaskAuditItem[];
  reportMarkdown: string;
}

// --- Gherkin Extraction Types ---
export interface ExtractedFeature {
  sourceFile: string;
  outputFile: string;
  featureName: string;
  scenarioCount: number;
}

export interface GherkinExtractionOptions {
  rootDir?: string;
  targetPath?: string;
  all?: boolean;
}

export interface GherkinExtractionResult {
  success: boolean;
  features: ExtractedFeature[];
  totalScenarios: number;
}

// --- License Compliance Types ---
export interface LicensePolicy {
  version: string;
  permitted: string[];
  restricted: string[];
  blocked: string[];
  exception_packages?: Record<string, string>;
}

export interface LicenseViolation {
  packageName: string;
  version?: string;
  license: string;
  reason: string;
  category: 'BLOCKED' | 'RESTRICTED' | 'UNRECOGNIZED';
}

export interface LicenseVerificationOptions {
  rootDir?: string;
  policyPath?: string;
  manifestPath?: string;
}

export interface LicenseVerificationResult {
  success: boolean;
  totalEvaluated: number;
  permittedCount: number;
  violations: LicenseViolation[];
  reportMarkdown: string;
}

// --- PDaC Graph & Cryptographic Drift Types ---
export interface PdacNode {
  id: string;
  type: string;
  filePath: string;
  title?: string;
  digest: string;
  rawContent: string;
  citations: {
    targetId: string;
    expectedDigest?: string;
    anchor?: string;
  }[];
}

export interface PdacDrift {
  sourceId: string;
  targetId: string;
  sourceFile: string;
  expectedDigest: string;
  actualDigest: string;
}

export interface PdacGraphOptions {
  rootDir?: string;
}

export interface PdacGraphResult {
  success: boolean;
  totalNodes: number;
  totalEdges: number;
  drifts: PdacDrift[];
  reportMarkdown: string;
}

// --- Quality Report Types ---
export interface QualityReportOptions {
  rootDir?: string;
  policyPath?: string;
  thresholds?: QualityThresholds;
}

export interface QualityReportResult {
  markdown: string;
  totalFiles: number;
  totalFunctions: number;
  avgMaintainability: number;
  avgCyclomatic: number;
  verdict: 'PASS' | 'FAIL';
}

// --- Git Workflow Types ---
export interface BranchValidationSuccess {
  valid: true;
  tier: 1 | 2 | 3 | 4;
  tierName: string;
  parentRequirement: string;
  targetMerge: string;
  id?: string;
  parentId?: string;
  taskId?: string;
}

export interface BranchValidationError {
  valid: false;
  tier: 0;
  tierName: 'Inválido';
  error: string;
}

export type BranchClassificationResult = BranchValidationSuccess | BranchValidationError;

export interface BranchHierarchyPlan {
  version: string;
  feature: string;
  tasks: string[];
  planText: string;
}
