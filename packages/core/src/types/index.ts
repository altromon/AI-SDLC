/**
 * AI-SDLC Core Domain Types and Interfaces
 */

// --- Quality Gate Types ---
export interface QualityPolicy {
  max_cyclomatic: number;
  max_cognitive: number;
  min_maintainability: number;
  max_function_lines: number;
  min_line_coverage: number;
  min_branch_coverage: number;
  min_function_coverage: number;
  enforce_mode: 'STRICT' | 'PERMISSIVE' | string;
  ratchet_mode?: boolean;
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
  line?: number;
}

export interface LanguageAstReport {
  language: string;
  filePath: string;
  functions: FunctionMetrics[];
  unsafeTypesCount?: number;
  emptyStubsCount?: number;
  rawMetrics?: Record<string, unknown>;
}

export interface AnalysisResult extends FunctionMetrics {
  relPath: string;
  status: 'PASS' | 'FAIL';
  violations: string[];
  toleratedViolations?: string[];
}


export interface QualityBaselineEntry {
  signature: string;
  file: string;
  functionName: string;
  line: number;
  metric: string;
  value?: number;
  threshold?: number;
  message: string;
}

export interface QualityBaseline {
  version: string;
  generatedAt: string;
  totalViolations: number;
  violations: QualityBaselineEntry[];
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
  requireCoverageReport?: boolean;
  requireFunctionUnitTests?: boolean;
  baseline?: boolean | string;
  baselinePath?: string;
  updateBaseline?: boolean;
  ratchet?: boolean;
}

export interface UntestedFunctionItem {
  file: string;
  functionName: string;
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
  coverageViolations?: string[];
  untestedFunctions?: UntestedFunctionItem[];
  reportMarkdown?: string;
  baselineViolationsCount?: number;
  toleratedViolationsCount?: number;
  newViolationsCount?: number;
  baselineUpdated?: boolean;
}

// --- Traceability Types ---
export interface DesignContractDeclaration {
  component?: string;
  interface?: string;
  methods: string[];
}

export interface ContractTraceAudit {
  designId: string;
  component?: string;
  interfaceName?: string;
  method: string;
  implementedInCode: boolean;
  testedInSuite: boolean;
  status: 'COMPLIANT' | 'MISSING_IMPLEMENTATION' | 'MISSING_UNIT_TEST';
}

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
  'governs-ropa'?: string | string[];
  'protects-data-assets'?: string | string[];
  'enforced-in-enclave'?: string;
  'cucumber-tags'?: string[];
  contracts?: Array<DesignContractDeclaration | string>;
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
  enforceContracts?: boolean;
}

export interface TraceabilityResult {
  success: boolean;
  rows: TraceabilityRow[];
  orphans: TraceabilityRow[];
  orphanCount: number;
  totalRequirements: number;
  contractAudits?: ContractTraceAudit[];
  missingContractsCount?: number;
  reportMarkdown: string;
}

// --- PDaC Handoff & SDD Adapter Types ---
export interface ProductHandoffSubgraph {
  requirements: string[];
  useCases?: string[];
  businessRules?: string[];
  securityRequirements?: string[];
  abuseCases?: string[];
  privacyRequirements?: string[];
  dataAssets?: string[];
  privacyRopa?: string[];
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
  createdCanonicalArtifacts?: string[];
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
  implementsComponents?: string[];
  satisfiesRequirements?: string[];
  implementsContracts?: string[];
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
  enforceDesignCoverage?: boolean;
  maxUseCasesPerChange?: number;
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
  unassignedDesignScope?: string[];
  reportMarkdown: string;
}

// --- Testing Coverage Types ---
export interface BddVariantCoverage {
  nominal: boolean;
  boundary: boolean;
  invalid: boolean;
  totalScenarios: number;
}

export interface UseCaseFlowAuditItem {
  id: string;
  file: string;
  declaredFlows: string[];
  coveredFlows: string[];
  missingFlows: string[];
  status: 'VERIFICADO_CON_PRUEBA' | 'FALLO_SIN_PRUEBA';
}

