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
  level?: number;
  'bounded-context'?: string;
  'parent-component'?: string;
  'implementation-type'?: 'service' | 'dll' | 'function' | 'composite' | string;
  'satisfies-requirements'?: string[];
  'derives-from'?: string | string[];
  'mitigates-abuse-case'?: string | string[];
  'enforced-in-enclave'?: string;
  'cucumber-tags'?: string[];
  [key: string]: unknown;
}

export interface TraceabilityRow {
  id: string;
  title: string;
  type?: string;
  hofId?: string;
  productTraces: string;
  productStatus: 'COMPLIANT' | 'ORPHAN' | 'CONFORME' | 'HUÉRFANO';
  archTraces: string;
  archStatus: 'COMPLIANT' | 'ORPHAN' | 'CONFORME' | 'HUÉRFANO';
  testTraces: string;
  testStatus: 'COMPLIANT' | 'ORPHAN' | 'CONFORME' | 'HUÉRFANO';
  content?: string;
  filePath?: string;
}

export interface TraceabilityOptions {
  rootDir?: string;
  specsDir?: string;
  examplesDir?: string;
  testsDir?: string;
  strictHandoff?: boolean;
}

export interface TraceabilityResult {
  success: boolean;
  rows: TraceabilityRow[];
  orphans: TraceabilityRow[];
  orphanCount: number;
  totalRequirements: number;
  reportMarkdown: string;
}

// --- PDaC Handoff & SDD Adapter Types ---
export interface ProductHandoffSubgraph {
  requirements: string[];
  useCases?: string[];
  businessRules?: string[];
  securityRequirements?: string[];
  abuseCases?: string[];
  actors?: string[];
  [key: string]: unknown;
}

export interface ProductHandoff {
  id: string; // e.g. HOF-001-TELEMETRY-INGESTION
  type: 'handoff' | 'product-handoff' | string;
  title?: string;
  changeId: string;
  version?: string;
  subgraph: ProductHandoffSubgraph;
  citations?: {
    id?: string;
    targetId?: string;
    expectedDigest?: string;
    anchor?: string;
    comment?: string;
  }[];
  createdAt?: string;
  [key: string]: unknown;
}

export type SddFramework = 'openspec' | 'speckit';

export type ChangeProfile = 'patch' | 'standard' | 'critical';
export const VALID_CHANGE_PROFILES: readonly ChangeProfile[] = ['patch', 'standard', 'critical'] as const;

export interface SddWorkspaceInfo {
  framework: SddFramework;
  changeId: string;
  changeDir: string;
  profile?: ChangeProfile;
  proposalFile?: string;
  specFile?: string;
  designFile?: string;
  tasksFile?: string;
  sidecarFile?: string;
  handoff?: ProductHandoff;
}

export interface SddDepositOptions {
  rootDir?: string;
  changeId: string;
  framework: SddFramework;
  handoff: ProductHandoff;
  destinationDir?: string;
}

export interface SddValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  workspace?: SddWorkspaceInfo;
}

export interface SddIntegrationOptions {
  rootDir?: string;
  changeId: string;
  author?: string;
  date?: string;
  autoArchive?: boolean;
}

export interface SddIntegrationResult {
  success: boolean;
  changeId: string;
  completedTasks: string[];
  pendingTasks: string[];
  integratedRequirements: string[];
  updatedProductArtifacts: string[];
  updatedArchitectureArtifacts: string[];
  archived: boolean;
  archivedPath?: string;
  errors: string[];
}

export interface SddChangeScaffoldOptions {
  rootDir?: string;
  name: string;
  changeId?: string;
  id?: string;
  from?: string | string[];
  framework?: SddFramework;
  author?: string;
  profile?: ChangeProfile;
  silent?: boolean;
}

export interface SddChangeScaffoldResult {
  success: boolean;
  changeId: string;
  canonicalId: string;
  profile: ChangeProfile;
  changeDir: string;
  createdFiles: string[];
  productArtifactCreated?: string;
  citedArtifacts: Array<{ id: string; digest: string; title?: string; comment?: string }>;
  errors: string[];
}

// --- Progressive Friction & Anti-Bypass Types ---
export interface ProgressiveFrictionOptions {
  rootDir?: string;
  changeId?: string;
  changeDir?: string;
  diffFiles?: string[];
  modifiedFiles?: string[];
}

export interface ProgressiveFrictionResult {
  success: boolean;
  profile: ChangeProfile;
  bypassed: boolean;
  violations: string[];
  bypassedRules: string[];
  evaluatedFiles: string[];
  errors: string[];
  reportMarkdown?: string;
}


export interface ChangeDetectionOptions {
  rootDir?: string;
  headRef?: string;
  prTitle?: string;
  prBody?: string;
  changedFiles?: string[];
}

