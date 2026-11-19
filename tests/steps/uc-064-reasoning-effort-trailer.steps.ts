// BDD STEP DEFINITIONS (tests/features/uc-064-reasoning-effort-trailer.feature)
// Traceability: @UC-064-REASONING-EFFORT-TRAILER @FR-064-REASONING-EFFORT-TRAILER-001 @CHG-064-REASONING-EFFORT-TRAILER CMP-064-REASONING-EFFORT-TRAILER
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
  let envVars: Record<string, string> = {};
  let detectedIdentity: AuthorIdentity | undefined;
  let formattedTrailers = '';
  let commitMessage = '';
  let parsedTrailers: CommitTrailers | undefined;
  let invalidTrailers: CommitTrailers | undefined;
  let missingTrailers: CommitTrailers | undefined;
  let renderedTableHtml = '';

  registry.given(
    'an agent environment with "AI_MODEL=claude-3-7-sonnet" and "AI_REASONING_EFFORT=high"',
    () => {
      envVars = {
        AI_SDLC_AUTHOR_TYPE: 'agent',
        AI_MODEL: 'claude-3-7-sonnet',
        AI_REASONING_EFFORT: 'high',
      };
    }
  );

  registry.when('"detectAuthorIdentity" and "formatCommitTrailers" process the commit metadata', () => {
    detectedIdentity = detectAuthorIdentity({ cwd: process.cwd(), env: envVars });
    formattedTrailers = formatCommitTrailers({
      authorType: detectedIdentity.authorType,
      aiModel: detectedIdentity.model,
      reasoningEffort: (detectedIdentity as unknown as { reasoningEffort?: never }).reasoningEffort,
      promptTokens: 1000,
      completionTokens: 250,
      activeTimeSeconds: 30,
    });
  });

  registry.then('the formatted trailers include "AI-Reasoning-Effort: high"', () => {
    assert(
      formattedTrailers.includes('AI-Reasoning-Effort: high'),
      `Expected formatted trailers to include "AI-Reasoning-Effort: high", got:\n${formattedTrailers}`
    );
  });

  registry.then('"dashboard-html" renders the model telemetry breakdown with reasoning effort "high"', () => {
    const trailers = parseCommitTrailers(formattedTrailers);
    const kpi = aggregateCommitKpiRecords(
      [
        {
          sha: 'uc06401',
          authorName: 'AI Agent',
          authorEmail: 'agent@example.com',
          date: '2026-11-19T18:00:00Z',
          subject: 'feat: uc-064 nominal',
          trailers,
          linesAdded: 15,
          linesDeleted: 3,
          isBugFix: false,
        },
      ],
      'main',
      'feat/uc-064'
    );
    const renderFn = (dashboardHtml as Record<string, unknown>).renderModelTelemetryTable as
      | ((kpi: PrKpiAggregation, label: string) => string)
      | undefined;
    assert(typeof renderFn === 'function', 'Expected renderModelTelemetryTable to be exported');
    const html = renderFn!(kpi, 'feat/uc-064');
    assert(
      html.includes('Reasoning Effort') && html.includes('high'),
      'Expected dashboard HTML to render model telemetry breakdown with reasoning effort "high"'
    );
  });

  registry.given(/^a commit message containing trailer "AI-Reasoning-Effort: ([^"]*)"$/, (args) => {
    commitMessage = `feat: boundary\n\nAuthor-Type: agent\nAI-Reasoning-Effort: ${args[0]}`;
  });

  registry.when('"parseCommitTrailers" parses the commit message', () => {
    parsedTrailers = parseCommitTrailers(commitMessage);
  });

  registry.then(/^"trailers\.reasoningEffort" equals "([^"]*)"$/, (args) => {
    const expected = args[0];
    const actual = (parsedTrailers as unknown as { reasoningEffort?: string })?.reasoningEffort;
    assert(
      actual === expected,
      `Expected trailers.reasoningEffort to equal "${expected}", got "${actual}"`
    );
  });

  registry.given(
    'a commit message with trailer "AI-Reasoning-Effort: ultra" and a commit without the trailer',
    () => {
      commitMessage = 'feat: ultra\n\nAuthor-Type: agent\nAI-Model: gpt-4o\nAI-Reasoning-Effort: ultra';
    }
  );

  registry.when('"parseCommitTrailers" and "dashboard-html" process both commits', () => {
    invalidTrailers = parseCommitTrailers(commitMessage);
    missingTrailers = parseCommitTrailers('feat: no effort\n\nAuthor-Type: agent\nAI-Model: gpt-4o');
    const kpi = aggregateCommitKpiRecords(
      [
        {
          sha: 'uc06402',
          authorName: 'AI Agent',
          authorEmail: 'agent@example.com',
          date: '2026-11-19T18:00:00Z',
          subject: 'feat: invalid effort',
          trailers: invalidTrailers,
          linesAdded: 10,
          linesDeleted: 0,
          isBugFix: false,
        },
        {
          sha: 'uc06403',
          authorName: 'AI Agent',
          authorEmail: 'agent@example.com',
          date: '2026-11-19T18:01:00Z',
          subject: 'feat: missing effort',
          trailers: missingTrailers,
          linesAdded: 12,
          linesDeleted: 1,
          isBugFix: false,
        },
      ],
      'main',
      'feat/uc-064-invalid'
    );
    const renderFn = (dashboardHtml as Record<string, unknown>).renderModelTelemetryTable as
      | ((kpi: PrKpiAggregation, label: string) => string)
      | undefined;
    assert(typeof renderFn === 'function', 'Expected renderModelTelemetryTable to be exported');
    renderedTableHtml = renderFn!(kpi, 'feat/uc-064-invalid');
  });

  registry.then('"trailers.reasoningEffort" is undefined for both commits', () => {
    const v1 = (invalidTrailers as unknown as { reasoningEffort?: string })?.reasoningEffort;
    const v2 = (missingTrailers as unknown as { reasoningEffort?: string })?.reasoningEffort;
    assert(v1 === undefined, `Expected invalid effort to be undefined, got "${v1}"`);
    assert(v2 === undefined, `Expected missing effort to be undefined, got "${v2}"`);
  });

  registry.then(
    'the dashboard renders them gracefully as "unspecified" or "—" without failing',
    () => {
      assert(
        renderedTableHtml.includes('unspecified') || renderedTableHtml.includes('—'),
        'Expected dashboard HTML to render missing effort as "unspecified" or "—"'
      );
    }
  );
}
