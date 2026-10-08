import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  buildGraphElements,
  collectDashboardMetrics,
  collectHistoricalKpis,
  generateDashboardReport,
  getCytoscapeScript,
  resolveCytoscapePath,
} from '../src/index.js';

describe('AI-SDLC Interactive Web Dashboard & Cytoscape Graph', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-dash-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore windows cleanup locks
      }
    }
  });

  it('should resolve and load Cytoscape.js standalone script', () => {
    const scriptPath = resolveCytoscapePath();
    expect(scriptPath).toBeTruthy();
    expect(fs.existsSync(scriptPath!)).toBe(true);

    const scriptContent = getCytoscapeScript();
    expect(scriptContent).toBeTruthy();
    expect(scriptContent.length).toBeGreaterThan(10000);
    expect(scriptContent).toContain('cytoscape');
  });

  it('should build graph elements categorizing into 4 canonical layers', () => {
    const rootDir = process.cwd();
    const result = buildGraphElements(rootDir);

    expect(result.elements).toBeDefined();
    expect(result.elements.length).toBeGreaterThan(0);

    const nodes = result.elements.filter((e) => e.group === 'nodes');
    const edges = result.elements.filter((e) => e.group === 'edges');

    expect(nodes.length).toBeGreaterThan(0);
    expect(edges.length).toBeGreaterThan(0);

    // Verify presence of layers
    expect(result.nodesByLayer.product).toBeGreaterThanOrEqual(0);
    expect(result.nodesByLayer.requirement).toBeGreaterThanOrEqual(0);
    expect(result.nodesByLayer.architecture).toBeGreaterThanOrEqual(0);
    expect(result.nodesByLayer.test).toBeGreaterThanOrEqual(0);

    // Verify node structure
    for (const node of nodes) {
      const data = node.data as any;
      expect(data.id).toBeTruthy();
      expect(data.layer).toBeDefined();
      expect(['product', 'requirement', 'architecture', 'test']).toContain(data.layer);
      expect(['COMPLIANT', 'ORPHAN', 'DRIFT', 'REVIEW', 'CONFORME', 'HUÉRFANO']).toContain(data.status);
    }
  });

  it('should collect metrics including quality gate, governance, and testing coverage', () => {
    const rootDir = process.cwd();
    const metrics = collectDashboardMetrics(rootDir);

    expect(metrics.gate).toBeDefined();
    expect(metrics.gov).toBeDefined();
    expect(metrics.cov).toBeDefined();
    expect(metrics.trace).toBeDefined();
    expect(metrics.history).toBeDefined();
    expect(Array.isArray(metrics.history)).toBe(true);
  });

  it('should parse historical release KPIs when reports/releases/*.kpis.json exist', () => {
    const mockReportsDir = path.join(tempDir, 'reports', 'releases');
    fs.mkdirSync(mockReportsDir, { recursive: true });

    const mockReport = {
      releaseBranch: 'release/v1.0.0',
      baseBranch: 'main',
      generatedAt: '2026-09-17T12:00:00Z',
      totalCommits: 15,
      totalLinesAdded: 2500,
      totalLinesDeleted: 200,
      totalKloc: 2.3,
      totalBugs: 1,
      globalDefectDensity: 0.43,
      totalTimeSeconds: 7200,
      totalTokens: 150000,
      totalCostUsd: 2.85,
      reworkTimeSeconds: 360,
      reworkTokens: 10000,
      reworkCostUsd: 0.2,
      reworkTimePercent: 5.0,
      reworkTokensPercent: 6.67,
      reworkCostPercent: 7.02,
      authorStats: [],
      bugList: [],
    };

    fs.writeFileSync(
      path.join(mockReportsDir, 'release_v1.0.0.kpis.json'),
      JSON.stringify(mockReport, null, 2),
      'utf-8'
    );

    const history = collectHistoricalKpis(tempDir);
    expect(history.length).toBe(1);
    expect(history[0].id).toBe('release/v1.0.0');
    expect(history[0].kloc).toBe(2.3);
    expect(history[0].bugs).toBe(1);
    expect(history[0].defectDensity).toBe(0.43);
  });

  it('should generate a complete, standalone, self-contained HTML dashboard', () => {
    const outputPath = path.join(tempDir, 'reports', 'test-dashboard.html');
    const result = generateDashboardReport({
      rootDir: process.cwd(),
      outputPath,
      title: 'Custom Test AI-SDLC Dashboard',
    });

    expect(result.outputPath).toBe(outputPath);
    expect(fs.existsSync(outputPath)).toBe(true);

    const htmlContent = fs.readFileSync(outputPath, 'utf-8');
    expect(htmlContent).toContain('<!DOCTYPE html>');
    expect(htmlContent).toContain('Custom Test AI-SDLC Dashboard');
    expect(htmlContent).toContain('cytoscape');
    expect(htmlContent).toContain('id="cy"');
    expect(htmlContent).toContain('360° Requirements Traceability Matrix');
    expect(htmlContent).toContain('Task Autonomy Modes Distribution');
    expect(htmlContent).toMatch(/Active Telemetry.*and KPI History/);
    // Verify node details sidebar content and 1-second hover tooltip
    expect(htmlContent).toContain('id="node-details"');
    expect(htmlContent).toContain('id="sidebar-content"');
    expect(htmlContent).toContain('showNodeDetails');
    expect(htmlContent).toContain('id="req-tooltip"');
    expect(htmlContent).toContain('startRowTooltip');
    expect(htmlContent).toContain('showTooltip');
    expect(htmlContent).toContain('hideTooltip');
    expect(htmlContent).toContain('1000');
    expect(htmlContent).toContain('Code Coverage (Lines)');

    // Verify it is larger than 100KB due to bundled Cytoscape library
    expect(htmlContent.length).toBeGreaterThan(100000);
  });

  it('should include markdown content and filePath in requirement graph nodes', () => {
    const rootDir = process.cwd();
    const result = buildGraphElements(rootDir);
    const reqNodes = result.elements
      .filter((e) => e.group === 'nodes')
      .map((e) => e.data as any)
      .filter((d) => d.layer === 'requirement');

    expect(reqNodes.length).toBeGreaterThan(0);
    const withContent = reqNodes.find((n) => n.content && n.content.length > 0);
    expect(withContent).toBeDefined();
    expect(withContent.filePath).toBeDefined();
    expect(withContent.content).toContain('Enunciado Normativo');
  });

  it('should render interactive task autonomy distribution with filters and md file links', () => {
    const outputPath = path.join(tempDir, 'reports', 'governance-dash-test.html');
    const result = generateDashboardReport({
      rootDir: process.cwd(),
      outputPath,
      title: 'Governance Task Test Dashboard',
    });

    const htmlContent = fs.readFileSync(outputPath, 'utf-8');

    // Autonomy modes rows have click toggles
    expect(htmlContent).toContain("toggleAutonomyTasks('AUTONOMOUS')");
    expect(htmlContent).toContain("toggleAutonomyTasks('HUMAN_REVIEW_PLAN')");
    expect(htmlContent).toContain("toggleAutonomyTasks('AMBIGUOUS')");
    expect(htmlContent).toContain("toggleAutonomyTasks('HIGH_RISK_MANUAL')");

    // Expandable accordion rows exist
    expect(htmlContent).toContain('id="tasks-row-AUTONOMOUS"');
    expect(htmlContent).toContain('id="tasks-row-HUMAN_REVIEW_PLAN"');
    expect(htmlContent).toContain('id="tasks-row-AMBIGUOUS"');
    expect(htmlContent).toContain('id="tasks-row-HIGH_RISK_MANUAL"');

    // Filter controls exist
    expect(htmlContent).toContain("filterAutonomyTasks('AUTONOMOUS', 'all'");
    expect(htmlContent).toContain("filterAutonomyTasks('AUTONOMOUS', 'open'");
    expect(htmlContent).toContain("filterAutonomyTasks('AUTONOMOUS', 'closed'");

    // Task rows with open/closed markers and side panel trigger
    expect(htmlContent).toContain('id="task-sidebar"');
    expect(htmlContent).toContain('id="task-backdrop"');
    expect(htmlContent).toContain('showTaskSidebar(');
    expect(htmlContent).toContain('closeTaskSidebar');
    expect(htmlContent).toContain('var govTasks =');
    expect(htmlContent).toContain('class="task-row task-item');
    expect(htmlContent).toMatch(/\.tasks\.md|tasks\.md/);
  });

  it('should discover Journeys, Actors, Business Rules, and Abuse Cases with distinct node typologies and semantic edges', () => {
    const rootDir = process.cwd();
    const result = buildGraphElements(rootDir);

    const nodes = result.elements.filter((e) => e.group === 'nodes').map((e) => e.data as any);
    const edges = result.elements.filter((e) => e.group === 'edges').map((e) => e.data as any);

    // Verify node types exist
    const journeyNode = nodes.find((n) => n.id === 'JRN-UAV-SURVEILLANCE' || n.type === 'journey');
    expect(journeyNode).toBeDefined();
    expect(journeyNode.type).toBe('journey');
    expect(journeyNode.layer).toBe('product');

    const actorNode = nodes.find((n) => n.id === 'ACT-AI-AGENT' || n.type === 'actor');
    expect(actorNode).toBeDefined();
    expect(actorNode.type).toBe('actor');

    const ruleNode = nodes.find((n) => n.id === 'BR-SPEC-TRACEABILITY-INVARIANT' || n.type === 'business-rule');
    expect(ruleNode).toBeDefined();
    expect(ruleNode.type).toBe('business-rule');

    const abuseNode = nodes.find((n) => n.id === 'ABUSE-UNVERIFIED-SPEC-BYPASS' || n.type === 'abuse-case');
    expect(abuseNode).toBeDefined();
    expect(abuseNode.type).toBe('abuse-case');

    // Verify semantic edges exist
    const pursuesEdge = edges.find((e) => e.relation === 'pursues');
    expect(pursuesEdge).toBeDefined();
    expect(pursuesEdge.target).toBe('JRN-AI-ASSISTED-SDLC');

    const decomposesEdge = edges.find((e) => e.relation === 'decomposes-into');
    expect(decomposesEdge).toBeDefined();
    expect(decomposesEdge.source).toBe('JRN-AI-ASSISTED-SDLC');

    const governsEdge = edges.find((e) => e.relation === 'governs');
    expect(governsEdge).toBeDefined();
    expect(governsEdge.source).toBe('BR-SPEC-TRACEABILITY-INVARIANT');

    const mitigatedEdge = edges.find((e) => e.relation === 'mitigated-by');
    expect(mitigatedEdge).toBeDefined();
    expect(mitigatedEdge.source).toBe('ABUSE-UNVERIFIED-SPEC-BYPASS');

    // Verify node classes contain type-*
    const nodeElements = result.elements.filter((e) => e.group === 'nodes');
    const hasTypeJourney = nodeElements.some((e) => e.classes?.includes('type-journey'));
    const hasTypeActor = nodeElements.some((e) => e.classes?.includes('type-actor'));
    const hasTypeRule = nodeElements.some((e) => e.classes?.includes('type-business-rule'));
    const hasTypeAbuse = nodeElements.some((e) => e.classes?.includes('type-abuse-case'));

    expect(hasTypeJourney).toBe(true);
    expect(hasTypeActor).toBe(true);
    expect(hasTypeRule).toBe(true);
    expect(hasTypeAbuse).toBe(true);
  });

  it('should render interactive typology legend and type filter dropdown in generated HTML', () => {
    const outputPath = path.join(tempDir, 'reports', 'typologies-dash-test.html');
    const result = generateDashboardReport({
      rootDir: process.cwd(),
      outputPath,
      title: 'Typologies Test Dashboard',
    });

    const htmlContent = fs.readFileSync(outputPath, 'utf-8');

    // Visual legend presence
    expect(htmlContent).toContain('class="graph-legend"');
    expect(htmlContent).toContain('Node Typologies');
    expect(htmlContent).toContain('Journey');
    expect(htmlContent).toContain('Actor');
    expect(htmlContent).toContain('Use Case');
    expect(htmlContent).toContain('Business Rule');
    expect(htmlContent).toContain('Abuse Case');

    // Type filter dropdown presence
    expect(htmlContent).toContain('id="type-filter"');
    expect(htmlContent).toContain('All Typologies');
    expect(htmlContent).toContain('filterType(this.value)');
    expect(htmlContent).toContain('value="journey"');
    expect(htmlContent).toContain('value="actor"');
    expect(htmlContent).toContain('value="business-rule"');
    expect(htmlContent).toContain('value="abuse-case"');

    // Cytoscape styles for typologies
    expect(htmlContent).toContain('node.type-journey');
    expect(htmlContent).toContain('node.type-actor');
    expect(htmlContent).toContain('node.type-business-rule');
    expect(htmlContent).toContain('node.type-abuse-case');

    // Edge relation styles
    expect(htmlContent).toContain('edge.relation-pursues');
    expect(htmlContent).toContain('edge.relation-decomposes-into');
    expect(htmlContent).toContain('edge.relation-governs');
    expect(htmlContent).toContain('edge.relation-mitigated-by');
  });

  it('should not include examples artifacts when rootDir is project root', () => {
    const result = buildGraphElements(process.cwd());
    const nodes = result.elements.filter((e) => e.group === 'nodes').map((e) => e.data);
    const exampleNodes = nodes.filter((n) => n.filePath && n.filePath.startsWith('examples/'));
    expect(exampleNodes.length).toBe(0);
    const sentinelNodes = nodes.filter((n) => n.id.includes('TELEMETRY') || n.id.includes('DRONE'));
    expect(sentinelNodes.length).toBe(0);
  });

  it('should safely escape </script> tags in embedded JSON and avoid event.target in switchTab', () => {
    const reqDir = path.join(tempDir, 'specs', 'product', 'requirements');
    fs.mkdirSync(reqDir, { recursive: true });
    fs.writeFileSync(
      path.join(reqDir, 'FR-XSS-001.md'),
      [
        '---',
        'id: FR-XSS-001',
        'title: Prevent <script>alert(1)</script> injection',
        'type: functional-requirement',
        '---',
        'The system MUST sanitize payloads containing `</script><script>evil()</script>` in input fields.',
      ].join('\n'),
      'utf-8'
    );

    const outputPath = path.join(tempDir, 'reports', 'xss-safe-dashboard.html');
    const result = generateDashboardReport({
      rootDir: tempDir,
      outputPath,
      title: 'Dashboard <script> Test',
    });

    const html = result.html;
    // Exactly 2 <script> blocks (Cytoscape bundle + dashboard app logic)
    const openScripts = html.match(/<script>/g) || [];
    const closeScripts = html.match(/<\/script>/g) || [];
    expect(openScripts.length).toBe(2);
    expect(closeScripts.length).toBe(2);
    expect(html).toContain('\\u003c/script\\u003e');
    expect(html).not.toContain('event.target');
  });

  it('should deduplicate architecture views, ignore build/changes directories, and link canonical schema relationships', () => {
    const actorsDir = path.join(tempDir, 'specs', 'product', 'actors');
    const ucsDir = path.join(tempDir, 'specs', 'product', 'use-cases');
    const rulesDir = path.join(tempDir, 'specs', 'product', 'rules');
    const reqsDir = path.join(tempDir, 'specs', 'product', 'requirements');
    const threatsDir = path.join(tempDir, 'specs', 'security', 'threats');
    const archCompDir = path.join(tempDir, 'specs', 'architecture', 'components');
    const archAdrDir = path.join(tempDir, 'specs', 'architecture', 'decisions');
    const changesDir = path.join(tempDir, 'specs', 'changes', 'CHG-001');
    const testsDir = path.join(tempDir, 'tests', 'features');
    const binTestsDir = path.join(tempDir, 'tests', 'bin', 'Debug', 'net8.0', 'features');

    for (const d of [actorsDir, ucsDir, rulesDir, reqsDir, threatsDir, archCompDir, archAdrDir, changesDir, testsDir, binTestsDir]) {
      fs.mkdirSync(d, { recursive: true });
    }

    fs.writeFileSync(
      path.join(actorsDir, 'ACT-CHEF.md'),
      '---\nid: ACT-CHEF\ntitle: Head Chef\ntype: actor\n---\nChef actor.',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(actorsDir, 'ACT-AUDITOR.md'),
      '---\nid: ACT-AUDITOR\ntitle: Cost Auditor\ntype: actor\n---\nAuditor actor.',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(rulesDir, 'BR-MARGIN-01.md'),
      '---\nid: BR-MARGIN-01\ntitle: Margin Rule\ntype: business-rule\n---\nMargin rule.',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(ucsDir, 'UC-RECIPE-01.md'),
      [
        '---',
        'id: UC-RECIPE-01',
        'title: Calculate Recipe Cost',
        'type: use-case',
        'primary-actor: ACT-CHEF',
        'supporting-actors:',
        '  - ACT-AUDITOR',
        'governed-by:',
        '  - BR-MARGIN-01',
        '---',
        'Use case body.',
      ].join('\n'),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(threatsDir, 'ABUSE-TAMPER-01.md'),
      [
        '---',
        'id: ABUSE-TAMPER-01',
        'title: Tamper Cost Calculation',
        'type: abuse-case',
        'targets-use-case:',
        '  - UC-RECIPE-01',
        '---',
        'Abuse case body.',
      ].join('\n'),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(reqsDir, 'FR-COST-01.md'),
      [
        '---',
        'id: FR-COST-01',
        'title: Formula Cost Engine',
        'type: functional-requirement',
        'derived-from:',
        '  - UC-RECIPE-01',
        'satisfied-by:',
        '  - CMP-COST-ENGINE',
        '---',
        'Requirement body.',
      ].join('\n'),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(archCompDir, 'CMP-COST-ENGINE.md'),
      '---\nid: CMP-COST-ENGINE\ntitle: Cost Engine Component\ntype: component\n---\nSatisfies FR-COST-01.',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(archAdrDir, 'ADR-001-DECIMAL.md'),
      [
        '---',
        'id: ADR-001',
        'title: Use Decimal Arithmetic',
        'type: adr',
        'affects-components:',
        '  - CMP-COST-ENGINE',
        '---',
        'ADR body referencing FR-COST-01.',
      ].join('\n'),
      'utf-8'
    );
    // SDD operational change file that should be ignored in graph
    fs.writeFileSync(
      path.join(changesDir, 'proposal.md'),
      '---\nid: CHG-001\ntitle: Change Proposal\ntype: proposal\n---\nProposal body.',
      'utf-8'
    );
    // Canonical test feature + duplicate build output in bin/
    const featureContent = '@FR-COST-01\nFeature: Cost calculation\n  Scenario: Valid cost\n    Given a recipe\n';
    fs.writeFileSync(path.join(testsDir, 'cost.feature'), featureContent, 'utf-8');
    fs.writeFileSync(path.join(binTestsDir, 'cost.feature'), featureContent, 'utf-8');

    const graph = buildGraphElements(tempDir);
    const nodes = graph.elements.filter((e) => e.group === 'nodes').map((e) => e.data as any);
    const edges = graph.elements.filter((e) => e.group === 'edges').map((e) => e.data as any);

    // 1. No duplicate CMP-COST-ENGINE.md or ADR-001-DECIMAL.md filename nodes
    expect(nodes.find((n) => n.id === 'CMP-COST-ENGINE.md')).toBeUndefined();
    expect(nodes.find((n) => n.id === 'ADR-001-DECIMAL.md')).toBeUndefined();
    expect(nodes.find((n) => n.id === 'CMP-COST-ENGINE')).toBeDefined();
    expect(nodes.find((n) => n.id === 'ADR-001')).toBeDefined();

    // 2. SDD change proposal excluded
    expect(nodes.find((n) => n.id === 'CHG-001')).toBeUndefined();

    // 3. Build output in bin/ excluded (only 1 test node for cost.feature)
    const testNodes = nodes.filter((n) => n.layer === 'test');
    expect(testNodes.length).toBe(1);

    // 4. Canonical edges created
    expect(edges.some((e) => e.source === 'ACT-AUDITOR' && e.target === 'UC-RECIPE-01' && e.relation === 'initiates')).toBe(true);
    expect(edges.some((e) => e.source === 'BR-MARGIN-01' && e.target === 'UC-RECIPE-01' && e.relation === 'governs')).toBe(true);
    expect(edges.some((e) => e.source === 'ABUSE-TAMPER-01' && e.target === 'UC-RECIPE-01' && e.relation === 'targets')).toBe(true);
    expect(edges.some((e) => e.source === 'ADR-001' && e.target === 'CMP-COST-ENGINE' && e.relation === 'governs')).toBe(true);
  });
});