export interface ChangeDetectionResult {
  detected: boolean;
  changeId?: string;
  source?: 'branch' | 'title' | 'body' | 'files' | 'single_active_completed';
  changeDir?: string;
  allTasksCompleted?: boolean;
  completedTasksCount?: number;
  totalTasksCount?: number;
  reasons: string[];
}

export interface SddIntegrationAudit {
  changeId: string;
  status: 'FULLY_INTEGRATED' | 'PARTIALLY_INTEGRATED' | 'UNINTEGRATED';
  completedTasksCount: number;
  totalTasksCount: number;
  integratedRequirements: string[];
  missingRequirements: string[];
  gaps: string[];
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

export interface GherkinSyncCheckResult {
  inSync: boolean;
  outOfSyncFiles: string[];
  missingFiles: string[];
  totalFeatures: number;
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

export type ScaTool = 'native' | 'license-checker' | 'trivy' | 'syft';

export interface ScannedDependency {
  name: string;
  version: string;
  spdxLicense: string;
  purl?: string;
  path?: string;
  licenseFile?: string;
  repository?: string;
  author?: string;
  isDirect?: boolean;
}

export interface CycloneDxLicense {
  license: {
    id?: string;
    name?: string;
  };
}

export interface CycloneDxComponent {
  type: 'library' | 'application' | 'framework';
  name: string;
  version: string;
  purl?: string;
  author?: string;
  licenses?: CycloneDxLicense[];
}

export interface CycloneDxBom {
  bomFormat: 'CycloneDX';
  specVersion: '1.5';
  version: number;
  serialNumber: string;
  metadata: {
    timestamp: string;
    tools: Array<{ vendor: string; name: string; version: string }>;
    component: {
      type: string;
      name: string;
      version: string;
    };
  };
  components: CycloneDxComponent[];
}

export interface LicenseVerificationOptions {
  rootDir?: string;
  policyPath?: string;
  manifestPath?: string;
  dynamic?: boolean;
  tool?: ScaTool;
  depth?: 'direct' | 'transitive';
  generateSbom?: boolean;
  sbomPath?: string;
  generateNotices?: boolean;
  noticesPath?: string;
  productionOnly?: boolean;
}

export interface LicenseVerificationResult {
  success: boolean;
  totalEvaluated: number;
  permittedCount: number;
  violations: LicenseViolation[];
  reportMarkdown: string;
  sbomPath?: string;
  noticesPath?: string;
  scannedDependencies?: ScannedDependency[];
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

export interface PdacSyncOptions {
  rootDir?: string;
  targetPath?: string;
}

export interface PdacSyncDetail {
  sourceFile: string;
  targetId: string;
  previousDigest: string;
  newDigest: string;
}

export interface PdacSyncResult {
  success: boolean;
  syncedCount: number;
  updatedFiles: string[];
  details: PdacSyncDetail[];
}

export interface PreflightGateSummary {
  name: string;
  status: 'PASSED' | 'FAILED' | 'FIXED' | 'WARNING';
  message: string;
  remediation?: string;
}

export interface PreflightCheckOptions {
  root?: string;
  fix?: boolean;
  silent?: boolean;
}

export interface PreflightCheckResult {
  success: boolean;
  autoFixExecuted: boolean;
  gherkinSynced: number;
  digestsSynced: number;
  gates: PreflightGateSummary[];
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

// --- Artifact Schema Validation Types ---
export interface ArtifactSchemaOptions {
  rootDir?: string;
  targetPath?: string;
  schemaDir?: string;
}

export interface ArtifactSchemaViolation {
  filePath: string;
  id?: string;
  type?: string;
  schemaId?: string;
  property?: string;
  message: string;
}

export interface ArtifactValidationResult {
  valid: boolean;
  filePath: string;
  id?: string;
  type?: string;
  schemaId?: string;
  errors: string[];
}

export interface ArtifactSchemaResult {
  success: boolean;
  totalEvaluated: number;
  validCount: number;
  invalidCount: number;
  violations: ArtifactSchemaViolation[];
  results: ArtifactValidationResult[];
}

// --- Git Task Checkout Types ---
export interface ActiveTaskMatch {
  taskId: string;
  taskTitle: string;
  changeId: string;
  changeDir: string;
  version: string;
}

export interface GitCheckoutTaskOptions {
  rootDir?: string;
}

export interface GitCheckoutTaskResult {
  success: boolean;
  taskId: string;
  changeId?: string;
  releaseBranch?: string;
  featureBranch?: string;
  taskBranch?: string;
  createdBranches: string[];
  switchedBranch?: string;
  error?: string;
  availableTasks?: Array<{ id: string; title: string; changeId: string }>;
}

// --- Duplicate Requirements Verifier Types ---
export type DuplicateSeverity = 'ERROR' | 'WARNING';

export type DuplicateIssueType =
  | 'ID_COLLISION'
  | 'EXACT_CONTENT'
  | 'TITLE_SIMILARITY'
  | 'BDD_TAG_COLLISION'
  | 'SHARED_BUSINESS_RULE';

export interface DuplicateIssue {
  type: DuplicateIssueType;
  severity: DuplicateSeverity;
  id: string;
  file: string;
  conflictingId?: string;
  conflictingFile?: string;
  message: string;
  similarityScore?: number;
}

export interface DuplicateVerifierOptions {
  rootDir?: string;
  specsDir?: string;
  examplesDir?: string;
  titleSimilarityThreshold?: number; // default: 0.85
  allowWarnings?: boolean;
}

export interface DuplicateVerifierResult {
  success: boolean;
  totalRequirements: number;
  errorCount: number;
  warningCount: number;
  issues: DuplicateIssue[];
  reportMarkdown?: string;
}

// --- Secret Scanning & Gitleaks Types ---
export type SecretFindingType =
  | 'PRIVATE_KEY'
  | 'AWS_CREDENTIAL'
  | 'GITHUB_TOKEN'
  | 'SLACK_TOKEN'
  | 'GOOGLE_API_KEY'
  | 'OPENAI_API_KEY'
  | 'STRIPE_API_KEY'
  | 'JWT_TOKEN'
  | 'GENERIC_HIGH_ENTROPY_SECRET'
  | 'GITLEAKS_FINDING';

export interface SecretViolation {
  filePath: string;
  relPath: string;
  lineNumber: number;
  type: SecretFindingType;
  maskedMatch: string;
  ruleId: string;
  entropy?: number;
  message: string;
}

export interface SecretVerifierOptions {
  rootDir?: string;
  diff?: boolean;
  baseBranch?: string;
  entropyThreshold?: number; // default: 4.3
  gitleaks?: boolean;
  excludePatterns?: string[];
  ignoreSecrets?: string[];
}

export interface SecretVerifierResult {
  success: boolean;
  totalFilesScanned: number;
  findingsCount: number;
  findings: SecretViolation[];
  scannedWithGitleaks: boolean;
  reportMarkdown?: string;
}

// --- SAST (Static Application Security Testing) Types ---
export type SastSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type SastFindingType =
  | 'SQL_INJECTION'
  | 'COMMAND_INJECTION'
  | 'SSRF'
  | 'PATH_TRAVERSAL'
  | 'UNSAFE_EVAL'
  | 'PROMPT_INJECTION_RISK'
  | 'SEMGREP_FINDING';

export interface SastViolation {
  filePath: string;
  relPath: string;
  lineNumber: number;
  ruleId: string;
  type: SastFindingType;
  severity: SastSeverity;
  snippet: string;
  message: string;
}

export interface SastVerifierOptions {
  rootDir?: string;
  semgrep?: boolean;
  targetDirectories?: string[];
  minSeverity?: SastSeverity;
}

export interface SastVerifierResult {
  success: boolean;
  totalFilesScanned: number;
  violationsCount: number;
  violations: SastViolation[];
  reportMarkdown?: string;
}

export interface PromptInjectionFinding {
  ruleId: string;
  severity: SastSeverity;
  pattern: string;
  snippet: string;
  lineNumber?: number;
  message: string;
}

// --- Interactive Web Dashboard & Cytoscape Graph Types ---
export type GraphNodeLayer = 'product' | 'requirement' | 'architecture' | 'test';
export type GraphNodeStatus = 'COMPLIANT' | 'ORPHAN' | 'DRIFT' | 'REVIEW' | 'CONFORME' | 'HUÉRFANO';

export interface CytoscapeNodeData {
  id: string;
  label: string;
  title: string;
  type: string;
  layer: GraphNodeLayer;
  status: GraphNodeStatus;
  filePath?: string;
  content?: string;
  digest?: string;
  details?: Record<string, unknown>;
  upstream?: string[];
  downstream?: string[];
}

export interface CytoscapeEdgeData {
  id: string;
  source: string;
  target: string;
  label?: string;
  relation: string;
  status?: GraphNodeStatus;
}

export interface CytoscapeElement {
  group: 'nodes' | 'edges';
  data: CytoscapeNodeData | CytoscapeEdgeData;
  classes?: string;
}

export interface DashboardHistoricalKpi {
  id: string;
  label: string;
  timestamp: string;
  kloc: number;
  commits: number;
  bugs: number;
  defectDensity: number;
  reworkPercent: number;
  costUsd: number;
}

export interface DashboardOptions {
  rootDir?: string;
  outputPath?: string;
  title?: string;
  includeHistoricalKpis?: boolean;
}

export interface DashboardResult {
  outputPath: string;
  totalNodes: number;
  totalEdges: number;
  conformingCount: number;
  issueCount: number;
  nodesByLayer: Record<GraphNodeLayer, number>;
  metrics: {
    totalFiles: number;
    totalFunctions: number;
    avgMaintainability: number;
    avgCyclomatic: number;
    qualityVerdict: 'PASS' | 'FAIL';
    autonomyDistribution: Record<string, number>;
    traceabilityRatio: number;
    bddCoverageRatio: number;
  };
  html: string;
}