export interface RequirementAuditItem {
  id: string;
  title: string;
  file: string;
  isTemplate: boolean;
  method: string;
  testRefs: string;
  existingCount: number;
  bddVariants?: BddVariantCoverage;
  missingVariants?: string[];
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
  enforceBddVariants?: boolean;
  enforceUseCaseFlows?: boolean;
  cucumberReportPath?: string;
  enforceCucumberExecution?: boolean;
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
  useCaseFlows?: UseCaseFlowAuditItem[];
  failedUseCaseFlows?: number;
  cucumberExecution?: {
    evaluatedFeatures: number;
    passedScenarios: number;
    failedScenarios: number;
    passed: boolean;
  };
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
export type VexAnalysisState = 'not_affected' | 'affected' | 'fixed' | 'in_triage';

export type VexAnalysisJustification =
  | 'code_not_present'
  | 'code_not_reachable'
  | 'requires_configuration'
  | 'requires_dependency'
  | 'requires_environment'
  | 'protected_by_compiler'
  | 'protected_at_runtime'
  | 'protected_at_perimeter'
  | 'protected_by_mitigating_control';

export interface VexStatement {
  id: string; // e.g., CVE-2023-45857
  package?: string;
  state: VexAnalysisState;
  justification?: VexAnalysisJustification;
  detail?: string;
  response?: Array<'can_not_fix' | 'will_not_fix' | 'update' | 'rollback' | 'workaround_available'>;
}

export interface CycloneDxVulnerability {
  id: string;
  source?: { name?: string; url?: string };
  ratings?: Array<{ score?: number; severity?: string; method?: string; vector?: string }>;
  analysis?: {
    state: VexAnalysisState;
    justification?: VexAnalysisJustification;
    detail?: string;
    response?: string[];
  };
  affects?: Array<{ ref: string }>;
}

export interface LicensePolicy {
  version: string;
  permitted: string[];
  restricted: string[];
  blocked: string[];
  exception_packages?: Record<string, string>;
  vex_statements?: VexStatement[];
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
  vulnerabilities?: CycloneDxVulnerability[];
}

export interface ScaVulnerability {
  id: string;
  packageName: string;
  installedVersion: string;
  fixedVersion?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  cvssV3Score?: number;
  cvssV3Vector?: string;
  title?: string;
  description?: string;
  primaryUrl?: string;
}

export interface VulnerabilityThresholds {
  failOnSeverity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  maxCvssScore?: number;
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
  scanVulnerabilities?: boolean;
  vulnerabilityThresholds?: VulnerabilityThresholds;
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
  vulnerabilities?: ScaVulnerability[];
  vulnerabilitiesSkipped?: boolean;
  vulnerabilitiesSkipReason?: string;
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
export interface CodeCoverageSummary {
  linesPct: number;
  branchesPct: number;
  functionsPct: number;
  statementsPct?: number;
  source: string;
}

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
  coverage?: CodeCoverageSummary | null;
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

export interface SecuritySuppression {
  kind: 'sast' | 'secret';
  ruleId?: string;
  reason?: string;
  expires?: string;
  approvedBy?: string;
  status: 'active' | 'expired' | 'invalid';
  filePath: string;
  lineNumber: number;
  rawComment: string;
  invalidReason?: string;
}

export interface SecretVerifierResult {
  success: boolean;
  totalFilesScanned: number;
  findingsCount: number;
  findings: SecretViolation[];
  scannedWithGitleaks: boolean;
  suppressions?: SecuritySuppression[];
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
  suppressions?: SecuritySuppression[];
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
export type GraphNodeType =
  | 'architecture-introduction'
  | 'journey'
  | 'actor'
  | 'threat-actor'
  | 'use-case'
  | 'business-rule'
  | 'abuse-case'
  | 'hazard'
  | 'data-asset'
  | 'privacy-ropa'
  | 'requirement'
  | 'security-requirement'
  | 'safety-requirement'
  | 'privacy-requirement'
  | 'component'
  | 'adr'
  | 'security-enclave'
  | 'bdd-feature'
  | 'code-test'
  | string;

export interface CytoscapeNodeData {
  id: string;
  label: string;
  title: string;
  type: GraphNodeType;
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
    userManualCoverageRatio?: number;
    productionManualCoverageRatio?: number;
    manualsCount?: number;
  };
  html: string;
}

// --- Operational Manuals (MAN-USER & MAN-PROD) Verification Types ---
export interface ManualDocumentItem {
  id: string;
  type: 'user-manual' | 'production-manual';
  title: string;
  status: string;
  version: string;
  appliesToVersion: string;
  filePath: string;
  targetAudience: string[];
  allowedRoles: string[];
  journeysCovered: string[];
  useCasesCovered: string[];
  componentsCovered: string[];
  enclavesInvolved: string[];
  body: string;
}

export interface ManualsCoverageSummary {
  totalJourneys: number;
  coveredJourneys: number;
  uncoveredJourneys: string[];
  totalUseCases: number;
  coveredUseCases: number;
  uncoveredUseCases: string[];
  userCoveragePct: number;
  totalComponents: number;
  coveredComponents: number;
  uncoveredComponents: string[];
  totalEnclaves: number;
  coveredEnclaves: number;
  uncoveredEnclaves: string[];
  productionCoveragePct: number;
}

export interface ManualsVerificationOptions {
  rootDir?: string;
  branch?: string;
  profile?: ChangeProfile;
  strict?: boolean;
}

export interface ManualsVerificationResult {
  success: boolean;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  enforcementMode: 'ADVISORY' | 'STRICT_RELEASE';
  branch: string;
  profile: ChangeProfile;
  userManuals: ManualDocumentItem[];
  productionManuals: ManualDocumentItem[];
  coverage: ManualsCoverageSummary;
  warnings: string[];
  violations: string[];
}

// --- Privacy-by-Design as Code (PDaC) & Data Protection Types ---
export type PrivacyFindingType =
  | 'PII_IN_LOGS'
  | 'PII_IN_LLM_PROMPT'
  | 'HARDCODED_PII_IN_CODE'
  | 'MISSING_RETENTION_POLICY'
  | 'UNREGISTERED_ROPA'
  | 'MISSING_PRIVACY_CONTROL'
  | 'UNAPPROVED_SUBPROCESSOR'
  | 'DPIA_APPROVAL_REQUIRED';

export interface PrivacyClassificationRule {
  action: 'ALLOW' | 'STRICT_GOVERNANCE' | 'DPIA_APPROVAL_REQUIRED' | 'DENY';
  description?: string;
  exception_requires?: string;
  require_ropa_entry?: boolean;
  require_dpia_artifact?: boolean;
  encryption_at_rest: boolean;
  encryption_in_transit: boolean;
  require_field_level_encryption?: boolean;
  allow_in_logs: boolean;
  log_masking_strategy?: string;
  allow_in_ai_prompts: boolean;
  max_retention_days?: number;
  require_right_to_erasure?: boolean;
}

export interface PrivacyPolicy {
  version: string;
  project: string;
  regulatory_frameworks: string[];
  default_action: string;
  classifications: Record<string, PrivacyClassificationRule>;
  cross_border_transfers?: {
    allowed_regions?: string[];
    require_scc_for_third_countries?: boolean;
    approved_subprocessors?: string[];
  };
  agent_guardrails: {
    forbid_real_pii_in_tests: boolean;
    forbid_pii_in_console_or_logger: boolean;
    require_dto_projection_for_pii: boolean;
    on_special_category_detected?: {
      action: string;
      notification_tag: string;
      message: string;
    };
  };
  ci_gates: {
    fail_on_unregistered_pii: boolean;
    fail_on_pii_in_logs: boolean;
    fail_on_missing_retention_policy: boolean;
    fail_on_unapproved_subprocessor?: boolean;
    generate_ropa_inventory: boolean;
    output_ropa_file: string;
    output_privacy_report: string;
  };
}

export interface DataAssetSummary {
  id: string;
  title: string;
  classification: string;
  piiCategories: string[];
  dataSubjects: string[];
  retentionPeriod: string;
  erasureMethod: string;
  filePath: string;
}

export interface PrivacyRopaSummary {
  id: string;
  title: string;
  lawfulBasis: string;
  processingPurpose: string;
  useCases: string[];
  dataAssets: string[];
  dataSubjects: string[];
  retentionTtl: string;
  crossBorderTransfer: boolean;
  subprocessors: string[];
  dpiaRequired: boolean;
  dpiaReference?: string | null;
  mitigatedBy: string[];
  filePath: string;
}

export interface PrivacyViolation {
  ruleId: string;
  type: PrivacyFindingType;
  severity: SastSeverity;
  filePath: string;
  relPath: string;
  lineNumber?: number;
  snippet?: string;
  message: string;
}

export interface PrivacyVerifierOptions {
  rootDir?: string;
  policyPath?: string;
  targetDirectories?: string[];
  generateRopa?: boolean;
  ropaOutputPath?: string;
  reportOutputPath?: string;
}

export interface PrivacyVerifierResult {
  success: boolean;
  totalFilesScanned: number;
  dataAssetsCount: number;
  ropaRecordsCount: number;
  privacyRequirementsCount: number;
  violationsCount: number;
  dpiaRequiredCount: number;
  dataAssets: DataAssetSummary[];
  ropaRecords: PrivacyRopaSummary[];
  violations: PrivacyViolation[];
  ropaMarkdown: string;
  reportMarkdown: string;
  ropaOutputPath?: string;
  reportOutputPath?: string;
}

// --- OASIS SARIF 2.1.0 Types ---
export type SarifLevel = "error" | "warning" | "note" | "none";

export interface SarifMultiformatMessageString {
  text: string;
  markdown?: string;
}

export interface SarifRuleConfiguration {
  level?: SarifLevel;
}

export interface SarifReportingDescriptor {
  id: string;
  name?: string;
  shortDescription?: { text: string };
  fullDescription?: { text: string };
  defaultConfiguration?: SarifRuleConfiguration;
  helpUri?: string;
  help?: SarifMultiformatMessageString;
  properties?: {
    tags?: string[];
    cwe?: string[];
    owasp?: string[];
    precision?: string;
    securitySeverity?: string;
    [key: string]: unknown;
  };
}

export interface SarifArtifactLocation {
  uri: string;
  uriBaseId?: string;
}

export interface SarifRegion {
  startLine: number;
  startColumn?: number;
  endLine?: number;
  endColumn?: number;
}

export interface SarifPhysicalLocation {
  artifactLocation: SarifArtifactLocation;
  region?: SarifRegion;
}

export interface SarifLocation {
  physicalLocation: SarifPhysicalLocation;
}

export interface SarifResult {
  ruleId: string;
  level: SarifLevel;
  message: { text: string };
  locations: SarifLocation[];
  ruleIndex?: number;
  properties?: Record<string, unknown>;
}

export interface SarifToolDriver {
  name: string;
  version?: string;
  informationUri?: string;
  rules: SarifReportingDescriptor[];
}

export interface SarifRun {
  tool: {
    driver: SarifToolDriver;
  };
  results: SarifResult[];
}

export interface SarifDocument {
  $schema: string;
  version: "2.1.0";
  runs: SarifRun[];
}

export interface GenerateSarifOptions {
  sastResult?: SastVerifierResult;
  secretsResult?: SecretVerifierResult;
  toolName?: string;
  toolVersion?: string;
  informationUri?: string;
}


export interface BddStepExecution {
  keyword: string;
  text: string;
  status: 'passed' | 'failed' | 'undefined' | 'skipped';
  durationMs: number;
  errorMessage?: string;
}

export interface BddScenarioExecution {
  name: string;
  tags: string[];
  status: 'passed' | 'failed' | 'undefined';
  steps: BddStepExecution[];
}

export interface BddFeatureExecutionReport {
  uri: string;
  featureName: string;
  tags: string[];
  scenarios: BddScenarioExecution[];
  passed: boolean;
}
