import { describe, it, expect } from 'vitest';
import {
  parseCommitTrailers,
  formatCommitTrailers,
} from '../src/git/trailers.js';

describe('Git Commit Trailers Engine', () => {
  it('parses commit message with complete agent trailers', () => {
    const message = `feat(telemetry): implement mTLS gateway validation

Task-ID: TSK-002
Parent-Ref: CHG-001
Author-Type: agent
AI-Model: claude-3-7-sonnet
Prompt-Tokens: 14500
Completion-Tokens: 1850
Active-Time-Seconds: 420
`;
    const trailers = parseCommitTrailers(message);

    expect(trailers.taskId).toBe('TSK-002');
    expect(trailers.parentRef).toBe('CHG-001');
    expect(trailers.authorType).toBe('agent');
    expect(trailers.aiModel).toBe('claude-3-7-sonnet');
    expect(trailers.promptTokens).toBe(14500);
    expect(trailers.completionTokens).toBe(1850);
    expect(trailers.activeTimeSeconds).toBe(420);
  });

  it('parses human commit without token trailers defaulting to zero and human type', () => {
    const message = `fix: correct parsing logic for null payloads

Task-ID: TSK-003
Author-Type: human
Active-Time-Seconds: 900
`;
    const trailers = parseCommitTrailers(message);

    expect(trailers.taskId).toBe('TSK-003');
    expect(trailers.authorType).toBe('human');
    expect(trailers.aiModel).toBeUndefined();
    expect(trailers.promptTokens).toBe(0);
    expect(trailers.completionTokens).toBe(0);
    expect(trailers.activeTimeSeconds).toBe(900);
  });

  it('defaults to human when no trailers are present in conventional commit', () => {
    const message = 'chore: update README documentation';
    const trailers = parseCommitTrailers(message);

    expect(trailers.authorType).toBe('human');
    expect(trailers.taskId).toBeUndefined();
    expect(trailers.promptTokens).toBe(0);
    expect(trailers.completionTokens).toBe(0);
  });

  it('detects agent authorType if AI-Model trailer is declared without explicit Author-Type', () => {
    const message = `feat: add schema validator

AI-Model: gpt-4o
`;
    const trailers = parseCommitTrailers(message);
    expect(trailers.authorType).toBe('agent');
    expect(trailers.aiModel).toBe('gpt-4o');
  });

  it('formats partial trailers into structured trailer text', () => {
    const formatted = formatCommitTrailers({
      taskId: 'TSK-101',
      parentRef: 'CHG-005',
      authorType: 'agent',
      aiModel: 'claude-3-7-sonnet',
      promptTokens: 5000,
      completionTokens: 800,
      activeTimeSeconds: 120,
    });

    expect(formatted).toContain('Task-ID: TSK-101');
    expect(formatted).toContain('Parent-Ref: CHG-005');
    expect(formatted).toContain('Author-Type: agent');
    expect(formatted).toContain('AI-Model: claude-3-7-sonnet');
    expect(formatted).toContain('Prompt-Tokens: 5000');
    expect(formatted).toContain('Completion-Tokens: 800');
    expect(formatted).toContain('Active-Time-Seconds: 120');
  });
});
