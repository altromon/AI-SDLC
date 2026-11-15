import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  renderDashboardHtml,
  safeJsonForScript,
  type DashboardMetricsData,
} from '../src/reporters/dashboard-html.js';
import type { GraphElementsResult } from '../src/reporters/dashboard-graph.js';
import type { QualityGateResult, TestingCoverageResult, TraceabilityResult } from '../src/types/index.js';

describe('Dashboard HTML Renderer Coverage Suite', () => {
  it('escapes HTML and serializes safe JSON for script tags', () => {
    expect(escapeHtml('<script>"a"&\'b\'</script>')).toBe('&lt;script&gt;&quot;a&quot;&amp;&#39;b&#39;&lt;/script&gt;');
    const json = safeJsonForScript({ html: '</script>&\u2028\u2029' });
    expect(json).not.toContain('</script>');
    expect(json).toContain('\\u003c/script\\u003e\\u0026');
  });

  it('renders full dashboard HTML with populated KPIs, compliance bundle, manuals, and failing/passing states', () => {
    const graphData: GraphElementsResult = {
      elements: [
        { group: 'nodes', data: { id: 'FR-1', label: 'FR-1', type: 'requirement', layer: 'Product' } },
        { group: 'nodes', data: { id: 'TSK-1', label: 'TSK-1', type: 'task', layer: 'Change' } },
        { group: 'edges', data: { id: 'e1', source: 'TSK-1', target: 'FR-1', label: 'satisfies' } },
      ],
      issueCount: 2,
    };

    const metricsData: DashboardMetricsData = {
      gate: {
        success: false,
        failCount: 1,
        results: [
          {
            filePath: 'src/a.ts',
            name: 'fnA',
            line: 10,
            linesOfCode: 45,
            cyclomatic: 12,
            cognitive: 18,
            maintainability: 45,
            passed: false,
            violations: ['CC > 10'],
          },
        ],
        policy: {
          max_cyclomatic: 10,
          max_cognitive: 15,
          min_maintainability: 50,
          max_lines_per_function: 40,
          min_line_coverage: 85,
          min_branch_coverage: 80,
          enforcement: 'STRICT',
        },
      } as unknown as QualityGateResult,
      gov: {
        success: false,
        totalTasks: 2,
        verifiedCount: 1,
        unverifiedCount: 1,
        riskCounts: { LOW: 1, MEDIUM: 0, HIGH: 1, CRITICAL: 0 },
        modeCounts: { AUTONOMOUS: 1, HUMAN_REVIEW_PLAN: 1, AMBIGUOUS: 0, HIGH_RISK_MANUAL: 0 },
        tasks: [
          {
            file: 'tasks.md',
            task: { id: 'TSK-1', title: 'Task 1', riskLevel: 'HIGH', autonomyMode: 'HUMAN_REVIEW_PLAN', assignedTo: 'agent-developer', verification: { criteria: 'pnpm test' } },
            hasVerification: true,
            validAutonomy: true,
            riskAnomaly: false,
          },
          {
            file: 'tasks.md',
            task: { id: 'TSK-2', title: 'Task 2', riskLevel: 'LOW', autonomyMode: 'AUTONOMOUS' },
            hasVerification: false,
            validAutonomy: true,
            riskAnomaly: true,
          },
        ],
        violations: ['Missing verification'],
        unassignedDesignScope: [],
        reportMarkdown: '# Gov',
      },
      cov: {
        success: false,
        totalFeatures: 2,
        totalScenarios: 4,
        totalRequirements: 2,
        passedRequirements: 1,
        failedRequirements: 1,
        reportMarkdown: '# Testing',
      } as unknown as TestingCoverageResult,
      codeCoverage: {
        linesPct: 80,
        branchesPct: 75,
        functionsPct: 82,
        statementsPct: 80,
        source: 'coverage/coverage-summary.json',
        format: 'istanbul',
      },
      trace: {
        success: false,
        totalRequirements: 2,
        orphanRequirements: 1,
        coveredRequirements: 1,
        rows: [
          {
            requirementId: 'FR-1',
            requirementTitle: 'Req 1',
            status: 'COVERED',
            designComponents: ['CMP-1'],
            tasks: ['TSK-1'],
            codeFiles: ['src/a.ts'],
            testFiles: ['tests/a.spec.ts'],
          },
          {
            requirementId: 'FR-2',
            requirementTitle: 'Req 2',
            status: 'ORPHAN',
            designComponents: [],
            tasks: [],
            codeFiles: [],
            testFiles: [],
          },
        ],
        reportMarkdown: '# Trace',
      } as unknown as TraceabilityResult,
      manuals: {
        success: false,
        status: 'WARNING',
        enforcementMode: 'STRICT',
        branch: 'feat/test',
        profile: 'standard',
        userManuals: [
          {
            id: 'MAN-USER-1',
            type: 'user-manual',
            title: 'User Guide',
            appliesTo: ['UC-1'],
            appliesToVersion: '4.4.0',
            status: 'active',
            filePath: 'docs/manuals/user/guide.md',
          },
        ],
        productionManuals: [
          {
            id: 'MAN-PROD-1',
            type: 'production-manual',
            title: 'Ops Guide',
            appliesTo: ['CMP-1'],
            appliesToVersion: '4.4.0',
            status: 'draft',
            filePath: 'docs/manuals/prod/ops.md',
          },
        ],
        coverage: {
          userCoveragePct: 100,
          productionCoveragePct: 100,
          coveredJourneys: 1,
          totalJourneys: 1,
          coveredUseCases: 1,
          totalUseCases: 1,
          coveredComponents: 1,
          totalComponents: 1,
          coveredEnclaves: 0,
          totalEnclaves: 0,
        },
        violations: [],
        warnings: ['Draft warning in docs/manuals/user/guide.md'],
      } as unknown as DashboardMetricsData['manuals'],
      history: [
        {
          id: 'v4.4.0',
          timestamp: '2026-11-15T10:00:00Z',
          kloc: 12.5,
          commits: 10,
          bugs: 0,
          defectDensity: 0,
          reworkPercent: 5,
          costUsd: 1.25,
        },
      ] as unknown as DashboardMetricsData['history'],
      activeBranch: 'feat/test',
      activePrKpi: {
        totalCommits: 3,
        linesAdded: 120,
        linesDeleted: 30,
        totalActiveTimeSeconds: 600,
        totalTokens: 15000,
        totalPromptTokens: 10000,
        totalCompletionTokens: 5000,
        estimatedCostUsd: 0.45,
        humanSummary: {
          commits: 1,
          linesAdded: 30,
          linesDeleted: 10,
          activeTimeSeconds: 200,
          tokens: 3000,
          promptTokens: 2000,
          completionTokens: 1000,
          estimatedCostUsd: 0.05,
        },
        byAuthor: {
          'dev@example.com': {
            commits: 3,
            linesAdded: 120,
            linesDeleted: 30,
            activeTimeSeconds: 600,
            tokens: 15000,
            costUsd: 0.45,
          },
        },
        byModel: {
          'gemini-2.5-pro': {
            commits: 2,
            linesAdded: 90,
            linesDeleted: 20,
            activeTimeSeconds: 400,
            tokens: 12000,
            costUsd: 0.40,
          },
        },
      } as unknown as DashboardMetricsData['activePrKpi'],
      branchTelemetries: {},
      totalTelemetry: {
        totalCommits: 10,
        linesAdded: 500,
        linesDeleted: 100,
        totalActiveTimeSeconds: 1800,
        totalTokens: 50000,
        totalPromptTokens: 35000,
        totalCompletionTokens: 15000,
        estimatedCostUsd: 1.5,
        humanSummary: {
          commits: 0,
          linesAdded: 0,
          linesDeleted: 0,
          activeTimeSeconds: 0,
          tokens: 0,
          promptTokens: 0,
          completionTokens: 0,
          estimatedCostUsd: 0,
        },
        byAuthor: {},
        byModel: {},
      } as unknown as DashboardMetricsData['totalTelemetry'],
      agentKpis: {
        totalTasks: 4,
        totalCommits: 6,
        auditedCommitsPercent: 100,
        firstPassYieldPercent: 85,
        reworkLoopsPerTask: 0.25,
        specificationAdherenceIndex: 98,
        humanTakeoverRatePercent: 5,
        tokenCostEfficiency: 1200,
        architectureDriftRatePercent: 0,
      } as unknown as DashboardMetricsData['agentKpis'],
      complianceBundle: {
        generatedAt: '2026-11-15T10:00:00Z',
        projectVersion: '4.4.0',
        frameworks: ['ISO27001', 'GDPR'],
        overallCompliancePct: 85,
        mappings: [
          {
            framework: 'ISO27001',
            controlId: 'A.12.1',
            controlTitle: 'Operational Procedures',
            gateName: 'verify:quality',
            status: 'PASS',
            evidencePaths: ['QUALITY_REPORT.md'],
          },
          {
            framework: 'GDPR',
            controlId: 'Art.32',
            controlTitle: 'Security of Processing',
            gateName: 'verify:privacy',
            status: 'FAIL',
            evidencePaths: ['PRIVACY_REPORT.md'],
          },
        ],
      } as unknown as DashboardMetricsData['complianceBundle'],
    };

    const html = renderDashboardHtml(graphData, metricsData, 'Custom <Title>', '2026-11-15T12:00:00Z');
    expect(html).toContain('Custom &lt;Title&gt;');
    expect(html).toContain('2 ISSUES');
    expect(html).toContain('FR-1');
    expect(html).toContain('agent-developer');
    expect(html).toContain('OSCAL');
  });

  it('renders clean compliant dashboard HTML with minimal/null optional fields', () => {
    const graphData: GraphElementsResult = { elements: [], issueCount: 0 };
    const metricsData: DashboardMetricsData = {
      gate: {
        success: true,
        failCount: 0,
        results: [],
        policy: {
          max_cyclomatic: 10,
          max_cognitive: 15,
          min_maintainability: 50,
          max_lines_per_function: 40,
          min_line_coverage: 85,
          min_branch_coverage: 80,
          enforcement: 'STRICT',
        },
      } as unknown as QualityGateResult,
      gov: {
        success: true,
        totalTasks: 0,
        verifiedCount: 0,
        unverifiedCount: 0,
        riskCounts: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
        modeCounts: { AUTONOMOUS: 0, HUMAN_REVIEW_PLAN: 0, AMBIGUOUS: 0, HIGH_RISK_MANUAL: 0 },
        tasks: [],
        violations: [],
        unassignedDesignScope: [],
        reportMarkdown: '',
      },
      cov: {
        success: true,
        totalFeatures: 0,
        totalScenarios: 0,
        totalRequirements: 0,
        passedRequirements: 0,
        failedRequirements: 0,
        reportMarkdown: '',
      } as unknown as TestingCoverageResult,
      codeCoverage: null,
      trace: {
        success: true,
        totalRequirements: 0,
        orphanRequirements: 0,
        coveredRequirements: 0,
        rows: [],
        reportMarkdown: '',
      } as unknown as TraceabilityResult,
      manuals: {
        success: true,
        status: 'PASSED',
        enforcementMode: 'ADVISORY',
        branch: 'main',
        profile: 'minimal',
        userManuals: [],
        productionManuals: [],
        coverage: {
          userCoveragePct: 100,
          productionCoveragePct: 100,
          coveredJourneys: 0,
          totalJourneys: 0,
          coveredUseCases: 0,
          totalUseCases: 0,
          coveredComponents: 0,
          totalComponents: 0,
          coveredEnclaves: 0,
          totalEnclaves: 0,
        },
        violations: [],
        warnings: [],
      } as unknown as DashboardMetricsData['manuals'],
      history: [],
      activeBranch: 'main',
      activePrKpi: null,
    };

    const html = renderDashboardHtml(graphData, metricsData);
    expect(html).toContain('100% COMPLIANT');
  });
});
