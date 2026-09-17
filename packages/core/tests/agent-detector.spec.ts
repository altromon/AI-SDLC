import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { detectAuthorIdentity } from '../src/git/agent-detector.js';

describe('Universal IDE-Agnostic Agent Detector Engine', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-sdlc-detector-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it('detects human developer by default when no agent signals exist', () => {
    const identity = detectAuthorIdentity({ cwd: tmpDir, env: {} });
    expect(identity.authorType).toBe('human');
    expect(identity.model).toBe('n/a');
    expect(identity.source).toBe('default-human');
    expect(identity.confidence).toBe('HIGH');
  });

  it('respects explicit AI_SDLC_AUTHOR_TYPE override', () => {
    const identity = detectAuthorIdentity({
      cwd: tmpDir,
      env: { AI_SDLC_AUTHOR_TYPE: 'agent', AI_MODEL: 'custom-llm' },
    });
    expect(identity.authorType).toBe('agent');
    expect(identity.model).toBe('custom-llm');
    expect(identity.source).toBe('explicit-env');
  });

  it('detects Claude Code agent environment', () => {
    const identity = detectAuthorIdentity({
      cwd: tmpDir,
      env: { CLAUDE_CODE: '1' },
    });
    expect(identity.authorType).toBe('agent');
    expect(identity.model).toBe('claude-3-7-sonnet');
    expect(identity.source).toBe('env-claude-code');
  });

  it('detects Cursor agent environment', () => {
    const identity = detectAuthorIdentity({
      cwd: tmpDir,
      env: { CURSOR_AGENT: 'true' },
    });
    expect(identity.authorType).toBe('agent');
    expect(identity.model).toBe('cursor-agent');
    expect(identity.source).toBe('env-cursor');
  });

  it('detects Windsurf Cascade agent environment', () => {
    const identity = detectAuthorIdentity({
      cwd: tmpDir,
      env: { WINDSURF_AGENT: '1' },
    });
    expect(identity.authorType).toBe('agent');
    expect(identity.model).toBe('windsurf-cascade');
    expect(identity.source).toBe('env-windsurf');
  });

  it('detects GitHub Copilot agent environment', () => {
    const identity = detectAuthorIdentity({
      cwd: tmpDir,
      env: { GITHUB_COPILOT_AGENT: 'true' },
    });
    expect(identity.authorType).toBe('agent');
    expect(identity.model).toBe('github-copilot');
    expect(identity.source).toBe('env-copilot');
  });

  it('detects Aider CLI environment', () => {
    const identity = detectAuthorIdentity({
      cwd: tmpDir,
      env: { AIDER_MODEL: 'gpt-4o' },
    });
    expect(identity.authorType).toBe('agent');
    expect(identity.model).toBe('gpt-4o');
    expect(identity.source).toBe('env-aider');
  });

  it('detects agent from local session-telemetry.json file', () => {
    const aiSdlcDir = path.join(tmpDir, '.ai-sdlc');
    fs.mkdirSync(aiSdlcDir, { recursive: true });
    fs.writeFileSync(
      path.join(aiSdlcDir, 'session-telemetry.json'),
      JSON.stringify({
        model: 'gemini-1.5-pro',
        promptTokens: 12000,
        completionTokens: 1500,
        activeTimeSeconds: 180,
      }),
      'utf-8'
    );

    const identity = detectAuthorIdentity({ cwd: tmpDir, env: {} });
    expect(identity.authorType).toBe('agent');
    expect(identity.model).toBe('gemini-1.5-pro');
    expect(identity.promptTokens).toBe(12000);
    expect(identity.completionTokens).toBe(1500);
    expect(identity.activeTimeSeconds).toBe(180);
    expect(identity.source).toBe('session-telemetry-file');
  });

  it('detects agent from git author name containing bot keywords', () => {
    const identity = detectAuthorIdentity({
      cwd: tmpDir,
      env: { GIT_AUTHOR_NAME: 'Claude [bot]', GIT_AUTHOR_EMAIL: 'claude@anthropic.com' },
    });
    expect(identity.authorType).toBe('agent');
    expect(identity.model).toBe('claude-3-7-sonnet');
    expect(identity.source).toBe('git-user-signature');
  });
});
