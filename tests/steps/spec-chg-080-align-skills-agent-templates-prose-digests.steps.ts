// RED/GREEN BDD STEP DEFINITIONS (tests/features/spec-chg-080-align-skills-agent-templates-prose-digests.feature)
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { expect } from 'vitest';
import { BddStepRegistry } from '@aisdlc/core';
import * as pdacGraph from '@aisdlc/core/verifiers/pdac-graph';
import {
  LIFECYCLE_SKILL_TEMPLATES,
  SKILL_REFERENCES,
  SPECIALIZED_AGENT_TEMPLATES,
  STARTER_ANTIGRAVITY_TESTING_RULES,
  STARTER_CURSOR_TESTING_RULES,
  STARTER_TESTS_AGENTS_MD,
} from '@aisdlc/core';
import { buildGherkinFailedGate } from '../../packages/cli/src/commands/check.js';
import { buildGherkinViolations } from '../../packages/cli/src/commands/verify.js';

const ROOT_DIR = path.resolve(__dirname, '../..');
const ZERO_HEX = '0'.repeat(64);
const STALE_HEX = 'b'.repeat(64);
const VALID_HEX = 'a'.repeat(64);

export function registerSteps(registry: BddStepRegistry): void {
  let citationState = '';
  let sampleContent = '';
  let extractedCitations: pdacGraph.CitationEntry[] = [];
  let syncResult: { updatedContent: string; changed: boolean } | null = null;
  let verifyResult: pdacGraph.PdacVerifyResult | null = null;
  let parseElapsedMs = 0;

  registry
    .given(
      'agent templates, skill references, ".agent/rules/ai-sdlc-testing.md", IDE mirrors, and CLI verify/check remediation builders are updated for optional "[--lang <ts|py|go|rs|cs>]" and "--features-only"',
      () => {
        const qa = SPECIALIZED_AGENT_TEMPLATES.find((a) => a.id === 'agent-qa-engineer');
        expect(qa).toBeDefined();
      }
    )
    .given('"pdac-graph.ts" supports prose "> **Upstream Citation**:" SHA-256 detection and synchronization', () => {
      expect((pdacGraph as Record<string, unknown>).extractProseCitations).toBeTypeOf('function');
      expect((pdacGraph as Record<string, unknown>).updateProseCitationLine).toBeTypeOf('function');
    })
    .when(
      '"npx aisdlc sync", CLI Gherkin remediation builders, and "pdac-graph.ts" citation verification/sync run',
      () => {
        verifyResult = pdacGraph.verifyPdacGraph({ rootDir: ROOT_DIR });
      }
    )
    .then('templates, skills, rules, IDE mirrors, and CLI messages document optional "[--lang <lang>]" and "--features-only"', () => {
      const qa = SPECIALIZED_AGENT_TEMPLATES.find((a) => a.id === 'agent-qa-engineer')!;
      const inc = LIFECYCLE_SKILL_TEMPLATES.find((s) => s.id === 'aisdlc-increment')!;
      const bdd = LIFECYCLE_SKILL_TEMPLATES.find((s) => s.id === 'aisdlc-bdd-gherkin')!;
      const matrix = (SKILL_REFERENCES['aisdlc-bdd-gherkin'] ?? []).find((r) => r.filename === 'gherkin-polyglot-matrix.md')!;
      const testingRule = fs.readFileSync(path.join(ROOT_DIR, '.agent', 'rules', 'ai-sdlc-testing.md'), 'utf-8');
      for (const text of [
        qa.body,
        inc.body,
        bdd.body,
        matrix.content,
        STARTER_ANTIGRAVITY_TESTING_RULES,
        STARTER_CURSOR_TESTING_RULES,
        STARTER_TESTS_AGENTS_MD,
        testingRule,
      ]) {
        expect(text).toMatch(/\[--lang\s*<(ts\|py\|go\|rs\|cs|lang)>\]/);
      }
      expect(buildGherkinFailedGate(1, true, false).remediation).toContain('[--lang <lang>]');
      const violations = buildGherkinViolations({
        inSync: false,
        totalFeatures: 1,
        missingFiles: [],
        outOfSyncFiles: [],
        orphanFeatureFiles: [],
        missingStepFiles: ['tests/features/sample.feature'],
        stepLanguageMismatches: [],
      });
      expect(violations.find((v) => v.type === 'MISSING_STEP_FILE')?.message).toContain('[--lang <lang>]');
    })
    .given(
      'prose citations in "FR-069-LANGUAGE-AGNOSTIC-CODING-RULES-001.md" and "FR-071-GHERKIN-SCAFFOLD-POLYGLOT-FIX-001.md" have valid synchronized SHA-256 digests',
      () => {
        const res = verifyResult ?? pdacGraph.verifyPdacGraph({ rootDir: ROOT_DIR });
        const staleProse = res.drifts.filter(
          (d) => d.sourceFile.includes('FR-069') || d.sourceFile.includes('FR-071')
        );
        expect(staleProse).toHaveLength(0);
      }
    )
    .given(
      '"TSK-070-01" and "TSK-070-02" are marked "COMPLETED" and "CHG-070" is integrated without committing global "reports/*" files',
      () => {
        const activePath = path.join(ROOT_DIR, 'specs/changes/active/chg-070-bdd-step-language-sync/tasks.md');
        const completedPath = path.join(ROOT_DIR, 'specs/changes/completed/chg-070-bdd-step-language-sync/tasks.md');
        const target = fs.existsSync(completedPath) ? completedPath : activePath;
        const content = fs.readFileSync(target, 'utf-8');
        expect(content).not.toMatch(/status:\s*PENDING/);
      }
    )
    .given(/^a Markdown specification with "([^"]+)"$/, ([state]) => {
      citationState = state;
      if (state.includes('0000...0000')) {
        sampleContent = `> **Upstream Citation**: \`UC-080-BOUNDARY\` (SHA-256: \`${ZERO_HEX}\`)\n`;
      } else if (state.includes('stale mismatched')) {
        sampleContent = `> **Upstream Citation**: \`UC-080-BOUNDARY\` (SHA-256: \`${STALE_HEX}\`)\n`;
      } else {
        sampleContent = [
          '---',
          'id: FR-080-BOTH',
          'citations:',
          '  - id: UC-080-YAML',
          `    digest: sha256:${ZERO_HEX}`,
          '---',
          `> **Upstream Citation**: \`UC-080-BOUNDARY\` (SHA-256: \`${ZERO_HEX}\`)`,
          '',
        ].join('\n');
      }
    })
    .when('"extractCitations" and "updateCitationsInContent" in "pdac-graph.ts" process the file', () => {
      extractedCitations = pdacGraph.extractCitations(sampleContent, 'specs/product/FR-080-BOUNDARY.md');
      const baselineMap = new Map<string, pdacGraph.PdacNode>([
        [
          'UC-080-BOUNDARY',
          {
            id: 'UC-080-BOUNDARY',
            type: 'use-case',
            title: 'Boundary',
            filePath: 'specs/product/UC-080-BOUNDARY.md',
            digest: VALID_HEX,
            rawDigest: `sha256:${VALID_HEX}`,
          },
        ],
        [
          'UC-080-YAML',
          {
            id: 'UC-080-YAML',
            type: 'use-case',
            title: 'YAML',
            filePath: 'specs/product/UC-080-YAML.md',
            digest: VALID_HEX,
            rawDigest: `sha256:${VALID_HEX}`,
          },
        ],
      ]);
      syncResult = pdacGraph.updateCitationsInContent(sampleContent, baselineMap, 'specs/product/FR-080-BOUNDARY.md', []);
    })
    .then(/^the outcome satisfies "([^"]+)"$/, ([expectedBehavior]) => {
      expect(extractedCitations.some((c) => c.targetId === 'UC-080-BOUNDARY')).toBe(true);
      expect(syncResult?.changed).toBe(true);
      expect(syncResult?.updatedContent).toContain(VALID_HEX);
      if (citationState.includes('both YAML')) {
        expect(extractedCitations).toHaveLength(2);
      } else {
        expect(expectedBehavior.length).toBeGreaterThan(0);
      }
    })
    .given(
      'a Markdown specification with a prose "> **Upstream Citation**:" pointing to a nonexistent upstream file or invalid digest',
      () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aisdlc-bdd-spec080-inv-'));
        try {
          const prodDir = path.join(tmpDir, 'specs', 'product');
          fs.mkdirSync(prodDir, { recursive: true });
          fs.writeFileSync(
            path.join(prodDir, 'FR-080-INV.md'),
            ['---', 'id: FR-080-INV', '---', '> **Upstream Citation**: `UC-MISSING` (SHA-256: `invalid-digest`)'].join(
              '\n'
            ),
            'utf-8'
          );
          verifyResult = pdacGraph.verifyPdacGraph({ rootDir: tmpDir });
        } finally {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      }
    )
    .when('"pdac-graph.ts" verifies PDaC traceability', () => {
      expect(verifyResult).not.toBeNull();
    })
    .then('verification reports a structured traceability error without crashing', () => {
      expect(verifyResult?.success).toBe(false);
      expect(verifyResult?.unresolvedCitations.some((c) => c.targetId === 'UC-MISSING')).toBe(true);
    })
    .given('a Markdown specification with a malformed or crafted "> **Upstream Citation**:" line', () => {
      sampleContent = `> **Upstream Citation**: \`UC-080-REDOS\` ${'x'.repeat(20000)} (no sha field)\n`;
    })
    .when('"extractCitations" and "updateCitationsInContent" in "pdac-graph.ts" process the content', () => {
      const extractProse = (pdacGraph as Record<string, unknown>).extractProseCitations;
      expect(extractProse).toBeTypeOf('function');
      const start = performance.now();
      extractedCitations = pdacGraph.extractCitations(sampleContent, 'specs/product/FR-080-REDOS.md');
      syncResult = pdacGraph.updateCitationsInContent(sampleContent, new Map(), 'specs/product/FR-080-REDOS.md', []);
      parseElapsedMs = performance.now() - start;
    })
    .then('parsing completes deterministically in linear time without throwing unhandled exceptions', () => {
      expect(extractedCitations).toEqual([]);
      expect(syncResult?.changed).toBe(false);
      expect(parseElapsedMs).toBeLessThan(100);
    });
}
