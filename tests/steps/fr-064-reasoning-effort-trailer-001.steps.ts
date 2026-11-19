// BDD STEP DEFINITIONS (tests/features/fr-064-reasoning-effort-trailer-001.feature)
// Traceability: @FR-064-REASONING-EFFORT-TRAILER-001 @UC-064-REASONING-EFFORT-TRAILER @CHG-064-REASONING-EFFORT-TRAILER CMP-064-REASONING-EFFORT-TRAILER
import {
  BddStepRegistry,
  parseCommitTrailers,
  formatCommitTrailers,
  detectAuthorIdentity,
  aggregateCommitKpiRecords,
  CommitTrailers,
  AuthorIdentity,
  PrKpiAggregation,
} from '@aisdlc/core';
import * as dashboardHtml from '../../packages/core/src/reporters/dashboard-html.js';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function registerSteps(registry: BddStepRegistry): void {
  let commitMessage = '';
  let parsedTrailers: CommitTrailers | undefined;
  let formattedTrailers = '';
  let prKpi: PrKpiAggregation | undefined;
  let renderedTableHtml = '';
  let envVars: Record<string, string> = {};
  let detectedIdentity: AuthorIdentity | undefined;
  let invalidCommitTrailers: CommitTrailers | undefined;
  let humanCommitTrailers: CommitTrailers | undefined;

  registry.given(
    'an agent commit with trailers "AI-Model: claude-3-7-sonnet" and "AI-Reasoning-Effort: high"',
    () => {
      commitMessage = [
        'feat(TSK-064-001): add reasoning effort telemetry',
        '',
        'Author-Type: agent',
        'AI-Model: claude-3-7-sonnet',
        'AI-Reasoning-Effort: high',
        'Prompt-Tokens: 1200',
        'Completion-Tokens: 300',
        'Active-Time-Seconds: 45',
      ].join('\n');
    }
  );

  registry.when('"parseCommitTrailers" and "formatCommitTrailers" execute', () => {
    parsedTrailers = parseCommitTrailers(commitMessage);
    formattedTrailers = formatCommitTrailers(parsedTrailers);
  });

  registry.then('"trailers.reasoningEffort" is "high"', () => {
    const actual = (parsedTrailers as unknown as { reasoningEffort?: string })?.reasoningEffort;
    assert(actual === 'high', `Expected trailers.reasoningEffort to be "high", got "${actual}"`);
  });

  registry.then('the formatted trailer block contains "AI-Reasoning-Effort: high"', () => {
    assert(
      formattedTrailers.includes('AI-Reasoning-Effort: high'),
      `Expected formatted trailers to include "AI-Reasoning-Effort: high", got:\n${formattedTrailers}`
    );
  });

  registry.when('the dashboard HTML is generated from the aggregated PR KPIs', () => {
    assert(parsedTrailers !== undefined, 'Expected parsedTrailers to be populated');
    prKpi = aggregateCommitKpiRecords(
      [
        {
          sha: 'abc1234',
          authorName: 'AI Agent',
          authorEmail: 'agent@example.com',
          date: '2026-11-19T18:00:00Z',
          subject: 'feat: add reasoning effort',
          trailers: parsedTrailers!,
          linesAdded: 25,
          linesDeleted: 5,
          isBugFix: false,
        },
      ],
      'main',
      'feat/CHG-064-reasoning-effort-trailer'
    );
    const renderFn = (dashboardHtml as Record<string, unknown>).renderModelTelemetryTable as
      | ((kpi: PrKpiAggregation, label: string) => string)
      | undefined;
    assert(typeof renderFn === 'function', 'Expected renderModelTelemetryTable to be exported');
    renderedTableHtml = renderFn!(prKpi, 'feat/CHG-064-reasoning-effort-trailer');
  });

  registry.then(
    'the model telemetry table displays the reasoning effort "high" for "claude-3-7-sonnet"',
    () => {
      assert(
        renderedTableHtml.includes('Reasoning Effort'),
        'Expected model telemetry table header to include "Reasoning Effort"'
      );
      assert(
        renderedTableHtml.includes('claude-3-7-sonnet') && renderedTableHtml.includes('high'),
        `Expected model telemetry table to display "high" for "claude-3-7-sonnet"`
      );
    }
  );

  registry.given(
    /^"AI_REASONING_EFFORT" is set to "([^"]*)" in an agent environment$/,
    (args) => {
      envVars = {
        AI_SDLC_AUTHOR_TYPE: 'agent',
        AI_MODEL: 'claude-3-7-sonnet',
        AI_REASONING_EFFORT: args[0],
      };
    }
  );

  registry.when('"detectAuthorIdentity" resolves the author identity', () => {
    detectedIdentity = detectAuthorIdentity({ cwd: process.cwd(), env: envVars });
  });

  registry.then(/^"identity\.reasoningEffort" is "([^"]*)"$/, (args) => {
    const expected = args[0];
    const actual = (detectedIdentity as unknown as { reasoningEffort?: string })?.reasoningEffort;
    assert(
      actual === expected,
      `Expected identity.reasoningEffort to be "${expected}", got "${actual}"`
    );
  });

  registry.then(
    /^"parseCommitTrailers" normalizes "AI-Reasoning-Effort: ([^"]*)" to "([^"]*)"$/,
    (args) => {
      const [rawEffort, expected] = args;
      const parsed = parseCommitTrailers(`feat: test\n\nAI-Reasoning-Effort: ${rawEffort}`);
      const actual = (parsed as unknown as { reasoningEffort?: string }).reasoningEffort;
      assert(
        actual === expected,
        `Expected normalized reasoningEffort "${expected}" for "${rawEffort}", got "${actual}"`
      );
    }
  );

  registry.given(
    'a commit message with "AI-Reasoning-Effort: extreme" and a human commit without "AI-Reasoning-Effort"',
    () => {
      commitMessage = 'feat: invalid\n\nAuthor-Type: agent\nAI-Model: gpt-4o\nAI-Reasoning-Effort: extreme';
    }
  );

  registry.when('"parseCommitTrailers" parses both messages', () => {
    invalidCommitTrailers = parseCommitTrailers(commitMessage);
    humanCommitTrailers = parseCommitTrailers('fix: human commit\n\nAuthor-Type: human');
  });

  registry.then('"trailers.reasoningEffort" is undefined for both commits', () => {
    const invalidVal = (invalidCommitTrailers as unknown as { reasoningEffort?: string })?.reasoningEffort;
    const humanVal = (humanCommitTrailers as unknown as { reasoningEffort?: string })?.reasoningEffort;
    assert(invalidVal === undefined, `Expected invalid effort to be undefined, got "${invalidVal}"`);
    assert(humanVal === undefined, `Expected missing effort to be undefined, got "${humanVal}"`);
  });

  registry.then(
    '"formatCommitTrailers" omits the "AI-Reasoning-Effort" line when "reasoningEffort" is undefined',
    () => {
      const formatted = formatCommitTrailers(humanCommitTrailers!);
      assert(
        !formatted.includes('AI-Reasoning-Effort:'),
        `Expected formatted trailers to omit AI-Reasoning-Effort, got:\n${formatted}`
      );
    }
  );

  registry.then(
    'the generated dashboard HTML renders missing effort levels gracefully as "unspecified" or "—"',
    () => {
      const kpi = aggregateCommitKpiRecords(
        [
          {
            sha: 'def5678',
            authorName: 'Legacy Agent',
            authorEmail: 'agent@example.com',
            date: '2026-11-19T18:00:00Z',
            subject: 'feat: legacy commit',
            trailers: {
              authorType: 'agent',
              aiModel: 'gpt-4o',
              promptTokens: 500,
              completionTokens: 100,
              activeTimeSeconds: 20,
            },
            linesAdded: 10,
            linesDeleted: 2,
            isBugFix: false,
          },
        ],
        'main',
        'feat/legacy'
      );
      const renderFn = (dashboardHtml as Record<string, unknown>).renderModelTelemetryTable as
        | ((kpi: PrKpiAggregation, label: string) => string)
        | undefined;
      assert(typeof renderFn === 'function', 'Expected renderModelTelemetryTable to be exported');
      const html = renderFn!(kpi, 'feat/legacy');
      assert(
        html.includes('unspecified') || html.includes('—'),
        'Expected dashboard HTML to render missing effort as "unspecified" or "—"'
      );
    }
  );
}
