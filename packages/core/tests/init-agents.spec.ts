/**
 * Cites: FR-029-EXPERT-USER-AGENT-001
 * Cites: FR-030-INIT-AGENT-SCAFFOLDING-001
 * Cites: FR-031-WORKFLOW-AGENT-HANDOFF-001
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initProject, SPECIALIZED_AGENT_TEMPLATES } from '../src/init/index.js';

describe('Core initProject: AI Agent Scaffolding & Governance Suite', () => {
  const tempDir = path.join(os.tmpdir(), 'test-core-init-agents');

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('deploys all agents and specialized role files by default when agents option is omitted', () => {
    const result = initProject({ targetDir: tempDir });
    expect(result.success).toBe(true);
    expect(result.agentsConfigured).toContain('all');

    expect(fs.existsSync(path.join(tempDir, 'quality-policy.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'license-policy.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates/workflow/agent-handoff.template.md'))).toBe(true);

    // Global agent files should be present by default
    expect(fs.existsSync(path.join(tempDir, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.agent/rules/ai-sdlc.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.cursor/rules/ai-sdlc-core.mdc'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.github/copilot-instructions.md'))).toBe(true);

    // Individual specialized agent files should be present for all 10 roles
    expect(SPECIALIZED_AGENT_TEMPLATES).toHaveLength(10);
    for (const agent of SPECIALIZED_AGENT_TEMPLATES) {
      expect(fs.existsSync(path.join(tempDir, `.agent/agents/${agent.id}.md`))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, `.agent/skills/${agent.id}/SKILL.md`))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, `.cursor/rules/${agent.id}.mdc`))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, `.claude/agents/${agent.id}.md`))).toBe(true);
      expect(fs.existsSync(path.join(tempDir, `.github/agents/${agent.id}.agent.md`))).toBe(true);
    }
  });

  it('initializes base policies and templates without agents when agents is "none" or false', () => {
    const result = initProject({ targetDir: tempDir, agents: 'none' });
    expect(result.success).toBe(true);
    expect(result.agentsConfigured).toEqual([]);

    expect(fs.existsSync(path.join(tempDir, 'quality-policy.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'license-policy.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'templates/workflow/agent-handoff.template.md'))).toBe(true);

    // Agent files should not be present
    expect(fs.existsSync(path.join(tempDir, 'CLAUDE.md'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, '.agent/rules/ai-sdlc.md'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, '.cursor/rules/ai-sdlc-core.mdc'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, '.github/copilot-instructions.md'))).toBe(false);
  });

  it('scaffolds all agents and MCP configs when agents is set to "all"', () => {
    const result = initProject({ targetDir: tempDir, agents: 'all' });
    expect(result.success).toBe(true);
    expect(result.agentsConfigured).toContain('all');

    // Antigravity
    const agFile = path.join(tempDir, '.agent/rules/ai-sdlc.md');
    expect(fs.existsSync(agFile)).toBe(true);
    const agContent = fs.readFileSync(agFile, 'utf-8');
    expect(agContent).toContain('AUTO-APPROVE');
    expect(agContent).toContain('agent-product-analyst');
    expect(agContent).toContain('agent-system-architect');
    expect(agContent).toContain('agent-security-auditor');
    expect(agContent).toContain('agent-compliance-checker');
    expect(agContent).toContain('agent-expert-user');
    expect(agContent).toContain('Workflow Handoff');

    // Cursor
    expect(fs.existsSync(path.join(tempDir, '.cursor/rules/ai-sdlc-core.mdc'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.cursor/rules/ai-sdlc-product.mdc'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.cursor/rules/ai-sdlc-quality.mdc'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.cursor/mcp.json'))).toBe(true);

    // Claude
    const claudeFile = path.join(tempDir, 'CLAUDE.md');
    expect(fs.existsSync(claudeFile)).toBe(true);
    const claudeContent = fs.readFileSync(claudeFile, 'utf-8');
    expect(claudeContent).toContain('AUTO-APPROVE');
    expect(claudeContent).toContain('Workflow Handoff');
    expect(claudeContent).toContain('license-policy.yaml');
    expect(claudeContent).toContain('agent-product-analyst');
    expect(claudeContent).toContain('agent-system-architect');

    // Copilot
    expect(fs.existsSync(path.join(tempDir, '.github/copilot-instructions.md'))).toBe(true);

    // MCP configs
    expect(fs.existsSync(path.join(tempDir, 'antigravity.mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.vscode/mcp.json'))).toBe(true);
  });

  it('scaffolds selectively when agents is set to "cursor,claude"', () => {
    const result = initProject({ targetDir: tempDir, agents: 'cursor,claude' });
    expect(result.success).toBe(true);
    expect(result.agentsConfigured).toContain('cursor');
    expect(result.agentsConfigured).toContain('claude');
    expect(result.agentsConfigured).not.toContain('antigravity');

    // Cursor & Claude exist (both global and individual agent files)
    expect(fs.existsSync(path.join(tempDir, '.cursor/rules/ai-sdlc-core.mdc'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.cursor/rules/agent-developer.mdc'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.claude/agents/agent-developer.md'))).toBe(true);

    // Antigravity & Copilot do not exist
    expect(fs.existsSync(path.join(tempDir, '.agent/rules/ai-sdlc.md'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, '.agent/agents/agent-developer.md'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, '.github/copilot-instructions.md'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, '.github/agents/agent-developer.agent.md'))).toBe(false);
  });

  it('scaffolds only MCP server configs when agents is set to "mcp"', () => {
    const result = initProject({ targetDir: tempDir, agents: 'mcp' });
    expect(result.success).toBe(true);

    expect(fs.existsSync(path.join(tempDir, '.cursor/mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'antigravity.mcp.json'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.vscode/mcp.json'))).toBe(true);

    // Rule files should not be created
    expect(fs.existsSync(path.join(tempDir, 'CLAUDE.md'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, '.cursor/rules/ai-sdlc-core.mdc'))).toBe(false);
  });

  it('strictly enforces no-clobber protection on existing files', () => {
    const customContent = '# My Custom Claude Instructions\nDo not overwrite me!';
    const claudeFile = path.join(tempDir, 'CLAUDE.md');
    fs.writeFileSync(claudeFile, customContent, 'utf-8');

    const result = initProject({ targetDir: tempDir, agents: 'all' });
    expect(result.success).toBe(true);

    // CLAUDE.md was not in filesCreated because it already existed
    expect(result.filesCreated).not.toContain('CLAUDE.md');

    // Content remains completely unchanged
    const afterContent = fs.readFileSync(claudeFile, 'utf-8');
    expect(afterContent).toBe(customContent);
  });

  it('supports dry-run without writing files to disk', () => {
    const result = initProject({ targetDir: tempDir, agents: 'all', dryRun: true });
    expect(result.success).toBe(true);
    expect(result.filesCreated.length).toBeGreaterThan(0);

    // No files should be written on disk
    expect(fs.existsSync(path.join(tempDir, 'quality-policy.yaml'))).toBe(false);
    expect(fs.existsSync(path.join(tempDir, 'CLAUDE.md'))).toBe(false);
  });
});
