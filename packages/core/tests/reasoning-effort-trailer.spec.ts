/**
 * AI-SDLC: Reasoning Effort Trailer & Dashboard Telemetry Tests
 * Traceability: FR-064-REASONING-EFFORT-TRAILER-001, UC-064-REASONING-EFFORT-TRAILER, CHG-064-REASONING-EFFORT-TRAILER, TSK-064-001
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vm from 'vm';
import * as trailersMod from '../src/git/trailers.js';
import { parseCommitTrailers, formatCommitTrailers, CommitKpiRecord } from '../src/git/trailers.js';
import { detectAuthorIdentity } from '../src/git/agent-detector.js';
import { PREPARE_COMMIT_MSG_SCRIPT } from '../src/git/hook-installer.js';
import { aggregateCommitKpiRecords, PrKpiAggregation } from '../src/reporters/pr-kpis.js';
import * as dashboardHtmlMod from '../src/reporters/dashboard-html.js';
import { DASHBOARD_CLIENT_SCRIPT } from '../src/reporters/dashboard-template.js';

describe('FR-064-REASONING-EFFORT-TRAILER-001: AI-Reasoning-Effort Trailer & Dashboard Breakdown', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-effort-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore Windows cleanup locks
    }
  });

  describe('normalizeReasoningEffort', () => {
    const getNormalizer = () =>
      (trailersMod as unknown as { normalizeReasoningEffort?: (raw?: string) => string | undefined })
        .normalizeReasoningEffort;

    it('accepts canonical lowercase levels: low, medium, high, max', () => {
      const normalize = getNormalizer();
      expect(typeof normalize).toBe('function');
      expect(normalize!('low')).toBe('low');
      expect(normalize!('medium')).toBe('medium');
      expect(normalize!('high')).toBe('high');
      expect(normalize!('max')).toBe('max');
    });

    it('normalizes uppercase and surrounding whitespace', () => {
      const normalize = getNormalizer();
      expect(typeof normalize).toBe('function');
      expect(normalize!('  HIGH  ')).toBe('high');
      expect(normalize!('Medium')).toBe('medium');
      expect(normalize!('\tMAX\r')).toBe('max');
    });

    it('returns undefined for invalid, empty, or undefined inputs', () => {
      const normalize = getNormalizer();
      expect(typeof normalize).toBe('function');
      expect(normalize!('ultra')).toBeUndefined();
      expect(normalize!('')).toBeUndefined();
      expect(normalize!('   ')).toBeUndefined();
      expect(normalize!(undefined)).toBeUndefined();
    });
  });

  describe('parseCommitTrailers & formatCommitTrailers', () => {
    it('parses valid AI-Reasoning-Effort trailer and formats it back', () => {
      const message = [
        'feat(TSK-064-001): add reasoning effort telemetry',
        '',
        'Author-Type: agent',
        'AI-Model: claude-3-7-sonnet',
        'AI-Reasoning-Effort: high',
        'Prompt-Tokens: 1200',
        'Completion-Tokens: 300',
        'Active-Time-Seconds: 45',
      ].join('\n');

      const parsed = parseCommitTrailers(message) as unknown as {
        reasoningEffort?: string;
        aiModel?: string;
        authorType: string;
      };
      expect(parsed.authorType).toBe('agent');
      expect(parsed.aiModel).toBe('claude-3-7-sonnet');
      expect(parsed.reasoningEffort).toBe('high');

      const formatted = formatCommitTrailers({
        authorType: 'agent',
        aiModel: 'claude-3-7-sonnet',
        reasoningEffort: 'high',
        promptTokens: 1200,
        completionTokens: 300,
        activeTimeSeconds: 45,
      } as Record<string, unknown>);
      expect(formatted).toContain('AI-Reasoning-Effort: high');
    });

    it('prevents newline-crossing capture on empty AI-Reasoning-Effort line', () => {
      const pocMessage = 'feat: poc\n\nAI-Reasoning-Effort:   \nhigh\nAuthor-Type: agent';
      const parsed = parseCommitTrailers(pocMessage) as unknown as { reasoningEffort?: string };
      expect(parsed.reasoningEffort).toBeUndefined();
    });

    it('returns undefined when missing and omits AI-Reasoning-Effort when formatting', () => {
      const parsed = parseCommitTrailers('fix: human change\n\nAuthor-Type: human') as unknown as {
        reasoningEffort?: string;
      };
      expect(parsed.reasoningEffort).toBeUndefined();

      const formatted = formatCommitTrailers({
        authorType: 'human',
        promptTokens: 0,
        completionTokens: 0,
        activeTimeSeconds: 60,
      });
      expect(formatted).not.toContain('AI-Reasoning-Effort:');
    });
  });

  describe('detectAuthorIdentity', () => {
    it('resolves reasoningEffort from AI_REASONING_EFFORT env var in agent environment', () => {
      const identity = detectAuthorIdentity({
        cwd: tmpDir,
        env: {
          AI_SDLC_AUTHOR_TYPE: 'agent',
          AI_MODEL: 'claude-3-7-sonnet',
          AI_REASONING_EFFORT: '  HIGH  ',
        },
      }) as unknown as { authorType: string; reasoningEffort?: string };

      expect(identity.authorType).toBe('agent');
      expect(identity.reasoningEffort).toBe('high');
    });

    it('resolves reasoningEffort from .ai-sdlc/session-telemetry.json', () => {
      const sdlcDir = path.join(tmpDir, '.ai-sdlc');
      fs.mkdirSync(sdlcDir, { recursive: true });
      fs.writeFileSync(
        path.join(sdlcDir, 'session-telemetry.json'),
        JSON.stringify({
          authorType: 'agent',
          model: 'gpt-4o',
          reasoningEffort: 'Max',
          promptTokens: 500,
          completionTokens: 150,
          activeTimeSeconds: 25,
        }),
        'utf-8'
      );

      const identity = detectAuthorIdentity({
        cwd: tmpDir,
        env: {},
      }) as unknown as { authorType: string; reasoningEffort?: string };

      expect(identity.authorType).toBe('agent');
      expect(identity.reasoningEffort).toBe('max');
    });

    it('omits reasoningEffort when authorType is human even if AI_REASONING_EFFORT is set', () => {
      const identity = detectAuthorIdentity({
        cwd: tmpDir,
        env: {
          AI_REASONING_EFFORT: 'high',
        },
      }) as unknown as { authorType: string; reasoningEffort?: string };

      expect(identity.authorType).toBe('human');
      expect(identity.reasoningEffort).toBeUndefined();
    });
  });

  describe('PREPARE_COMMIT_MSG_SCRIPT', () => {
    it('contains AI-Reasoning-Effort trailer, AI_REASONING_EFFORT env var, CRLF stripping, and 6-field fallback', () => {
      expect(PREPARE_COMMIT_MSG_SCRIPT).toContain('AI-Reasoning-Effort');
      expect(PREPARE_COMMIT_MSG_SCRIPT).toContain('AI_REASONING_EFFORT');
      expect(PREPARE_COMMIT_MSG_SCRIPT).toContain("tr -d '\\r[:space:]'");
      expect(PREPARE_COMMIT_MSG_SCRIPT).toContain('id.reasoningEffort');
    });
  });

  describe('aggregateCommitKpiRecords (PR KPIs), renderModelTelemetryTable & filterTelemetryByBranch', () => {
    const makeRecord = (
      sha: string,
      authorType: 'human' | 'agent',
      aiModel: string | undefined,
      reasoningEffort: string | undefined,
      tokens: number
    ): CommitKpiRecord => ({
      sha,
      authorName: authorType === 'agent' ? 'AI Agent' : 'Human Dev',
      authorEmail: 'dev@example.com',
      date: '2026-11-19T18:00:00Z',
      subject: `commit ${sha}`,
      trailers: {
        authorType,
        aiModel,
        reasoningEffort,
        promptTokens: tokens,
        completionTokens: Math.floor(tokens / 4),
        activeTimeSeconds: 60,
      } as CommitKpiRecord['trailers'],
      linesAdded: 20,
      linesDeleted: 5,
      isBugFix: false,
    });

    it('aggregates byEffort breakdown per model and falls back to unspecified for legacy commits', () => {
      const records: CommitKpiRecord[] = [
        makeRecord('sha1', 'human', undefined, undefined, 0),
        makeRecord('sha2', 'agent', 'claude-3-7-sonnet', 'high', 1000),
        makeRecord('sha3', 'agent', 'claude-3-7-sonnet', 'low', 400),
        makeRecord('sha4', 'agent', 'claude-3-7-sonnet', undefined, 600),
      ];

      const kpi = aggregateCommitKpiRecords(records, 'main', 'feat/CHG-064');
      const sonnet = kpi.byModel['claude-3-7-sonnet'] as unknown as {
        commits: number;
        byEffort?: Record<string, { commits: number; promptTokens: number }>;
      };

      expect(sonnet).toBeDefined();
      expect(sonnet.commits).toBe(3);
      expect(sonnet.byEffort).toBeDefined();
      expect(sonnet.byEffort!['high'].commits).toBe(1);
      expect(sonnet.byEffort!['high'].promptTokens).toBe(1000);
      expect(sonnet.byEffort!['low'].commits).toBe(1);
      expect(sonnet.byEffort!['unspecified'].commits).toBe(1);
    });

    it('renders 8-column model telemetry table with Reasoning Effort header, <td>—</td> in human/total rows, and XSS escaping', () => {
      const renderFn = (dashboardHtmlMod as unknown as {
        renderModelTelemetryTable?: (kpi: PrKpiAggregation, label: string) => string;
      }).renderModelTelemetryTable;
      expect(typeof renderFn).toBe('function');

      const records: CommitKpiRecord[] = [
        makeRecord('sha1', 'human', undefined, undefined, 0),
        makeRecord('sha2', 'agent', '<img src=x onerror=alert(1)>', 'high', 1000),
        makeRecord('sha3', 'agent', 'gpt-4o', undefined, 500),
      ];

      const kpi = aggregateCommitKpiRecords(records, 'main', 'feat/CHG-064');
      // Inject malicious reasoningEffort directly to verify output escaping
      const evilModel = kpi.byModel['<img src=x onerror=alert(1)>'] as unknown as {
        byEffort?: Record<string, unknown>;
      };
      if (evilModel?.byEffort) {
        evilModel.byEffort['<script>alert(2)</script>'] = evilModel.byEffort['high'];
        delete evilModel.byEffort['high'];
      }

      const html = renderFn!(kpi, 'feat/CHG-064');
      expect(html).toContain('<th>Reasoning Effort</th>');
      expect(html).toContain('unspecified');
      expect(html).not.toContain('<img src=x onerror=alert(1)>');
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(html).not.toContain('<script>alert(2)</script>');
      expect(html).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');

      // Verify 8-column alignment in human and total rows (each row should have 8 <td>...</td> cells)
      const rowMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
      const dataRows = rowMatches.filter((r) => r.includes('<td'));
      expect(dataRows.length).toBeGreaterThanOrEqual(3);
      for (const row of dataRows) {
        const tdCount = (row.match(/<td\b/g) || []).length;
        expect(tdCount).toBe(8);
      }
    });

    it('filterTelemetryByBranch in DASHBOARD_CLIENT_SCRIPT renders 8 columns with byEffort, unspecified fallback, and XSS escaping', () => {
      const elements: Record<string, { textContent: string; innerHTML: string }> = {
        'card-branch-label': { textContent: '', innerHTML: '' },
        'table-branch-label': { textContent: '', innerHTML: '' },
        'telemetry-badge-container': { textContent: '', innerHTML: '' },
        'card-commits': { textContent: '', innerHTML: '' },
        'card-lines': { textContent: '', innerHTML: '' },
        'card-time': { textContent: '', innerHTML: '' },
        'card-time-seconds': { textContent: '', innerHTML: '' },
        'card-tokens': { textContent: '', innerHTML: '' },
        'card-tokens-detail': { textContent: '', innerHTML: '' },
        'card-cost': { textContent: '', innerHTML: '' },
        'telemetry-table-tbody': { textContent: '', innerHTML: '' },
      };

      const sandbox: Record<string, unknown> = {
        document: {
          getElementById: (id: string) => elements[id] || null,
          querySelectorAll: () => [],
          addEventListener: () => {},
        },
        window: {
          addEventListener: () => {},
        },
        telemetryData: {
          'feat/test': {
            totalCommits: 3,
            linesAdded: 30,
            linesDeleted: 5,
            totalActiveTimeSeconds: 180,
            totalPromptTokens: 1500,
            totalCompletionTokens: 300,
            totalTokens: 1800,
            estimatedCostUsd: 0.05,
            humanSummary: {
              commits: 1,
              linesAdded: 10,
              linesDeleted: 0,
              activeTimeSeconds: 60,
              promptTokens: 0,
              completionTokens: 0,
              estimatedCostUsd: 0,
            },
            byModel: {
              '<svg onload=alert(1)>': {
                commits: 1,
                linesAdded: 10,
                linesDeleted: 2,
                activeTimeSeconds: 60,
                promptTokens: 1000,
                completionTokens: 200,
                estimatedCostUsd: 0.03,
                byEffort: {
                  '<script>xss</script>': {
                    commits: 1,
                    linesAdded: 10,
                    linesDeleted: 2,
                    activeTimeSeconds: 60,
                    promptTokens: 1000,
                    completionTokens: 200,
                    estimatedCostUsd: 0.03,
                  },
                },
              },
              'legacy-model': {
                commits: 1,
                linesAdded: 10,
                linesDeleted: 3,
                activeTimeSeconds: 60,
                promptTokens: 500,
                completionTokens: 100,
                estimatedCostUsd: 0.02,
              },
            },
          },
        },
      };

      vm.runInNewContext(`${DASHBOARD_CLIENT_SCRIPT}\nfilterTelemetryByBranch('feat/test');`, sandbox);
      const tbodyHtml = elements['telemetry-table-tbody'].innerHTML;

      expect(tbodyHtml).toContain('<td>—</td>');
      expect(tbodyHtml).toContain('unspecified');
      expect(tbodyHtml).not.toContain('<svg onload=alert(1)>');
      expect(tbodyHtml).toContain('&lt;svg onload=alert(1)&gt;');
      expect(tbodyHtml).not.toContain('<script>xss</script>');
      expect(tbodyHtml).toContain('&lt;script&gt;xss&lt;/script&gt;');

      const rows = tbodyHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
      expect(rows.length).toBe(4);
      for (const row of rows) {
        const tdCount = (row.match(/<td\b/g) || []).length;
        expect(tdCount).toBe(8);
      }
    });
  });
});
